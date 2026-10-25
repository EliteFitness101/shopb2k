import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, Sparkles, ShieldCheck, Dumbbell, ShoppingBag, Radio, PlayCircle, Send, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chatb2k")({
  head: () => ({
    meta: [
      { title: "ChatB2K™ AssistLoop — ResoFit" },
      { name: "description", content: "A personalized ResoFit concierge for wellness, products, media, live sessions, and ecosystem support." },
    ],
    links: [{ rel: "canonical", href: "https://www.resofit.fit/chatb2k" }],
  }),
  component: ChatB2KAssistLoop,
});

type Intent = "wellness" | "shop" | "live" | "support";
type AssistantResult = { name?: string; title?: string; description?: string; tagline?: string; website?: string; url?: string; product_url?: string; verification_status?: string; contact?: { website?: string | null } };
type AssistantData = { intent?: { intent?: string }; category?: string; count?: number; results?: AssistantResult[] };

function safeHttpsUrl(value: unknown, attribution: Record<string, string> = {}): string | null {
  try {
    const url = new URL(String(value ?? ""));
    if (url.protocol !== "https:" || url.username || url.password) return null;
    for (const [key, value] of Object.entries(attribution)) {
      if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.href;
  } catch {
    return null;
  }
}

const intentCards: { id: Intent; title: string; detail: string; icon: typeof Sparkles; route: string }[] = [
  { id: "wellness", title: "My wellness plan", detail: "Nutrition, movement, recovery and personalized guidance.", icon: Sparkles, route: "/me" },
  { id: "shop", title: "Find a product", detail: "Browse verified ResoFit programs and equipment.", icon: ShoppingBag, route: "/shop" },
  { id: "live", title: "BIGO & media", detail: "Explore live sessions, episodes, highlights and replays.", icon: Radio, route: "/content" },
  { id: "support", title: "Help & support", detail: "Get routed to the right support path.", icon: ShieldCheck, route: "/contact" },
];

function classifyIntent(query: string): Intent | null {
  const q = query.toLowerCase();
  if (/bigo|live|episode|replay|highlight|season|stream|creator|tiktok/.test(q)) return "live";
  if (/shop|buy|price|product|equipment|pay|checkout|order|jumia|konga|selar|jiji|shopify/.test(q)) return "shop";
  if (/support|help|account|payment|problem|error|refund/.test(q)) return "support";
  if (/wellness|fitness|meal|workout|weight|strength|nutrition|plan|health/.test(q)) return "wellness";
  return null;
}

function ChatB2KAssistLoop() {
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assistantData, setAssistantData] = useState<AssistantData | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (preference.matches) video.pause();
      else void video.play().catch(() => undefined);
    };
    syncPlayback();
    preference.addEventListener("change", syncPlayback);
    return () => {
      preference.removeEventListener("change", syncPlayback);
      video.pause();
    };
  }, []);
  const attribution = useMemo(() => {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    const keys = ["rsid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "session_id", "source_id", "campaign_id", "ttclid", "gclid", "fbclid", "msclkid", "ref"];
    const values: Record<string, string> = {};
    for (const key of keys) {
      const value = params.get(key) ?? (key === "rsid" ? params.get("RSID") : null);
      if (value) values[key] = value;
    }
    return values;
  }, []);
  const toggleHeroAudio = async () => {
    const video = heroVideoRef.current;
    if (!video) return;
    if (audioEnabled) {
      video.muted = true;
      setAudioEnabled(false);
      return;
    }
    video.volume = 0.33;
    video.muted = false;
    try {
      await video.play();
      setAudioEnabled(true);
    } catch {
      video.muted = true;
      setAudioEnabled(false);
    }
  };
  const inferred = classifyIntent(query);
  const selected = intent ?? inferred;
  const destination = intentCards.find((card) => card.id === selected);
  const submit = async () => {
    const cleanQuery = query.trim();
    setSubmitted(true);
    setAssistantData(null);
    setAssistantError(null);
    if (!cleanQuery) {
      setAssistantError("Enter a goal or search phrase to get a tailored route.");
      return;
    }
    if (!intent && inferred) setIntent(inferred);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chatb2k-orchestrator", {
        body: { q: cleanQuery, limit: 6 },
      });
      if (error) throw error;
      setAssistantData(data as AssistantData);
    } catch (error) {
      console.error("ChatB2K AssistLoop request failed", error);
      setAssistantError("The live ChatB2K route is temporarily unavailable. Choose a path below or try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="font-display text-xl tracking-wide">RESOFIT<span className="ml-2 text-gold">×</span><span className="ml-2 text-sm text-muted-foreground">ChatB2K™</span></Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-gold sm:inline-flex">AssistLoop</span>
            <Link to="/me" search={attribution as never} className="rounded-full bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black transition hover:brightness-110">Personalize <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-border/50">
        <video ref={heroVideoRef} className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-20 motion-reduce:hidden" muted loop playsInline preload="metadata" poster="https://res.cloudinary.com/resofit/image/upload/f_auto,q_auto/IMG_7973" aria-hidden="true"><source src="https://res.cloudinary.com/resofit/video/upload/f_auto,q_auto/gemini_generated_video_F48FFEE5.mp4" type="video/mp4" /></video>
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_15%_15%,rgba(202,164,91,.24),rgba(8,8,8,.78)_58%),linear-gradient(90deg,rgba(8,8,8,.72),rgba(8,8,8,.42))]" />
        <div className="relative z-20 mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-[10px] font-medium uppercase tracking-[.25em] text-gold"><Sparkles className="h-3.5 w-3.5" /> Your intelligent concierge</p>
            <h1 className="mt-7 max-w-3xl font-display text-5xl leading-[.98] sm:text-6xl lg:text-7xl">Tell us where you want to <span className="text-gradient-gold">go next.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Wellness, products, live media or support. Start with a goal, a question or a search phrase. ChatB2K helps you find the right ResoFit path without unnecessary steps.</p>
            <div className="mt-8 flex flex-wrap gap-2">
              <button type="button" onClick={toggleHeroAudio} className="rounded-full border border-gold/50 bg-black/40 px-4 py-2 text-xs font-medium text-gold transition hover:bg-gold/10">{audioEnabled ? "Mute hero" : "Enable sound · 33%"}</button>
              {["Build a meal plan", "Find a product", "BIGO replays", "Payment help"].map((suggestion) => <button key={suggestion} onClick={() => { setQuery(suggestion); setSubmitted(false); setIntent(null); setAssistantData(null); setAssistantError(null); }} className="rounded-full border border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground transition hover:border-gold/60 hover:text-foreground">{suggestion}</button>)}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[.035] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-6">
            <div className="rounded-[1.5rem] border border-gold/20 bg-black/30 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold"><Sparkles className="h-5 w-5" /></div>
                <div><p className="font-medium">Welcome. I’m ChatB2K™ AssistLoop.</p><p className="mt-1 text-sm leading-6 text-muted-foreground">What would you like to achieve today? Share your intent or context, or search for a product, program, live session or answer.</p></div>
              </div>
              <form className="mt-6" onSubmit={(event) => { event.preventDefault(); submit(); }}>
                <label htmlFor="chatb2k-query" className="mb-2 block text-[10px] uppercase tracking-[.2em] text-muted-foreground">Your goal or search</label>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/80 p-2 focus-within:border-gold/60">
                  <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <input id="chatb2k-query" value={query} onChange={(event) => { setQuery(event.target.value); setSubmitted(false); setAssistantData(null); setAssistantError(null); }} placeholder="I want to improve my energy…" className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none placeholder:text-muted-foreground/70" />
                  <button aria-label="Find my path" type="submit" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-black transition hover:brightness-110"><Send className="h-4 w-4" /></button>
                </div>
              </form>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Search and discovery use the existing ChatB2K orchestration route. Purchases, payments, publishing and account changes remain on their verified service paths.</p>
              {submitted && <div role="status" aria-live="polite" className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-4">
                <p className="text-sm font-medium">{destination ? `Suggested path: ${destination.title}` : assistantData?.intent?.intent ? `ChatB2K intent: ${assistantData.intent.intent}` : "Your next step"}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{destination ? destination.detail : assistantData?.category ? `Matched ecosystem category: ${assistantData.category}.` : "Choose a path below or refine your search."}</p>
                {loading && <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Searching the live ResoFit ecosystem…</p>}
                {assistantError && <p className="mt-3 text-xs leading-5 text-amber-200">{assistantError}</p>}
                {assistantData && <div className="mt-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-[.18em] text-gold">{assistantData.count ?? assistantData.results?.length ?? 0} matching result(s)</p>
                  {(assistantData.results ?? []).slice(0, 4).map((result, index) => {
                    const href = safeHttpsUrl(result.url ?? result.product_url ?? result.website ?? result.contact?.website, attribution);
                    return <div key={`${result.name ?? result.title ?? "result"}-${index}`} className="rounded-xl border border-border/70 bg-background/60 p-3">
                      <p className="text-sm font-medium">{result.name ?? result.title ?? "ResoFit result"}</p>
                      {(result.description ?? result.tagline) && <p className="mt-1 text-xs leading-5 text-muted-foreground">{result.description ?? result.tagline}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">{result.verification_status ?? "Registry result"}</span>
                        {href && <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gold">Open result <ArrowRight className="h-3 w-3" /></a>}
                      </div>
                    </div>;
                  })}
                  {!assistantData.results?.length && <p className="text-xs text-muted-foreground">No verified match returned yet. Refine the query or choose a path below.</p>}
                </div>}
                {destination && <Link to={destination.route as never} search={attribution as never} className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-black">Continue <ArrowRight className="h-3.5 w-3.5" /></Link>}
              </div>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[{ icon: ShieldCheck, label: "Secure paths" }, { icon: PlayCircle, label: "Media ready" }, { icon: Dumbbell, label: "Personalized" }].map(({ icon: Icon, label }) => <div key={label} className="rounded-xl border border-border/70 bg-background/45 px-2 py-3 text-center"><Icon className="mx-auto h-4 w-4 text-gold" /><p className="mt-2 text-[9px] uppercase tracking-wider text-muted-foreground sm:text-[10px]">{label}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] uppercase tracking-[.25em] text-gold">Choose a direction</p><h2 className="mt-3 font-display text-3xl sm:text-4xl">Your next step, simplified.</h2></div><p className="max-w-md text-sm leading-6 text-muted-foreground">Pick a path now. You can change direction at any time.</p></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {intentCards.map(({ id, title, detail, icon: Icon }) => <button key={id} onClick={() => { setIntent(id); setSubmitted(true); }} className={`group rounded-3xl border p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-gold/50 hover:bg-card/70 hover:shadow-xl hover:shadow-black/20 sm:p-6 ${intent === id ? "border-gold/60 bg-gold/5" : "border-border/70 bg-card/35"}`}>
            <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold"><Icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-gold" /></div>
            <h3 className="mt-5 font-display text-2xl">{title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{detail}</p>
            <span className="mt-6 inline-flex rounded-full border border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition group-hover:border-gold group-hover:text-gold">Select path <ArrowRight className="ml-2 h-3 w-3" /></span>
          </button>)}
        </div>
      </section>

      <section className="border-y border-border/60 bg-black/20">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[.25em] text-gold">Curated for your next move</p><h2 className="mt-3 font-display text-3xl sm:text-4xl">Explore the ResoFit world.</h2></div>
            <span className="hidden text-xs text-muted-foreground sm:inline">Swipe to explore <ArrowRight className="ml-1 inline h-3 w-3" /></span>
          </div>
          <div aria-label="Featured ResoFit paths" className="mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
            <Link to="/me" search={attribution as never} className="group relative min-h-[300px] min-w-[250px] flex-1 snap-start overflow-hidden rounded-3xl border border-gold/20 bg-cover bg-center p-5 sm:min-w-[280px]" style={{ backgroundImage: "linear-gradient(180deg,rgba(8,8,8,.05),rgba(8,8,8,.92)),url(https://res.cloudinary.com/resofit/image/upload/f_auto,q_auto/IMG_7988)" }}>
              <span className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[9px] uppercase tracking-widest text-white">Wellness</span>
              <div className="relative mt-40"><h3 className="font-display text-2xl text-white">Build your rhythm.</h3><p className="mt-2 text-xs leading-5 text-white/75">Meals, movement and sustainable habits.</p><span className="mt-4 inline-flex items-center rounded-full bg-gold px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-black">Personalize <ArrowRight className="ml-2 h-3 w-3" /></span></div>
            </Link>
            <Link to="/shop" search={attribution as never} className="group relative min-h-[300px] min-w-[250px] flex-1 snap-start overflow-hidden rounded-3xl border border-gold/20 bg-cover bg-center p-5 sm:min-w-[280px]" style={{ backgroundImage: "linear-gradient(180deg,rgba(8,8,8,.05),rgba(8,8,8,.92)),url(https://res.cloudinary.com/resofit/image/upload/f_auto,q_auto/IMG_7980)" }}>
              <span className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[9px] uppercase tracking-widest text-white">Strength</span>
              <div className="relative mt-40"><h3 className="font-display text-2xl text-white">Train with intent.</h3><p className="mt-2 text-xs leading-5 text-white/75">Explore equipment and training programs.</p><span className="mt-4 inline-flex items-center rounded-full bg-gold px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-black">Explore shop <ArrowRight className="ml-2 h-3 w-3" /></span></div>
            </Link>
            <Link to="/shop" search={attribution as never} className="group relative min-h-[300px] min-w-[250px] flex-1 snap-start overflow-hidden rounded-3xl border border-gold/20 bg-cover bg-center p-5 sm:min-w-[280px]" style={{ backgroundImage: "linear-gradient(180deg,rgba(8,8,8,.05),rgba(8,8,8,.92)),url(https://res.cloudinary.com/resofit/image/upload/f_auto,q_auto/IMG_6732)" }}>
              <span className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[9px] uppercase tracking-widest text-white">Apparel</span>
              <div className="relative mt-40"><h3 className="font-display text-2xl text-white">Move in your element.</h3><p className="mt-2 text-xs leading-5 text-white/75">Discover the ResoFlex collection.</p><span className="mt-4 inline-flex items-center rounded-full bg-gold px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-black">View collection <ArrowRight className="ml-2 h-3 w-3" /></span></div>
            </Link>
            <Link to="/chatb2k" search={attribution as never} className="group relative min-h-[300px] min-w-[250px] flex-1 snap-start overflow-hidden rounded-3xl border border-gold/20 bg-cover bg-center p-5 sm:min-w-[280px]" style={{ backgroundImage: "linear-gradient(180deg,rgba(8,8,8,.05),rgba(8,8,8,.92)),url(https://res.cloudinary.com/resofit/image/upload/f_auto,q_auto/IMG_7989)" }}>
              <span className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[9px] uppercase tracking-widest text-white">ChatB2K™</span>
              <div className="relative mt-40"><h3 className="font-display text-2xl text-white">Find your next step.</h3><p className="mt-2 text-xs leading-5 text-white/75">A guided path through the ResoFit ecosystem.</p><span className="mt-4 inline-flex items-center rounded-full bg-gold px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-black">Ask AssistLoop <ArrowRight className="ml-2 h-3 w-3" /></span></div>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-black/20"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>ResoFit × ChatB2K™ · Observe. Verify. Execute. Verify. Recover. Learn. Care.</span><span>{attribution.rsid ? `RSID preserved: ${attribution.rsid}` : "Attribution parameters are preserved from the entry URL."}</span></div></footer>
    </main>
  );
}
