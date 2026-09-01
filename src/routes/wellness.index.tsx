import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ArrowRight, LocateFixed, Search } from "lucide-react";
import { trackEvent } from "@/lib/revenueOS";
import heroImg from "@/assets/hero-barbell.jpg";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const VIDEO = "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/wellness/bg-wellness.mp4";
const POSTER = "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/cover/resofit-cover-3.jpeg";

type State = { id:string; state_code:string; name:string; slug:string; status:string };

async function loadStates(){
  if(!SUPABASE_URL) return [] as State[];
  const r=await fetch(`${SUPABASE_URL}/functions/v1/wellness-locator?action=states`,{headers:SUPABASE_KEY?{apikey:SUPABASE_KEY}:undefined});
  if(!r.ok) throw new Error("locator failed");
  const d=await r.json() as {states?:State[]};
  return (d.states||[]).filter(s=>s.status==="active");
}

export const Route=createFileRoute("/wellness/")({head:()=>({meta:[{title:"Wellness — Find Your Wellness Path | ResoFit"},{name:"description",content:"Discover wellness services, locations and wellness hubs across Nigeria through ResoFit."}],links:[{rel:"canonical",href:"https://resofit.fit/wellness"}]}),component:WellnessHome});

function WellnessHome(){
  const[states,setStates]=useState<State[]>([]);const[q,setQ]=useState("");const[message,setMessage]=useState("");const[loading,setLoading]=useState(false);
  useEffect(()=>{trackEvent("wellness_view");loadStates().then(setStates).catch(()=>setMessage("Wellness discovery is temporarily unavailable."))},[]);
  const locate=()=>{if(!navigator.geolocation){setMessage("Location services are unavailable. Choose a state instead.");return}setLoading(true);navigator.geolocation.getCurrentPosition(({coords})=>{trackEvent("wellness_location_detected");window.location.href=`/wellness/states/cities/hubs/geo-locator?lat=${coords.latitude}&lng=${coords.longitude}`},()=>{setLoading(false);setMessage("Location permission was not granted. Choose a state instead.")},{enableHighAccuracy:true,timeout:10000,maximumAge:300000})};
  const search=(e:React.FormEvent)=>{e.preventDefault();if(!q.trim())return;trackEvent("wellness_search");window.location.href=`/wellness/states/cities/hubs/geo-locator?q=${encodeURIComponent(q.trim())}`};
  return <div className="min-h-screen bg-background"><SiteHeader/><main><section className="relative min-h-[72svh] overflow-hidden border-b border-border/60"><div className="absolute inset-0 bg-background"><img src={POSTER} alt="" aria-hidden width={1200} height={630} className="absolute inset-0 h-full w-full object-cover opacity-60" onError={e=>{e.currentTarget.src=heroImg}}/><video className="absolute inset-0 h-full w-full object-cover opacity-70" src={VIDEO} autoPlay muted loop playsInline preload="metadata" poster={POSTER} aria-hidden onError={e=>{e.currentTarget.style.display="none"}}/><div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/15"/><div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/35"/></div><div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-32"><p className="mb-5 text-xs uppercase tracking-[0.35em] text-gold">ResoFit™ Wellness Network</p><h1 className="font-display text-6xl leading-[0.92] md:text-8xl">What wellness<br/><span className="text-gradient-gold">do you need today?</span></h1><p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">Tell us what you need, where you are, or simply use your location.</p><form onSubmit={search} className="mt-10 max-w-3xl"><div className="flex items-center gap-3 border border-border bg-card/40 p-2"><Search className="ml-3 h-5 w-5"/><input aria-label="Search wellness" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search for a service, location, need or wellness goal…" className="min-w-0 flex-1 bg-transparent px-2 py-4 outline-none"/><button className="inline-flex h-12 items-center gap-2 bg-gold px-5 text-xs font-semibold uppercase tracking-widest text-gold-foreground">Search<ArrowRight className="h-4 w-4"/></button></div></form><div className="mt-4 flex flex-wrap items-center gap-4"><button type="button" onClick={locate} disabled={loading} className="inline-flex items-center gap-2 border border-border px-4 py-3 text-xs font-semibold uppercase tracking-widest"><LocateFixed className="h-4 w-4"/>{loading?"Locating…":"Use my location"}</button>{message&&<span className="text-sm text-muted-foreground">{message}</span>}</div></div></section><section className="border-b border-border/60 py-20"><div className="mx-auto max-w-7xl px-6"><div className="mb-8 flex items-end justify-between"><div><p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Explore Nigeria</p><h2 className="font-display text-4xl md:text-5xl">Find wellness by location.</h2></div><Link to="/wellness/states/cities/hubs/geo-locator" className="text-xs uppercase tracking-widest text-muted-foreground">Open locator →</Link></div><div className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{states.map(s=><a key={s.id} href={`/wellness/states/cities/hubs/geo-locator?state=${encodeURIComponent(s.slug)}`} className="bg-background p-5 text-sm hover:bg-card hover:text-gold"><span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.state_code}</span><span className="mt-2 block font-medium">{s.name}</span></a>)}</div></div></section></main><SiteFooter/></div>
}
