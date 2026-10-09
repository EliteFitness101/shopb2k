import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
async function hmacSha512(body:string,secret:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-512"},false,["sign"]);const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(body));return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function sha256(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");}
function constantTimeEqual(a:string,b:string){if(a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;}
async function sendTikTokPurchase(args:{reference:string;email:string;ttclid?:string|null;amount:number;currency:string;sku:string;productName:string}){const token=Deno.env.get("TIKTOK_EVENTS_API_TOKEN")??Deno.env.get("TIKTOK_EVENTS_API_ACCESS_TOKEN")??"";if(!token){console.error("TikTok Events API: missing TIKTOK_EVENTS_API_ACCESS_TOKEN");return{sent:false,reason:"missing_token"};}const pixelId=Deno.env.get("TIKTOK_PIXEL_ID")??"DADLTG3C77U208ULCJJ0";const eventId=`paystack:${args.reference}`;const user:Record<string,unknown>={email:await sha256(args.email.trim().toLowerCase())};if(args.ttclid)user.ttclid=args.ttclid;const payload={event_source:"web",event_source_id:pixelId,data:[{event:"Purchase",event_time:Math.floor(Date.now()/1000),event_id:eventId,user,page:{url:"https://www.resofit.fit/shop"},properties:{currency:args.currency,value:args.amount,content_type:"product",content_ids:[args.sku],contents:[{content_id:args.sku,content_name:args.productName,quantity:1,price:args.amount}]}}]};try{const response=await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/",{method:"POST",headers:{"Content-Type":"application/json","Access-Token":token},body:JSON.stringify(payload)});const responseBody=await response.text();let parsed:any=null;try{parsed=JSON.parse(responseBody)}catch{}if(!response.ok||(parsed&&parsed.code!==0)){console.error("TikTok Events API rejected Purchase",{httpStatus:response.status,code:parsed?.code??null,message:parsed?.message??null,reference:args.reference});return{sent:false,reason:"tiktok_rejected",httpStatus:response.status,code:parsed?.code??null};}return{sent:true,eventId};}catch(error){console.error("TikTok Events API request failed",{reference:args.reference,error:String(error)});return{sent:false,reason:"request_failed"};}}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const bodyText = await req.text();
  let admin: any = null;
  let reference: string | null = null;
  let eventType: string | null = null;
  let eventKey: string | null = null;
  let processingClaimed = false;

  try {
    const signature = req.headers.get("x-paystack-signature") ?? "";
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
    if (!secret || !secret.startsWith("sk_live_")) {
      return json({ error: "Production Paystack live secret is required" }, 500);
    }
    const expected = await hmacSha512(bodyText, secret);
    if (!constantTimeEqual(signature, expected)) return json({ error: "Invalid signature" }, 401);

    const event = JSON.parse(bodyText);
    reference = typeof event?.data?.reference === "string" ? event.data.reference.trim() : null;
    if (!reference) return json({ received: true });
    eventType = typeof event?.event === "string" ? event.event : "unknown";
    const providerEventId = String(event?.data?.id ?? event?.data?.refund_reference ?? "");
    eventKey = await sha256(`${eventType}:${reference}:${providerEventId}`);
    admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const now = new Date().toISOString();
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: existing, error: lookupError } = await admin
      .from("payment_event_processing")
      .select("id,status,attempt_count,updated_at")
      .eq("paystack_ref", reference)
      .eq("event_key", eventKey)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.status === "processed") return json({ received: true, duplicate: true });
    if (existing?.status === "processing" && Date.now() - new Date(existing.updated_at ?? 0).getTime() < 15 * 60 * 1000) {
      return json({ received: true, duplicate: true });
    }

    if (existing) {
      let claimQuery = admin.from("payment_event_processing")
        .update({ status: "processing", attempt_count: Number(existing.attempt_count ?? 1) + 1, last_error: null, updated_at: now })
        .eq("paystack_ref", reference)
        .eq("event_key", eventKey)
        .eq("status", existing.status);
      if (existing.status === "processing") claimQuery = claimQuery.lt("updated_at", staleBefore);
      const { data: claim, error: claimError } = await claimQuery.select("id").maybeSingle();
      if (claimError) throw claimError;
      if (!claim) return json({ received: true, duplicate: true });
      processingClaimed = true;
    } else {
      const { data: claim, error: claimError } = await admin.from("payment_event_processing").insert({
        paystack_ref: reference,
        event_key: eventKey,
        event_type: eventType,
        status: "processing",
        attempt_count: 1,
        last_error: null,
        updated_at: now,
      }).select("id").maybeSingle();
      if (claimError?.code === "23505") return json({ received: true, duplicate: true });
      if (claimError) throw claimError;
      processingClaimed = Boolean(claim);
    }

    const markProcessed = async () => {
      const { error } = await admin.from("payment_event_processing")
        .update({ status: "processed", last_error: null, updated_at: new Date().toISOString() })
        .eq("paystack_ref", reference)
        .eq("event_key", eventKey);
      if (error) throw error;
      processingClaimed = false;
    };

    // payment_events is an immutable event log; processing state lives in payment_event_processing.
    const { error: eventPersistError } = await admin.from("payment_events").upsert({
      paystack_ref: reference,
      event: eventType,
      payload: event,
      processed: false,
      signature_verified: true,
      source: "paystack",
    }, { onConflict: "paystack_ref,event", ignoreDuplicates: true });
    if (eventPersistError) throw eventPersistError;

    if(event.event==="charge.success"){const data=event.data??{},metadata=data.metadata??{};const isResoFitCheckout=metadata.checkout_channel==="paystack_direct"||typeof metadata.sku==="string";if(!isResoFitCheckout){await markProcessed();return json({received:true,ignored:true});}const{subscriber,error:subscriberError}=await (async()=>{const r=await admin.from("resoflex_subscribers").select("id,rsid,email,product_id,product_name,amount_paid,payment_status,user_id,metadata").eq("reference",reference).maybeSingle();return{subscriber:r.data,error:r.error}})();if(subscriberError)throw subscriberError;if(!subscriber)return json({error:"Order context not found; retry required"},500);const expectedKobo=Math.round(Number(subscriber.amount_paid)*100),receivedKobo=Number(data.amount),customerEmail=String(data.customer?.email??"").trim().toLowerCase(),emailMatches=!customerEmail||customerEmail===String(subscriber.email).trim().toLowerCase();if(data.status!=="success"||data.currency!=="NGN"||!Number.isFinite(receivedKobo)||receivedKobo!==expectedKobo||!emailMatches)return json({error:"Payment verification mismatch; retry required"},422);const paidAt=data.paid_at??new Date().toISOString(),email=customerEmail||subscriber.email,now=new Date().toISOString();const{subscriberUpdateError}=await (async()=>({subscriberUpdateError:(await admin.from("resoflex_subscribers").update({payment_status:"success",updated_at:now}).eq("id",subscriber.id).neq("payment_status","success")).error}))();if(subscriberUpdateError)throw subscriberUpdateError;const{error:paymentError}=await admin.from("payments").upsert({user_id:subscriber.user_id??null,amount:receivedKobo/100,currency:"NGN",status:"success",plan_type:subscriber.product_name,paystack_ref:reference,rsid:subscriber.rsid,customer_email:email,product_sku:subscriber.product_id,funnel_origin:metadata.funnel_origin??"resoflex_shop",gross_amount:receivedKobo,paid_at:paidAt,gateway_response:data.gateway_response??null,reconciled:true,reconciled_at:now,settlement_status:"pending",metadata},{onConflict:"paystack_ref"});if(paymentError)throw paymentError;const{error:revenueError}=await admin.from("revenue_events").upsert({payment_reference:reference,amount:receivedKobo/100,currency:"NGN",email,product_slug:subscriber.product_id,rsid:subscriber.rsid,status:"success",campaign:metadata.utm_campaign??metadata.campaign??null,utm:{source:metadata.utm_source??null,medium:metadata.utm_medium??null,campaign:metadata.utm_campaign??null,term:metadata.utm_term??null,content:metadata.utm_content??null}},{onConflict:"payment_reference"});if(revenueError)throw revenueError;
// Close the existing attribution chain on verified Paystack success.
const attributionFilter=admin.from("campaign_attribution").update({
  order_id:reference,
  revenue_ngn:receivedKobo/100,
  contribution_margin_ngn:metadata.gross_margin_ngn??null
}).eq("checkout_id",reference);
const {error:attributionUpdateError}=await attributionFilter;
if(attributionUpdateError)throw attributionUpdateError;
const {data:existingConversion,error:conversionLookupError}=await admin.from("conversion_events")
  .select("id").eq("event_name","purchase").eq("order_id",reference).maybeSingle();
if(conversionLookupError)throw conversionLookupError;
if(!existingConversion){
  const {error:conversionError}=await admin.from("conversion_events").insert({
    event_name:"purchase",
    session_id:typeof metadata.session_id==="string"?metadata.session_id:null,
    anonymous_id:null,
    user_id:subscriber.user_id??null,
    recommendation_id:null,
    product_id:subscriber.product_id,
    checkout_id:reference,
    order_id:reference,
    value_ngn:receivedKobo/100,
    metadata:{rsid:subscriber.rsid,utm:{source:metadata.utm_source??null,medium:metadata.utm_medium??null,campaign:metadata.utm_campaign??null,term:metadata.utm_term??null,content:metadata.utm_content??null},funnel_origin:metadata.funnel_origin??"resoflex_shop"},
    occurred_at:paidAt
  });
  if(conversionError)throw conversionError;
}const{error:eventLedgerError}=await admin.from("resofit_events").upsert({event_name:"payment.succeeded",contract_version:"1.0",occurred_at:paidAt,source_system:"paystack-webhook",adapter:"paystack",idempotency_key:`paystack:payment.succeeded:${reference}`,correlation_id:subscriber.rsid??reference,rsid:subscriber.rsid??null,funnel_origin:metadata.funnel_origin??"resoflex_shop",utm:{source:metadata.utm_source??null,medium:metadata.utm_medium??null,campaign:metadata.utm_campaign??null,term:metadata.utm_term??null,content:metadata.utm_content??null},payload:{payment_reference:reference,amount:receivedKobo/100,currency:data.currency,product_sku:subscriber.product_id,product_name:subscriber.product_name,customer_email:email,gateway_response:data.gateway_response??null}},{onConflict:"idempotency_key"});if(eventLedgerError)throw eventLedgerError;if(metadata.upsell===true&&typeof metadata.productId==="string"){const{data:upsellSubscriber,error:upsellLookupError}=await admin.from("resoflex_subscribers").select("id").eq("rsid",metadata.rsid??"").maybeSingle();if(upsellLookupError)throw upsellLookupError;if(upsellSubscriber){const{error:upsellError}=await admin.from("resoflex_upsells").update({payment_status:"success",amount_paid:receivedKobo,paystack_ref:reference}).eq("subscriber_id",upsellSubscriber.id).eq("product_id",metadata.productId).neq("payment_status","success");if(upsellError)throw upsellError;}}await sendTikTokPurchase({reference,email,ttclid:typeof metadata.ttclid==="string"?metadata.ttclid:null,amount:receivedKobo/100,currency:String(data.currency??"NGN"),sku:String(subscriber.product_id??""),productName:String(subscriber.product_name??"")});}

    if (eventType !== "charge.success") {
      await markProcessed();
      return json({ received: true, ignored: true, event: eventType });
    }
    await markProcessed();
    return json({ received: true });
  } catch (error) {
    if (admin && processingClaimed && reference && eventKey) {
      const { error: stateError } = await admin.from("payment_event_processing").update({
        status: "failed",
        last_error: String(error).slice(0, 1000),
        updated_at: new Date().toISOString(),
      }).eq("paystack_ref", reference).eq("event_key", eventKey);
      if (stateError) console.error("Failed to persist webhook retry state", stateError);
    }
    console.error("Webhook processing failed", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
