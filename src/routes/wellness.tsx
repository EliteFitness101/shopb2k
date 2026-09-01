import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, LocateFixed, Search } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { trackEvent } from "@/lib/revenueOS";
import heroImg from "@/assets/hero-barbell.jpg";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const WELLNESS_HERO_VIDEO = "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/wellness/bg-wellness.mp4";
const WELLNESS_SOCIAL_COVER = "https://resofit.fit/og?section=RESOFIT%E2%84%A2%20WELLNESS&title=Find%20Your%20Wellness%20Path&subtitle=Personalized%20wellness%20discovery%20powered%20by%20ChatB2K%E2%84%A2";

type State = { id: string; state_code: string; name: string; slug: string; status: string };

async function locator<T>(params: Record<string, string | number | undefined>) {
  if (!SUPABASE_URL) throw new Error("Wellness locator is not configured");
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  const response = await fetch(`${SUPABASE_URL}/functions/v1/wellness-locator?${query.toString()}`, { headers: SUPABASE_KEY ? { apikey: SUPABASE_KEY } : undefined });
  if (!response.ok) throw new Error(`Wellness locator failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export const Route = createFileRoute("/wellness")({
  head: () => ({
    meta: [
      { title: "Wellness — Find Your Wellness Path | ResoFit" },
      { name: "description", content: "Discover wellness services, locations and verified partner hubs across Nigeria through ResoFit." },
      { property: "og:title", content: "ResoFit Wellness — Find Your Wellness Path" },
      { property: "og:description", content: "One intelligent front door for wellness discovery across Nigeria." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://resofit.fit/wellness" },
      { property: "og:image", content: WELLNESS_SOCIAL_COVER },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: WELLNESS_SOCIAL_COVER },
    ],
    links: [{ rel: "canonical", href: "https://resofit.fit/wellness" }],
  }),
  component: WellnessHome,
});

function WellnessHome() {
  const [states, setStates] = useState<State[]>([]);
  const [query, setQuery] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    trackEvent("wellness_view");
    locator<{ states: State[] }>({ action: "states" }).then((data) => setStates(data.states.filter((state) => state.status === "active"))).catch(() => setLocationMessage("Wellness discovery is temporarily unavailable."));
  }, []);
  const locate = () => {
    if (!navigator.geolocation) { setLocationMessage("Location services are unavailable. You can choose a state below."); return; }
    setLoading(true); setLocationMessage("Resolving your location…");
    navigator.geolocation.getCurrentPosition(({ coords }) => { trackEvent("wellness_location_detected"); window.location.href = `/wellness/states/cities/hubs/geo-locator?lat=${coords.latitude}&lng=${coords.longitude}`; }, () => { setLoading(false); setLocationMessage("Location permission was not granted. Choose a state instead."); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
  };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); const value = query.trim(); if (!value) return; trackEvent("wellness_search"); window.location.href = `/wellness/states/cities/hubs/geo-locator?q=${encodeURIComponent(value)}`; };
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative min-h-[72svh] overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 bg-background">
            <img src={heroImg} alt="" aria-hidden="true" width={1536} height={1280} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-60" />
            <video className="absolute inset-0 h-full w-full object-cover opacity-70" src={WELLNESS_HERO_VIDEO} autoPlay muted loop playsInline preload="metadata" poster={heroImg} aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/15" /><div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/35" />
          </div>
          <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-32">
            <div className="max-w-4xl"><p className="mb-5 text-xs uppercase tracking-[0.35em] text-gold">ResoFit™ Wellness Network</p><h1 className="font-display text-6xl leading-[0.92] sm:text-7xl md:text-8xl">What wellness<br /><span className="text-gradient-gold">do you need today?</span></h1><p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">Tell us what you need, where you are, or simply use your location. ResoFit connects your request to the verified wellness network available around you.</p></div>
            <form onSubmit={submitSearch} className="mt-10 max-w-3xl"><label htmlFor="wellness-search" className="sr-only">Search for a wellness service, location, need or goal</label><div className="flex items-center gap-3 border border-border bg-card/40 p-2 focus-within:border-gold"><Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" /><input id="wellness-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a service, location, need or wellness goal…" className="min-w-0 flex-1 bg-transparent px-2 py-4 text-base outline-none placeholder:text-muted-foreground" /><button type="submit" className="inline-flex h-12 items-center gap-2 bg-gold px-5 text-xs font-semibold uppercase tracking-widest text-gold-foreground">Search <ArrowRight className="h-4 w-4" /></button></div></form>
            <div className="mt-4 flex flex-wrap items-center gap-4"><button type="button" onClick={locate} disabled={loading} className="inline-flex items-center gap-2 border border-border px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors hover:border-gold hover:text-gold disabled:opacity-50"><LocateFixed className="h-4 w-4" /> {loading ? "Locating…" : "Use my location"}</button>{locationMessage && <span className="text-sm text-muted-foreground">{locationMessage}</span>}</div>
          </div>
        </section>
        <section className="border-b border-border/60 py-20"><div className="mx-auto max-w-7xl px-6"><div className="mb-8 flex items-end justify-between gap-6"><div><p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Explore Nigeria</p><h2 className="font-display text-4xl md:text-5xl">Find wellness by location.</h2></div><Link to="/wellness/states/cities/hubs/geo-locator" className="hidden text-xs uppercase tracking-widest text-muted-foreground hover:text-gold md:inline-flex">Open locator →</Link></div><div className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{states.map((state) => <a key={state.id} href={`/wellness/states/cities/hubs/geo-locator?state=${encodeURIComponent(state.slug)}`} className="bg-background p-5 text-sm transition-colors hover:bg-card hover:text-gold"><span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{state.state_code}</span><span className="mt-2 block font-medium">{state.name}</span></a>)}</div></div></section>
        <section className="py-20"><div className="mx-auto max-w-7xl px-6"><p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">The Wellness Loop</p><h2 className="font-display text-4xl md:text-5xl">One intelligent front door.</h2><div className="mt-10 grid gap-px bg-border/60 md:grid-cols-4">{[{ n: "01", t: "Tell us", d: "Describe your need, goal or location." }, { n: "02", t: "We resolve", d: "ChatB2K interprets intent and location." }, { n: "03", t: "We match", d: "The canonical registry supplies verified services and hubs." }, { n: "04", t: "Take action", d: "Book, chat, call or continue your wellness journey." }].map((step) => <div key={step.n} className="bg-background p-6"><p className="font-display text-3xl text-gold">{step.n}</p><h3 className="mt-4 font-display text-xl">{step.t}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.d}</p></div>)}</div></div></section>
      </main><SiteFooter />
    </div>
  );
}
