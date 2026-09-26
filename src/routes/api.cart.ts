import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL=process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL??"https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SERVICE_ROLE=process.env.SUPABASE_SERVICE_ROLE_KEY;
function cors(origin:string|null){const allowed=origin&&/^https:\/\/([a-z0-9-]+\.)*resofit\.fit$/i.test(origin)?origin:"https://resofit.fit";return {"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Credentials":"true","Access-Control-Allow-Headers":"authorization,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"};}
function clean(v:unknown,max=500){return typeof v==="string"?v.trim().slice(0,max):"";}
function json(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers});}
export const Route=createFileRoute("/api/cart")({server:{handlers:{
 OPTIONS:async({request})=>new Response(null,{status:204,headers:cors(request.headers.get("origin"))}),
 POST:async({request})=>{
  const headers=cors(request.headers.get("origin"));
  try{
   if(!SERVICE_ROLE)return json({ok:false,error:"Cart service is not configured server-side."},503,headers);
   const body=await request.json().catch(()=>({}));
   const cartToken=clean(body.cartToken,128); if(!cartToken)return json({ok:false,error:"cartToken is required."},400,headers);
   const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});
   let userId:string|null=null; const authHeader=request.headers.get("authorization");
   if(authHeader?.startsWith("Bearer ")){const {data}=await admin.auth.getUser(authHeader.slice(7));userId=data.user?.id??null;}
   const items=Array.isArray(body.items)?body.items.slice(0,100):[];
   const attr=body.attribution&&typeof body.attribution==="object"?body.attribution:{};
   const payload={cart_token:cartToken,user_id:userId,anonymous_id:clean(body.anonymousId,128)||null,session_id:clean(body.sessionId,128)||null,rsid:clean(attr.rsid,200)||null,funnel_origin:clean(attr.funnel_origin,200)||null,utm:attr,customer_email:clean(body.customerEmail,320).toLowerCase()||null,customer_name:clean(body.customerName,160)||null,customer_phone:clean(body.customerPhone,50)||null,currency:clean(body.currency,8)||"NGN",status:"active",last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()};
   const {data:cart,error:cartError}=await admin.from("resofit_cart_sessions").upsert(payload,{onConflict:"cart_token"}).select("id").single(); if(cartError)throw cartError;
   await admin.from("resofit_cart_items").delete().eq("cart_id",cart.id);
   if(items.length){const rows=items.map((i:any)=>({cart_id:cart.id,sku:clean(i.sku||i.variantId,200),title_snapshot:clean(i.title,300)||null,quantity:Math.max(1,Math.min(999,Number(i.quantity)||1)),unit_price:Number(i.unitPrice)||0,currency:clean(i.currency,8)||payload.currency,metadata:i.metadata&&typeof i.metadata==="object"?i.metadata:{}}));const {error}=await admin.from("resofit_cart_items").insert(rows);if(error)throw error;}
   return json({ok:true,cartId:cart.id},200,headers);
  }catch(error){console.error("ResoFit cart sync",error);return json({ok:false,error:"Unable to sync cart."},500,headers);}
 }
}}});