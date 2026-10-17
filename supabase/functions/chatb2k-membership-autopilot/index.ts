import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const SECRET = Deno.env.get("BUFFER_CRON_SECRET") || Deno.env.get("CONTENT_CRON_SECRET") || "";
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const authorized = (req: Request) => !!SECRET && (req.headers.get("x-content-cron-secret") || req.headers.get("x-buffer-cron-secret")) === SECRET;

const rankFor = (sales: number) => {
  if (sales >= 2_000_000) return { code: "PARTNER", rate: 800, next: null, threshold: null };
  if (sales >= 750_000) return { code: "PRO", rate: 700, next: "PARTNER", threshold: 2_000_000 };
  if (sales >= 250_000) return { code: "GROWTH", rate: 600, next: "PRO", threshold: 750_000 };
  return { code: "STARTER", rate: 500, next: "GROWTH", threshold: 250_000 };
};

function paymentNetNgn(p:any):number{const gross=Number(p?.amount??0),raw=Number(p?.net_amount??0);if(Number.isFinite(raw)&&raw>0){const net=gross>0&&raw>gross*10?raw/100:raw;if(net>0&&(!gross||net<=gross*1.05))return gross>0?Math.min(net,gross):net;}if(Number.isFinite(gross)&&gross>0)return gross;const g=Number(p?.gross_amount??0);return Number.isFinite(g)&&g>0?(g>100000?g/100:g):0;}
const categoryFor = (p: any) => {
  const s = [p?.product_type, p?.title, p?.handle, ...(p?.tags || [])].filter(Boolean).join(" ").toLowerCase();
  if (/(digital|\bdig\b|guide|ebook|protocol|programme|program)/.test(s)) return "digital";
  if (/(coaching|coach)/.test(s)) return "coaching";
  if (/(wellness|massage|spa|recovery)/.test(s)) return "wellness_services";
  if (/(premium|high[- ]margin|custom build|equipment)/.test(s)) return "premium_high_margin";
  if (/(b2b|corporate|wholesale)/.test(s)) return "b2b";
  if (/(physical|apparel|top|set|dumbbell|bench|rack|bar)/.test(s)) return "resoflex_standard";
  return "resoflex_standard";
};

async function queueTask(userId: string | null, taskType: string, channel: string, due: Date, priority: number, payload: any) {
  const dedupe = taskType + ":" + channel + ":" + (userId || "system") + ":" + due.toISOString().slice(0,10);
  const { data } = await db.from("chatb2k_automation_tasks").upsert(
    { user_id: userId, task_type: taskType, channel, due_at: due.toISOString(), priority, status: "queued", dedupe_key: dedupe, payload, updated_at: new Date().toISOString() },
    { onConflict: "dedupe_key", ignoreDuplicates: true }
  ).select("id").maybeSingle();
  return !!data;
}

async function notify(userId: string, type: string, title: string, body: string, actionUrl: string | null, metadata: any = {}) {
  const { data: existing } = await db.from("chatb2k_member_notifications").select("id").eq("user_id", userId).eq("notification_type", type)
    .gte("created_at", new Date(Date.now()-24*3600*1000).toISOString()).limit(1);
  if ((existing || []).length) return false;
  await db.from("chatb2k_member_notifications").insert({
    user_id: userId, notification_type: type, title, body, channel: "dashboard", status: "queued", action_url: actionUrl,
    metadata: { ...metadata, engine: "ChatB2K" }
  });
  return true;
}

