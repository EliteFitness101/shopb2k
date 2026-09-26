import * as React from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { ArrowRight, CalendarDays, GraduationCap, MapPin, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const URL=import.meta.env.VITE_SUPABASE_URL??"https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY??import.meta.env.VITE_SUPABASE_ANON_KEY;
const db=KEY?createClient(URL,KEY):null;

type Page={id:string;page_type:string;source_type:string;source_key:string;slug:string;canonical_path:string;template_key:string;version:number;manifest:Record<string,unknown>;seo:Record<string,unknown>;commerce:Record<string,unknown>;booking:Record<string,unknown>;access:Record<string,unknown>;media:Record<string,unknown>};

export const Route=createFileRoute("/experience/$type/$slug")({
 component:ExperiencePage,
 head:({params})=>({meta:[{title:"ResoFit Experience"},{name:"robots",content:"index,follow"}]})
});

async function getPage(type:string,slug:string){
 if(!db)return null;
 const {data,error}=await db.from("experience_page_registry").select("id,page_type,source_type,source_key,slug,canonical_path,template_key,version,manifest,seo,commerce,booking,access,media").eq("page_type",type.replaceAll("-","_")).eq("slug",slug).eq("status","published").maybeSingle();
 if(error)throw error;
 return data as Page|null;
}
function text(v:unknown,fallback=""){return typeof v==="string"&&v.trim()?v:fallback}
function ExperiencePage(){
 const {type,slug}=Route.useParams();
 const [page,setPage]=React.useState<Page|null|undefined>(undefined);
 React.useEffect(()=>{void getPage(type,slug).then(setPage).catch(()=>setPage(null))},[type,slug]);
 if(page===undefined)return <div className="min-h-screen bg-background"><SiteHeader/><main className="mx-auto max-w-5xl px-6 py-32"><p className="text-sm text-muted-foreground">Loading experience…</p></main><SiteFooter/></div>;
 if(!page)throw notFound();
 const title=text(page.seo.title,text(page.manifest.title,page.slug.replaceAll("-"," ")));
 const description=text(page.seo.description,text(page.manifest.description,"A ResoFit experience powered by canonical ecosystem data."));
 const image=text(page.media.hero,text(page.manifest.image,""));
 const kind=page.page_type;
 const cta=typeof page.commerce.checkout_path==="string"?page.commerce.checkout_path:kind==="booking"||kind==="service"?"/wellness/makaveli/book":kind==="product"||kind==="digital_product"?"/product/"+page.slug:kind==="course"?"/experience/course/"+page.slug:"/contact";
 return <div className="min-h-screen bg-background"><SiteHeader/><main>
  <section className="border-b border-border/60 bg-gradient-to-b from-gold/[0.08] to-transparent"><div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
   <p className="text-xs uppercase tracking-[.35em] text-gold">{kind.replaceAll("_"," ")} · ResoFit</p>
   <h1 className="mt-4 max-w-5xl font-display text-5xl leading-[.95] md:text-8xl">{title}</h1>
   <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">{description}</p>
   <div className="mt-8 flex flex-wrap gap-3"><a href={cta} className="inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground">{kind==="booking"||kind==="service"?"Book experience":kind==="course"?"View programme":"Continue"}<ArrowRight className="h-4 w-4"/></a>
    {kind==="course"&&<span className="inline-flex items-center gap-2 border border-border px-5 py-3 text-xs uppercase tracking-widest"><GraduationCap className="h-4 w-4 text-gold"/>Education</span>}
    {kind==="booking"&&<span className="inline-flex items-center gap-2 border border-border px-5 py-3 text-xs uppercase tracking-widest"><CalendarDays className="h-4 w-4 text-gold"/>Booking</span>}
   </div>
  </div></section>
  <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-[1.35fr_.65fr]">
   <article className="border border-border/60 bg-card/20 p-7 md:p-10">{image&&<img src={image} alt={title} className="mb-8 aspect-video w-full object-cover"/>}
    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold"><Sparkles className="h-4 w-4"/>Canonical ecosystem experience</div>
    <p className="mt-5 text-sm leading-7 text-muted-foreground">This experience is rendered from the ResoFit Experience Registry. The underlying product, service, education, booking, payment and fulfillment authorities remain unchanged.</p>
    {page.manifest.features&&Array.isArray(page.manifest.features)&&<ul className="mt-7 grid gap-3 md:grid-cols-2">{(page.manifest.features as unknown[]).slice(0,8).map((x,i)=><li key={i} className="border border-border/60 p-4 text-sm text-muted-foreground">{String(x)}</li>)}</ul>}
   </article>
   <aside className="h-fit border border-border/60 bg-card/20 p-7"><p className="text-xs uppercase tracking-widest text-gold">Experience details</p>
    <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-muted-foreground">Type</dt><dd className="mt-1">{kind.replaceAll("_"," ")}</dd></div><div><dt className="text-muted-foreground">Source</dt><dd className="mt-1 font-mono text-xs">{page.source_type} · {page.source_key}</dd></div><div><dt className="text-muted-foreground">Template</dt><dd className="mt-1 font-mono text-xs">{page.template_key} · v{page.version}</dd></div></dl>
    {kind==="location"&&<div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 text-gold"/>Location experience</div>}
   </aside>
  </section>
 </main><SiteFooter/></div>;
}