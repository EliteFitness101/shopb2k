import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CRON_SECRET=Deno.env.get("BUFFER_CRON_SECRET")||""; const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
async function cronSecret(){if(CRON_SECRET)return CRON_SECRET;const {data,error}=await supabase.rpc("get_buffer_cron_secret");if(error||!data)throw Error("BUFFER_CRON_SECRET unavailable");return String(data);}
const LOCKED_BUFFER_ORG="6a7cfd9705e59fe6e2a3bf71";
const LOCKED_CHANNELS={tiktok:"6ab33e0aea19ca0bdebf46ff",youtube:"6a7d4ae7b2d9d577436a9c08",tiktok_recruit:"6a7cfe5ab2d9d57743686cc5",linkedin:"6ac1a8c2abf1a9f92cb7e1fc"} as Record<string,string>;
async function sameSecret(a:string,b:string){const e=new TextEncoder();const[x,y]=await Promise.all([crypto.subtle.digest("SHA-256",e.encode(a)),crypto.subtle.digest("SHA-256",e.encode(b))]);const aa=new Uint8Array(x),bb=new Uint8Array(y);let d=aa.length^bb.length;for(let i=0;i<aa.length;i++)d|=aa[i]^bb[i];return d===0}
async function authorized(req:Request){const c=req.headers.get("x-buffer-cron-secret")??req.headers.get("x-content-cron-secret")??"";if(c){try{const expected=await cronSecret();if(expected&&await sameSecret(c,expected))return true}catch{}}const a=req.headers.get("authorization")??"";const b=a.startsWith("Bearer ")?a.slice(7):"";return Boolean(SERVICE_ROLE&&b&&await sameSecret(b,SERVICE_ROLE))}
async function bufferKey(){const {data,error}=await supabase.rpc("get_buffer_access_token");if(error||!data)throw Error("BUFFER_ACCESS_TOKEN unavailable");return String(data)}
async function gql(query:string,variables:Record<string,unknown>){const token=await bufferKey();const r=await fetch("https://api.buffer.com",{method:"POST",headers:{"content-type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({query,variables})});const t=await r.text();let j:any;try{j=JSON.parse(t)}catch{throw Error(`Buffer non-JSON HTTP ${r.status}`)}if(!r.ok||j.errors?.length)throw Error(JSON.stringify(j.errors??j));return j.data}
async function discoverChannels(){const q=`query{account{organizations{id name}}}`;const a=await gql(q,{});const orgs=Array.isArray(a?.account?.organizations)?a.account.organizations:[];if(!orgs.some((o:any)=>String(o?.id)===LOCKED_BUFFER_ORG))throw Error("Buffer organization mismatch: locked ResoFit organization not owned by Vault token");const c=await gql(`query($organizationId:OrganizationId!){channels(input:{organizationId:$organizationId}){id name displayName service isQueuePaused isDisconnected isLocked}}`,{organizationId:LOCKED_BUFFER_ORG});return {organizationId:LOCKED_BUFFER_ORG,channels:Array.isArray(c?.channels)?c.channels:[]}}
async function resolveChannel(platform:string,item:any){const {organizationId,channels}=await discoverChannels();const service=platform==="youtube"?"youtube":platform==="google_business"?"googlebusiness":platform==="linkedin"?"linkedin":platform==="pinterest"?"pinterest":"tiktok";let candidates=channels.filter((c:any)=>String(c.service).toLowerCase()===service&&!c.isDisconnected&&!c.isLocked);if(platform==="tiktok"||platform==="youtube"||platform==="tiktok_recruit"||platform==="linkedin"){const targetId=LOCKED_CHANNELS[platform];const target=candidates.filter((c:any)=>c.id===targetId);return {organizationId,channel:target.length===1?target[0]:null,reason:target.length===1?"locked_channel_verified_live":"locked_channel_not_found_or_unavailable"};}if(platform==="google_business"){const targetId=String(item?.metadata?.buffer_channel_id||item?.destination||"").trim();if(targetId){const target=candidates.filter((c:any)=>c.id===targetId);return {organizationId,channel:target.length===1?target[0]:null,reason:target.length===1?"explicit_google_business_channel_verified":"google_business_target_not_found_or_unavailable"};}return {organizationId,channel:candidates.length===1?candidates[0]:null,reason:candidates.length===1?"single_google_business_channel_verified":"google_business_channel_id_required"};}const flowLock=String(item?.metadata?.destination_lock||"");if(flowLock==="tiktok:resonancefitness"&&service==="tiktok"){const target=candidates.filter((c:any)=>`${c.name||""} ${c.displayName||""}`.toLowerCase().replace(/[^a-z0-9]/g,"").includes("resonancefitness"));if(target.length!==1)return {organizationId,channel:null,reason:target.length===0?"flow_resonancefitness_channel_not_found":"flow_resonancefitness_channel_ambiguous"};candidates=target;}if(!candidates.length)return {organizationId,channel:null,reason:"no_connected_channel"};if(platform==="tiktok_recruit"){const hint=String(item?.metadata?.channel_selector||"recruitment").toLowerCase();const preferred=candidates.filter((c:any)=>`${c.name||""} ${c.displayName||""}`.toLowerCase().replace(/[^a-z0-9]/g,"").includes("resoflex2"));if(preferred.length===1)return {organizationId,channel:preferred[0],reason:"recruitment_channel_preferred"};const scored=candidates.map((c:any)=>{const label=`${c.name||""} ${c.displayName||""}`.toLowerCase();let score=0;for(const k of hint.split(/[^a-z0-9]+/).filter(Boolean))if(label.includes(k))score+=3;for(const k of ["recruit","resonance","elite","bigo"])if(label.includes(k))score+=1;if(c.isQueuePaused)score-=5;return {c,score}}).sort((a:any,b:any)=>b.score-a.score);return {organizationId,channel:scored[0]?.c||null,reason:"dynamic_channel_discovery"}}return {organizationId,channel:candidates.find((c:any)=>!c.isQueuePaused)||candidates[0],reason:"dynamic_channel_discovery"}}
const BLOB_HOST_SUFFIX=".public.blob.vercel-storage.com";
const isPublicMedia=(u:string)=>{try{const x=new URL(u);const blob=x.hostname.endsWith(BLOB_HOST_SUFFIX)&&x.hostname.length>BLOB_HOST_SUFFIX.length&&x.pathname.length>1;const dropbox=x.hostname==="www.dropbox.com"&&/^\/scl\/fi\/[A-Za-z0-9_-]+\/[^/]+$/.test(x.pathname)&&/^[A-Za-z0-9_-]+$/.test(x.searchParams.get("rlkey")||"")&&x.searchParams.get("dl")==="1";return x.protocol==="https:"&&(blob||dropbox)}catch{return false}};
const isVideo=(u:string)=>/^https?:\/\//i.test(u)&&/(?:\.mp4(?:$|[?#])|\.mov(?:$|[?#])|\/video\/)/i.test(u);
const isImage=(u:string)=>/^https?:\/\//i.test(u)&&/(?:\.jpg(?:$|[?#])|\.jpeg(?:$|[?#])|\.png(?:$|[?#])|\.webp(?:$|[?#])|\.heic(?:$|[?#]))/i.test(u);
async function validatePublicVideo(u:string){try{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);let r:Response;try{r=await fetch(u,{method:"HEAD",redirect:"follow",signal:controller.signal})}finally{clearTimeout(timer)}const contentType=String(r.headers.get("content-type")||"").toLowerCase();const length=Number(r.headers.get("content-length")||0);const typeOk=!contentType||contentType.startsWith("video/")||contentType==="application/octet-stream";return {ok:r.ok&&typeOk&&(!length||length>0),status:r.status,contentType,contentLength:length||null}}catch(e){return {ok:false,status:0,contentType:"",contentLength:null,reason:e instanceof Error?e.message:"media_head_request_failed"}}}
function platformQa(item:any,platform:string){const qaPlatform=platform==="tiktok_recruit"?"tiktok":platform; const q=item?.metadata?.platform_qa?.[qaPlatform];if(q&&q.status&&q.status!=="pass")return {ok:false,reason:String(q.reason||"platform QA not passed")};return {ok:true};}
Deno.serve(async req=>{if(req.method!=="POST")return Response.json({error:"POST required"},{status:405});if(!(await authorized(req)))return Response.json({error:"Unauthorized"},{status:401});const b=await req.json().catch(()=>({}));if(b?.diagnostic===true){try{const d=await discoverChannels();const channels=await Promise.all((d.channels||[]).filter((c:any)=>!c.isDisconnected&&!c.isLocked).map(async(c:any)=>({id:c.id,name:c.name,displayName:c.displayName,service:c.service,isQueuePaused:c.isQueuePaused,daily:null})));return Response.json({ok:true,organization_id:d.organizationId,channels,source:"buffer-live-discovery"});}catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:502})}}try{const {data:item,error}=await supabase.from("content_queue").select("*").eq("id",b.id).eq("status","approved").single();if(error)throw error;if(!item)return Response.json({ok:true,message:"Queue item not approved"});const platform=String(item.platform||item.platforms?.[0]||"").trim();if(platform!=="tiktok"&&platform!=="youtube"&&platform!=="tiktok_recruit"&&platform!=="google_business"&&platform!=="linkedin")return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"platform_disabled_production"});const {data:settings,error:settingsError}=await supabase.from("content_automation_settings").select("paused,scheduler_enabled").eq("id",true).single();if(settingsError)throw settingsError;if(settings?.paused||settings?.scheduler_enabled===false)return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:settings?.paused?"automation_paused":"scheduler_disabled"});const {data:globalRateLimit,error:globalRateLimitError}=await supabase.from("content_publish_log").select("created_at,error_message,platform,channel_id").eq("provider","buffer").eq("status","rate_limited").ilike("error_message","%RATE_LIMIT_EXCEEDED%").order("created_at",{ascending:false}).limit(1).maybeSingle();if(globalRateLimitError)throw globalRateLimitError;if(globalRateLimit?.created_at){const globalLockAge=Date.now()-new Date(globalRateLimit.created_at).getTime();if(globalLockAge<24*60*60*1000)return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"buffer_global_rate_limit_backoff",retry_after_seconds:Math.ceil((24*60*60*1000-globalLockAge)/1000)});}const resolved=await resolveChannel(platform,item);const channel=resolved.channel?.id?.trim();if(!channel)return Response.json({ok:true,queue_id:item.id,platform,message:"No eligible Buffer channel",reason:resolved.reason});if(resolved.channel?.isQueuePaused)return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"buffer_queue_paused"});const qa=platformQa(item,platform);if(!qa.ok)return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:qa.reason});
if(platform==="tiktok"||platform==="youtube"){
 const assetUrl=String(item.asset_url??"").trim();
 const meta=item?.metadata||{};
 const assetId=String(meta.asset_id||"").trim();
 const sourceAssetId=String(meta.source_asset_id||item.public_id||"").trim();
 let registry:any=null;
 if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId)){
  const lookup=await supabase.from("content_asset_registry").select("id,source_asset_id,canonical_url,rights_status,commercial_status,qa_status,tiktok_eligible,youtube_eligible,platform_qa").eq("id",assetId).maybeSingle();
  if(lookup.error)throw lookup.error;registry=lookup.data;
 }
 if(!registry&&sourceAssetId){
  const lookup=await supabase.from("content_asset_registry").select("id,source_asset_id,canonical_url,rights_status,commercial_status,qa_status,tiktok_eligible,youtube_eligible,platform_qa").eq("source_asset_id",sourceAssetId).maybeSingle();
  if(lookup.error)throw lookup.error;registry=lookup.data;
 }
 if(!registry&&assetUrl){
  const lookup=await supabase.from("content_asset_registry").select("id,source_asset_id,canonical_url,rights_status,commercial_status,qa_status,tiktok_eligible,youtube_eligible,platform_qa").eq("canonical_url",assetUrl).maybeSingle();
  if(lookup.error)throw lookup.error;registry=lookup.data;
 }
 if(!registry)return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"content_asset_registry_record_required"});
 if(String(registry.canonical_url||"").trim()!==assetUrl)return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"asset_url_does_not_match_canonical_registry"});
 const rights=String(registry.rights_status||"").toLowerCase();
 if(!["owned","licensed","permission_granted","original_owned","public_domain"].includes(rights))return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"rights_or_originality_not_verified",asset_id:registry.id});
 const commercial=String(registry.commercial_status||"").toLowerCase();
 if(!["approved","eligible","cleared"].includes(commercial))return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"commercial_use_not_cleared",asset_id:registry.id});
 if(String(registry.qa_status||"").toLowerCase()!=="approved")return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"asset_quality_review_not_approved",asset_id:registry.id});
 const pqa=registry.platform_qa?.[platform];
 const eligible=platform==="tiktok"?(registry.tiktok_eligible===true||pqa?.eligible===true):(registry.youtube_eligible===true||pqa?.eligible===true);
 if(!eligible)return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"asset_not_cleared_for_destination_platform",asset_id:registry.id});
}
const {data:channelConfig,error:channelConfigError}=await supabase.from("buffer_channels").select("daily_limit,active").eq("channel_id",channel).maybeSingle();if(channelConfigError)throw channelConfigError;if(channelConfig?.active===false)return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"channel_disabled"});const startOfDay=new Date();startOfDay.setHours(0,0,0,0);const {count:dailyCount,error:dailyCountError}=await supabase.from("content_publish_log").select("id",{count:"exact",head:true}).eq("provider","buffer").eq("platform",platform).eq("channel_id",channel).gte("created_at",startOfDay.toISOString());if(dailyCountError)throw dailyCountError;if(channelConfig?.daily_limit!=null&&Number(dailyCount||0)>=Number(channelConfig.daily_limit))return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"daily_limit_reached",daily_count:Number(dailyCount||0),daily_limit:Number(channelConfig.daily_limit)});
const {data:lastRateLimit}=await supabase.from("content_publish_log").select("created_at").eq("provider","buffer").eq("platform",platform).eq("channel_id",channel).eq("status","rate_limited").ilike("error_message","%RATE_LIMIT_EXCEEDED%").order("created_at",{ascending:false}).limit(1).maybeSingle();
if(lastRateLimit?.created_at){
 const lockAge=Date.now()-new Date(lastRateLimit.created_at).getTime();
 if(lockAge<24*60*60*1000)return Response.json({
   ok:true,queue_id:item.id,platform,status:"held",reason:"buffer_rate_limit_backoff",
   retry_after_seconds:Math.ceil((24*60*60*1000-lockAge)/1000)
 });
}
const text=String(item.caption??item.title??"").trim();if(!text){const {data:held,error:holdError}=await supabase.from("content_queue").update({status:"draft",error_message:"Held for caption repair: missing caption/title"}).eq("id",item.id).eq("status","approved").select("id,status").maybeSingle();if(holdError)throw holdError;return Response.json({ok:true,queue_id:item.id,platform,status:held?.status??"held",reason:"missing_caption_title",action:"returned_to_draft_for_repair"});}const u=String(item.asset_url??"").trim();const textOnlyAllowed=(platform==="linkedin"||platform==="google_business")&&!u;if(!isPublicMedia(u)&&!textOnlyAllowed)throw Error("Public allowlisted media URL required (Vercel Blob or Dropbox shared link); LinkedIn and Google Business text-only posts may omit media");if((platform==="tiktok"||platform==="youtube")&&isVideo(u)){const mediaCheck=await validatePublicVideo(u);if(!mediaCheck.ok)return Response.json({ok:true,queue_id:item.id,platform,status:"held",reason:"public_video_media_validation_failed",media_status:mediaCheck.status,content_type:mediaCheck.contentType||null,validation_reason:mediaCheck.reason||null});}const input:any={channelId:channel,text,schedulingType:"automatic",mode:"addToQueue",source:"resofit-content-engine",aiAssisted:true};if(platform==="google_business"){if(u){if(!isImage(u))throw Error("Google Business updates require a public image URL");input.assets=[{image:{url:u}}];}input.metadata={google:{type:"whats_new",detailsWhatsNew:{button:"learn_more",link:String(item.destination||"https://www.resofit.fit")}}};}else if(platform==="linkedin"){if(isImage(u))input.assets=[{image:{url:u}}];else if(isVideo(u))input.assets=[{video:{url:u}}];else if(u)throw Error("LinkedIn media must be a public image or video URL");}else if(isVideo(u)){input.assets=[{video:{url:u}}];input.metadata=platform==="youtube"?{youtube:{title:String(item.title??text).trim(),categoryId:"17",privacy:"public",notifySubscribers:true,embeddable:true,isAiGenerated:true}}:{tiktok:{isAiGenerated:true}};}else if(platform==="tiktok_recruit"&&isImage(u)){input.assets=[{image:{url:u}}];}else throw Error(platform==="youtube"?"Queue item needs a public video URL":"Queue item needs public video or image media");const m=`mutation CreatePost($input: CreatePostInput!){createPost(input:$input){... on PostActionSuccess{post{id dueAt status channelId}} ... on MutationError{message}}}`;const r=await gql(m,{input}),p=r?.createPost?.post;if(!p?.id)throw Error(typeof r?.createPost?.message==="string"?r.createPost.message:JSON.stringify(r?.createPost||r));const{data:up,error:ue}=await supabase.from("content_queue").update({status:"scheduled",buffer_post_ids:{[platform]:p.id},error_message:null}).eq("id",item.id).eq("status","approved").select("id,status,buffer_post_ids").single();if(ue)throw ue;await supabase.from("content_publish_log").insert({queue_id:item.id,platform,channel_id:channel,provider:"buffer",provider_post_id:p.id,status:"scheduled"});
// Additive revenue-campaign fan-out: once Buffer accepts the campaign, create idempotent Telegram child jobs and immediately hand them to the existing social publisher.
let telegramFanout:any[]=[];let telegramFanoutErrors:any[]=[];
try{if(item?.metadata?.fanout_to_telegram===true){
  const{data:tds,error:te}=await supabase.from("social_destinations").select("id,provider,platform,external_channel_id,active").eq("provider","telegram").eq("active",true);
  if(te) throw te;
  for(const d of (tds||[])){
    const idem=`fanout:${item.id}:${d.id}`;
    const{data:existing}=await supabase.from("social_publish_attempts").select("id,queue_id,status").eq("idempotency_key",idem).maybeSingle();
    let childId=existing?.queue_id;
    if(!childId){const{data:priorChild}=await supabase.from("content_queue").select("id").eq("metadata->>fanout_idempotency_key",idem).maybeSingle();childId=priorChild?.id;}
    if(!childId){
      const{data:child,error:ce}=await supabase.from("content_queue").insert({
        sku:item.sku,title:item.title,asset_url:item.asset_url,public_id:item.public_id,caption:item.caption,
        platform:d.platform||"telegram",destination:d.external_channel_id,status:"approved",scheduled_at:item.scheduled_at,
        metadata:{...(item.metadata||{}),source_queue_id:item.id,social_destination_id:d.id,distribution_fanout:true,fanout_idempotency_key:idem,source_platform:platform}
      }).select("id").single();
      if(ce){telegramFanoutErrors.push({destination_id:d.id,error:String(ce.message||ce)});continue;}
      childId=child.id;
      const{error:ae}=await supabase.from("social_publish_attempts").insert({
        queue_id:childId,provider:"telegram",platform:d.platform||"telegram",destination_id:d.id,
        idempotency_key:idem,status:"queued",attempt_count:0,response_metadata:{source_queue_id:item.id,buffer_post_id:p.id}
      });
      if(ae){telegramFanoutErrors.push({destination_id:d.id,error:String(ae.message||ae)});continue;}
    }
    try{
      const secret=await cronSecret();
      const sr=await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/social-publisher`,{
        method:"POST",headers:{"content-type":"application/json","x-social-cron-secret":secret},
        body:JSON.stringify({id:childId})
      });
      const sj=await sr.json().catch(()=>({}));
      telegramFanout.push({destination_id:d.id,queue_id:childId,status:sj?.status||"queued",message_id:sj?.message_id||null});
    }catch(e){telegramFanoutErrors.push({destination_id:d.id,queue_id:childId,error:e instanceof Error?e.message:String(e)});}
  }
}
}catch(fanoutError){telegramFanoutErrors.push({stage:"fanout",error:fanoutError instanceof Error?fanoutError.message:String(fanoutError)});}
return Response.json({ok:true,queue_id:item.id,platform,buffer_post_id:p.id,status:up?.status,dueAt:p.dueAt,telegramFanout,telegramFanoutErrors})}catch(e){
 const message=e instanceof Error?e.message:String(e);
 const id=b?.id;
 let transient=false;
 if(id){
   const {data:qrow}=await supabase.from("content_queue").select("platform").eq("id",id).maybeSingle();
   const errorText=message.toLowerCase();
   transient =
     errorText.includes("rate_limit") ||
     errorText.includes("rate limit") ||
     errorText.includes("scheduled posts limit") ||
     errorText.includes("too many requests") ||
     errorText.includes("throttl") ||
     errorText.includes("http 429") ||
     errorText.includes("http 500") ||
     errorText.includes("http 502") ||
     errorText.includes("http 503") ||
     errorText.includes("timeout") ||
     errorText.includes("temporarily");
   const logPlatform=String(qrow?.platform||b?.platform||"unknown");
   const logChannel =
     b?.channel_id ||
     (logPlatform==="tiktok_recruit"?"6a7cfe5ab2d9d57743686cc5":
      logPlatform==="tiktok"?"6ab33e0aea19ca0bdebf46ff":
      logPlatform==="youtube"?"6a7d4ae7b2d9d577436a9c08":null);
   await supabase.from("content_publish_log").insert({
     queue_id:id,platform:logPlatform,channel_id:logChannel,provider:"buffer",
     status:transient?"rate_limited":"failed",error_message:message
   });
   if(!transient){
     await supabase.from("content_queue").update({status:"failed",error_message:message}).eq("id",id).eq("status","approved");
   }
 }
 console.error(e);
 return Response.json({ok:false,error:message,status:transient?"held":"failed"},{status:transient?429:500});
}})