async function processPaymentAttributions() {
  let created = 0;
  const { data: payments, error: paymentsError } = await db.from("payments").select("id,user_id,amount,gross_amount,net_amount,status,product_sku,created_at,paid_at,customer_email")
    .in("status", ["success","successful"]).order("created_at",{ascending:false}).limit(200);
  if(paymentsError)throw new Error("payment attribution read failed: "+paymentsError.message);
  for (const pay of payments || []) {
    if (!pay.user_id) continue;
    const { data: already, error: alreadyError } = await db.from("chatb2k_referral_attributions").select("id").eq("payment_id",pay.id).maybeSingle();
    if(alreadyError)throw new Error("attribution idempotency check failed: "+alreadyError.message);
    if (already) continue;
    const paidAt = new Date(pay.paid_at || pay.created_at);
    const cutoff = new Date(paidAt.getTime()-30*24*3600*1000).toISOString();
    const { data: refs, error: refsError } = await db.from("referrals").select("id,referrer_id,referred_id,created_at")
      .eq("referred_id",pay.user_id).gte("created_at",cutoff).order("created_at",{ascending:false}).limit(1);
    if(refsError)throw new Error("referral lookup failed: "+refsError.message);
    const ref = refs?.[0];
    if (!ref?.referrer_id || ref.referrer_id === pay.user_id) continue;
    const eligible = paymentNetNgn(pay);
    if (!(eligible > 0)) continue;

    const { data: directRefs, error: directRefsError } = await db.from("referrals").select("referred_id").eq("referrer_id",ref.referrer_id);
    if(directRefsError)throw new Error("direct referral lookup failed: "+directRefsError.message);
    const ids = (directRefs || []).map((x:any)=>x.referred_id).filter(Boolean);
    let qualifiedSales = 0;
    if (ids.length) {
      const { data: qs, error: qualifiedSalesError } = await db.from("payments").select("net_amount,gross_amount,amount").in("user_id",ids).eq("status","success").gte("paid_at",cutoff);
      if(qualifiedSalesError)throw new Error("qualified sales lookup failed: "+qualifiedSalesError.message);
      qualifiedSales = (qs || []).reduce((sum:any,x:any)=>sum+paymentNetNgn(x),0);
    }
    const rank = rankFor(qualifiedSales);
    let product: any = null;
    if (pay.product_sku) {
      const { data, error: productError } = await db.from("products").select("product_type,title,handle,tags").eq("sku",pay.product_sku).maybeSingle();
      if (productError) throw new Error("product classification lookup failed: " + productError.message);
      product = data;
    }
    const cat = categoryFor(product || { title: pay.product_sku || "" });
    const catRates: Record<string,number> = { low_margin_physical:300, resoflex_standard:500, premium_high_margin:700, digital:1000, wellness_services:1000, coaching:700, b2b:500 };
    const rate = Math.min(1000, Math.max(catRates[cat] ?? 500, rank.rate));
    const commission = Math.floor(eligible * rate / 10000);

    const { error: attributionInsertError } = await db.from("chatb2k_referral_attributions").insert({
      payment_id:pay.id,referrer_id:ref.referrer_id,referred_id:pay.user_id,eligible_amount_ngn:eligible,rate_bps:rate,
      commission_ngn:commission,status:"accrued",attribution_reason:"direct one-level referral within 30-day attribution window",attribution_window_days:30,
      product_sku:pay.product_sku??null,commission_basis:"net_collected_revenue_ngn",rule_version:"chatb2k-referral-v2"
    });
    if(attributionInsertError)throw new Error("attribution insert failed: "+attributionInsertError.message);
    created++;

    const { data: unpaid } = await db.from("chatb2k_referral_attributions").select("commission_ngn").eq("referrer_id",ref.referrer_id).in("status",["accrued","payout_eligible"]);
    const accrued = (unpaid || []).reduce((s:any,x:any)=>s+Number(x.commission_ngn||0),0);
    if (accrued >= 5000) {
      await db.from("chatb2k_referral_attributions").update({status:"payout_eligible",updated_at:new Date().toISOString()}).eq("referrer_id",ref.referrer_id).eq("status","accrued");
      await notify(ref.referrer_id,"earning_payout_eligible","Referral earnings are payout-eligible","Your accrued direct-referral commissions have reached the ₦5,000 payout threshold.","/dashboard",{accrued_ngn:accrued});
    }
    await notify(ref.referrer_id,"referral_earning","New referral earning accrued",
      "A qualified direct referral generated ₦" + commission.toLocaleString() + " in accrued commission at " + (rate/100).toFixed(2) + "%.",
      "/dashboard",{commission_ngn:commission,rate_bps:rate});
  }
  return created;
}

