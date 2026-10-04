// ResoFit storefront data client. Supabase is the canonical catalog source.
export const RESOFIT_SUPABASE_URL="https://vbqjvmnhdtdhmeeudqnn.supabase.co";
export const RESOFIT_STOREFRONT_URL=`${RESOFIT_SUPABASE_URL}/functions/v1/storefront-products`;
export const RESOFIT_CATALOG_URL=`${RESOFIT_SUPABASE_URL}/functions/v1/catalog-public`;

export interface MoneyV2{amount:string;currencyCode:string}
export interface ShopifyImage{url:string;altText:string|null}
export interface ShopifyVariant{id:string;title:string;price:MoneyV2;availableForSale:boolean;selectedOptions:Array<{name:string;value:string}>}
export interface ShopifyProductNode{id:string;title:string;description:string;descriptionHtml?:string;handle:string;sku?:string|null;productType?:string;vendor?:string;tags?:string[];fulfillmentMode?:string|null;priceRange:{minVariantPrice:MoneyV2};images:{edges:Array<{node:ShopifyImage}>};variants:{edges:Array<{node:ShopifyVariant}>};options:Array<{name:string;values:string[]}>}
export interface ShopifyProduct{node:ShopifyProductNode}
type StorefrontProduct={id:string;handle:string;title:string;body_html:string|null;vendor:string|null;product_type:string;tags:string[]|null;published:boolean;variant_price:number;variant_inventory_qty:number;image_src:string|null;sku:string|null;fulfillment_mode?:string|null};
type CatalogAsset={sku:string;role:string;filename:string;canonical_url:string;image_position:number|null};
const STOREFRONT_REQUEST_TIMEOUT_MS=8000;
async function fetchWithTimeout(input:RequestInfo|URL,init:RequestInit={}):Promise<Response>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),STOREFRONT_REQUEST_TIMEOUT_MS);try{return await fetch(input,{...init,signal:controller.signal})}catch(error){if(error instanceof DOMException&&error.name==="AbortError")throw new Error(`ResoFit catalog request timed out after ${STOREFRONT_REQUEST_TIMEOUT_MS}ms`);throw error}finally{clearTimeout(timer)}}

function mapProduct(p:StorefrontProduct,assets:CatalogAsset[]=[]):ShopifyProductNode{
 const price={amount:String(p.variant_price??0),currencyCode:"NGN"};
 const variant:ShopifyVariant={id:p.id,title:"Default Title",price,availableForSale:(p.variant_inventory_qty??0)>0,selectedOptions:[]};
 const approved=assets.filter(a=>{try{const host=new URL(a.canonical_url).hostname.toLowerCase();return host.endsWith("imagekit.io")||host.endsWith("public.blob.vercel-storage.com")}catch{return false}});
 const roleOrder=new Map([["hero",1],["lifestyle",2],["detail",3],["gallery-01",4],["gallery-02",5],["gallery-03",6]]);
 const ordered=(approved.length?approved:assets).filter(a=>a.canonical_url).sort((a,b)=>(roleOrder.get(a.role)??99)-(roleOrder.get(b.role)??99)||(a.image_position??Number.MAX_SAFE_INTEGER)-(b.image_position??Number.MAX_SAFE_INTEGER));
 const registryImages=ordered.slice(0,6).map(a=>({url:a.canonical_url,altText:`${p.title} ${a.role.replace(/[-_]/g," ")}`.trim()}));
 const images=registryImages.length?registryImages:p.image_src?[{url:p.image_src,altText:p.title}]:[];
 const description=p.body_html?.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()||`Explore ${p.title} from ResoFit${p.product_type?` — ${p.product_type}`:""}. View product details, availability and secure checkout.`;
 return{id:p.id,title:p.title,description,descriptionHtml:p.body_html??undefined,handle:p.handle,sku:p.sku,productType:p.product_type,vendor:p.vendor??"ResoFlex",tags:p.tags??[],fulfillmentMode:p.fulfillment_mode??null,priceRange:{minVariantPrice:price},images:{edges:images.map(node=>({node}))},variants:{edges:[{node:variant}]},options:[]};
}
async function fetchStorefrontProducts(handle:string|null):Promise<StorefrontProduct[]>{const url=new URL(RESOFIT_STOREFRONT_URL);if(handle)url.searchParams.set("handle",handle);const response=await fetchWithTimeout(url.toString(),{method:"GET",cache:"no-store"});if(!response.ok)throw new Error(`ResoFit storefront HTTP ${response.status}`);const payload=await response.json() as {products?:StorefrontProduct[];error?:string};if(payload.error)throw new Error(payload.error);return payload.products??[]}
async function fetchCanonicalCatalog(handle:string|null):Promise<StorefrontProduct[]>{const url=new URL(handle?`${RESOFIT_CATALOG_URL}/product`:RESOFIT_CATALOG_URL);if(handle)url.searchParams.set("handle",handle);else url.searchParams.set("limit","200");const response=await fetchWithTimeout(url.toString(),{method:"GET",cache:"no-store"});if(!response.ok)throw new Error(`ResoFit canonical catalog HTTP ${response.status}`);const payload=await response.json() as {data?:StorefrontProduct|StorefrontProduct[];error?:string};if(payload.error)throw new Error(payload.error);if(handle)return payload.data?[payload.data as StorefrontProduct]:[];return Array.isArray(payload.data)?payload.data:[]}
async function fetchCanonicalAssets(handle:string):Promise<CatalogAsset[]>{if(!handle)return[];const url=new URL(`${RESOFIT_CATALOG_URL}/assets`);url.searchParams.set("handle",handle);url.searchParams.set("limit","50");const response=await fetchWithTimeout(url.toString(),{method:"GET",cache:"no-store"});if(!response.ok)throw new Error(`ResoFit catalog assets HTTP ${response.status}`);const payload=await response.json() as {data?:CatalogAsset[];error?:string};if(payload.error)throw new Error(payload.error);return Array.isArray(payload.data)?payload.data:[]}

