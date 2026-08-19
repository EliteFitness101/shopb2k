import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { trackEvent } from "@/lib/revenueOS";

export const Route = createFileRoute("/personalize")({ component: PersonalizePage });

const WEBHOOK_URL = "https://hook.eu1.make.com/p0c26asklninfrxhp2sw6nkdjjb19a89";
const WHATSAPP_NUMBER = "2348132255842";
const SHOP = "https://shop.resofit.fit";

type Answers = { goal: string; activity: string; diet: string };
type Product = {
  sku?: string; handle?: string; variant_id?: string; variantId?: string;
  title?: string; image?: string; price?: string; reason?: string;
  url?: string; checkoutUrl?: string; path?: string;
};

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
  if (!id) { id = `anon_${crypto.randomUUID?.() ?? Date.now().toString(36)}`; localStorage.setItem("resofit:anon_id", id); }
  return id;
}

function isRecord(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object" && !Array.isArray(v); }
function stringValue(v: unknown): string | undefined { return typeof v === "string" && v.trim() ? v.trim() : undefined; }

/** Accept the known provider shapes, including nested Make/ChatB2K payloads. */
function normalizeProduct(v: unknown): Product | null {
  if (!isRecord(v)) return null;
  const p: Product = {
    sku: stringValue(v.sku) ?? stringValue(v.SKU) ?? stringValue(v.product_sku),
    handle: stringValue(v.handle) ?? stringValue(v.product_handle) ?? stringValue(v.shopify_handle),
    variant_id: stringValue(v.variant_id) ?? stringValue(v.variantId),
    title: stringValue(v.title) ?? stringValue(v.product_title) ?? stringValue(v.name) ?? stringValue(v.product_name),
    image: stringValue(v.image) ?? stringValue(v.image_url) ?? stringValue(v.product_image),
    price: stringValue(v.price) ?? stringValue(v.price_ngn) ?? stringValue(v.amount),
    reason: stringValue(v.reason) ?? stringValue(v.why),
    url: stringValue(v.url) ?? stringValue(v.product_url) ?? stringValue(v.shop_url) ?? stringValue(v.external_url),
    checkoutUrl: stringValue(v.checkoutUrl) ?? stringValue(v.checkout_url) ?? stringValue(v.checkout),
    path: stringValue(v.path) ?? stringValue(v.product_path),
  };
  return Object.values(p).some(Boolean) ? p : null;
}

function productsFrom(value: unknown): Product[] {
  const out: Product[] = [];
  const seen = new Set<string>();
  const visit = (node: unknown, depth = 0) => {
    if (depth > 5 || node == null) return;
    if (Array.isArray(node)) { node.forEach((x) => visit(x, depth + 1)); return; }
    if (!isRecord(node)) return;
    const candidate = normalizeProduct(node);
    const identity = candidate && (candidate.checkoutUrl ?? candidate.url ?? candidate.handle ?? candidate.sku ?? candidate.variant_id ?? candidate.title);
    if (candidate && identity && !seen.has(identity)) { seen.add(identity); out.push(candidate); }
    for (const [key, child] of Object.entries(node)) {
      if (["product", "products", "recommendation", "recommendations", "bundle", "item", "items", "result", "data", "output", "body"].includes(key.toLowerCase())) visit(child, depth + 1);
    }
  };
  visit(value);
  return out;
}

function exactDestination(product?: Product) {
  if (!product) return null;
  if (product.checkoutUrl) return product.checkoutUrl;
  if (product.url) return product.url;
  if (product.path) return new URL(product.path, SHOP).toString();
  if (product.handle) return `${SHOP}/product/${encodeURIComponent(product.handle)}`;
  return null;
}

function fallbackRecommendation(a: Answers) {
  const goal = GOALS.find(x => x.value === a.goal)?.label ?? "your wellness goal";
  const reset = a.goal === "reset";
  return {
    title: reset ? "Your ResoFit 7-Day Reset" : "Your ResoFit Personalized Pathway",
    summary: `Your assessment is complete. Your priority is ${goal.toLowerCase()}. ${reset ? "Start the ResoFit 7-Day Reset." : "A ResoFit specialist can help you access the right next step."}`,
  };
}

function PersonalizePage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ goal: "", activity: "", diet: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function submit(next: Answers) {
    setLoading(true); trackEvent("assessment_click");
    try {
      const response = await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ anon_id: anonId(), source: "resofit.fit/personalize", submittedAt: new Date().toISOString(), ...next }) });
      const text = await response.text();
      let parsed: unknown = {};
      try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { summary: text }; }
      if (!response.ok) throw new Error("Assessment unavailable");
      setResult(parsed); setStep(3); trackEvent("assessment_complete");
    } catch {
      setResult(fallbackRecommendation(next)); setStep(3); trackEvent("assessment_complete"); trackEvent("assessment_fallback");
    } finally { setLoading(false); }
  }

  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-12">
    <header className="mb-8 text-center"><p className="text-xs uppercase tracking-[0.3em] text-gold">ChatB2K Assessment</p><h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Your personalized <span className="text-gold">ResoFit</span> protocol</h1><p className="mt-3 text-sm text-muted-foreground">3 questions · about 60 seconds · personalized next step</p></header>
    {step < 3 && <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-border/40"><div className="h-full bg-gold transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} /></div>}
    {step === 0 && <StepCard title="What's your primary goal?" options={GOALS} onSelect={v => { setAnswers(a => ({ ...a, goal: v })); setStep(1); }} />}
    {step === 1 && <StepCard title="How active are you right now?" options={ACTIVITIES} onBack={() => setStep(0)} onSelect={v => { setAnswers(a => ({ ...a, activity: v })); setStep(2); }} />}
    {step === 2 && <StepCard title="Which best describes your diet?" options={DIETS} loading={loading} onBack={() => setStep(1)} onSelect={v => { const next = { ...answers, diet: v }; setAnswers(next); void submit(next); }} />}
    {step === 3 && <ResultView result={result} answers={answers} onRestart={() => { setStep(0); setResult(null); setAnswers({ goal: "", activity: "", diet: "" }); }} />}
  </main><SiteFooter /></div>;
}