async function syncMembers() {
  const { data: profiles } = await db.from("profiles").select("id,full_name,ref_id,referred_by,is_vip,created_at,updated_at").limit(1000);
  let onboarded=0,checkups=0,upsells=0,rankChanges=0,badges=0;
  for (const p of profiles || []) {
    const { data: state } = await db.from("resofit_member_states").select("*").eq("user_id",p.id).maybeSingle();
    if (!state) {
      const { error } = await db.rpc("provision_member_state_internal",{p_user_id:p.id,p_canonical_name:p.full_name || p.ref_id || "Member"});
      if (!error) { onboarded++; await queueTask(p.id,"onboarding_follow_up","whatsapp",new Date(),90,{stage:"member",personalized:true}); }
    } else {
      if (Date.now()-new Date(state.updated_at).getTime() > 7*24*3600*1000) {
        if(await queueTask(p.id,"wellness_checkup","whatsapp",new Date(),80,{stage:state.current_phase,reason:"7_day_inactivity_window"})) checkups++;
      }
    }

    const { data: refs } = await db.from("referrals").select("referred_id").eq("referrer_id",p.id);
    const referralCount = refs?.length || 0;
    const ids = (refs||[]).map((x:any)=>x.referred_id).filter(Boolean);
    let sales30=0;
    if(ids.length){
      const cutoff=new Date(Date.now()-30*24*3600*1000).toISOString();
      const { data: s, error: salesError }=await db.from("payments").select("net_amount,gross_amount,amount").in("user_id",ids).eq("status","success").gte("paid_at",cutoff);
      if(salesError)throw new Error("member sales lookup failed: "+salesError.message);
      sales30=(s||[]).reduce((sum:any,x:any)=>sum+paymentNetNgn(x),0);
    }
    const rank=rankFor(sales30);
    const { data: prev }=await db.from("chatb2k_member_rank_state").select("rank_code").eq("user_id",p.id).maybeSingle();
    await db.from("chatb2k_member_rank_state").upsert({
      user_id:p.id,rank_code:rank.code,qualified_sales_30d:sales30,qualified_referrals_30d:referralCount,active_referrals:referralCount,
      commission_rate_bps:rank.rate,next_rank_code:rank.next,next_rank_threshold_ngn:rank.threshold,
      earning_potential_ngn:Math.round(sales30*rank.rate/10000),updated_at:new Date().toISOString()
    });
    if(!prev || prev.rank_code!==rank.code){
      rankChanges++;
      const { error: badgeError }=await db.from("chatb2k_member_badges").upsert({
        user_id:p.id,badge_code:"RANK_"+rank.code,label:"ChatB2K "+rank.code,
        metadata:{qualified_sales_30d:sales30,commission_rate_bps:rank.rate}
      },{onConflict:"user_id,badge_code"});
      if(!badgeError) badges++;
      await notify(p.id,"rank_upgrade","Your ChatB2K earning rank has updated",
        "Your current referral rank is "+rank.code+" with a configured commission rate of "+(rank.rate/100).toFixed(2)+"% on eligible referred revenue.",
        "/dashboard",{rank:rank.code,rate_bps:rank.rate});
    }
    if(referralCount>0) await queueTask(p.id,"referral_follow_up","whatsapp",new Date(),70,{direct_referrals:referralCount,rank:rank.code});
    const { data: recentPurchase }=await db.from("payments").select("id").eq("user_id",p.id).eq("status","success")
      .gte("created_at",new Date(Date.now()-30*24*3600*1000).toISOString()).limit(1);
    if(recentPurchase?.length){
      if(await queueTask(p.id,"personalized_upsell","whatsapp",new Date(Date.now()+3*24*3600*1000),60,{reason:"recent_purchase",rank:rank.code})) upsells++;
    }
    await db.from("chatb2k_funnel_states").upsert({
      actor_key:"user:"+p.id,actor_type:"member",user_id:p.id,stage:referralCount>0?"referrer":"member",
      previous_stage:null,intent_score:0,qualification_score:referralCount>0?100:50,last_action:"membership_cycle",
      next_best_action:referralCount>0?"referral_follow_up":"personalized_checkup",metadata:{is_vip:p.is_vip===true},updated_at:new Date().toISOString()
    });
  }
  return {profiles:profiles?.length||0,onboarded,checkups,upsells,rankChanges,badges};
}

