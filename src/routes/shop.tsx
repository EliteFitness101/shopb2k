import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductImage } from "@/components/ProductImage";
import { recordEngagement } from "@/lib/imagePriority";
import { PRODUCTS_QUERY, approxUSD, formatMoney, storefrontApiRequest, ecosystemSearch, type EcosystemSearchResult, type ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { track } from "@/lib/tracking";

type SortKey = "featured" | "newest" | "price_asc" | "price_desc";
const SHOP_URL = "https://www.resofit.fit/shop";

export const Route = createFileRoute("/shop")({
  head:()=>({meta:[
    {title:"ResoFit™ Shop — Premium Wellness, Performance & Equipment"},
    {name:"description",content:"Explore ResoFit™ digital programs, nutrition, recovery, apparel, accessories, equipment and curated bundles with secure Paystack checkout."},
    {property:"og:title",content:"ResoFit™ Shop — Premium Wellness, Performance & Equipment"},
    {property:"og:description",content:"A curated ResoFit™ commerce experience across digital, physical and hybrid products."},
    {property:"og:type",content:"website"},{property:"og:url",content:SHOP_URL},
  ],links:[{rel:"canonical",href:SHOP_URL}]}),
  validateSearch:(s:{q?:string;type?:string;vendor?:string;sort?:string})=>({
    q:typeof s.q==="string"?s.q:undefined,type:typeof s.type==="string"?s.type:undefined,vendor:typeof s.vendor==="string"?s.vendor:undefined,
    sort:(typeof s.sort==="string"?s.sort:"featured") as SortKey,
  }),
  component:Shop,
});

async function fetchProducts():Promise<ShopifyProduct[]>{
  const res=await storefrontApiRequest<{products:{edges:ShopifyProduct[]}}>(PRODUCTS_QUERY,{first:60});
  return res?.data?.products?.edges??[];
}

function Shop(){
  return <div className="min-h-screen bg-background"><SiteHeader/>
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(201,162,74,.12),transparent_40%)]"/>
      <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28">
        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-gold">ResoFit™ Commerce</p>
        <h1 className="max-w-5xl font-display text-6xl leading-[.9] md:text-8xl">Curated for<br/><span className="text-gradient-gold">your next level.</span></h1>
        <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">Digital transformation programs, Nigerian nutrition, recovery, apparel, accessories, performance equipment and premium bundles — discovered through one unified catalog.</p>
        <div className="mt-8 flex flex-wrap gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          {["Digital delivery","Nationwide shipping","Secure Paystack","ChatB2K™ guidance"].map(x=><span key={x} className="rounded-full border border-gold/20 bg-white/[.03] px-4 py-2">{x}</span>)}
        </div>
      </div>
    </section>
    <ShopGrid/><SiteFooter/>
  </div>;
}