function StepCard({ title, options, onSelect, onBack, loading = false }: { title: string; options: Array<{value:string;label:string}>; onSelect:(v:string)=>void; onBack?:()=>void; loading?:boolean }) {
  return <section className="rounded-2xl border border-gold/20 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-8"><h2 className="font-display text-2xl md:text-3xl">{title}</h2><div className="mt-6 grid gap-3">{options.map(o => <button key={o.value} disabled={loading} onClick={() => onSelect(o.value)} className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition-all hover:border-gold/50 hover:bg-gold/[0.06] disabled:opacity-50"><span>{o.label}</span><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-gold" /></button>)}</div><div className="mt-6 flex justify-between">{onBack ? <button onClick={onBack} disabled={loading} className="text-xs uppercase tracking-widest text-muted-foreground">← Back</button> : <span />}{loading && <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold"><Loader2 className="h-3 w-3 animate-spin" /> Curating your recommendation…</span>}</div></section>;
}

function ResultView({ result, answers, onRestart }: { result: unknown; answers: Answers; onRestart: () => void }) {
  const products = productsFrom(result); const primary = products[0]; const destination = exactDestination(primary);
  const record = isRecord(result) ? result : {};
  const title = stringValue(record.title) ?? primary?.title ?? "Your ResoFit Recommendation";
  const summary = stringValue(record.summary) ?? stringValue(record.reason) ?? "Your assessment is complete. We found the next step that best matches your goal.";
  const goal = GOALS.find(x => x.value === answers.goal)?.label ?? answers.goal;
  const helpUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi ResoFit, I completed my 60-second assessment. My goal is ${goal}. Please help me access my recommended next step.`)}`;
  return <article className="overflow-hidden rounded-[2rem] border border-gold/30 bg-black/70 p-5 shadow-2xl shadow-gold/10 backdrop-blur-2xl md:p-10"><p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold"><Sparkles className="h-3 w-3" /> Your ResoFit match</p><h2 className="mt-2 font-display text-3xl text-gold md:text-4xl">{title}</h2>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Primary goal",goal],["Current activity",ACTIVITIES.find(x=>x.value===answers.activity)?.label ?? answers.activity],["Lifestyle fit",DIETS.find(x=>x.value===answers.diet)?.label ?? answers.diet]].map(([k,v])=><div key={k} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><Check className="h-4 w-4 text-gold"/><p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{k}</p><p className="mt-1 text-sm">{v}</p></div>)}</div>
    <div className="mt-6 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-6"><div className="flex items-center gap-2 text-gold"><Sparkles className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-widest">Why this fits you</span></div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{summary}</p></div>
    {primary && <div className="mt-6 overflow-hidden rounded-2xl border border-gold/40 bg-white/[0.04]">{primary.image && <img src={primary.image} alt={primary.title ?? "Recommended ResoFit solution"} className="h-56 w-full object-cover md:h-72"/>}<div className="p-6"><p className="text-[10px] uppercase tracking-[0.25em] text-gold">Recommended for you</p><h3 className="mt-2 font-display text-2xl">{primary.title ?? "Your exact ResoFit solution"}</h3>{primary.reason && <p className="mt-2 text-sm text-muted-foreground">{primary.reason}</p>}{primary.price && <p className="mt-4 text-xl font-semibold text-gold">{primary.price}</p>}</div></div>}
    <div className="mt-8 rounded-[1.5rem] border border-gold/60 bg-gradient-to-br from-gold/15 to-transparent p-6 text-center"><p className="text-xs uppercase tracking-[0.25em] text-gold">Your next move</p><h3 className="mt-2 font-display text-2xl">{destination ? "Your exact recommendation is ready" : "Your recommendation needs one final step"}</h3><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{destination ? "Continue directly to the exact product, service or checkout. No browsing required." : "We could not safely resolve an exact destination. A ResoFit specialist will help rather than sending you to a generic shop."}</p>{destination ? <button onClick={() => { trackEvent("assessment_result_cta"); window.location.assign(destination); }} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-4 text-xs font-bold uppercase tracking-widest text-gold-foreground md:w-auto">Get my exact recommendation <ArrowRight className="h-4 w-4"/></button> : <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-4 text-xs font-bold uppercase tracking-widest text-gold-foreground md:w-auto">Connect me to my recommendation <MessageCircle className="h-4 w-4"/></a>}</div>
    <button onClick={onRestart} className="mt-6 w-full text-xs uppercase tracking-widest text-muted-foreground">Retake assessment</button>
  </article>;
}
