import { createClient } from "npm:@supabase/supabase-js@2";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!; const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; const PAYSTACK_SECRET_KEY=Deno.env.get("PAYSTACK_SECRET_KEY")!;
if(!PAYSTACK_SECRET_KEY||!PAYSTACK_SECRET_KEY.startsWith("sk_live_"))throw new Error("Production Paystack live secret is required");
const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async(req:Request)=>{try{
 let authUserId:string|null=null;
 let identity:any=null;
 const bearer=req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]??null;
 if(bearer){
   const {data:{user}}=await admin.auth.getUser(bearer);
   if(user){
     authUserId=user.id;
     const {data:identityRow}=await admin.from("resofit_ecosystem_identity")
       .select("email,full_name,phone,rsid")
       .eq("auth_user_id",user.id).maybeSingle();
     identity=identityRow??null;
   }
 }

 if(req.method==="OPTIONS")return new Response("ok",{headers:cors}); if(req.method!=="POST")return json(405,{error:"method_not_allowed"});
 let body:any;try{body=await req.json()}catch{return json(400,{error:"invalid_json"})}
 let email=String(body?.email||"").trim().toLowerCase().slice(0,255);
let name=String(body?.name||"").trim().slice(0,120);
let phone=String(body?.phone||"").trim().slice(0,32);
const address=String(body?.address||"").trim().slice(0,255);
const cartId=String(body?.cart_id||"").trim().slice(0,64)||null;
if(authUserId){
  email=email||String(identity?.email||"").trim().toLowerCase().slice(0,255);
  name=name||String(identity?.full_name||"").trim().slice(0,120);
  phone=phone||String(identity?.phone||"").trim().slice(0,32);
}
if(!email||!name||!phone)return json(400,{error:"missing_checkout_fields"}); if(!/^\S+@\S+\.\S+$/.test(email))return json(400,{error:"invalid_email"});
 const rawItems=Array.isArray(body?.items)?body.items:[{sku:String(body?.sku||"").trim().slice(0,128),quantity:Number(body?.quantity??1)}]; const items=rawItems.map((item:any)=>({sku:String(item?.sku||"").trim().slice(0,128),quantity:Number(item?.quantity??1)}));
 if(!items.length||items.length>50||items.some((item:any)=>!item.sku||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>100))return json(400,{error:"invalid_checkout_items"});
 const merged=new Map<string,number>();for(const item of items)merged.set(item.sku,(merged.get(item.sku)||0)+item.quantity);const normalizedItems=[...merged.entries()].map(([sku,quantity])=>({sku,quantity}));const skus=normalizedItems.map(i=>i.sku);
 const {data:products,error:productErr}=await admin.from("products").select("sku,title,variant_price,published,product_type,tags,variant_inventory_qty,fulfillment_mode").in("sku",skus).eq("published",true); if(productErr)return json(500,{error:"catalog_lookup_failed"});
 const bySku=new Map((products??[]).map((p:any)=>[String(p.sku),p]));if(bySku.size!==skus.length)return json(404,{error:"product_not_found"});
 const offerId=String(body?.commercial_offer_id||"").trim(); const requestedFinalPrice=Number(body?.final_selling_price_ngn);
 if((offerId||Number.isFinite(requestedFinalPrice))&&(!offerId||!Number.isFinite(requestedFinalPrice)))return json(400,{error:"commercial_offer_price_pair_required"});
 if(offerId&&normalizedItems.length!==1)return json(409,{error:"commercial_offer_single_item_only"});
 let amountNgn=0,requiresAddress=false;const lineItems=[] as Array<{sku:string;title:string;quantity:number;unit_price_ngn:number;fulfillment_mode:string}>;
 let commercial:any=null;
 for(const item of normalizedItems){const product=bySku.get(item.sku)!;const mode=String(product.fulfillment_mode||"unknown").toLowerCase();if(!["digital","physical","hybrid","service"].includes(mode))return json(409,{error:"fulfillment_mode_unclassified",sku:item.sku});
  if(mode==="physical"||mode==="hybrid"){const {data:sources,error:sourceErr}=await admin.from("resofit_catalog_inventory_sources").select("quantity,reserved_quantity,availability_status").eq("sku",item.sku).eq("availability_status","available");if(sourceErr)return json(500,{error:"inventory_source_lookup_failed",sku:item.sku});const available=(sources??[]).reduce((sum:any,s:any)=>sum+Math.max(0,Number(s.quantity||0)-Number(s.reserved_quantity||0)),0);if(!Number.isFinite(available)||available<item.quantity)return json(409,{error:"insufficient_catalog_inventory",sku:item.sku,available});}
  let price=Number(product.variant_price);if(!Number.isFinite(price)||price<=0)return json(409,{error:"product_not_sellable",sku:item.sku});
  if(offerId){const {data:v,error:vErr}=await admin.rpc("validate_commercial_offer",{p_offer_id:offerId,p_product_sku:item.sku,p_final_price:requestedFinalPrice});if(vErr)return json(500,{error:"commercial_offer_validation_failed"});if(!v?.ok)return json(409,{error:String(v?.error||"commercial_offer_invalid")});commercial=v;price=Number(v.final_selling_price_ngn);}
  if(mode==="physical"||mode==="hybrid")requiresAddress=true;amountNgn+=price*item.quantity;lineItems.push({sku:item.sku,title:String(product.title),quantity:item.quantity,unit_price_ngn:price,fulfillment_mode:mode});
 }
 if(!Number.isFinite(amountNgn)||amountNgn<=0)return json(409,{error:"product_not_sellable"});if(requiresAddress&&!address)return json(400,{error:"missing_checkout_fields",field:"address"});
 const reference=`RF-${Date.now()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;const rsid=String(body?.rsid||"").trim().slice(0,128)||String(identity?.rsid||"").trim().slice(0,128)||`RSID-${crypto.randomUUID().slice(0,12).toUpperCase()}`;
 const attribution={rsid,ttclid:String(body?.ttclid||"").trim().slice(0,255)||null,utm_source:String(body?.utm_source||"").trim().slice(0,128)||null,utm_medium:String(body?.utm_medium||"").trim().slice(0,128)||null,utm_campaign:String(body?.utm_campaign||"").trim().slice(0,128)||null,utm_term:String(body?.utm_term||"").trim().slice(0,128)||null,utm_content:String(body?.utm_content||"").trim().slice(0,128)||null,funnel_origin:String(body?.funnel_origin||"resofit_shop").trim().slice(0,128),session_id:String(body?.session_id||"").trim().slice(0,128)||null,campaign:String(body?.campaign||"").trim().slice(0,128)};
 const primary=lineItems[0];const checkoutMetadata={sku:primary.sku,variant_sku:primary.sku,product_name:primary.title,line_items:lineItems,customer_name:name,phone,delivery_address:requiresAddress?address:null,checkout_channel:"paystack_direct",auth_user_id:authUserId,cart_id:cartId,commercial_offer_id:commercial?.offer_id??null,canonical_price_ngn:commercial?.canonical_price_ngn??Number(bySku.get(primary.sku)?.variant_price),eligible_cost_base_ngn:commercial?.eligible_cost_base_ngn??null,final_selling_price_ngn:commercial?.final_selling_price_ngn??amountNgn,gross_margin_ngn:commercial?.gross_margin_ngn??null,commission_basis:commercial?.commission_basis??null,commission_rate_bps:commercial?.commission_rate_bps??null,referral_commission_ngn:commercial?.commission_ngn??null,commercial_rule_version:commercial?.rule_version??null,...attribution,custom_fields:[{display_name:"SKU",variable_name:"variant_sku",value:primary.sku},{display_name:"Phone",variable_name:"phone",value:phone},{display_name:"Delivery",variable_name:"delivery_address",value:requiresAddress?address:"digital"},{display_name:"RSID",variable_name:"rsid",value:rsid}]};
 const {error:subscriberErr}=await admin.from("resoflex_subscribers").upsert({rsid,reference,email,full_name:name,phone,product_id:primary.sku,product_name:lineItems.length===1?primary.title:`${primary.title} + ${lineItems.length-1} more`,amount_paid:amountNgn,currency:"NGN",payment_status:"pending",metadata:checkoutMetadata,updated_at:new Date().toISOString()},{onConflict:"reference"});if(subscriberErr)return json(500,{error:"checkout_order_persistence_failed"});
 const {error:paymentPendingErr}=await admin.from("payments").upsert({
   user_id:authUserId, amount:amountNgn, currency:"NGN", status:"pending", plan_type:primary.title,
   paystack_ref:reference, rsid, customer_email:email, product_sku:primary.sku,
   funnel_origin:attribution.funnel_origin, gross_amount:Math.round(amountNgn),
   settlement_status:"pending", reconciled:false, metadata:checkoutMetadata,
   commercial_offer_id:commercial?.offer_id??null,
   canonical_price_ngn:commercial?.canonical_price_ngn??Number(bySku.get(primary.sku)?.variant_price),
   eligible_cost_base_ngn:commercial?.eligible_cost_base_ngn??null,
   final_selling_price_ngn:commercial?.final_selling_price_ngn??amountNgn,
   gross_margin_ngn:commercial?.gross_margin_ngn??null,
   commission_rate_bps:commercial?.commission_rate_bps??null,
   referral_commission_ngn:commercial?.commission_ngn??null,
   commercial_rule_version:commercial?.rule_version??null
 },{onConflict:"paystack_ref"});
 if(paymentPendingErr)return json(500,{error:"payment_ledger_persistence_failed"});
// Additive campaign/conversion attribution: preserve existing checkout/payment authority.
await admin.from("conversion_events").insert({
  event_name:"checkout_started",
  session_id:attribution.session_id,
  anonymous_id:null,
  user_id:authUserId,
  recommendation_id:null,
  product_id:primary.sku,
  checkout_id:reference,
  order_id:null,
  value_ngn:amountNgn,
  metadata:{rsid,utm:attribution,commercial_offer_id:commercial?.offer_id??null,funnel_origin:attribution.funnel_origin},
  occurred_at:new Date().toISOString()
});
await admin.from("campaign_attribution").insert({
  campaign_id:attribution.utm_campaign??attribution.campaign??null,
  platform:attribution.utm_source??null,
  ad_id:null,
  session_id:attribution.session_id,
  anonymous_id:null,
  utm_source:attribution.utm_source,
  utm_campaign:attribution.utm_campaign,
  utm_content:attribution.utm_content,
  recommendation_id:null,
  product_id:primary.sku,
  checkout_id:reference,
  order_id:null,
  revenue_ngn:null,
  contribution_margin_ngn:null
});
if(cartId){
  await admin.from("resofit_cart_sessions").update({
    user_id:authUserId??undefined,
    customer_email:email,
    customer_name:name,
    customer_phone:phone,
    rsid,
    funnel_origin:attribution.funnel_origin,
    utm:attribution,
    checkout_started_at:new Date().toISOString(),
    last_activity_at:new Date().toISOString(),
    updated_at:new Date().toISOString(),
    status:"checkout_started"
  }).eq("id",cartId);
}
 const paystackRequest=async()=>{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);try{return await fetch("https://api.paystack.co/transaction/initialize",{method:"POST",headers:{Authorization:`Bearer ${PAYSTACK_SECRET_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({email,amount:Math.round(amountNgn*100),currency:"NGN",reference,callback_url:primary.sku.startsWith("MX-")?"https://martial.resofit.fit/payment/success":"https://www.resofit.fit/payment/callback",metadata:checkoutMetadata,channels:["card","bank","ussd","bank_transfer","mobile_money"]}),signal:controller.signal});}finally{clearTimeout(timeout)}};let response:Response;try{response=await paystackRequest()}catch(firstError){console.error("paystack initialize request failed; retrying",{reference,reason:String(firstError)});try{response=await paystackRequest()}catch(secondError){await admin.from("payments").update({status:"failed",gateway_response:"payment_initialization_request_failed",reconciled:true,reconciled_at:new Date().toISOString()}).eq("paystack_ref",reference).eq("status","pending");return json(502,{error:"payment_initialization_failed"})}}const payload=await response.json().catch(()=>null);if(!response.ok||!payload?.status||!payload?.data?.authorization_url){console.error("paystack initialize failed",{reference,httpStatus:response.status,code:payload?.data?.code??payload?.code??null});await admin.from("payments").update({status:"failed",gateway_response:"payment_initialization_rejected",reconciled:true,reconciled_at:new Date().toISOString()}).eq("paystack_ref",reference).eq("status","pending");return json(502,{error:"payment_initialization_failed"})}
 return json(200,{reference,authorization_url:payload.data.authorization_url,amount_ngn:amountNgn,sku:primary.sku,items:lineItems,rsid,commercial_offer:commercial});
}catch(error){console.error("paystack init failed",String(error));return json(500,{error:"checkout_initialization_failed"})}});