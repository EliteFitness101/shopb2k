import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SECRET=Deno.env.get("BUFFER_CRON_SECRET")||Deno.env.get("CONTENT_CRON_SECRET")||"";
const out=(x:unknown,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});
function auth(r:Request){const x=r.headers.get("x-content-cron-secret")||r.headers.get("x-buffer-cron-secret")||"";return !!SECRET&&x===SECRET}
function mt(u:string,m:string=""){const x=u.toLowerCase(),z=m.toLowerCase();if(z.startsWith("video/")||/\.(mp4|mov|webm|m4v)(?:$|[?#])/.test(x)||x.includes("/video/"))return "video";if(z.startsWith("image/")||/\.(png|jpe?g|webp|avif|gif)(?:$|[?#])/.test(x)||x.includes("/image/"))return "image";return "unknown"}
function pqa(t:string){if(t==="video")return {tiktok:{eligible:true},youtube:{eligible:true,made_for_kids:null},google_business:{eligible:true}};if(t==="image")return {tiktok:{eligible:false,reason:"transformation required"},youtube:{eligible:true,surface:"community_image"},google_business:{eligible:true,surface:"business_photo_or_post"}};return {tiktok:{eligible:false},youtube:{eligible:false},google_business:{eligible:false}}}
function publicBlob(u:string){return /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(u)}
async function batch(rows:any[],source:string){if(!rows.length)return {source,rows:0};const r=await db.from("content_asset_registry").upsert(rows,{onConflict:"source_provider,source_asset_id"});return {source,rows:rows.length,error:r.error?String((r.error as any).message||r.error):null}}
async function verifyPublicAsset(url:string,expectedType:string){
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),10000);
 try{let r=await fetch(url,{method:"HEAD",signal:controller.signal,redirect:"follow"}); if(!r.ok)r=await fetch(url,{headers:{Range:"bytes=0-0"},signal:controller.signal,redirect:"follow"});
 const ct=(r.headers.get("content-type")||"").toLowerCase(); const ok=r.ok&&((expectedType==="video"&&ct.startsWith("video/"))||(expectedType==="image"&&ct.startsWith("image/")));
 return {ok,status:r.status,content_type:ct,final_url:r.url||url};
 }catch(e){return {ok:false,status:0,content_type:"",final_url:url,error:e instanceof Error?e.message:String(e)}} finally{clearTimeout(timer)}
}
async function automationKillReason(): Promise<{blocked:boolean;reason:string}> {
 const {data,error}=await db.from("chatb2k_control_plane").select("kill_switch_enabled,kill_switch_reason").eq("id",true).maybeSingle();
 if(error||!data)return {blocked:true,reason:"Control plane unavailable; automation paused"};
 return {blocked:data.kill_switch_enabled===true,reason:String(data.kill_switch_reason||"Orchestration globally paused")};
}
Deno.serve(async req=>{
 if(req.method!=="POST")return out({error:"POST required"},405);
 if(!auth(req))return out({error:"Unauthorized"},401);
 const gate=await automationKillReason();if(gate.blocked)return out({error:"CHATB2K_GLOBAL_KILL_SWITCH_ACTIVE",reason:gate.reason},503);
 try{
  const b:any=await req.json().catch(()=>({})); const limit=Math.min(Math.max(Number(b.limit||500),1),500); const reports:any[]=[];
  const DISCOVERY_URL=Deno.env.get("ASSET_DISCOVERY_URL")||"https://resofit.fit/api/content/assets";
  async function syncResoFlexVault(limit:number){
   let assets:any[]=[]; let discoveredAt=new Date().toISOString();
   try{
    const r=await fetch(DISCOVERY_URL,{headers:{"accept":"application/json"},redirect:"follow"});
    if(!r.ok) throw new Error("Blob discovery failed: "+r.status);
    const payload:any=await r.json();
    if(!payload?.ok||!Array.isArray(payload.assets)) throw new Error("Blob discovery returned invalid payload");
    discoveredAt=String(payload.discovered_at||discoveredAt);
    assets=payload.assets.slice(0,Math.min(limit,500));
   }catch(discoveryError){
    const fallback=await db.from("asset_manifest").select("blob_pathname").like("blob_pathname","buffer/assets/ResoFlex_Vault/%").limit(Math.min(limit,500));
    if(fallback.error) throw new Error("Blob discovery failed and registry fallback failed: "+String(fallback.error.message));
    assets=(fallback.data||[]).map((a:any)=>{const pathname=String(a.blob_pathname||"").replace(/^\//,"");return {url:"https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/"+pathname,pathname,filename:pathname.split("/").pop()||pathname,asset_type:mt(pathname),folder:"buffer/assets/ResoFlex_Vault/",discovery_fallback:true}});
   }
   const rows:any[]=[]; const rejected:any[]=[];
   for(const a of assets){const url=String(a.url||""),t=String(a.asset_type||""); if(!publicBlob(url)||!["video","image"].includes(t)){rejected.push({url,reason:"public_blob_or_type_policy"});continue}
    if(a.discovery_fallback){
      rows.push({source_provider:"vercel_blob_resoflex_vault",source_asset_id:String(a.pathname),source_url:url,canonical_url:url,brand:"ResoFlex",campaign:"ResoFlex_Vault",asset_type:t,mime_type:t==="video"?"video/mp4":t==="image"?"image/jpeg":null,rights_status:"public_blob_source",commercial_status:"source_verified",qa_status:"pending",qa_reason:"Registry fallback; public Vercel Blob URL structurally verified; external fetch deferred",content_pillar:"ResoFlex_Vault",platform_qa:pqa(t),intelligence:{source_table:"asset_manifest",pathname:a.pathname,filename:a.filename,discovery_fallback:true,discovered_at:discoveredAt}});
      continue;
    }
    const v=await verifyPublicAsset(url,t); if(!v.ok){rejected.push({url,reason:"public_fetch_verification_failed",status:v.status,error:v.error});continue}
    rows.push({source_provider:"vercel_blob_resoflex_vault",source_asset_id:String(a.pathname),source_url:url,canonical_url:v.final_url||url,brand:"ResoFlex",campaign:"ResoFlex_Vault",asset_type:t,mime_type:v.content_type,rights_status:"public_blob_source",commercial_status:"source_verified",qa_status:"verified",qa_reason:"Public Vercel Blob asset discovered and externally fetched by ingestion",content_pillar:"ResoFlex_Vault",platform_qa:pqa(t),verified_at:new Date().toISOString(),intelligence:{source_table:"vercel_blob",pathname:a.pathname,filename:a.filename,size:a.size,uploaded_at:a.uploaded_at,etag:a.etag||null,discovered_at:discoveredAt}});
   }
   return {discovery_url:DISCOVERY_URL,discovered:assets.length,verified:rows.length,rejected:rejected.length,rejected_samples:rejected.slice(0,10),registry:await batch(rows,"vercel_blob_resoflex_vault"),fallback_supported:true};
  }
  try{reports.push({source:"vercel_blob_resoflex_vault",...(await syncResoFlexVault(limit))})}catch(e){reports.push({source:"vercel_blob_resoflex_vault",ok:false,error:e instanceof Error?e.message:String(e)})}
  const m=await db.from("martial_asset_registry").select("id,asset_name,blob_url,brand,default_pillar,visual_description").order("created_at",{ascending:true}).limit(limit);
  if(m.error)reports.push({source:"martial_asset_registry",error:m.error.message}); else {const rows=(m.data||[]).filter((a:any)=>publicBlob(String(a.blob_url||""))).map((a:any)=>{const t=mt(a.blob_url||"");return {source_provider:"martial_asset_registry",source_asset_id:String(a.id),source_url:a.blob_url,canonical_url:a.blob_url,brand:a.brand,campaign:a.brand,asset_type:t,mime_type:t==="image"?"image/jpeg":t==="video"?"video/mp4":null,rights_status:"unknown",commercial_status:"unknown",qa_status:"pending",qa_reason:"Source synchronized; public Blob URL verified by source policy; platform QA required",content_pillar:a.default_pillar,visual_summary:a.visual_description,platform_qa:pqa(t),intelligence:{source_table:"martial_asset_registry",asset_name:a.asset_name}}}); reports.push(await batch(rows,"martial_asset_registry"))}
  const am=await db.from("asset_manifest").select("id,blob_pathname,handle,campaign_type,platform,status,notes,title,caption,destination,keywords,safety_checked").order("id",{ascending:true}).limit(limit);
  if(am.error)reports.push({source:"asset_manifest",error:am.error.message}); else {const rows=(am.data||[]).filter((a:any)=>a.blob_pathname).map((a:any)=>{const raw=String(a.blob_pathname);const t=mt(raw);return {source_provider:"asset_manifest",source_asset_id:String(a.id),source_url:raw,canonical_url:publicBlob(raw)?raw:null,brand:/martial/i.test(String(a.campaign_type||""))?"Martial-X":"ResoFit",campaign:a.campaign_type,asset_type:t,rights_status:"unknown",commercial_status:"unknown",qa_status:a.status==="approved"?"pending":"hold",qa_reason:a.status==="approved"?"Manifest-approved; public source and platform/rights QA required":"Manifest not approved",content_pillar:a.campaign_type,platform_qa:pqa(t),intelligence:{source_table:"asset_manifest",handle:a.handle,source_platform:a.platform,notes:a.notes,title:a.title,caption:a.caption,destination:a.destination,keywords:a.keywords,safety_checked:a.safety_checked}}}); reports.push(await batch(rows,"asset_manifest"))}
  const c=await db.from("resofit_catalog_assets").select("id,asset_id,sku,canonical_url,filename,role,image_type,alt_text,mime_type,width,height,file_size,source_batch,social_ready,web_ready").order("id",{ascending:true}).limit(limit);
  if(c.error)reports.push({source:"resofit_catalog_assets",error:c.error.message}); else {const rows=(c.data||[]).map((a:any)=>{const t=mt(a.canonical_url||"",a.mime_type||"");return {source_provider:"resofit_catalog_assets",source_asset_id:String(a.id),source_url:a.canonical_url,canonical_url:a.canonical_url,brand:"ResoFit",campaign:a.source_batch,asset_type:t,mime_type:a.mime_type,width:a.width,height:a.height,aspect_ratio:a.width&&a.height?String(a.width)+":"+String(a.height):null,audio_present:t==="image"?false:null,rights_status:"source_catalog",commercial_status:"catalog_use",qa_status:a.social_ready?"pending":"hold",qa_reason:a.social_ready?"Catalog synchronized; social QA required":"Not marked social_ready",alt_text:a.alt_text,content_pillar:a.role||a.image_type,platform_qa:pqa(t),intelligence:{source_table:"resofit_catalog_assets",asset_id:a.asset_id,sku:a.sku,filename:a.filename,role:a.role,image_type:a.image_type,file_size:a.file_size,social_ready:a.social_ready,web_ready:a.web_ready}}}); reports.push(await batch(rows,"resofit_catalog_assets"))}
  const mu=await db.from("music_library").select("id,blob_pathname,title,asset_type,status,metadata").order("id",{ascending:true}).limit(limit);
  if(mu.error)reports.push({source:"music_library",error:mu.error.message}); else {const rows=(mu.data||[]).map((a:any)=>({source_provider:"music_library",source_asset_id:String(a.id),source_url:a.blob_pathname,canonical_url:a.blob_pathname,brand:"shared",asset_type:"audio",rights_status:a.status==="approved"?"library_approved":"unknown",commercial_status:"unknown",qa_status:"hold",qa_reason:"Platform-specific commercial music rights verification required",platform_qa:{tiktok:{music_status:"hold"},youtube:{music_status:"hold"},google_business:{music_status:"not_applicable"}},intelligence:{source_table:"music_library",title:a.title,asset_type:a.asset_type,status:a.status,metadata:a.metadata}})); reports.push(await batch(rows,"music_library"))}
  return out({ok:true,reports,policy:"No binary migration; existing public Vercel Blob source URLs are preserved",next:"ChatB2K/Gemini enrichment and platform-specific QA"});
 }catch(e){return out({ok:false,error:e instanceof Error?e.message:String(e)},500)}
});