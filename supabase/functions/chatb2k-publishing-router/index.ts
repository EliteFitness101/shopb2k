import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!;
const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,key);
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
async function sameSecret(a:string,b:string){const e=new TextEncoder();const[x,y]=await Promise.all([crypto.subtle.digest("SHA-256",e.encode(a)),crypto.subtle.digest("SHA-256",e.encode(b))]);const aa=new Uint8Array(x),bb=new Uint8Array(y);let d=aa.length^bb.length;for(let i=0;i<aa.length;i++)d|=aa[i]^bb[i];return d===0}
async function authorized(req:Request){const h=req.headers.get("authorization")||"";return h.startsWith("Bearer ")&&await sameSecret(h.slice(7),key)}
async function automationKillReason(): Promise<{blocked:boolean;reason:string}> {
 const {data,error}=await db.from("chatb2k_control_plane").select("kill_switch_enabled,kill_switch_reason").eq("id",true).maybeSingle();
 if(error||!data)return {blocked:true,reason:"Control plane unavailable; automation paused"};
 return {blocked:data.kill_switch_enabled===true,reason:String(data.kill_switch_reason||"Orchestration globally paused")};
}
Deno.serve(async req=>{
 if(req.method!=="POST")return json({ok:false,error:"POST required"},405);
 if(!(await authorized(req)))return json({ok:false,error:"Unauthorized"},401);
 const gate=await automationKillReason();if(gate.blocked)return json({ok:false,error:"CHATB2K_GLOBAL_KILL_SWITCH_ACTIVE",reason:gate.reason},503);
 const body:any=await req.json().catch(()=>({}));
 const id=String(body?.id||"").trim();
 if(!id)return json({ok:false,error:"approved_queue_id_required"},400);
 try{
  const {data:item,error:ie}=await db.from("content_queue").select("id,platform,platforms,status").eq("id",id).maybeSingle();
  if(ie)throw ie;
  if(!item)return json({ok:false,error:"queue_item_not_found"},404);
  if(item.status!=="approved")return json({ok:true,status:"held",reason:"queue_item_not_approved",queue_id:id});
  const platform=String(item.platform||item.platforms?.[0]||"").trim();
  const {data:routes,error:re}=await db.from("chatb2k_provider_routes").select("route_id,provider,status,config,endpoint_class").eq("service_type","social_distribution").eq("status","active");
  if(re)throw re;
  const eligible=(routes||[]).filter((r:any)=>{
   const c=r.config||{};
   const platforms=Array.isArray(c.platforms)?c.platforms.map((x:any)=>String(x)):[];
   return c.enabled===true&&c.approved===true&&typeof c.adapter_function==="string"&&(!platforms.length||platforms.includes(platform));
  });
  if(eligible.length!==1)return json({ok:true,status:"held",reason:eligible.length?"multiple_approved_publisher_routes_match":"no_approved_publisher_route_match",queue_id:id,platform,candidates:eligible.map((r:any)=>r.route_id)});
  const route=eligible[0],adapter=String(route.config.adapter_function);
  if(!/^[a-z0-9-]{3,80}$/.test(adapter))return json({ok:false,error:"provider_route_adapter_function_invalid",route_id:route.route_id},500);
  const response=await fetch(`${url}/functions/v1/${adapter}`,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`,"x-chatb2k-route-id":String(route.route_id)},body:JSON.stringify({id})});
  const raw=await response.text();let result:any;try{result=JSON.parse(raw)}catch{result={raw:raw.slice(0,1000)}}
  return json({ok:response.ok,router:"chatb2k-publishing-router",route_id:route.route_id,provider:route.provider,adapter_function:adapter,queue_id:id,adapter_status:response.status,result},response.ok?200:502);
 }catch(e){return json({ok:false,error:e instanceof Error?e.message:String(e)},500)}
});
