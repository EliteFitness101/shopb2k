import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SECRET = Deno.env.get("BUFFER_CRON_SECRET") || Deno.env.get("CONTENT_CRON_SECRET") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const clamp = (n:number,min=0,max=100) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
const num = (v:unknown) => Number(v ?? 0);

async function authorized(req:Request){
  const h=req.headers.get("x-content-cron-secret") || req.headers.get("x-buffer-cron-secret") || "";
  if(SECRET && h===SECRET) return true;
  const a=req.headers.get("authorization") || "";
  return Boolean(SERVICE_ROLE && a === `Bearer ${SERVICE_ROLE}`);
}

function score(m:any, baseline:any){
  const views=num(m.views), retention=num(m.retention_percent), likes=num(m.likes), comments=num(m.comments), shares=num(m.shares), subs=num(m.subscribers_gained), clicks=num(m.clicks), checkouts=num(m.checkouts), purchases=num(m.purchases), revenue=num(m.revenue_ngn);
  const bViews=Math.max(1,num(baseline.views)||1), bRet=Math.max(1,num(baseline.retention_percent)||1);
  const reach=clamp(50*(views/bViews));
  const retentionScore=clamp(100*(retention/bRet));
  const engagementRate=(likes+comments+shares)/Math.max(1,views);
  const baselineEngagement=(num(baseline.likes)+num(baseline.comments)+num(baseline.shares))/bViews;
  const engagement=clamp(50*(engagementRate/Math.max(0.0001,baselineEngagement)));
  const subscriberRate=subs/Math.max(1,views);
  const baselineSubRate=num(baseline.subscribers_gained)/bViews;
  const subscriber=clamp(50*(subscriberRate/Math.max(0.000001,baselineSubRate)));
  const commerceRate=(clicks+checkouts+purchases)/Math.max(1,views);
  const baselineCommerce=(num(baseline.clicks)+num(baseline.checkouts)+num(baseline.purchases))/bViews;
  const commerce=clamp(50*(commerceRate/Math.max(0.000001,baselineCommerce)));
  const viral=clamp(0.30*reach+0.25*retentionScore+0.20*engagement+0.15*subscriber+0.10*commerce);
  let action="observe";
  if(viral>=80) action="remix"; else if(viral>=65) action="expand"; else if(viral>=45) action="repackage"; else if(viral<20) action="retire";
  return {reach_score:reach,retention_score:retentionScore,engagement_score:engagement,subscriber_score:subscriber,commerce_score:commerce,viral_signal_score:viral,total_score:viral,action,rationale:{views,retention_percent:retention,engagement_rate:engagementRate,subscriber_rate:subscriberRate,clicks,checkouts,purchases,revenue_ngn}};
}

function remixCopy(topic:string,n:number){
  const hooks=[`Most people approach ${topic||"their wellness goals"} backwards. Here's the first step.`,`If ${topic||"your wellness goal"} has been difficult, try this simpler approach.`,`Before you change everything, check this one thing about ${topic||"your routine"}.`];
  const hook=hooks[(n-1)%hooks.length];
  return {hook,caption:`${hook}\n\nPractical guidance from RESONANCE FITNESS.\n\nSubscribe for the next step.`,title:`${topic||"Wellness"} — practical next step`};
}

async function processMetric(m:any){
  const {data:recent}=await db.from("youtube_content_metrics").select("views,retention_percent,likes,comments,shares,subscribers_gained,clicks,checkouts,purchases").order("observed_at",{ascending:false}).limit(50);
  const rows=recent||[];
  const avg=(key:string)=>rows.length?rows.reduce((s:any,r:any)=>s+num(r[key]),0)/rows.length:0;
  const baseline={views:avg("views")||Math.max(1,num(m.views)),retention_percent:avg("retention_percent")||50,likes:avg("likes")||1,comments:avg("comments")||1,shares:avg("shares")||1,subscribers_gained:avg("subscribers_gained")||1,clicks:avg("clicks"),checkouts:avg("checkouts"),purchases:avg("purchases")};
  const s=score(m,baseline);
  const {data:queue}=m.content_queue_id?await db.from("content_queue").select("id,title,asset_url,platform,destination,content_variant,campaign_key,metadata").eq("id",m.content_queue_id).maybeSingle():{data:null};
  await db.from("youtube_content_scores").upsert({external_video_id:String(m.external_video_id),content_queue_id:m.content_queue_id||null,topic:queue?.metadata?.topic||queue?.metadata?.pillar||null,hook:queue?.metadata?.hook||null,content_variant:queue?.content_variant||null,...s,last_metrics_at:m.observed_at||new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"external_video_id"});
  let remixCount=0;
  if(s.action==="remix" && queue?.asset_url){
    for(let n=1;n<=3;n++){
      const c=remixCopy(queue?.metadata?.topic||queue?.title||"wellness",n);
      await db.from("creative_variants").insert({opportunity_id:null,platform:"youtube",hook:c.hook,script:null,caption:c.caption,title:c.title,thumbnail_url:null,cta:"Subscribe for the next step.",asset_url:queue.asset_url,status:"draft"});
      remixCount++;
    }
  }
  return {external_video_id:m.external_video_id,score:s,remix_count:remixCount};
}

Deno.serve(async req=>{
  if(req.method!=="POST" && req.method!=="GET") return Response.json({error:"POST or GET required"},{status:405});
  if(!(await authorized(req))) return Response.json({error:"Unauthorized"},{status:401});
  try{
    if(req.method==="GET"){
      const {data,error}=await db.from("youtube_content_scores").select("*").order("total_score",{ascending:false}).limit(20);
      if(error) throw error;
      return Response.json({ok:true,top:data||[],engine:"ChatB2K YouTube Growth Engine",weights:{reach:.30,retention:.25,engagement:.20,subscriber:.15,commerce:.10}});
    }
    const body:any=await req.json().catch(()=>({}));
    const metrics=Array.isArray(body.metrics)?body.metrics:[body];
    if(!metrics.length) return Response.json({ok:false,error:"metrics required"},{status:400});
    const run=await db.from("youtube_growth_runs").insert({run_type:"metrics_ingest_and_score",input_count:metrics.length,status:"running"}).select("id").single();
    if(run.error) throw run.error;
    const report=[]; let scored=0,remix=0;
    for(const m of metrics){
      if(!m.external_video_id) continue;
      await db.from("youtube_content_metrics").upsert({platform:"youtube",external_video_id:String(m.external_video_id),content_queue_id:m.content_queue_id||null,publish_log_id:m.publish_log_id||null,observed_at:m.observed_at||new Date().toISOString(),views:num(m.views),engaged_views:num(m.engaged_views),watch_time_seconds:num(m.watch_time_seconds),average_view_duration_seconds:num(m.average_view_duration_seconds),retention_percent:num(m.retention_percent),likes:num(m.likes),comments:num(m.comments),shares:num(m.shares),subscribers_gained:num(m.subscribers_gained),clicks:num(m.clicks),assessment_starts:num(m.assessment_starts),checkouts:num(m.checkouts),purchases:num(m.purchases),revenue_ngn:num(m.revenue_ngn),metadata:m.metadata||{}},{onConflict:"external_video_id,observed_at"});
      const r=await processMetric(m); report.push(r); scored++; remix+=r.remix_count;
    }
    await db.from("youtube_growth_runs").update({status:"completed",scored_count:scored,remix_count:remix,report:{items:report},completed_at:new Date().toISOString()}).eq("id",run.data.id);
    return Response.json({ok:true,scored,remix_count:remix,report,engine:"ChatB2K YouTube Growth Engine"});
  }catch(e){ return Response.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:500}); }
});