export async function storefrontApiRequest<T=unknown>(query:string,variables:Record<string,unknown>={}):Promise<{data?:T;errors?:Array<{message:string}>}|undefined>{
 const handle=typeof variables.handle==="string"?variables.handle:null;let products:StorefrontProduct[]=[];
 try{products=await fetchCanonicalCatalog(handle)}catch(error){console.warn("Canonical catalog unavailable; using storefront compatibility fallback",error);products=await fetchStorefrontProducts(handle)}
 const isHandleQuery=/product\s*\(handle/i.test(query);
 // Product grids must not fan out into one catalog-assets request per product.
 // Fetch the six canonical assets only for an individual product page; the grid
 // can use the lightweight image_src and stays responsive on mobile.
 const assetEntries=isHandleQuery&&products[0]?.handle
   ? [[products[0].handle,await fetchCanonicalAssets(products[0].handle).catch(()=>[])] as const]
   : [];
 const assetMap=new Map(assetEntries);
 const nodes=products.map(product=>mapProduct(product,assetMap.get(product.handle)??[]));const mappedProducts=isHandleQuery?(nodes[0]??null):{edges:nodes.map(node=>({node}))};
 if(isHandleQuery)return{data:{product:mappedProducts} as T};if(/products\s*\(/i.test(query))return{data:{products:mappedProducts} as T};if(/query\s+cart/i.test(query))return{data:{cart:null} as T};throw new Error("Unsupported storefront operation");
}
export type EcosystemSearchResult={id:string;type:string;title:string;description?:string|null;href:string;source?:string;metadata?:Record<string,unknown>};
export async function ecosystemSearch(query:string):Promise<{query:string;results:EcosystemSearchResult[];groups:Record<string,number>}>{const q=query.trim();if(!q)return{query:q,results:[],groups:{}};const url=new URL(RESOFIT_CATALOG_URL+"/search");url.searchParams.set("q",q);url.searchParams.set("limit","8");const response=await fetch(url.toString(),{method:"GET",cache:"no-store"});if(!response.ok)throw new Error(`ResoFit ecosystem search HTTP ${response.status}`);const payload=await response.json() as {query?:string;results?:EcosystemSearchResult[];groups?:Record<string,number>;error?:string};if(payload.error)throw new Error(payload.error);return{query:payload.query??q,results:payload.results??[],groups:payload.groups??{}}}
export const PRODUCTS_QUERY=/* GraphQL */`query GetProducts($first: Int!, $query: String) { products(first: $first, query: $query) { edges { node { id title description handle productType vendor tags priceRange { minVariantPrice { amount currencyCode } } images(first: 5) { edges { node { url altText } } } variants(first: 10) { edges { node { id title availableForSale price { amount currencyCode } selectedOptions { name value } } } } options { name values } } } }`;
export const PRODUCT_BY_HANDLE_QUERY=/* GraphQL */`query ProductByHandle($handle: String!) { product(handle: $handle) { id title description descriptionHtml handle productType vendor tags priceRange { minVariantPrice { amount currencyCode } } images(first: 12) { edges { node { url altText } } } variants(first: 50) { edges { node { id title availableForSale price { amount currencyCode } selectedOptions { name value } } } } options { name values } } }`;
export const CART_QUERY=`query cart($id: ID!) { cart(id: $id) { id totalQuantity } }`;
export const CART_CREATE_MUTATION="";export const CART_LINES_ADD_MUTATION="";export const CART_LINES_UPDATE_MUTATION="";export const CART_LINES_REMOVE_MUTATION="";
export function formatCheckoutUrl(checkoutUrl:string):string{return checkoutUrl}
export function isCartNotFoundError(userErrors:Array<{field:string[]|null;message:string}>):boolean{return userErrors.some(e=>e.message.toLowerCase().includes("cart not found")||e.message.toLowerCase().includes("does not exist"))}
export function formatMoney(money:MoneyV2):string{const amount=parseFloat(money.amount);try{return new Intl.NumberFormat("en-NG",{style:"currency",currency:money.currencyCode,maximumFractionDigits:money.currencyCode==="NGN"?0:2}).format(amount)}catch{return`${money.currencyCode} ${amount.toFixed(2)}`}}
const NGN_PER_USD=1600;
export function approxUSD(money:MoneyV2):string{const amount=parseFloat(money.amount);const usd=money.currencyCode==="NGN"?amount/NGN_PER_USD:amount;return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:usd>=100?0:2}).format(usd)}
