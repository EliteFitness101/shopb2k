import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SECRET=Deno.env.get("BUFFER_CRON_SECRET")||Deno.env.get("CONTENT_CRON_SECRET")||"";
const MODEL="gemini-3.1-flash-lite";
const bad=/\b(cure|miracle|guaranteed|instant|rapid[- ]?loss|diagnose|diagnosis|steroid|drug|suicide|self[- ]?harm|porn|weapon|hate|fabricated|fake testimonial)\b/i;
const out=(x:unknown,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});
const authorized=(r:Request)=>!!SECRET&&(r.headers.get("x-content-cron-secret")||r.headers.get("x-buffer-cron-secret"))===SECRET;
async function gemini(source:any){
 const key=Deno.env.get("GEMINI_API_KEY"); if(!key)return {ok:false,reason:"GEMINI_API_KEY_missing"};
 const prompt=["You are ChatB2K Story Intelligence for ResoFit.","Transform ONLY the supplied canonical source into a short-form story episode.","Do not invent facts, people, dates, locations, achievements, testimonials, prices, URLs or outcomes.","Preserve uncertainty. Do not make medical, financial or legal claims.","Return JSON only with: episode_title, hook, teaser, short_caption, long_caption, cta, hashtags, keywords, duration_seconds, narration, scene_plan.","scene_plan must be an array of objects with start,end,visual,on_screen_text,narration.","Target 35-60 seconds, vertical social video, strong first 2 seconds, concise captions, documentary tone.",JSON.stringify(source)].join("\n");
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:"POST",headers:{"x-goog-api-key":key,"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:.35}})});
 if(!r.ok)return {ok:false,reason:`Gemini_HTTP_${r.status}`}; const j=await r.json(); const text=j?.candidates?.[0]?.content?.parts?.map((x:any)=>x.text||"").join("")||"";
 let data:any;try{data=JSON.parse(text)}catch{return {ok:false,reason:"Gemini_JSON_parse_failed"}} if(bad.test(JSON.stringify(data)))return {ok:false,reason:"safety_keyword_gate"}; return {ok:true,data};
}
async function run(){
 const {data:sources,error}=await db.from("story_sources").select("id,story_key,title,source_text,canonical_url,privacy_level,publication_status").eq("publication_status","approved").eq("privacy_level","public").order("updated_at",{ascending:true}).limit(20);
 if(error)throw error;if(!sources?.length)return {ok:true,created:0,reason:"no approved public story sources"};
 const {data:existing}=await db.from("story_episodes").select("story_source_id");const used=new Set((existing||[]).map((x:any)=>x.story_source_id));
 const source=sources.find((x:any)=>!used.has(x.id))||sources[0]; const g=await gemini(source);if(!g.ok)return {ok:true,created:0,held:1,reason:g.reason,source_id:source.id};
 const e=g.data, scenePlan=Array.isArray(e.scene_plan)?e.scene_plan:[];
 const insert={story_source_id:source.id,episode_title:String(e.episode_title||source.title).slice(0,180),hook:String(e.hook||"").slice(0,500),teaser:String(e.teaser||"").slice(0,1200),short_caption:String(e.short_caption||"").slice(0,2200),long_caption:String(e.long_caption||"").slice(0,5000),cta:String(e.cta||"").slice(0,500),hashtags:Array.isArray(e.hashtags)?e.hashtags.slice(0,15).map(String):[],keywords:Array.isArray(e.keywords)?e.keywords.slice(0,20).map(String):[],scene_plan:scenePlan,script:String(e.narration||"").slice(0,8000),duration_seconds:Math.max(20,Math.min(90,Number(e.duration_seconds)||45)),generation_model:MODEL,generation_status:"generated",qa_status:"passed_source_only",media_status:"pending",publication_status:"draft",metadata:{engine:"ChatB2K Story Intelligence",source_url:source.canonical_url,source_key:source.story_key,generated_at:new Date().toISOString(),truth_mode:"canonical-source-only"}};
 const {data:row,error:insErr}=await db.from("story_episodes").insert(insert).select("*").single();if(insErr)throw insErr;
 await db.from("story_renders").insert({episode_id:row.id,render_type:"captioned_mp4",render_status:"pending",metadata:{renderer:"FFmpeg",target:"1080x1920",fps:30,codec:"H.264/AAC"}});
 return {ok:true,created:1,episode:row,source};
}
async function automationKillReason(): Promise<{blocked:boolean;reason:string}> {
 const {data,error}=await db.from("chatb2k_control_plane").select("kill_switch_enabled,kill_switch_reason").eq("id",true).maybeSingle();
 if(error||!data)return {blocked:true,reason:"Control plane unavailable; automation paused"};
 return {blocked:data.kill_switch_enabled===true,reason:String(data.kill_switch_reason||"Orchestration globally paused")};
}
Deno.serve(async req=>{if(req.method!=="POST")return out({error:"POST required"},405);if(!authorized(req))return out({error:"Unauthorized"},401);const gate=await automationKillReason();if(gate.blocked)return out({error:"CHATB2K_GLOBAL_KILL_SWITCH_ACTIVE",reason:gate.reason},503);try{return out(await run())}catch(e){return out({ok:false,error:e instanceof Error?e.message:String(e)},500)}});