import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const out=(x:unknown,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
async function adminUser(req:Request){
 const auth=req.headers.get("authorization")||""; if(!auth.startsWith("Bearer ")) return null;
 const {data:{user}}=await db.auth.getUser(auth.slice(7)); if(!user) return null;
 const {data:roles}=await db.from("user_roles").select("role").eq("user_id",user.id);
 const email=(user.email||"").toLowerCase(); const allowed=email==="ceo@resofit.fit"||(roles||[]).some((r:any)=>["admin","moderator"].includes(String(r.role||"")));
 return allowed?user:null;
}
const PRODUCT_ROUTE_BASE="https://www.resofit.fit/product/";
function buildSpec(p:any){
 const sku=String(p.sku),title=String(p.title),handle=String(p.handle),destination=PRODUCT_ROUTE_BASE+handle;
 const facts={sku,title,product_type:p.product_type,fulfillment_mode:p.fulfillment_mode,canonical_destination:destination};
 const common="ResoFlex powered by Resonance Fitness. Use only the supplied product facts. Do not invent testimonials, medical outcomes, discounts, stock claims, delivery promises or features not present in the product record. Keep the product as the subject; use cinematic wellness-commerce storytelling.";
 const prompt=(x:string)=>common+" "+x+" Destination: "+destination+"."; 
 return {provider:"google_flow",source_of_truth:"public.products",product:facts,generation_policy:{no_replacement:true,media_origin:"Google Flow / Veo / Flow image generation",external_generation_required:true,ingest_target:"content_asset_registry",qa_target:"content-intelligence-enricher",publishing_target:"existing content_queue / Buffer pipeline"},asset_slots:[
  {role:"hero_video",type:"video",required:true,aspect_ratio:"9:16",duration_seconds:8,prompt:prompt("Create a premium vertical hero clip for \""+title+"\". Show a clear wellness/product context, polished Nigerian/African lifestyle aesthetic, confident but truthful visual storytelling. End with a clean visual moment suitable for a CTA overlay.")},
  {role:"problem_solution_video",type:"video",required:true,aspect_ratio:"9:16",duration_seconds:8,prompt:prompt("Create an 8-second vertical problem-to-solution visual story for \""+title+"\". Show the user context and product/program concept without claiming guaranteed results. No before/after transformation claims.")},
  {role:"product_cover",type:"image",required:true,aspect_ratio:"1:1",prompt:prompt("Create a premium square cover image representing \""+title+"\" as a digital wellness product. Minimal clean composition, strong subject hierarchy, room for title text overlay, no fake badges or pricing.")},
  {role:"lifestyle_image",type:"image",required:true,aspect_ratio:"4:5",prompt:prompt("Create a premium lifestyle image for \""+title+"\" showing an authentic Nigerian/African wellness context. Natural, aspirational, practical, non-medical.")},
  {role:"education_video",type:"video",required:true,aspect_ratio:"9:16",duration_seconds:8,prompt:prompt("Create an educational vertical clip explaining visually what \""+title+"\" is for and how it fits into a wellness journey. No diagnosis, treatment or guaranteed outcome claims.")},
  {role:"cta_video",type:"video",required:true,aspect_ratio:"9:16",duration_seconds:8,prompt:prompt("Create a clean vertical conversion clip for \""+title+"\". Focus on curiosity, clarity and the next step. Do not display invented price, discount, availability or unsupported claims.")},
  {role:"social_support_image",type:"image",required:false,aspect_ratio:"9:16",prompt:prompt("Create a vertical social support image for \""+title+"\" that can accompany a truthful caption. Strong composition, premium ResoFlex visual language, no unsupported text.")}
 ]};
}
async function invokeMediaGenerator(action:string,jobId:string){
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!key)return out({ok:false,error:"internal_signing_key_missing"},500);
 const ts=String(Math.floor(Date.now()/1000));
 const data=new TextEncoder().encode(ts+"."+action+"."+jobId);
 const cryptoKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const mac=await crypto.subtle.sign("HMAC",cryptoKey,data);
 const signature=Array.from(new Uint8Array(mac)).map(x=>x.toString(16).padStart(2,"0")).join("");
 const base=Deno.env.get("SUPABASE_URL")||"";
 const r=await fetch(base+"/functions/v1/digital-product-media-generator",{method:"POST",headers:{"content-type":"application/json","x-resofit-factory-ts":ts,"x-resofit-factory-signature":signature,"x-resofit-factory-action":action,"x-resofit-factory-job":jobId},body:JSON.stringify({action,job_id:jobId})});
 const text=await r.text();let dataOut:any=null;try{dataOut=JSON.parse(text)}catch(e){console.error("media-generator-response-parse-failed",e instanceof Error?e.message:"unknown");}
 if(!r.ok||dataOut?.ok===false)return out({ok:false,error:"media_generator_dispatch_failed",status:r.status,action,job_id:jobId,detail:dataOut||text.slice(0,500)},502);
 return out({ok:true,action,job_id:jobId,generator:dataOut});
}
async function latestVersion(sku:string){const {data}=await db.from("digital_product_factory_jobs").select("version").eq("product_sku",sku).order("version",{ascending:false}).limit(1).maybeSingle();return Number(data?.version||0)+1;}
async function run(req:Request){
 const user=await adminUser(req); if(!user)return out({ok:false,error:"forbidden"},403);
 const body:any=await req.json().catch(()=>({})); const action=String(body.action||"status"); if(action==="start_generation"){const gate=await automationKillReason();if(gate.blocked)return out({ok:false,error:"CHATB2K_GLOBAL_KILL_SWITCH_ACTIVE",reason:gate.reason},503);}
 if(action==="start_generation"||action==="poll_generation"){
  const jobId=String(body.job_id||"").trim();if(!jobId)return out({ok:false,error:"job_id_required"},400);
  const {data:job,error}=await db.from("digital_product_factory_jobs").select("id,product_sku,provider,status,generation_spec").eq("id",jobId).maybeSingle();
  if(error||!job)return out({ok:false,error:"job_not_found"},404);
  const configuredProvider=String((job.generation_spec as any)?.provider||job.provider||"").toLowerCase();
  if(configuredProvider!=="gemini_api"&&configuredProvider!=="gemini")return out({ok:false,error:"provider_route_mismatch",job_id:jobId,configured_provider:configuredProvider,available_adapter:"gemini_api",next_action:"Use a Google Flow-specific adapter for this job or explicitly create a Gemini API job; no cross-provider fallback is performed."},409);
  return await invokeMediaGenerator(action==="start_generation"?"start":"poll",jobId);
 }
 if(action==="create_job"){
  const sku=String(body.product_sku||"").trim(); if(!sku)return out({ok:false,error:"product_sku_required"},400);
  const {data:p,error}=await db.from("products").select("id,sku,handle,title,variant_price,product_type,fulfillment_mode,published,tags").eq("sku",sku).maybeSingle();
  if(error||!p)return out({ok:false,error:"product_not_found"},404);
  if(p.published!==true||String(p.fulfillment_mode||"").toLowerCase()!=="digital")return out({ok:false,error:"factory_accepts_published_digital_products_only"},409);
  const version=await latestVersion(sku),spec=buildSpec(p);
  const {data:job,error:insertError}=await db.from("digital_product_factory_jobs").insert({product_id:p.id,product_sku:p.sku,product_title:p.title,provider:"google_flow",status:"ready_for_generation",version,generation_spec:spec,package_spec:{package_type:"digital_product_media_package",roles:spec.asset_slots.map((x:any)=>x.role),delivery_source:"existing entitlement + storefront-delivery architecture; no payment replacement"},created_by:user.id}).select("id,product_sku,product_title,provider,status,version,generation_spec,package_spec,created_at").single();
  if(insertError)return out({ok:false,error:insertError.message},500); return out({ok:true,job});
 }
 if(action==="status"){
  const sku=String(body.product_sku||"").trim(); let q=db.from("digital_product_factory_jobs").select("id,product_sku,product_title,provider,status,version,asset_count,approved_asset_count,published_at,created_at,updated_at").order("created_at",{ascending:false}).limit(100);
  if(sku)q=q.eq("product_sku",sku); const {data,error}=await q; if(error)return out({ok:false,error:error.message},500);
  const ids=(data||[]).map((x:any)=>x.id); const {data:assets}=ids.length?await db.from("digital_product_factory_assets").select("job_id,content_asset_id,role,required,status").in("job_id",ids):{data:[]}; return out({ok:true,jobs:data||[],assets:assets||[]});
 }
 if(action==="attach_asset"){
  const jobId=String(body.job_id||"").trim(),assetId=String(body.content_asset_id||"").trim(),role=String(body.role||"").trim();
  if(!jobId||!assetId||!role)return out({ok:false,error:"job_id_content_asset_id_role_required"},400);
  const {data:job}=await db.from("digital_product_factory_jobs").select("id,product_sku,generation_spec,status").eq("id",jobId).maybeSingle(); if(!job)return out({ok:false,error:"job_not_found"},404);
  const {data:asset}=await db.from("content_asset_registry").select("id,canonical_url,asset_type,qa_status,platform_qa,brand,campaign,content_pillar").eq("id",assetId).maybeSingle(); if(!asset)return out({ok:false,error:"content_asset_not_found"},404);
  const slot=((job.generation_spec as any)?.asset_slots||[]).find((x:any)=>x.role===role); if(!slot)return out({ok:false,error:"role_not_in_job_spec"},409); if(slot.type!==asset.asset_type)return out({ok:false,error:"asset_type_mismatch"},409);
  const status=asset.qa_status==="approved"?"approved":"qa_hold"; const {data:row,error}=await db.from("digital_product_factory_assets").upsert({job_id:jobId,content_asset_id:assetId,role,required:slot.required,status},{onConflict:"job_id,content_asset_id,role"}).select().single();
  if(error)return out({ok:false,error:error.message},500);
  const {count}=await db.from("digital_product_factory_assets").select("id",{count:"exact",head:true}).eq("job_id",jobId); const {count:approved}=await db.from("digital_product_factory_assets").select("id",{count:"exact",head:true}).eq("job_id",jobId).eq("status","approved");
  await db.from("digital_product_factory_jobs").update({asset_count:count||0,approved_asset_count:approved||0,status:(approved||0)>0?"qa":"awaiting_ingest"}).eq("id",jobId); return out({ok:true,asset:row,asset_count:count||0,approved_asset_count:approved||0});
 }
 if(action==="approve_job"){
  const jobId=String(body.job_id||"").trim(); const {data:job}=await db.from("digital_product_factory_jobs").select("id,generation_spec").eq("id",jobId).maybeSingle(); if(!job)return out({ok:false,error:"job_not_found"},404);
  const slots=(job.generation_spec as any)?.asset_slots||[]; const {data:assets}=await db.from("digital_product_factory_assets").select("role,status,required").eq("job_id",jobId);
  const missing=slots.filter((s:any)=>s.required&&!assets?.some((a:any)=>a.role===s.role&&a.status==="approved")).map((s:any)=>s.role); if(missing.length)return out({ok:false,error:"required_assets_missing_or_not_approved",missing},409);
  await db.from("digital_product_factory_jobs").update({status:"approved",approved_at:new Date().toISOString()}).eq("id",jobId); return out({ok:true,status:"approved",next:"existing digital fulfillment/storefront delivery remains unchanged; publish mapping is a separate explicit step"});
 }
 return out({ok:false,error:"unsupported_action"},400);
}
async function automationKillReason(): Promise<{blocked:boolean;reason:string}> {
 const {data,error}=await db.from("chatb2k_control_plane").select("kill_switch_enabled,kill_switch_reason").eq("id",true).maybeSingle();
 if(error||!data)return {blocked:true,reason:"Control plane unavailable; automation paused"};
 return {blocked:data.kill_switch_enabled===true,reason:String(data.kill_switch_reason||"Orchestration globally paused")};
}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors}); const r=await run(req); const headers=new Headers(r.headers); Object.entries(cors).forEach(([k,v])=>headers.set(k,v)); return new Response(r.body,{status:r.status,headers});});