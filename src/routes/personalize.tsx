import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Copy, Crown, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { trackEvent } from "@/lib/revenueOS";

export const Route = createFileRoute("/personalize")({
  component: PersonalizePage,
  head: () => ({
    meta: [
      { title: "ChatB2K Assessment — ResoFit" },
      { name: "description", content: "Receive a personalized ResoFit pathway tailored to your goal, activity, and diet." },
      { property: "og:title", content: "ChatB2K Assessment — ResoFit" },
      { property: "og:description", content: "A premium, personalized wellness recommendation in under a minute." },
    ],
  }),
});

const SHOP_URL = "https://shop.resofit.fit";
const STORE_URL = "https://store.resofit.fit";
const WHATSAPP_NUMBER = "2348132255842";
const ELITE_WA_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi CoachB2K, I'd like to upgrade to Elite Coaching.")}`;
const IMAGEKIT_ENDPOINT = String(import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT ?? "").replace(/\/$/, "");

type Step = 0 | 1 | 2 | 3;
interface Answers { goal: string; activity: string; diet: string; }
interface ImageMeta {
  sourcePath: string;
  alt: string;
  title: string;
  mime: "image/png";
  imageKitUrl: string | null;
  variants: Record<"thumb" | "card" | "hero", string | null>;
}
interface Recommendation {
  title: string;
  summary: string;
  sku?: string;
  productHandle?: string;
  priceNGN?: number;
  shopUrl: string;
  storeUrl: string;
  label: string;
  image?: ImageMeta;
}

