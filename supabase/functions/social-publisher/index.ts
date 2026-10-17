import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cron=Deno.env.get("BUFFER_CRON_SECRET")||"";
const same=async(a:string,b:string)=>{const e=new TextEncoder();const[x,y]=await Promise.all([crypto.subtle.digest("SHA-256",e.encode(a)),crypto.subtle.digest("SHA-256",e.encode(b))]);const A=new Uint8Array(x),B=new Uint8Array(y);let d=0;for(let i=0;i<A.length;i++)d|=A[i]^B[i];return d===0};
const auth=async(r:Request)=>{const h=r.headers.get("x-social-cron-secret")||r.headers.get("x-buffer-cron-secret")||"";return !!cron&&await same(h,cron)};
const vault=async(name:string)=>{const {data,error}=await db.rpc("get_social_secret",{p_name:name});if(error||!data)throw Error("secret_unavailable:"+name);return String(data)};
const tg=async(token:string,method:string,body:any)=>{const r=await fetch("https://api.telegram.org/bot"+token+"/"+method,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error("telegram_"+method+":"+String(j.description||r.status));return j.result};

const tgUpload=async(token:string,method:string,chatId:string,url:string,caption:string,field:string)=>{
 const asset=await fetch(url);
 if(!asset.ok)throw Error("asset_fetch_http_"+asset.status);
 const blob=await asset.blob();
 if(blob.size===0)throw Error("asset_fetch_empty");
 const path=new URL(url).pathname;
 const filename=path.split("/").pop()||("resofit-media"+(field==="photo"?".jpg":field==="video"?".mp4":".bin"));
 const form=new FormData();
 form.set("chat_id",chatId);
 form.set(field,blob,filename);
 if(caption)form.set("caption",caption.slice(0,1024));
 const r=await fetch("https://api.telegram.org/bot"+token+"/"+method,{method:"POST",body:form});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||!j.ok)throw Error("telegram_"+method+":"+String(j.description||r.status));
 return j.result;
};
const mediaType=(u:string)=>{if(/\.(mp4|mov|m4v)(\?|$)/i.test(u))return "video";if(/\.(jpg|jpeg|png|webp|heic)(\?|$)/i.test(u))return "photo";return "document"};

