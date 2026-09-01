import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const Route = createFileRoute("/wellness/makaveli")({
  head: () => ({
    meta: [
      { title: "Makaveli Wellness Spa — ResoFit" },
      { name: "description", content: "Makaveli Wellness Spa — ResoFit's Phase-1 wellness and recovery partner hub in Aba, Abia." },
      { property: "og:title", content: "Makaveli Wellness Spa — ResoFit" },
      { property: "og:description", content: "Wellness and recovery services through the ResoFit Wellness Network." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://resofit.fit/wellness/makaveli" },
      { property: "og:image", content: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/cover/resofit-cover-3.jpeg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/cover/resofit-cover-3.jpeg" },
    ],
    links: [{ rel: "canonical", href: "https://resofit.fit/wellness/makaveli" }],
  }),
  component: MakaveliWellness,
});

type Hub = { id:string; hub_code:string; name:string; description:string|null; phone:string|null; whatsapp:string|null; distance_km:number|null; services:Array<{id:string;service_name:string;price:number|null;currency:string;booking_method:string}> };
async function locator<T>(params:Record<string,string|number|undefined>){if(!SUPABASE_URL)throw new Error("Wellness locator is not configured");const q=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!=="")q.set(k,String(v))});const r=await fetch(`${SUPABASE_URL}/functions/v1/wellness-locator?${q}`,{headers:SUPABASE_KEY?{apikey:SUPABASE_KEY}:undefined});if(!r.ok)throw new Error(`Wellness locator failed: ${r.status}`);return r.json() as Promise<T>}
function MakaveliWellness(){const[hub,setHub]=useState<Hub|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState(false);useEffect(()=>{locator<{results:Hub[]}>({action:"nearby",q:"Makaveli Wellness Hub",state:"abia",city:"aba"}).then(d=>setHub(d.results.find(x=>x.hub_code==="MKV-ABA-001")??d.results[0]??null)).catch(()=>setError(true)).finally(()=>setLoading(false))},[]);const whatsapp=hub?.whatsapp?(hub.whatsapp.startsWith("http")?hub.whatsapp:`https://wa.me/${hub.whatsapp.replace(/\D/g,"")}`):null;const phone=hub?.phone??null;return <div className="min-h-screen bg-background"><SiteHeader/><main><section className="border-b border-border/60"><div className="mx-auto max-w-7xl px-6 py-24 md:py-32"><p className="text-xs uppercase tracking-[0.35em] text-gold">ResoFit Wellness Network · Aba</p><h1 className="mt-5 max-w-4xl font-display text-6xl leading-[0.92] md:text-8xl">Makaveli<br/><span className="text-gradient-gold">Wellness Spa.</span></h1><p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">A Phase-1 wellness and recovery partner hub in Aba, connected to the ResoFit Wellness Network.</p><div className="mt-10 flex flex-wrap gap-3">{whatsapp&&<a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground"><MessageCircle className="h-4 w-4"/>WhatsApp</a>}{phone&&<a href={`tel:${phone}`} className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest"><Phone className="h-4 w-4"/>Call</a>}<Link to="/wellness/states/cities/hubs/geo-locator" className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest">Open Wellness Locator <ArrowRight className="h-4 w-4"/></Link></div></div></section><section className="py-20"><div className="mx-auto max-w-7xl px-6">{loading?<p className="text-sm text-muted-foreground">Checking the canonical wellness registry…</p>:error?<div className="border border-border/60 p-8"><h2 className="font-display text-3xl">Makaveli Wellness Spa</h2><p className="mt-3 text-sm text-muted-foreground">The wellness registry is temporarily unavailable.</p></div>:hub?<div className="grid gap-10 md:grid-cols-[1.3fr_.7fr]"><div><p className="text-xs uppercase tracking-[0.3em] text-gold">Partner hub</p><h2 className="mt-3 font-display text-4xl md:text-5xl">{hub.name}</h2><p className="mt-5 max-w-2xl text-muted-foreground">{hub.description??"Wellness and recovery services connected to ResoFit."}</p><div className="mt-8 flex items-start gap-3 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold"/><span>Aba, Abia, Nigeria · exact location controlled by ChatB2K™</span></div></div><div className="border border-border/60 p-6"><p className="text-xs uppercase tracking-[0.25em] text-gold">Available services</p><div className="mt-5 space-y-3">{hub.services.map(s=><div key={s.id} className="border-b border-border/50 pb-3 text-sm">{s.service_name}{s.price!==null&&<span className="float-right text-muted-foreground">{s.currency} {s.price.toLocaleString()}</span>}</div>)}</div><p className="mt-5 text-xs text-muted-foreground">Hub code: {hub.hub_code}</p></div></div>:<div className="border border-border/60 p-8"><h2 className="font-display text-3xl">Makaveli Wellness Spa</h2><p className="mt-3 text-sm text-muted-foreground">This partner is registered in the ResoFit system but is not currently returning as a published verified location.</p></div>}</div></section></main><SiteFooter/></div>}