const GOALS = [
  { value: "fat_loss", label: "Lose body fat" },
  { value: "muscle", label: "Build lean muscle" },
  { value: "energy", label: "More energy & focus" },
  { value: "reset", label: "Full reset & detox" },
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

function imageKitAsset(path: string, alt: string, title: string): ImageMeta {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const make = (width: number) => IMAGEKIT_ENDPOINT ? `${IMAGEKIT_ENDPOINT}/${encodedPath}?tr=w-${width},f-auto,q-auto` : null;
  return {
    sourcePath: path,
    alt,
    title,
    mime: "image/png",
    imageKitUrl: make(1200),
    variants: { thumb: make(320), card: make(640), hero: make(1200) },
  };
}

function recommendationFor(answers: Answers): Recommendation {
  if (answers.goal === "fat_loss" || answers.goal === "reset") {
    const isReset = answers.goal === "reset";
    return {
      title: isReset ? "ResoFit 7-Day Reset" : "ResoFit Fat-Loss Pathway",
      summary: `Your protocol is matched to ${isReset ? "a full reset" : "fat loss"}, ${answers.activity} activity and a ${answers.diet} diet. Start with the verified 7-Day Nigerian Reset Protocol and continue into the appropriate pathway from the ResoFit shop.`,
      sku: "d5362283-6cdb-48ce-81a9-f9853602bf8f",
      productHandle: "7-day-nigerian-reset",
      priceNGN: 1000,
      shopUrl: `${SHOP_URL}/products/7-day-nigerian-reset`,
      storeUrl: `${STORE_URL}/products/7-day-nigerian-reset`,
      label: isReset ? "Start your reset" : "Shop your fat-loss pathway",
      image: imageKitAsset("hero-reset.png", "7-Day Nigerian Reset Protocol", "ResoFit 7-Day Nigerian Reset Protocol"),
    };
  }

  const title = answers.goal === "muscle" ? "ResoFit Strength Pathway" : "ResoFit Energy & Wellness Pathway";
  return {
    title,
    summary: `Your protocol is matched to ${answers.goal}, ${answers.activity} activity and a ${answers.diet} diet. The ResoFit shop will show the current verified options for your goal.`,
    shopUrl: `${SHOP_URL}?goal=${encodeURIComponent(answers.goal)}`,
    storeUrl: `${STORE_URL}?goal=${encodeURIComponent(answers.goal)}`,
    label: answers.goal === "muscle" ? "Shop strength options" : "Shop wellness options",
  };
}

function PersonalizePage() {
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({ goal: "", activity: "", diet: "" });
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const progress = useMemo(() => (step / 3) * 100, [step]);

  const submit = (final: Answers) => {
    setLoading(true);
    trackEvent("assessment_click");
    setRecommendation(recommendationFor(final));
    setStep(3);
    setLoading(false);
  };

  const restart = () => {
    setStep(0);
    setAnswers({ goal: "", activity: "", diet: "" });
    setRecommendation(null);
    setRevealed(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">ChatB2K Assessment</p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Your personalized <span className="text-gold">ResoFit</span> protocol</h1>
          <p className="mt-3 text-sm text-muted-foreground">3 questions · 60 seconds · Personalized by CoachB2K</p>
        </header>

        {step < 3 && <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-border/40"><div className="h-full bg-gold transition-all duration-500" style={{ width: `${progress}%` }} /></div>}
        {step === 0 && <StepCard title="What's your primary goal?" options={GOALS} value={answers.goal} onSelect={(v) => { setAnswers((a) => ({ ...a, goal: v })); setStep(1); }} />}
        {step === 1 && <StepCard title="How active are you right now?" options={ACTIVITIES} value={answers.activity} onSelect={(v) => { setAnswers((a) => ({ ...a, activity: v })); setStep(2); }} onBack={() => setStep(0)} />}
        {step === 2 && <StepCard title="Which best describes your diet?" options={DIETS} value={answers.diet} onSelect={(v) => { const next = { ...answers, diet: v }; setAnswers(next); submit(next); }} onBack={() => setStep(1)} loading={loading} />}
        {step === 3 && recommendation && <ResultView recommendation={recommendation} answers={answers} revealed={revealed} onReveal={() => setRevealed(true)} onRestart={restart} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function StepCard({ title, options, value, onSelect, onBack, loading }: { title: string; options: Array<{ value: string; label: string }>; value: string; onSelect: (v: string) => void; onBack?: () => void; loading?: boolean }) {
  return (
    <section className="rounded-lg border border-border/60 bg-card/40 p-6 md:p-8">
      <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      <div className="mt-6 grid gap-3">
        {options.map((o) => <button key={o.value} type="button" disabled={loading} onClick={() => onSelect(o.value)} className={`group flex items-center justify-between rounded-md border px-5 py-4 text-left transition-colors ${value === o.value ? "border-gold bg-gold/10 text-foreground" : "border-border hover:border-gold/60 hover:bg-card"} disabled:opacity-50`}><span className="text-sm md:text-base">{o.label}</span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold" /></button>)}
      </div>
      <div className="mt-6 flex items-center justify-between">{onBack ? <button type="button" onClick={onBack} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground" disabled={loading}>← Back</button> : <span />}{loading && <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold"><Loader2 className="h-3 w-3 animate-spin" /> Matching your protocol…</span>}</div>
    </section>
  );
}

function ResultView({ recommendation, answers, revealed, onReveal, onRestart }: { recommendation: Recommendation; answers: Answers; revealed: boolean; onReveal: () => void; onRestart: () => void }) {
  const copy = async () => {
    const image = recommendation.image;
    const text = [
      `ResoFit Protocol — ${recommendation.title}`,
      `Goal: ${answers.goal} · Activity: ${answers.activity} · Diet: ${answers.diet}`,
      recommendation.sku ? `Verified catalog ID: ${recommendation.sku}` : "",
      recommendation.productHandle ? `Product handle: ${recommendation.productHandle}` : "",
      recommendation.priceNGN ? `Price: ₦${recommendation.priceNGN.toLocaleString("en-NG")}` : "",
      recommendation.shopUrl,
      recommendation.storeUrl,
      image?.imageKitUrl ? `ImageKit: ${image.imageKitUrl}` : "ImageKit: endpoint not configured",
    ].filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); } catch { toast.error("Couldn't copy"); }
  };

  return (
    <article className="relative overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-b from-black via-black to-black/80 p-6 text-foreground shadow-2xl shadow-gold/10 md:p-10">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.3em] text-gold">CoachB2K Result</p><h2 className="mt-2 font-display text-3xl text-gold md:text-4xl">{recommendation.title}</h2></div><button type="button" onClick={copy} aria-label="Copy result" className="rounded-md border border-gold/40 p-2 text-gold hover:bg-gold/10"><Copy className="h-4 w-4" /></button></div>

      <div className="relative mt-6">
        <div className={`space-y-6 transition-all duration-500 ${revealed ? "blur-0" : "pointer-events-none select-none blur-md"}`} aria-hidden={!revealed}>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{recommendation.summary}</p>
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold"><Check className="h-4 w-4" /> Verified ResoFit commerce route</div>
            {recommendation.sku && <p className="mt-3 text-xs text-muted-foreground">Catalog ID: <span className="text-foreground">{recommendation.sku}</span></p>}
            {recommendation.productHandle && <p className="mt-1 text-xs text-muted-foreground">Handle: <span className="text-foreground">{recommendation.productHandle}</span> · ₦{recommendation.priceNGN?.toLocaleString("en-NG")}</p>}
            {recommendation.image && <p className="mt-1 text-xs text-muted-foreground">Image: <span className="text-foreground">{recommendation.image.sourcePath}</span> · {recommendation.image.mime}</p>}
            <a href={recommendation.shopUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("checkout_start")} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground hover:bg-gold/90">{recommendation.label}<ArrowRight className="h-4 w-4" /></a>
            <a href={recommendation.storeUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-border px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:border-gold/60 hover:text-foreground">Open Storefront Adapter<ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
        {!revealed && <button type="button" onClick={onReveal} className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-black/30 backdrop-blur-sm"><span className="flex items-center gap-2 rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground shadow-lg shadow-gold/30"><Sparkles className="h-3.5 w-3.5" /> Reveal my protocol</span><span className="text-[11px] uppercase tracking-widest text-white/80">Curated for you</span></button>}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/40 pt-6"><a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi CoachB2K, I just completed the assessment (${answers.goal}/${answers.activity}/${answers.diet}). Can you help me choose?`)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("whatsapp_click")} className="inline-flex items-center gap-2 rounded-sm bg-[#25D366] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90"><MessageCircle className="h-4 w-4" /> Ask an Expert</a><button type="button" onClick={onRestart} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">Retake assessment</button></div>
      <a href={ELITE_WA_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("whatsapp_click")} className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-gold/40 bg-gradient-to-r from-gold/10 via-transparent to-gold/10 p-5 hover:from-gold/20 hover:to-gold/20"><div className="flex items-center gap-3"><Crown className="h-5 w-5 text-gold" /><div><p className="text-sm font-semibold text-foreground">Upgrade to Elite Coaching</p><p className="text-xs text-muted-foreground">1:1 with CoachB2K · custom programming · concierge access</p></div></div><ArrowRight className="h-4 w-4 text-gold" /></a>
    </article>
  );
}