async function automationKillReason(): Promise<{blocked:boolean;reason:string}> {
 const {data,error}=await db.from("chatb2k_control_plane").select("kill_switch_enabled,kill_switch_reason").eq("id",true).maybeSingle();
 if(error||!data)return {blocked:true,reason:"Control plane unavailable; automation paused"};
 return {blocked:data.kill_switch_enabled===true,reason:String(data.kill_switch_reason||"Orchestration globally paused")};
}
Deno.serve(async req=>{
 if(req.method!=="POST")return Response.json({error:"POST required"},{status:405});
 if(!(await auth(req)))return Response.json({error:"Unauthorized"},{status:401});
 const gate=await automationKillReason();if(gate.blocked)return Response.json({error:"CHATB2K_GLOBAL_KILL_SWITCH_ACTIVE",reason:gate.reason},{status:503});
 const b=await req.json().catch(()=>({}));
 try{
  const {data:settings}=await db.from("content_automation_settings").select("paused,scheduler_enabled").eq("id",true).single();
  if(settings?.paused||settings?.scheduler_enabled===false)return Response.json({ok:true,status:"paused"});
  // Additive bot-identity reconciliation: verify protected Telegram bot tokens without activating unresolved destinations.
  try{
   const {data:botRows}=await db.from("social_destinations").select("id,auth_secret_ref,metadata,last_verified_at,active").eq("provider","telegram");
   for(const d of (botRows||[]).filter((x:any)=>x.metadata?.target_type==="bot_identity")){
    const stale=!d.last_verified_at || (Date.now()-new Date(d.last_verified_at).getTime()>6*60*60*1000);
    if(!stale)continue;
    try{const token=await vault(d.auth_secret_ref);const me=await tg(token,"getMe",{});const expected=String(d.metadata?.bot_username||"").toLowerCase();const actual=String(me.username||"").toLowerCase();const state=expected&&expected===actual?"bot_identity_verified":"bot_identity_mismatch";await db.from("social_destinations").update({last_verified_at:new Date().toISOString(),metadata:{...(d.metadata||{}),bot_username:me.username,bot_id:me.id,verification_state:state}}).eq("id",d.id)}catch(e){await db.from("social_destinations").update({last_verified_at:new Date().toISOString(),metadata:{...(d.metadata||{}),verification_state:"bot_identity_check_failed",verification_error:e instanceof Error?e.message:String(e)}}).eq("id",d.id)}
   }
  }catch(_e){}
  if(b.diagnostic){
   const {data:ds}=await db.from("social_destinations").select("id,provider,platform,external_channel_id,display_name,active,auth_secret_ref,last_verified_at,capabilities");
   const out:any[]=[];
   for(const d of ds||[]){
    let state="not_checked";
    if(d.provider==="telegram"&&d.auth_secret_ref){
     try{const token=await vault(d.auth_secret_ref);const me=await tg(token,"getMe",{});const botTarget=d.metadata?.target_type==="bot_identity";
       if(botTarget){state=(String(me.username||"").toLowerCase()===String(d.metadata?.bot_username||"").toLowerCase())?"bot_identity_verified":"bot_identity_mismatch";await db.from("social_destinations").update({last_verified_at:new Date().toISOString(),metadata:{...(d.metadata||{}),bot_username:me.username,bot_id:me.id,verification_state:state}}).eq("id",d.id)}
       else {const chat=await tg(token,"getChat",{chat_id:d.external_channel_id});const admins=await tg(token,"getChatMember",{chat_id:d.external_channel_id,user_id:me.id});state=(admins?.status==="administrator"&&admins?.can_post_messages!==false)?"verified":"bot_not_authorized_to_post";await db.from("social_destinations").update({last_verified_at:new Date().toISOString(),metadata:{...(d.metadata||{}),bot_username:me.username,chat_title:chat.title,verification_state:state}}).eq("id",d.id)}
     }catch(e){state=e instanceof Error?e.message:"verification_failed"}
    } else if(d.provider==="whatsapp") state="native_or_business_api_requires_supported_provider";
    out.push({id:d.id,provider:d.provider,platform:d.platform,display_name:d.display_name,active:d.active,state});
   }
   return Response.json({ok:true,destinations:out});
  }
  if(b.fanout){
   const {data:destinations}=await db.from("social_destinations").select("*").eq("active",true);
   const targets=(destinations||[]).filter((d:any)=>d.provider==="telegram"&&d.metadata?.verification_state==="verified");
   if(!targets.length)return Response.json({ok:true,created:0,reason:"no_active_telegram_or_whatsapp_destinations"});
   const {data:src,error:se}=await db.from("content_queue").select("*").eq("status","approved").in("platform",["tiktok","tiktok_recruit","youtube","google_business"]).not("caption","is",null).neq("caption","").order("created_at",{ascending:false}).limit(10);
   if(se)throw se;
   let created=0;
   let selected:any=null;
   for(const candidate of (src||[]).filter((x:any)=>String(x.caption||"").trim())){
    const {data:seen}=await db.from("social_publish_attempts").select("id").like("idempotency_key",`fanout:${candidate.id}:%`).limit(1);
    if(!seen?.length){selected=candidate;break;}
   }
   for(const item of (selected?[selected]:[])){
    for(const d of targets){
     const idem="fanout:"+item.id+":"+d.id;
     const {data:exists}=await db.from("social_publish_attempts").select("id").eq("idempotency_key",idem).maybeSingle();
     if(exists)continue;
     const {data:newItem,error}=await db.from("content_queue").insert({sku:item.sku,title:item.title,asset_url:"",public_id:null,caption:item.caption,platform:d.platform||d.provider,destination:d.external_channel_id,status:"approved",scheduled_at:new Date().toISOString(),metadata:{...(item.metadata||{}),source_queue_id:item.id,social_destination_id:d.id,distribution_fanout:true,source_platform:item.platform,media_omitted_for_telegram_text_fallback:true}}).select("id").single();
     if(error)throw error;
     await db.from("social_publish_attempts").insert({queue_id:newItem.id,provider:d.provider,platform:d.platform||d.provider,destination_id:d.id,idempotency_key:idem,status:"queued",attempt_count:0,response_metadata:{source_queue_id:item.id}});
     created++;
    }
   }
   return Response.json({ok:true,created});
  }
  if(!b.id)return Response.json({ok:false,error:"id required"},{status:400});
  const {data:item,error}=await db.from("content_queue").select("*").eq("id",b.id).eq("status","approved").single(); if(error)throw error;
  const did=item.metadata?.social_destination_id;if(!did)throw Error("social_destination_id missing");
  const {data:d,error:de}=await db.from("social_destinations").select("*").eq("id",did).eq("active",true).single();if(de)throw de;
  const idem="publish:"+item.id+":"+d.id;
  const {data:attempt}=await db.from("social_publish_attempts").select("*").eq("idempotency_key",idem).maybeSingle();
  if(attempt?.status==="published")return Response.json({ok:true,status:"already_published",external_post_id:attempt.external_post_id});
  if(d.provider==="whatsapp"){
    await db.from("social_publish_attempts").upsert({queue_id:item.id,provider:"whatsapp",platform:d.platform||"whatsapp",destination_id:d.id,idempotency_key:idem,status:"manual_required",attempt_count:Number(attempt?.attempt_count||0),last_error:"Official WhatsApp channel/status publishing API not configured; asset queued for native/business-supported publishing.",response_metadata:{asset_url:item.asset_url,caption:item.caption}},{onConflict:"idempotency_key"});
    return Response.json({ok:true,status:"manual_required",provider:"whatsapp"});
  }
  if(d.provider!=="telegram")throw Error("unsupported_provider:"+d.provider);
  const token=await vault(d.auth_secret_ref);
  const caption=String(item.caption||item.title||"").slice(0,1024);
  const u=String(item.asset_url||"");const type=mediaType(u);
  let result:any;
  if(!u)result=await tg(token,"sendMessage",{chat_id:d.external_channel_id,text:caption.slice(0,4096),disable_web_page_preview:false});
  else if(type==="video")result=await tgUpload(token,"sendVideo",d.external_channel_id,u,caption,"video");
  else if(type==="photo")result=await tgUpload(token,"sendPhoto",d.external_channel_id,u,caption,"photo");
  else result=await tgUpload(token,"sendDocument",d.external_channel_id,u,caption,"document");
  await db.from("social_publish_attempts").upsert({queue_id:item.id,provider:"telegram",platform:d.platform||"telegram",destination_id:d.id,idempotency_key:idem,status:"published",attempt_count:Number(attempt?.attempt_count||0)+1,external_post_id:String(result?.message_id||""),response_metadata:{chat_id:d.external_channel_id,message_id:result?.message_id,message_date:result?.date}},{onConflict:"idempotency_key"});
  await db.from("content_publish_log").insert({queue_id:item.id,platform:d.platform||"telegram",provider:"telegram",provider_post_id:String(result?.message_id||""),status:"published",published_at:new Date().toISOString(),channel_id:d.external_channel_id,metrics:{destination_id:d.id}});
  await db.from("content_queue").update({status:"published",published_at:new Date().toISOString(),error_message:null}).eq("id",item.id).eq("status","approved");
  return Response.json({ok:true,status:"published",provider:"telegram",message_id:result?.message_id});
 }catch(e){
  const msg=e instanceof Error?e.message:String(e);
  if(b.id){try{await db.from("social_publish_attempts").upsert({queue_id:b.id,provider:"unknown",platform:"social",destination_id:b.destination_id||null,idempotency_key:"error:"+b.id,status:"failed",attempt_count:1,last_error:msg},{onConflict:"idempotency_key"});}catch(_persistError){console.error("failed to persist social publish error",_persistError);}}
  return Response.json({ok:false,error:msg},{status:500});
 }
});