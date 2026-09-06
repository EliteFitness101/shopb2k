import crypto from "node:crypto";
function send(res,body,status=200){res.status(status).json(body)}
function header(req,name){const v=req.headers?.[name.toLowerCase()];return Array.isArray(v)?v[0]:v??null}
function secret(){return process.env.SHOPIFY_WEBHOOK_SECRET||process.env.SHOPIFY_CLIENT_SECRET||null}
function rawBody(req){return new Promise((resolve,reject)=>{const chunks=[];req.on("data",c=>chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c)));req.on("end",()=>resolve(Buffer.concat(chunks)));req.on("error",reject)})}
function validHmac(body,provided,key){if(!provided||!key)return false;const expected=crypto.createHmac("sha256",key).update(body).digest();let received;try{received=Buffer.from(provided,"base64")}catch{return false}return received.length===expected.length&&crypto.timingSafeEqual(received,expected)}
function sbConfig(){const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Supabase server configuration is incomplete");return{url:url.replace(/\/$/,""),key}}
async function sb(path,options={}){const{url,key}=sbConfig();return fetch(`${url}/rest/v1/${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(options.headers||{})}})}
async function post(path,payload){return sb(path,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)})}
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return send(res,{ok:false,error:"Method Not Allowed"},405)}
 try{
  const key=secret();if(!key)return send(res,{ok:false,error:"Shopify webhook secret is not configured"},500)
  const body=await rawBody(req);if(!validHmac(body,header(req,"x-shopify-hmac-sha256"),key))return send(res,{ok:false,error:"Invalid Shopify webhook signature"},401)
  const webhookId=header(req,"x-shopify-webhook-id");if(!webhookId)return send(res,{ok:false,error:"Missing Shopify webhook ID"},400)
  let payload;try{payload=JSON.parse(body.toString("utf8"))}catch{return send(res,{ok:false,error:"Invalid JSON payload"},400)}
  const topic=header(req,"x-shopify-topic")||"orders/create",shopDomain=header(req,"x-shopify-shop-domain"),eventId=header(req,"x-shopify-event-id"),triggeredAt=header(req,"x-shopify-triggered-at"),now=triggeredAt||new Date().toISOString(),orderId=payload?.id!=null?String(payload.id):(eventId||webhookId);
  const existing=await sb(`resofit_events?select=id&idempotency_key=eq.${encodeURIComponent(webhookId)}&limit=1`);if(existing.ok){const rows=await existing.json().catch(()=>[]);if(Array.isArray(rows)&&rows.length)return send(res,{ok:true,duplicate:true,webhook_id:webhookId})}
  const eventPayload={topic,shop_domain:shopDomain,webhook_id:webhookId,event_id:eventId,triggered_at:triggeredAt,order_id:orderId,shopify:payload};
  const insert=await post("resofit_events",{event_name:topic,source_system:"shopify",adapter:"shopify-webhook",contract_version:"2026-07",occurred_at:now,created_at:now,utm:{},payload:eventPayload,idempotency_key:webhookId,correlation_id:orderId||null});
  if(!insert.ok){if(insert.status===409)return send(res,{ok:true,duplicate:true,webhook_id:webhookId});console.error("[Shopify webhook] canonical persistence failure",insert.status,await insert.text().catch(()=>""));return send(res,{ok:false,error:"Failed to persist Shopify order event"},500)}
  const commerce=await post("commerce_events",{event_name:topic,source:"shopify",session_id:eventId||webhookId,metadata:{webhook_id:webhookId,shop_domain:shopDomain,event_id:eventId,triggered_at:triggeredAt,order_id:orderId,order:payload}});
  if(!commerce.ok){console.error("[Shopify webhook] commerce persistence failure",commerce.status,await commerce.text().catch(()=>""));return send(res,{ok:false,error:"Failed to persist Shopify commerce event"},500)}
  const sync=await post("shopify_sync_logs",{sync_type:topic,shopify_object:"order",object_id:orderId,status:"received",payload:{webhook_id:webhookId,shop_domain:shopDomain,event_id:eventId,triggered_at:triggeredAt,order:payload}});
  if(!sync.ok){console.error("[Shopify webhook] sync-log persistence failure",sync.status,await sync.text().catch(()=>""));return send(res,{ok:false,error:"Failed to persist Shopify sync log"},500)}
  return send(res,{ok:true,duplicate:false,webhook_id:webhookId,order_id:orderId,reconciled:true});
 }catch(error){console.error("[Shopify webhook] handler failure",error);return send(res,{ok:false,error:"Internal webhook handler error"},500)}
}