function ShopGrid(){
  const search=Route.useSearch(); const navigate=Route.useNavigate();
  const {data,isLoading,isError}=useQuery({queryKey:["products","all"],queryFn:fetchProducts,staleTime:60000,enabled:!search.q});
  const {data:ecosystem,isLoading:ecosystemLoading,isError:ecosystemError}=useQuery({queryKey:["ecosystem-search",search.q??""],queryFn:()=>ecosystemSearch(search.q??""),staleTime:30000,enabled:Boolean(search.q?.trim())});
  const productTypes=useMemo(()=>Array.from(new Set((data??[]).map(p=>p.node.productType).filter(Boolean) as string[])).sort(),[data]);
  const vendors=useMemo(()=>Array.from(new Set((data??[]).map(p=>p.node.vendor).filter(Boolean) as string[])).sort(),[data]);
  const filtered=useMemo(()=>{
    let list=data??[]; const query=search.q?.trim().toLowerCase();
    if(query) list=list.filter(p=>[p.node.title,p.node.description,p.node.productType,p.node.vendor,p.node.handle,...(p.node.tags??[])].filter(Boolean).some(v=>String(v).toLowerCase().includes(query)));
    if(search.type) list=list.filter(p=>p.node.productType===search.type);
    if(search.vendor) list=list.filter(p=>p.node.vendor===search.vendor);
    const sorted=[...list]; switch(search.sort){
      case"price_asc":sorted.sort((a,b)=>parseFloat(a.node.priceRange.minVariantPrice.amount)-parseFloat(b.node.priceRange.minVariantPrice.amount));break;
      case"price_desc":sorted.sort((a,b)=>parseFloat(b.node.priceRange.minVariantPrice.amount)-parseFloat(a.node.priceRange.minVariantPrice.amount));break;
      case"newest":sorted.sort((a,b)=>a.node.id<b.node.id?1:-1);break;
      default:break;
    } return sorted;
  },[data,search.q,search.type,search.vendor,search.sort]);
  useEffect(()=>{if(!search.type||search.vendor||filtered.length!==1)return;window.location.replace(`/product/${filtered[0].node.handle}`);},[filtered,search.type,search.vendor]);
  const updateSearch=(patch:Partial<typeof search>)=>navigate({search:(prev:typeof search)=>({...prev,...patch}),replace:true});
  if(search.q?.trim()) return <EcosystemSearchResults query={search.q.trim()} data={ecosystem} loading={ecosystemLoading} error={ecosystemError}/>;
  return <section className="py-14"><div className="mx-auto max-w-7xl px-6">
    {data&&data.length>0&&<div className="mb-10 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-end gap-4">
        {productTypes.length>0&&<label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">Category<select value={search.type??""} onChange={e=>updateSearch({type:e.target.value||undefined})} aria-label="Filter by category" className="min-w-44 rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none"><option value="">All categories</option>{productTypes.map(t=><option key={t} value={t}>{t}</option>)}</select></label>}
        {vendors.length>0&&<label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">Brand / vendor<select value={search.vendor??""} onChange={e=>updateSearch({vendor:e.target.value||undefined})} aria-label="Filter by brand or vendor" className="min-w-44 rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none"><option value="">All brands</option>{vendors.map(v=><option key={v} value={v}>{v}</option>)}</select></label>}
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">Sort<select value={search.sort} onChange={e=>updateSearch({sort:e.target.value as SortKey})} aria-label="Sort products" className="min-w-44 rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price_asc">Price: Low → High</option><option value="price_desc">Price: High → Low</option></select></label>}
        <p className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">{filtered.length} {filtered.length===1?"product":"products"}</p>
        {(search.type||search.vendor)&&<button type="button" onClick={()=>updateSearch({type:undefined,vendor:undefined})} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-gold">Clear filters</button>}
      </div>
    </div>}
    {isLoading&&<div className="flex justify-center py-32 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin"/></div>}
    {isError&&<p className="py-16 text-center text-sm text-muted-foreground">Couldn't load products. Try refreshing.</p>}
    {data&&filtered.length===0&&<div className="py-24 text-center"><p className="font-display text-2xl">No products found</p><p className="mt-2 text-sm text-muted-foreground">Clear the filters or ask ChatB2K™ to refine the right ResoFit pathway.</p></div>}
    {filtered.length>0&&<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((p,i)=><ProductCard key={p.node.id} product={p} placement={i}/>)}</div>}
    <p className="mt-16 text-center text-xs uppercase tracking-widest text-muted-foreground">Secure Paystack checkout · Digital delivery where applicable · Shipping calculated at checkout</p>
  </div></section>;
}

function EcosystemSearchResults({query,data,loading,error}:{query:string;data?:{results:EcosystemSearchResult[];groups:Record<string,number>};loading:boolean;error:boolean}){
 return <section className="py-12"><div className="mx-auto max-w-7xl px-6">
  <div className="mb-10 border-b border-border/60 pb-6"><p className="text-[10px] uppercase tracking-[.3em] text-gold">ResoFit™ Unified Search</p><h2 className="mt-2 font-display text-4xl">Results for “{query}”</h2><p className="mt-2 text-sm text-muted-foreground">Products, programs, wellness, network, content, offers and ChatB2K™ knowledge.</p>{data?.groups&&<p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">{Object.entries(data.groups).map(([k,v])=>k+": "+v).join(" · ")}</p>}</div>
  {loading&&<div className="py-24 text-center text-sm text-muted-foreground">Searching the ResoFit™ ecosystem…</div>}
  {error&&<div className="py-24 text-center text-sm text-muted-foreground">Search is temporarily unavailable. ChatB2K™ remains available for assisted discovery.</div>}
  {!loading&&!error&&data?.results.length===0&&<div className="py-24 text-center"><p className="font-display text-2xl">No direct match found</p><p className="mt-2 text-sm text-muted-foreground">Try a broader phrase or ask ChatB2K™ to refine the intent.</p></div>}
  {!loading&&!error&&data?.results.length?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.results.map(item=><a key={item.id} href={item.href} className="group rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-gold/60"><div className="text-[10px] uppercase tracking-[.25em] text-gold">{item.type.replace(/_/g," ")}{item.source?" · "+item.source:""}</div><h3 className="mt-2 font-display text-xl group-hover:text-gold">{item.title}</h3>{item.description&&<p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.description}</p>}<div className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">Explore →</div></a>)}</div>:null}
  <div className="mt-12 rounded-2xl border border-gold/20 bg-gold/5 p-6"><p className="text-xs uppercase tracking-[.25em] text-gold">ChatB2K™ Knowledge</p><p className="mt-2 text-sm text-muted-foreground">Personalized discovery remains available when catalog search is not enough.</p><Link to="/me" className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gold-foreground">Ask ChatB2K™</Link></div>
 </div></section>;
}

function ProductCard({product,placement=99}:{product:ShopifyProduct;placement?:number}){
 const node=product.node; const variants=node.variants.edges.map(e=>e.node); const firstAvail=variants.find(v=>v.availableForSale)??variants[0]; const image=node.images.edges[0]?.node; const price=node.priceRange.minVariantPrice;
 const addItem=useCartStore(s=>s.addItem); const isLoading=useCartStore(s=>s.isLoading); const [busy,setBusy]=useState(false);
 const handleAdd=async()=>{if(!firstAvail)return;setBusy(true);try{await addItem({product:{id:node.id,title:node.title,handle:node.handle,sku:node.sku,images:node.images},variantId:firstAvail.id,variantTitle:firstAvail.title,price:firstAvail.price,quantity:1,selectedOptions:firstAvail.selectedOptions});track("add_to_cart",{product_id:node.sku||node.id,product_title:node.title,quantity:1,value:Number(firstAvail.price.amount),currency:firstAvail.price.currencyCode??"NGN"});recordEngagement(node.id,"add_to_cart");toast.success(`Added ${node.title} to cart`,{position:"top-center"});}finally{setBusy(false);}};
 return <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-2xl hover:shadow-black/30">
  <Link to="/product/$handle" params={{handle:node.handle}} className="relative block"><ProductImage src={image?.url} alt={image?.altText} title={node.title} category={node.productType} productId={node.id} placement={placement} className="group-hover:[&>img]:scale-105"/>{node.productType&&<span className="absolute left-4 top-4 z-10 rounded-full bg-background/85 px-3 py-1 text-[9px] uppercase tracking-widest text-gold backdrop-blur">{node.productType}</span>}</Link>
  <div className="flex flex-1 flex-col p-6"><Link to="/product/$handle" params={{handle:node.handle}}><h2 className="font-display text-2xl leading-tight hover:text-gold">{node.title}</h2></Link>{node.description&&<p className="mt-3 flex-1 line-clamp-3 text-sm leading-6 text-muted-foreground">{node.description}</p>}
   <div className="mt-6 flex items-end justify-between gap-4 border-t border-border/60 pt-5"><div><p className="font-display text-2xl text-gold">{formatMoney(price)}</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground">≈ {approxUSD(price)} · NGN</p></div><button type="button" onClick={handleAdd} disabled={busy||isLoading||!firstAvail?.availableForSale} className="inline-flex h-11 items-center justify-center rounded-sm bg-foreground px-5 text-xs font-semibold uppercase tracking-widest text-background transition-colors hover:bg-gold hover:text-gold-foreground disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:firstAvail?.availableForSale?"Add to cart":"Sold out"}</button></div>
  </div>
 </article>;
}
