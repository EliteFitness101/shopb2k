import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SECRET=Deno.env.get("BUFFER_CRON_SECRET")||Deno.env.get("CONTENT_CRON_SECRET")||"";
const MODEL="gemini-3.1-flash-lite";
const HOST="ab2ttlkn9no0tuoa.public.blob.vercel-storage.com";
const PREFIX="/buffer/assets/";
const channels=["tiktok","tiktok_recruit","youtube"] as const;
const bad=/\b(cure|miracle|guaranteed|instant|rapid[- ]?loss|diagnose|diagnosis|steroid|drug|suicide|self[- ]?harm|porn|weapon|violence|hate|fabricated|fake testimonial)\b/i;

const mediaOk=(u:string)=>{try{const x=new URL(u);return x.protocol==="https:"&&x.hostname===HOST&&x.pathname.startsWith(PREFIX)}catch{return false}};
const out=(x:unknown,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});
const authorized=(r:Request)=>!!SECRET&&(r.headers.get("x-content-cron-secret")||r.headers.get("x-buffer-cron-secret"))===SECRET;

async function gemini(facts:any){const key=Deno.env.get("GEMINI_API_KEY");if(!key)return {ok:false,reason:"GEMINI_API_KEY_missing"};const model=MODEL;const {data:reservation,error:reservationError}=await db.rpc("chatb2k_reserve_gemini_request",{p_function_name:"resofit-ecosystem-autopilot",p_model:model,p_estimated_tokens:8000});if(reservationError||!reservation)return {ok:false,reason:"gemini_admission_limit"};const prompt=`You are ChatB2K, ResoFit content intelligence. Transform only the verified facts below. Never invent price, availability, services, products, locations, testimonials, earnings, discounts, partnerships or URLs. Return JSON: title,caption,search_topics,platform_copy. Avoid medical claims, guarantees, body shaming and unsupported outcomes.`+JSON.stringify(facts);let r:Response;try{r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:"POST",headers:{"x-goog-api-key":key,"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:.4}})})}catch(e){await db.rpc("chatb2k_release_gemini_request",{p_id:String(reservation)});return {ok:false,reason:"Gemini_network_error"}}if(!r.ok){await db.rpc("chatb2k_release_gemini_request",{p_id:String(reservation)});await db.from("chatb2k_gemini_usage").insert({function_name:"resofit-ecosystem-autopilot",model,operation:"generate_content",status:"error",http_status:r.status,total_tokens:0,estimated_cost_usd:0,metadata:{reservation_id:reservation,retry_disabled:true,free_tier_model:true}});return {ok:false,reason:`Gemini_HTTP_${r.status}`}}const j=await r.json();const t=j?.candidates?.[0]?.content?.parts?.map((x:any)=>x.text||"").join("")||"";let data:any;try{data=JSON.parse(t)}catch{await db.rpc("chatb2k_release_gemini_request",{p_id:String(reservation)});return {ok:false,reason:"Gemini_JSON_parse_failed"}}if(bad.test(JSON.stringify(data))){await db.rpc("chatb2k_release_gemini_request",{p_id:String(reservation)});return {ok:false,reason:"safety_keyword_gate"}}await db.from("chatb2k_gemini_usage").insert({function_name:"resofit-ecosystem-autopilot",model,operation:"generate_content",status:"success",input_tokens:Number(j?.usageMetadata?.promptTokenCount||0),output_tokens:Number(j?.usageMetadata?.candidatesTokenCount||0),total_tokens:Number(j?.usageMetadata?.totalTokenCount||0),estimated_cost_usd:0,metadata:{reservation_id:reservation,free_tier:true,provider_admission:"atomic",retry_disabled:true}});await db.rpc("chatb2k_release_gemini_request",{p_id:String(reservation)});return {ok:true,data}}
async function run(){
 const [src,prod,well,assets]=await Promise.all([
  db.from("resofit_ecosystem_source_registry").select("theme,canonical_url,runtime_status,runtime_ok,content_type,verified_at").eq("runtime_ok",true),
  db.from("products").select("id,handle,title,sku,variant_price,variant_inventory_qty,published,product_type,tags,image_src").eq("published",true).limit(12),
  db.from("resofit_network_directory").select("id,slug,name,entity_type,city,state,services,capabilities,verification_status,status,last_verified_at").eq("status","active").eq("verification_status","verified").limit(30),
  db.from("content_asset_registry").select("id,source_asset_id,canonical_url,asset_type,mime_type,qa_status,rights_status,commercial_status,platform_qa,brand,campaign,content_pillar,alt_text").eq("qa_status","approved").in("rights_status",["owned","licensed","permission_granted","original_owned","public_domain"]).in("commercial_status",["approved","eligible","cleared"]).limit(50)
 ]);
 const urls=(src.data||[]).map((x:any)=>({theme:x.theme,url:x.canonical_url,status:x.runtime_status,ok:x.runtime_ok,verified_at:x.verified_at}));
 const media=(assets.data||[]).filter((a:any)=>mediaOk(String(a.canonical_url||"")));
 const rawProducts=prod.data||[]; const productAsset=(assets.data||[]).find((a:any)=>a.qa_status==="approved"&&String(a.campaign||"").toLowerCase().includes("verified-product")&&mediaOk(String(a.canonical_url||""))); const p=rawProducts.find((x:any)=>productAsset&&String(productAsset.alt_text||"").toLowerCase().includes(String(x.handle||"").toLowerCase()))||null;
 const mak=(well.data||[]).find((x:any)=>x.slug==="makaveli-wellness-hub-aba");
 const v=(theme:string)=>urls.find((x:any)=>x.theme===theme&&x.ok);
 const opp:any[]=[];
 if(v("RESOFIT_SHOP")&&p)opp.push({theme:"FEATURED_PRODUCT",url:v("RESOFIT_SHOP").url,angle:"verified catalog product discovery",facts:{title:p.title,sku:p.sku,price_ngn:p.variant_price,inventory_qty:p.variant_inventory_qty??null,product_type:p.product_type}});
 if(v("MAKAVELI_BOOKING")&&mak?.services?.length)opp.push({theme:"MAKAVELI_WELLNESS",url:v("MAKAVELI_BOOKING").url,angle:"verified wellness booking",facts:{provider:mak.name,city:mak.city,state:mak.state,services:mak.services}});
 if(v("CHATB2K_ASSESSMENT"))opp.push({theme:"CHATB2K_ASSESSMENT",url:v("CHATB2K_ASSESSMENT").url,angle:"personalized assessment",facts:{destination:v("CHATB2K_ASSESSMENT").url}});
 if(v("RESET"))opp.push({theme:"RESET",url:v("RESET").url,angle:"wellness reset destination",facts:{destination:v("RESET").url}});
 if(v("MARTIAL_X_APPLY"))opp.push({theme:"MARTIAL_X_APPLY",url:v("MARTIAL_X_APPLY").url,angle:"application conversion",facts:{destination:v("MARTIAL_X_APPLY").url}});
 if(v("MARTIAL_X"))opp.push({theme:"MARTIAL_X",url:v("MARTIAL_X").url,angle:"Martial-X ecosystem",facts:{destination:v("MARTIAL_X").url}});
 if(v("RESOFIT_ABOUT"))opp.push({theme:"RESOFIT_BRAND_AUTHORITY",url:v("RESOFIT_ABOUT").url,angle:"brand authority",facts:{destination:v("RESOFIT_ABOUT").url}});
 if(!media.length){
 const targets=[
  {platform:"linkedin",channelId:"6ac1a8c2abf1a9f92cb7e1fc",fallbackFlag:"media_omitted_for_linkedin_text_fallback"},
  {platform:"google_business",channelId:"6ac1a651ea19ca0bde6c881a",fallbackFlag:"media_omitted_for_google_business_text_fallback"},
  {platform:"google_business",channelId:"6ac1a651ea19ca0bde6c881b",fallbackFlag:"media_omitted_for_google_business_text_fallback"}
 ];
 const since=new Date(Date.now()-7*24*60*60*1000).toISOString();
 const prior=await db.from("content_queue").select("metadata,created_at").eq("campaign_key","ecosystem-autopilot-text").in("status",["approved","scheduled","published"]).gte("created_at",since).limit(100);
 if(prior.error)return {ok:false,created:0,held:opp.length,reason:"text_only_dedupe_query_failed"};
 const used=new Set((prior.data||[]).map((x:any)=>String(x.metadata?.theme||"")));
 const o=opp.find((x:any)=>!used.has(x.theme));
 if(!o)return {ok:true,created:0,held:opp.length,reason:"All verified text-only themes already queued for the current 7-day window",verified_sources:urls.length,opportunities:opp.map(x=>x.theme)};
 const existing=await db.from("content_opportunities").select("id").eq("platform","ecosystem_autopilot").eq("intent","conversion").eq("topic",o.theme).eq("canonical_url",o.url).limit(1);
 if(existing.data?.length)await db.from("content_opportunities").update({hook:o.angle,pov:"verified ecosystem facts only",cta:"Open verified destination",status:"open",updated_at:new Date().toISOString()}).eq("id",existing.data[0].id);
 else await db.from("content_opportunities").insert({platform:"ecosystem_autopilot",intent:"conversion",topic:o.theme,hook:o.angle,pov:"verified ecosystem facts only",canonical_url:o.url,cta:"Open verified destination",status:"open"});
 const g=await gemini({brand:"ResoFit",campaign:"ecosystem-autopilot-text",theme:o.theme,destination:o.url,facts:o.facts,platforms:["linkedin","google_business"],market:"Nigeria",content_gap:"Practical, culturally relevant wellness education; no unsupported product claims.",instruction:"Write distinct, useful copy for LinkedIn and Google Business Profile. Include a clear, non-pushy next step. Never invent local services, prices, stock, testimonials or outcomes."});
 if(!g.ok)return {ok:true,created:0,held:1,reason:g.reason,theme:o.theme,verified_sources:urls.length};
 const e=g.data;const rows:any[]=[];
 for(let i=0;i<targets.length;i++){
  const target=targets[i];const pc=e.platform_copy?.[target.platform]||{};let caption=String(pc.caption||e.caption||`${o.angle}. Explore the verified destination: ${o.url}`).trim();
  if(!caption.includes(o.url))caption+=`\n\nExplore: ${o.url}`;
  if(!caption||bad.test(caption))continue;
  rows.push({title:String(e.title||o.theme).slice(0,180),asset_url:"",public_id:null,caption,platforms:[target.platform],status:"approved",scheduled_at:new Date(Date.now()+30*60000+i*45*60000).toISOString(),campaign_key:"ecosystem-autopilot-text",platform:target.platform,destination:o.url,keywords:Array.isArray(e.search_topics)?e.search_topics.slice(0,12):[],safety_checked:true,content_variant:1,metadata:{engine:"ChatB2K ecosystem autopilot",gemini_model:MODEL,theme:o.theme,verified_snapshot_at:new Date().toISOString(),text_only_fallback:true,[target.fallbackFlag]:true,...(target.platform==="google_business"?{buffer_channel_id:target.channelId}:{}),referral_enabled:false,referral_reason:"Commission terms not configured; no earnings claim."}});
 }
 if(!rows.length)return {ok:true,created:0,held:1,reason:"Text-only copy failed safety or content validation",theme:o.theme};
 const ins=await db.from("content_queue").insert(rows).select("id,platform,scheduled_at,destination");
 if(ins.error)return {ok:true,created:0,held:1,reason:"text_only_queue_insert_failed",error:ins.error.message,theme:o.theme};
 return {ok:true,created:ins.data?.length??0,held:0,theme:o.theme,queue_ids:(ins.data||[]).map((x:any)=>x.id),verified_sources:urls.length,approved_media:media.length,text_only_fallback:true,targets:targets.map((x:any)=>({platform:x.platform,channelId:x.channelId}))};
}
 const matching=(o:any)=>media.find((a:any)=>{const p=String(a.content_pillar||"").toLowerCase(),c=String(a.campaign||"").toLowerCase();if(o.theme==="FEATURED_PRODUCT")return c.includes("verified-product")||p.includes("pull")||p.includes("product");if(o.theme.startsWith("MARTIAL"))return c.includes("martial")||p.includes("martial");if(o.theme==="MAKAVELI_WELLNESS"||o.theme==="RESET")return c.includes("wellness")||p.includes("wellness");if(o.theme==="CHATB2K_ASSESSMENT")return p.includes("chatb2k")||p.includes("assessment");return p.includes("ecosystem")||c.includes("ecosystem")});
 const o=opp.find(x=>matching(x)); if(o){const ex=await db.from("content_opportunities").select("id").eq("platform","ecosystem_autopilot").eq("intent","conversion").eq("topic",o.theme).eq("canonical_url",o.url).limit(1);if(ex.data?.length)await db.from("content_opportunities").update({hook:o.angle,pov:"verified ecosystem facts only",cta:"Open verified destination",status:"open",updated_at:new Date().toISOString()}).eq("id",ex.data[0].id);else await db.from("content_opportunities").insert({platform:"ecosystem_autopilot",intent:"conversion",topic:o.theme,hook:o.angle,pov:"verified ecosystem facts only",canonical_url:o.url,cta:"Open verified destination",status:"open"});} if(!o)return {ok:true,created:0,held:opp.length,reason:"No content-appropriate approved media",verified_sources:urls.length,approved_media:media.length};
 const asset=matching(o); const g=await gemini({brand:"ResoFit",campaign:"ecosystem-autopilot-2026",theme:o.theme,destination:o.url,facts:o.facts,platforms:channels}); if(!g.ok)return {ok:true,created:0,held:1,reason:g.reason,theme:o.theme};
 const e=g.data; const rows:any[]=[]; const eligible=channels.filter(x=>asset.platform_qa?.[x]?.eligible===true || (x==="tiktok_recruit" && asset.platform_qa?.tiktok?.eligible===true));
 for(const platform of eligible){const pc=e.platform_copy?.[platform]||{};const caption=String(pc.caption||e.caption||`${o.angle}. Explore the verified ResoFit destination: ${o.url}`).trim();if(!caption||bad.test(caption))continue;rows.push({title:String(e.title||o.theme).slice(0,180),asset_url:asset.canonical_url,public_id:asset.source_asset_id,caption,platforms:[platform],status:"approved",scheduled_at:new Date(Date.now()+30*60000+rows.length*45*60000).toISOString(),campaign_key:"ecosystem-autopilot-2026",platform,destination:o.url,keywords:Array.isArray(e.search_topics)?e.search_topics.slice(0,12):[],safety_checked:true,content_variant:1,metadata:{engine:"ChatB2K ecosystem autopilot",gemini_model:MODEL,theme:o.theme,verified_snapshot_at:new Date().toISOString(),platform_qa:asset.platform_qa?.[platform],asset_id:asset.id,referral_enabled:false,referral_reason:"Commission terms not configured; no earnings claim."}})}
 if(!rows.length)return {ok:true,created:0,held:1,reason:"No eligible platform for selected asset",theme:o.theme};
 const ins=await db.from("content_queue").insert(rows).select("id,platform,scheduled_at,destination"); if(ins.error)return {ok:true,created:0,held:1,reason:"queue_insert_failed",error:ins.error.message,theme:o.theme};
 return {ok:true,created:ins.data?.length??0,held:0,theme:o.theme,queue_ids:(ins.data||[]).map((x:any)=>x.id),verified_sources:urls.length,approved_media:media.length};
}

Deno.serve(async req=>{if(req.method!=="POST")return out({error:"POST required"},405);if(!authorized(req))return out({error:"Unauthorized"},401);try{return out(await run())}catch(e){return out({ok:false,error:e instanceof Error?e.message:String(e)},500)}});
