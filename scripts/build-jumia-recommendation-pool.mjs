import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FEED_URL = process.env.JUMIA_AUTHORIZED_FEED_URL;
const TARGET = 1000;
const CATEGORY_TARGETS = { fitness: 300, sports: 150, health: 150, beauty: 150, lifestyle: 150, recovery: 100 };
const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_TARGETS));
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!FEED_URL) throw new Error("JUMIA_AUTHORIZED_FEED_URL is required; this job does not scrape jumia.com.ng");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const inferCategory = (title, subcategory = "") => {
  const text = `${title} ${subcategory}`.toLowerCase();
  const words = { fitness:["fitness","gym","dumbbell","barbell","workout","exercise","rope","mat","resistance","training"], sports:["sport","football","basketball","cycling","running","athletic","sportswear","glove","bag"], health:["health","wellness","scale","monitor","support","posture","hydration","medical","care"], beauty:["beauty","skin","skincare","hair","makeup","cosmetic","grooming","personal care"], lifestyle:["travel","accessory","bag","bottle","sunglasses","wallet","organizer","home","office"], recovery:["massage","recovery","foam roller","stretch","mobility","compression","lumbar","posture","therapy"] };
  let best="lifestyle", hits=0; for (const [category,list] of Object.entries(words)) { const n=list.reduce((x,w)=>x+(text.includes(w)?1:0),0); if(n>hits){best=category;hits=n;} } return best;
};
const score = (x) => x.priceNgn<=0||x.stockQty<=0 ? 0 : Number(((x.codEligible?20:0)+Math.max(0,Math.min(5,x.rating??0))*8+Math.min(15,Math.log10((x.reviewCount??0)+1)*7)+(x.imageUrl?8:0)+(["authorized","licensed","owned"].includes(x.imageRightsStatus)?8:0)+(x.resaleStatus==="authorized"?10:0)+Math.min(8,Math.log10(x.stockQty+1)*4)).toFixed(2));
const qualified = (x) => x.priceNgn>0&&x.stockQty>0&&x.codEligible&&Boolean(x.imageUrl)&&["authorized","licensed","owned"].includes(x.imageRightsStatus)&&x.resaleStatus==="authorized";
async function loadFeed(){const r=await fetch(FEED_URL,{signal:AbortSignal.timeout(30000),headers:{accept:"application/json"}});if(!r.ok)throw new Error(`Jumia authorized feed failed: HTTP ${r.status}`);return r.json();}
function normalize(raw){const title=String(raw.title??"").trim(), subcategory=typeof raw.subcategory==="string"?raw.subcategory.trim():"", requested=String(raw.category??"").toLowerCase();return {externalProductId:String(raw.externalProductId??raw.id??"").trim(),sku:typeof raw.sku==="string"?raw.sku.trim():null,title,category:VALID_CATEGORIES.has(requested)?requested:inferCategory(title,subcategory),subcategory,priceNgn:Number(raw.priceNgn??raw.price??0),stockQty:Number(raw.stockQty??raw.stock??0),rating:raw.rating==null?null:Number(raw.rating),reviewCount:Number(raw.reviewCount??raw.reviews??0),codEligible:raw.codEligible===true,imageUrl:typeof raw.imageUrl==="string"?raw.imageUrl:null,imageRightsStatus:raw.imageRightsStatus??"unknown",resaleStatus:raw.resaleStatus??"pending",metadata:raw.metadata&&typeof raw.metadata==="object"?raw.metadata:{},sourceUrl:typeof raw.sourceUrl==="string"?raw.sourceUrl:null};}
const payload=await loadFeed();
const candidates=(Array.isArray(payload?.products)?payload.products:[]).map(normalize).filter(x=>x.externalProductId&&x.title);
const deduped=new Map(); for(const x of candidates){const k=(x.sku||x.externalProductId).toLowerCase();if(!deduped.has(k)||score(x)>score(deduped.get(k)))deduped.set(k,x);}
const qualifiedItems=[...deduped.values()].filter(qualified).sort((a,b)=>score(b)-score(a));
const selected=[],remaining=new Map(qualifiedItems.map(x=>[x.externalProductId,x]));
for(const [category,target] of Object.entries(CATEGORY_TARGETS)){for(const x of [...remaining.values()].filter(i=>i.category===category).sort((a,b)=>score(b)-score(a)).slice(0,target)){selected.push(x);remaining.delete(x.externalProductId);}}
selected.push(...[...remaining.values()].sort((a,b)=>score(b)-score(a))); const pool=selected.slice(0,TARGET);
const {data:catalog,error:catalogError}=await supabase.from("recommendation_catalogs").upsert({code:"jumia-ng-cod-1000",name:"Jumia Nigeria COD — ResoFit Recommendation Pool",target_size:TARGET,status:"active"},{onConflict:"code"}).select("id").single(); if(catalogError)throw catalogError;
const {data:run,error:runError}=await supabase.from("recommendation_catalog_runs").insert({catalog_id:catalog.id,source_code:"JUMIA_NG_COD",input_count:candidates.length,qualified_count:qualifiedItems.length,selected_count:pool.length,rejected_count:candidates.length-qualifiedItems.length}).select("id").single(); if(runError)throw runError;
if(pool.length){const rows=pool.map(x=>({catalog_id:catalog.id,external_product_id:x.externalProductId,sku:x.sku,title:x.title,category:x.category,subcategory:x.subcategory,price_ngn:x.priceNgn,stock_qty:x.stockQty,rating:x.rating,review_count:x.reviewCount,cod_eligible:x.codEligible,image_url:x.imageUrl,image_rights_status:x.imageRightsStatus,resale_status:x.resaleStatus,recommendation_score:score(x),publishable:false,status:"qualified",source_url:x.sourceUrl,metadata:x.metadata}));const {error}=await supabase.from("recommendation_candidates").upsert(rows,{onConflict:"catalog_id,external_product_id"});if(error)throw error;}
await supabase.from("recommendation_catalog_runs").update({status:"completed",completed_at:new Date().toISOString()}).eq("id",run.id);
console.log(JSON.stringify({source:"JUMIA_NG_COD",input:candidates.length,qualified:qualifiedItems.length,selected:pool.length,target:TARGET},null,2));