async function syncRolesAndPartners() {
  let roleTasks=0,partnerTasks=0;
  const { data: roles }=await db.from("chatb2k_ecosystem_roles").select("*").eq("status","active").limit(1000);
  for(const r of roles||[]){
    if(r.role_code==="member") continue;
    if(await queueTask(r.user_id,"role_growth_follow_up","whatsapp",new Date(),75,{role:r.role_code,scope:r.scope_level,state:r.state,lga:r.lga})) roleTasks++;
    await notify(r.user_id,"network_upgrade","Network role active",
      "ChatB2K is tracking your "+r.role_code.replaceAll("_"," ")+" scope, activity, referrals and configured earning telemetry.",
      "/dashboard",{role:r.role_code});
  }
  const { data: partners }=await db.from("wellness_partner_leads").select("id,name,city,state,partnership_status,verification_status,email,phone")
    .eq("partnership_status","prospect").limit(100);
  for(const p of partners||[]){
    if(p.email || p.phone){
      if(await queueTask(null,"partner_outreach","system",new Date(),55,{partner_id:p.id,name:p.name,city:p.city,state:p.state,verification_status:p.verification_status})) partnerTasks++;
    }
  }
  return {active_roles:roles?.length||0,roleTasks,partnerTasks};
}

async function learn() {
  let learned=0, skipped=0;
  const { data: gaps }=await db.from("content_growth_gaps").select("platform,channel_id,gap_type,topic,evidence,recommended_action,priority_score,status").eq("status","open").order("priority_score",{ascending:false}).limit(50);
  const { data: recent }=await db.from("chatb2k_learning_events").select("platform,source,event_type,topic,observation,created_at").in("event_type",["search_gap_observed","performance_observed","channel_cycle"]).gte("created_at",new Date(Date.now()-48*3600*1000).toISOString()).order("created_at",{ascending:false}).limit(10000);
  const seen=new Set<string>();
  for(const e of recent||[]){
    const o:any=e.observation||{},i:any=o.intelligence||{};
    if(e.event_type==="performance_observed"){
      const post=i.buffer_post_id||i.post_id||i.content_id||"",metrics=i.metrics_updated_at||i.metricsUpdatedAt||"";
      seen.add(post?"performance:"+e.platform+":"+post+":"+metrics:"performance:"+e.platform+":"+JSON.stringify({channel_id:o.channel_id||i.channel_id||null,content_score:o.content_score,lead_intent_score:o.lead_intent_score,action:o.action,intelligence:i,evidence_status:o.evidence_status}));
    }else if(e.event_type==="search_gap_observed"){
      seen.add("gap:"+JSON.stringify({platform:e.platform,topic:e.topic,gap_type:o.gap_type,evidence:o.evidence,recommended_action:o.recommended_action,priority_score:o.priority_score}));
    }else if(e.event_type==="channel_cycle") seen.add("cycle:"+e.platform+":"+e.source);
  }
  for(const g of gaps||[]){
    const key="gap:"+JSON.stringify({platform:g.platform,topic:g.topic,gap_type:g.gap_type,evidence:g.evidence,recommended_action:g.recommended_action,priority_score:g.priority_score});
    if(seen.has(key)){skipped++;continue;}
    await db.from("chatb2k_learning_events").insert({platform:g.platform,source:"content_growth_gaps",event_type:"search_gap_observed",topic:g.topic,observation:{gap_type:g.gap_type,evidence:g.evidence,recommended_action:g.recommended_action,priority_score:g.priority_score},confidence:0.7,action:g.recommended_action});seen.add(key);learned++;
  }
  const { data: cross }=await db.from("cross_platform_growth_intelligence").select("platform,channel_id,content_score,lead_intent_score,action,intelligence,evidence_status,observed_at").order("observed_at",{ascending:false}).limit(100);
  for(const x of cross||[]){
    const i:any=x.intelligence||{},post=i.buffer_post_id||i.post_id||i.content_id||"",metrics=i.metrics_updated_at||i.metricsUpdatedAt||"";
    const key=post?"performance:"+x.platform+":"+post+":"+metrics:"performance:"+x.platform+":"+JSON.stringify({channel_id:x.channel_id,content_score:x.content_score,lead_intent_score:x.lead_intent_score,action:x.action,intelligence:i,evidence_status:x.evidence_status});
    if(seen.has(key)){skipped++;continue;}
    await db.from("chatb2k_learning_events").insert({platform:x.platform,source:"cross_platform_growth_intelligence",event_type:"performance_observed",observation:{channel_id:x.channel_id,content_score:x.content_score,lead_intent_score:x.lead_intent_score,action:x.action,intelligence:x.intelligence,evidence_status:x.evidence_status,observed_at:x.observed_at},confidence:x.evidence_status==="live_provider_telemetry"?0.95:0.5,action:x.action});seen.add(key);learned++;
  }
  for(const platform of ["tiktok","youtube","google_business","whatsapp","telegram"]){
    const key="cycle:"+platform+":"+(platform==="whatsapp"||platform==="telegram"?"conversation_channel_registry":"cross_platform_growth_intelligence");
    if(seen.has(key)){skipped++;continue;}
    await db.from("chatb2k_learning_events").insert({platform,source:(platform==="whatsapp"||platform==="telegram")?"conversation_channel_registry":"cross_platform_growth_intelligence",event_type:"channel_cycle",observation:{ingestion_mode:"evidence_first",metrics_inferred:false,search_gaps_logged:true},confidence:(platform==="whatsapp"||platform==="telegram")?0.4:0.9,action:"continue_ingest_compare_gap_log"});seen.add(key);learned++;
  }
  return learned;
}

