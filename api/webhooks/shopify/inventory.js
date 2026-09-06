import crypto from "node:crypto";
function send(res,body,status=200){res.status(status).json(body)}
function header(req,name){const v=req.headers?.[name.toLowerCase()];return Array.isArray(v)?v[0]:v??null}
function secret(){return process.env.SHOPIFY_WEBHOOK_SECRET||process.env.SHOPIFY_CLIENT_SECRET||null}
function rawBody(req){return new Promise((resolve,reject)=>{const chunks=[];req.on("data",c=>chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c)));req.on("end",()=>resolve(Buffer.concat(chunks)));req.on("error",reject)})}
function validHmac(body,provided,key){if(!provided||!key)return false;const expected=crypto.createHmac("sha256",key).update(body).digest();let received;try{received=Buffer.from(provided,"base64")}catch{return false}return received.length===expected.length&&crypto.timingSafeEqual(received,expected)}
function sbConfig(){const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Supabase server configuration is incomplete");return{url:url.replace(/\/$/,""),key}}
async function sb(path,options={}){const{url,key}=sbConfig();return fetch(`${url}/rest/v1/${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(options.headers||{})}})}
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return send(res,{ok:false,error:"Method Not Allowed"},405)}
 try{
  const key=secret();if(!key)return send(res,{ok:false,error:"Shopify webhook secret is not configured"},500)
  const body=await rawBody(req);if(!validHmac(body,header(req,"x-shopify-hmac-sha256"),key))return send(res,{ok:false,error:"Invalid Shopify webhook signature"},401)
  const webhookId=header(req,"x-shopify-webhook-id");if(!webhookId)return send(res,{ok:false,error:"Missing Shopify webhook ID"},400)
  let payload;try{payload=JSON.parse(body.toString("utf8"))}catch{return send(res,{ok:false,error:"Invalid JSON payload"},400)}
  const topic=header(req,"x-shopify-topic")||"inventory_levels/update",eventId=header(req,"x-shopify-event-id"),triggeredAt=header(req,"x-shopify-triggered-at"),shopDomain=header(req,"x-shopify-shop-domain"),now=triggeredAt||new Date().toISOString(),correlationId=payload?.inventory_item_id!=null?String(payload.inventory_item_id):(payload?.id!=null?String(payload.id):(eventId||""));
  const existing=await sb(`resofit_events?select=id&idempotency_key=eq.${encodeURIComponent(webhookId)}&limit=1`);if(existing.ok){const rows=await existing.json().catch(()=>[]);if(Array.isArray(rows)&&rows.length)return send(res,{ok:true,duplicate:true,webhook_id:webhookId})}
  const insert=await sb("resofit_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({event_name:topic,source_system:"shopify",adapter:"shopify-webhook",contract_version:"2026-07",occurred_at:now,created_at:now,utm:{},payload:{topic,shop_domain:shopDomain,webhook_id:webhookId,event_id:eventId,triggered_at:triggeredAt,inventory_item_id:correlationId||null,shopify:payload},idempotency_key:webhookId,correlation_id:correlationId||null})});
  if(insert.ok)return send(res,{ok:true,duplicate:false,webhook_id:webhookId});if(insert.status===409)return send(res,{ok:true,duplicate:true,webhook_id:webhookId});console.error("[Shopify webhook] persistence failure",insert.status,await insert.text().catch(()=>""));return send(res,{ok:false,error:"Failed to persist Shopify webhook event"},500)
 }catch(error){console.error("[Shopify webhook] handler failure",error);return send(res,{ok:false,error:"Internal webhook handler error"},500)}
}
