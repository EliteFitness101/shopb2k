import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@/lib/shopify";
import { ProductImage } from "@/components/ProductImage";

interface Props { currentHandle: string; productType?: string; title?: string; }
type Recommendation={id:string;sku:string|null;handle:string;title:string;product_type:string|null;price:number;inventory:number;image:string|null;score:number;lifecycle:string|null;route:string};
const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const SUPABASE_KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;

export function RecommendedProducts({currentHandle,productType,title="Recommended for you"}:Props){
 const {data}=useQuery({queryKey:["chatb2k-recommend",currentHandle,productType??"all"],queryFn:async()=>{
  if(!SUPABASE_URL||!SUPABASE_KEY)return [] as Recommendation[];
  const r=await fetch(`${SUPABASE_URL.replace(/\/$/,"")}/functions/v1/chatb2k-recommend`,{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({query:productType??currentHandle.replace(/[-_]/g," "),product_type:productType??"",limit:6})});
  if(!r.ok)return [] as Recommendation[]; const b=await r.json(); return (b.recommendations??[]) as Recommendation[];
 },staleTime:60000});
 const items=(data??[]).filter(p=>p.handle!==currentHandle).slice(0,3); if(!items.length)return null;
 return <section className="mt-16 border-t border-border/60 pt-10"><div className="mb-6 flex items-baseline justify-between"><h2 className="font-display text-2xl">{title}</h2><Link to="/shop" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-gold">Shop all →</Link></div><div className="grid gap-6 sm:grid-cols-3">{items.map(p=><Link key={p.id} to="/product/$handle" params={{handle:p.handle}} className="group block"><div className="relative overflow-hidden border border-border/60"><ProductImage src={p.image??undefined} alt={p.title} title={p.title} category={p.product_type??"wellness"} productId={p.id} tier="medium"/><span className="absolute left-2 top-2 rounded-sm bg-gold/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold-foreground">ChatB2K match</span></div><p className="mt-3 text-sm text-foreground group-hover:text-gold">{p.title}</p><p className="mt-1 text-xs text-gold">{formatMoney({amount:String(p.price),currencyCode:"NGN"})}</p></Link>)}</div></section>;
}