async function processTikTokQueue(){const{data:rows,error:readError}=await db.from("payment_event_queue").select("id,request_id,paystack_reference,payload,attempts,processed_at").eq("event_type","tiktok_purchase").eq("status","pending").order("created_at",{ascending:true}).limit(20);if(readError)throw new Error("TikTok retry queue read failed: "+readError.message);const token=Deno.env.get("TIKTOK_EVENTS_API_TOKEN")??Deno.env.get("TIKTOK_EVENTS_API_ACCESS_TOKEN")??"";if(!token)return{scanned:rows?.length??0,sent:0,deferred:rows?.length??0,error:"missing_tiktok_events_token"};let sent=0,deferred=0,failed=0;for(const row of rows??[]){const attempts=Number(row.attempts??0),last=row.processed_at?new Date(row.processed_at).getTime():0,delay=Math.min(60,Math.pow(2,Math.max(0,attempts)))*60000;if(last&&Date.now()-last<delay){deferred++;continue;}const{data:claimed,error:claimError}=await db.from("payment_event_queue").update({status:"processing",attempts:attempts+1,processed_at:new Date().toISOString()}).eq("id",row.id).eq("status","pending").select("id").maybeSingle();if(claimError)throw new Error("TikTok queue claim failed: "+claimError.message);if(!claimed){deferred++;continue;}try{const response=await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/",{method:"POST",headers:{"Content-Type":"application/json","Access-Token":token},body:JSON.stringify(row.payload??{})});const body=await response.text();let parsed:any=null;try{parsed=JSON.parse(body)}catch{}if(response.ok&&parsed?.code===0){const{error}=await db.from("payment_event_queue").update({status:"completed",processed_at:new Date().toISOString(),last_error:null}).eq("id",row.id);if(error)throw error;sent++;}else{const terminal=attempts+1>=8,reason="TikTok HTTP "+response.status+"; code="+String(parsed?.code??"unknown")+"; "+String(parsed?.message??"delivery rejected").slice(0,180);const{error}=await db.from("payment_event_queue").update({status:terminal?"failed":"pending",processed_at:new Date().toISOString(),last_error:reason}).eq("id",row.id);if(error)throw error;failed++;}}catch(error){const terminal=attempts+1>=8;const{error:updateError}=await db.from("payment_event_queue").update({status:terminal?"failed":"pending",processed_at:new Date().toISOString(),last_error:String(error instanceof Error?error.message:error).slice(0,240)}).eq("id",row.id);if(updateError)throw updateError;failed++;}}return{scanned:rows?.length??0,sent,deferred,failed};}
async function run() {
  const now=new Date(); now.setUTCMinutes(Math.floor(now.getUTCMinutes()/5)*5,0,0); const runKey="chatb2k-membership-"+now.toISOString().slice(0,16);
  const { data: existing }=await db.from("chatb2k_automation_runs").select("id,status").eq("run_key",runKey).maybeSingle();
  if(existing) return {ok:true,duplicate:true,run_id:existing.id};
  const { data: runRow }=await db.from("chatb2k_automation_runs").insert({run_key:runKey,engine:"ChatB2K membership + referral + network + learning orchestrator"}).select("id").single();
  try {
    const attributions=await processPaymentAttributions();
    const members=await syncMembers();
    const network=await syncRolesAndPartners();
    const learned=await learn();
    const tiktokRetries=await processTikTokQueue();
    const report={ok:true,attributions,members,network,learning_events:learned,tiktok_retries:tiktokRetries,
      funnel:"qualified visitor → member → referrer → partner/distributor → investor/Sovereign 50/500",
      governance:"Discover → Assess → Recommend → Source → Convert → Fulfill → Follow Up → Upsell → Retain",
      commission_policy:"one-level direct referral; 30-day attribution; eligible net collected revenue; ₦5,000 minimum payout; 5% standard with category/tier increases up to 10%",
      channel_policy:["TikTok","YouTube","Google Business","WhatsApp","Telegram"],
      evidence_policy:"Provider-backed telemetry only; unavailable metrics are not inferred."
    };
    await db.from("chatb2k_automation_runs").update({status:"completed",completed_at:new Date().toISOString(),counts:{attributions,members,network,learned,tiktokRetries},report}).eq("id",runRow.id);
    return report;
  } catch(e) {
    await db.from("chatb2k_automation_runs").update({status:"error",completed_at:new Date().toISOString(),report:{error:e instanceof Error?e.message:String(e)}}).eq("id",runRow.id);
    throw e;
  }
}

async function automationKillReason(): Promise<{blocked:boolean;reason:string}> {
 const {data,error}=await db.from("chatb2k_control_plane").select("kill_switch_enabled,kill_switch_reason").eq("id",true).maybeSingle();
 if(error||!data)return {blocked:true,reason:"Control plane unavailable; automation paused"};
 return {blocked:data.kill_switch_enabled===true,reason:String(data.kill_switch_reason||"Orchestration globally paused")};
}
Deno.serve(async req=>{
  if(req.method!=="POST") return json({error:"POST required"},405);
  if(!authorized(req)) return json({error:"Unauthorized"},401);
  const gate=await automationKillReason();if(gate.blocked)return json({error:"CHATB2K_GLOBAL_KILL_SWITCH_ACTIVE",reason:gate.reason},503);
  try { return json(await run()); }
  catch(e) { return json({ok:false,error:e instanceof Error?e.message:String(e)},500); }
});
