import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { trackEvent } from "@/lib/revenueOS";

export const Route = createFileRoute("/personalize")({
  component: PersonalizePage,
  head: () => ({
    meta: [
      { title: "ChatB2K Assessment — ResoFit" },
      {
        name: "description",
        content: "Complete the ChatB2K Assessment and receive a personalized ResoFit recommendation and next step.",
      },
    ],
  }),
});

const WEBHOOK_URL = "https://hook.eu1.make.com/p0c26asklninfrxhp2sw6nkdjjb19a89";
const WHATSAPP_NUMBER = "2348132255842";
const CANONICAL_SHOP_URL = "https://shop.resofit.fit";

type Step = 0 | 1 | 2 | 3;
interface Answers { goal: string; activity: string; diet: string }
interface Product {
  handle?: string;
  variant_id?: string;
  variantId?: string;
  title?: string;
  image?: string;
  price?: string;
  reason?: string;
  url?: string;
  checkoutUrl?: string;
  path?: string;
}
interface Result {
  title?: string;
  summary?: string;
  reason?: string;
  reasoning?: string;
  product?: Product;
  bundle?: Product[];
  products?: Product[];
  recommendation?: Product | Product[];
}

const GOALS = [
  { value: "fat_loss", label: "Lose body fat" },
  { value: "muscle", label: "Build lean muscle" },
  { value: "energy", label: "More energy & focus" },
  { value: "reset", label: "Full reset & wellness" },
];
const ACTIVITIES = [
  { value: "low", label: "Sedentary (desk work)" },
  { value: "moderate", label: "Active 2–4×/week" },
  { value: "high", label: "Athletic / daily training" },
];
const DIETS = [
  { value: "omnivore", label: "Omnivore" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
];

function anonId() {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("resofit:anon_id");
  if (!id) {
    id = `anon_${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
    localStorage.setItem("resofit:anon_id", id);
  }
  return id;
}

function fallbackRecommendation(answers: Answers): Result {
  const goal = GOALS.find((x) => x.value === answers.goal)?.label ?? "your wellness goal";
  const activity = ACTIVITIES.find((x) => x.value === answers.activity)?.label ?? "your current activity level";
  const diet = DIETS.find((x) => x.value === answers.diet)?.label ?? "your dietary preference";
  const reset = answers.goal === "reset";
  return {
    title: reset ? "Your ResoFit 7-Day Reset" : "Your ResoFit Personalized Pathway",
    summary: `Based on your assessment, your priority is ${goal.toLowerCase()}, with ${activity.toLowerCase()} and a ${diet.toLowerCase()} approach. Your recommended next step is the ResoFit ${reset ? "7-Day Reset" : "personalized wellness pathway"}.`,
  };
}

function productsFrom(result: Result | null): Product[] {
  if (!result) return [];
  const values: Product[] = [];
  if (Array.isArray(result.bundle)) values.push(...result.bundle);
  if (Array.isArray(result.products)) values.push(...result.products);
  if (Array.isArray(result.recommendation)) values.push(...result.recommendation);
  if (result.product) values.push(result.product);
  if (result.recommendation && !Array.isArray(result.recommendation)) values.push(result.recommendation);
  const seen = new Set<string>();
  return values.filter((p) => {
    const key = p.handle ?? p.variant_id ?? p.variantId ?? p.url ?? p.title ?? "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function customerSafeSummary(result: Result | null) {
  const raw = result?.summary ?? result?.reason ?? result?.reasoning ?? "";
  const technical = /webhook|curat(ed|ing)|inactive|no longer active|finaliz(e|ing).*protocol|being curated/i.test(raw);
  if (!raw || technical) return "Your assessment is complete. We found the next step that best matches your goal.";
  return raw;
}

function exactDestination(product?: Product) {
  if (!product) return null;
  if (product.checkoutUrl) return product.checkoutUrl;
  if (product.url) return product.url;
  if (product.path) return new URL(product.path, CANONICAL_SHOP_URL).toString();
  if (product.handle) return `${CANONICAL_SHOP_URL}/product/${encodeURIComponent(product.handle)}`;
  return null;
}

function PersonalizePage() {
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({ goal: "", activity: "", diet: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (final: Answers) => {
    setLoading(true);
    setError(null);
    trackEvent("assessment_click");
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anon_id: anonId(), source: "resofit.fit/personalize", submittedAt: new Date().toISOString(), ...final }),
      });
      const text = await response.text();
      let parsed: Result = {};
      try { parsed = text ? (JSON.parse(text) as Result) : {}; } catch { parsed = { summary: text }; }
      if (!response.ok) throw new Error("Assessment service unavailable");
      setResult(parsed);
      setStep(3);
      trackEvent("assessment_complete");
    } catch {
      setResult(fallbackRecommendation(final));
      setStep(3);
      trackEvent("assessment_complete");
      trackEvent("assessment_fallback");
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep(0);
    setResult(null);
    setError(null);
    setAnswers({ goal: "", activity: "", diet: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-12">
        <header className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">ChatB2K Assessment</p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Your personalized <span className="text-gold">ResoFit</span> protocol</h1>
          <p className="mt-3 text-sm text-muted-foreground">3 questions · about 60 seconds · personalized next step</p>
        </header>

        {step < 3 && (
          <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-border/40">
            <div className="h-full bg-gold transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        )}

        {step === 0 && <StepCard title="What's your primary goal?" options={GOALS} onSelect={(v) => { setAnswers((a) => ({ ...a, goal: v })); setStep(1); }} />}
        {step === 1 && <StepCard title="How active are you right now?" options={ACTIVITIES} onBack={() => setStep(0)} onSelect={(v) => { setAnswers((a) => ({ ...a, activity: v })); setStep(2); }} />}
        {step === 2 && <StepCard title="Which best describes your diet?" options={DIETS} onBack={() => setStep(1)} loading={loading} onSelect={(v) => { const next = { ...answers, diet: v }; setAnswers(next); void submit(next); }} />}
        {step === 3 && <ResultView result={result} answers={answers} error={error} onRestart={restart} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function StepCard({ title, options, onSelect, onBack, loading = false }: { title: string; options: Array<{ value: string; label: string }>; onSelect: (value: string) => void; onBack?: () => void; loading?: boolean }) {
  return (
    <section className="rounded-2xl border border-gold/20 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-8">
      <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      <div className="mt-6 grid gap-3">
        {options.map((option) => (
          <button key={option.value} type="button" disabled={loading} onClick={() => onSelect(option.value)} className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition-all hover:border-gold/50 hover:bg-gold/[0.06] disabled:opacity-50">
            <span className="text-sm md:text-base">{option.label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold" />
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        {onBack ? <button type="button" onClick={onBack} disabled={loading} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Back</button> : <span />}
        {loading && <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold"><Loader2 className="h-3 w-3 animate-spin" /> Curating your recommendation…</span>}
      </div>
    </section>
  );
}

function ResultView({ result, answers, error, onRestart }: { result: Result | null; answers: Answers; error: string | null; onRestart: () => void }) {
  const products = useMemo(() => productsFrom(result), [result]);
  const primary = products[0];
  const destination = exactDestination(primary);
  const summary = customerSafeSummary(result);
  const title = result?.title ?? "Your ResoFit Protocol";
  const insights = [
    ["Primary goal", GOALS.find((x) => x.value === answers.goal)?.label ?? answers.goal],
    ["Current activity", ACTIVITIES.find((x) => x.value === answers.activity)?.label ?? answers.activity],
    ["Lifestyle fit", DIETS.find((x) => x.value === answers.diet)?.label ?? answers.diet],
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText([`ResoFit Protocol — ${title}`, ...insights.map(([k, v]) => `${k}: ${v}`), "", summary].join("\n"));
      toast.success("Your result was copied");
    } catch { toast.error("Couldn't copy the result"); }
  };

  const continueToRecommendation = () => {
    if (!destination) {
      trackEvent("assessment_result_help");
      return;
    }
    trackEvent("assessment_result_cta");
    window.location.assign(destination);
  };

  const helpUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi ResoFit, I completed my 60-second assessment. My goal is ${GOALS.find((x) => x.value === answers.goal)?.label ?? answers.goal}. Please help me access my recommended next step.`)}`;

  return (
    <article className="overflow-hidden rounded-[2rem] border border-gold/30 bg-black/70 p-5 text-foreground shadow-2xl shadow-gold/10 backdrop-blur-2xl md:p-10">
      <div className="absolute pointer-events-none" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold"><Sparkles className="h-3 w-3" /> Your ResoFit match</p>
          <h2 className="mt-2 font-display text-3xl text-gold md:text-4xl">{title}</h2>
        </div>
        <button type="button" onClick={copy} aria-label="Copy result" className="rounded-full border border-gold/40 p-2 text-gold hover:bg-gold/10"><Copy className="h-4 w-4" /></button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-5 text-sm text-muted-foreground">
          Your assessment is safe. Please retry your assessment.
          <button type="button" onClick={onRestart} className="mt-4 block text-xs uppercase tracking-widest text-gold underline">Retry assessment</button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {insights.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
                <Check className="h-4 w-4 text-gold" />
                <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-white/[0.03] to-transparent p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-gold"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-widest">Why this fits you</span></div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{summary}</p>
          </div>

          {primary && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-gold/40 bg-white/[0.04] backdrop-blur-xl">
              {primary.image && <img src={primary.image} alt={primary.title ?? "Your recommended ResoFit solution"} className="h-56 w-full object-cover md:h-72" />}
              <div className="p-6">
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Recommended for you</p>
                <h3 className="mt-2 font-display text-2xl md:text-3xl">{primary.title ?? "Your ResoFit recommendation"}</h3>
                {primary.reason && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{primary.reason}</p>}
                {primary.price && <p className="mt-4 text-xl font-semibold text-gold">{primary.price}</p>}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-[1.5rem] border border-gold/60 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent p-6 text-center shadow-xl shadow-gold/10 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-gold">Your next move</p>
            <h3 className="mt-2 font-display text-2xl md:text-3xl">{destination ? "Your recommendation is ready" : "Your recommendation is ready to unlock"}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{destination ? "We've selected the exact next step for you. Continue directly to it — no browsing required." : "We'll connect you with a ResoFit specialist so you receive the exact next step from your assessment."}</p>
            {destination ? (
              <button type="button" onClick={continueToRecommendation} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-4 text-xs font-bold uppercase tracking-widest text-gold-foreground shadow-lg shadow-gold/20 transition-all hover:scale-[1.01] md:w-auto">Continue to my exact recommendation <ArrowRight className="h-4 w-4" /></button>
            ) : (
              <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-4 text-xs font-bold uppercase tracking-widest text-gold-foreground shadow-lg shadow-gold/20 transition-all hover:scale-[1.01] md:w-auto">Connect me to my recommendation <MessageCircle className="h-4 w-4" /></a>
            )}
            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">Secure checkout or guided fulfilment · ResoFit value first</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-border/40 pt-6">
            <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-3 text-xs uppercase tracking-widest hover:border-gold/60"><MessageCircle className="h-4 w-4" /> Ask an Expert</a>
            <button type="button" onClick={onRestart} className="px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">Retake assessment</button>
          </div>
        </>
      )}
    </article>
  );
}
