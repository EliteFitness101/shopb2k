import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, MapPin, MessageCircle, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

type DirectoryEntity = { id:string; entity_type:string; slug:string; name:string; tagline:string|null; description:string|null; country_code:string; state:string|null; city:string|null; public_location_label:string|null; services:string[]; capabilities:string[]; verification_status:string; contract_status:string; status:string; public_metadata:Record<string,unknown>; last_verified_at:string|null; contact?:{phone:string|null;whatsapp:string|null;website:string|null;email:string|null}; };

async function orchestrate(q:string) {
  if (!SUPABASE_URL) throw new Error("ChatB2K is not configured");
  const params = new URLSearchParams({ q });
  const r = await fetch(`${SUPABASE_URL}/functions/v1/chatb2k-orchestrator?${params}`, { headers: SUPABASE_KEY ? { apikey: SUPABASE_KEY } : undefined });
  if (!r.ok) throw new Error("Orchestrator unavailable");
  return r.json() as Promise<{results:DirectoryEntity[]}>;
}

export const Route = createFileRoute("/wellness/hubs/$slug")({
  loader: async ({ params }) => {
    if (!SUPABASE_URL) throw new Error("Directory unavailable");
    const r = await fetch(`${SUPABASE_URL}/functions/v1/chatb2k-orchestrator?q=${encodeURIComponent(params.slug)}&type=wellness_hub`, { headers: SUPABASE_KEY ? { apikey: SUPABASE_KEY } : undefined });
    if (!r.ok) throw notFound();
    const data = await r.json() as { results:DirectoryEntity[] };
    const entity = data.results.find((x) => x.slug === params.slug);
    if (!entity) throw notFound();
    return entity;
  },
  head: ({ loaderData }) => ({ meta:[{title:`${loaderData.name} — ResoFit Wellness`},{name:"description",content:loaderData.tagline ?? loaderData.description ?? "Verified ResoFit Wellness Network partner."},{property:"og:title",content:`${loaderData.name} — ResoFit Wellness`},{property:"og:description",content:loaderData.tagline ?? "Verified ResoFit Wellness Network partner."},{property:"og:type",content:"website"},{property:"og:url",content:`https://resofit.fit/wellness/hubs/${loaderData.slug}`}],links:[{rel:"canonical",href:`https://resofit.fit/wellness/hubs/${loaderData.slug}`}] }),
  component: DynamicHubPage,
});

function DynamicHubPage(){
  const initial = Route.useLoaderData(); const [entity,setEntity]=useState(initial); const [loading,setLoading]=useState(false);
  useEffect(()=>{ let live=true; setLoading(true); orchestrate(entity.slug).then(d=>{const fresh=d.results.find(x=>x.slug===entity.slug);if(live&&fresh)setEntity(fresh)}).finally(()=>{if(live)setLoading(false)}); return()=>{live=false}},[entity.slug]);
  const wa=entity.contact?.whatsapp ? (entity.contact.whatsapp.startsWith("http")?entity.contact.whatsapp:`https://wa.me/${entity.contact.whatsapp.replace(/\D/g,"")}`):null;
  return <div className="min-h-screen bg-background"><SiteHeader/><main>
    <section className="border-b border-border/60"><div className="mx-auto max-w-7xl px-6 py-24 md:py-32"><p className="text-xs uppercase tracking-[0.35em] text-gold">ResoFit Wellness Network · {entity.city ?? "Nigeria"}</p><h1 className="mt-5 max-w-5xl font-display text-6xl leading-[0.92] md:text-8xl">{entity.name}</h1>{entity.tagline&&<p className="mt-6 max-w-2xl text-xl text-muted-foreground">{entity.tagline}</p>}<div className="mt-9 flex flex-wrap gap-3">{wa&&<a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground"><MessageCircle className="h-4 w-4"/>Connect</a>}{entity.contact?.phone&&<a href={`tel:${entity.contact.phone}`} className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest"><Phone className="h-4 w-4"/>Call</a>}<Link to="/wellness/states/cities/hubs/geo-locator" className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest">Find with ChatB2K <ArrowRight className="h-4 w-4"/></Link></div></div></section>
    <section className="py-20"><div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1.2fr_.8fr]"><div><p className="text-xs uppercase tracking-[0.3em] text-gold">Verified profile</p><p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{entity.description ?? "A verified partner in the ResoFit ecosystem."}</p><div className="mt-8 flex items-start gap-3 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold"/><span>{entity.public_location_label ?? [entity.city,entity.state,entity.country_code].filter(Boolean).join(", ")}</span></div><p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Exact address is intentionally private. ChatB2K can guide eligible clients when appropriate.</p></div><aside className="border border-border/60 p-6"><p className="text-xs uppercase tracking-[0.25em] text-gold">Services & capabilities</p><div className="mt-5 flex flex-wrap gap-2">{[...entity.services,...entity.capabilities].map((x,i)=><span key={`${x}-${i}`} className="border border-border px-3 py-2 text-xs">{x}</span>)}</div><p className="mt-6 text-xs text-muted-foreground">{entity.contract_status === "active" ? "Active ecosystem contract" : "Partner status: " + entity.contract_status}{loading&&" · refreshing"}</p></aside></div></section>
  </main><SiteFooter/></div>;
}
