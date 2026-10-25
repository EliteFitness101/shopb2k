import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Search, Sparkles, ShieldCheck, Dumbbell, ShoppingBag, Radio, PlayCircle, Send } from "lucide-react";

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
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const attribution = useMemo(() => {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    return {
      rsid: params.get("rsid") ?? params.get("RSID") ?? "",
      utm_source: params.get("utm_source") ?? "",
      utm_medium: params.get("utm_medium") ?? "",
      utm_campaign: params.get("utm_campaign") ?? "",
    };
  }, []);
  const inferred = classifyIntent(query);
  const selected = intent ?? inferred;
  const destination = intentCards.find((card) => card.id === selected);
  const submit = () => {
    setSubmitted(true);
    if (!intent && inferred) setIntent(inferred);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="font-display text-xl tracking-wide">RESOFIT<span className="ml-2 text-gold">×</span><span className="ml-2 text-sm text-muted-foreground">ChatB2K™</span></Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-gold sm:inline-flex">AssistLoop</span>
            <Link to="/me" className="rounded-full bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black transition hover:brightness-110">Personalize <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-border/50">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_15%,rgba(202,164,91,.18),transparent_42%),radial-gradient(ellipse_at_90%_70%,rgba(88,76,58,.16),transparent_35%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-[10px] font-medium uppercase tracking-[.25em] text-gold"><Sparkles className="h-3.5 w-3.5" /> Your intelligent concierge</p>
            <h1 className="mt-7 max-w-3xl font-display text-5xl leading-[.98] sm:text-6xl lg:text-7xl">Tell us where you want to <span className="text-gradient-gold">go next.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Wellness, products, live media or support. Start with a goal, a question or a search phrase. ChatB2K helps you find the right ResoFit path without unnecessary steps.</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["Build a meal plan", "Find a product", "BIGO replays", "Payment help"].map((suggestion) => <button key={suggestion} onClick={() => { setQuery(suggestion); setSubmitted(false); setIntent(null); }} className="rounded-full border border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground transition hover:border-gold/60 hover:text-foreground">{suggestion}</button>)}
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
                  <input id="chatb2k-query" value={query} onChange={(event) => { setQuery(event.target.value); setSubmitted(false); }} placeholder="I want to improve my energy…" className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none placeholder:text-muted-foreground/70" />
                  <button aria-label="Find my path" type="submit" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-black transition hover:brightness-110"><Send className="h-4 w-4" /></button>
                </div>
              </form>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Your query is used to suggest a destination. Personalized AI responses and connected account actions require their live service integrations to be verified.</p>
              {submitted && <div role="status" className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-4"><p className="text-sm font-medium">{destination ? `Suggested path: ${destination.title}` : "Let’s narrow it down."}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{destination ? destination.detail : "Choose one of the paths below, or add a little more context to your search."}</p>{destination && <Link to={destination.route as never} className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-black">Continue <ArrowRight className="h-3.5 w-3.5" /></Link>}</div>}
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
          {intentCards.map(({ id, title, detail, icon: Icon, route }) => <button key={id} onClick={() => { setIntent(id); setSubmitted(true); }} className={`group rounded-3xl border p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-gold/50 hover:bg-card/70 hover:shadow-xl hover:shadow-black/20 sm:p-6 ${intent === id ? "border-gold/60 bg-gold/5" : "border-border/70 bg-card/35"}`}>
            <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold"><Icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-gold" /></div>
            <h3 className="mt-5 font-display text-2xl">{title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{detail}</p>
            <Link to={route as never} onClick={(event) => event.stopPropagation()} className="mt-6 inline-flex rounded-full border border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider transition hover:border-gold hover:text-gold">Explore path</Link>
          </button>)}
        </div>
      </section>

      <footer className="border-t border-border/60 bg-black/20"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>ResoFit × ChatB2K™ · Observe. Verify. Execute. Verify. Recover. Learn. Care.</span><span>{attribution.rsid ? `RSID preserved: ${attribution.rsid}` : "Attribution parameters are preserved from the entry URL."}</span></div></footer>
    </main>
  );
}
