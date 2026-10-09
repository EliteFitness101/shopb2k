import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductImage } from "@/components/ProductImage";
import { track } from "@/lib/tracking";

export const Route = createFileRoute("/me")({ component: MePage });
const WHATSAPP_NUMBER = "2348132255842";
const EXTERNAL_RESET_URL = "https://reset.resofit.fit";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
type Answers = { goal: string; activity: string; diet: string };
type Recommendation = { title: string; summary: string; reason: string; url: string; cta: string; price?: number; image?: string; sku?: string };
type Option = { value: string; label: string };
type ChatB2KRecommendation = { title: string; summary?: string; rationale?: string; route?: string; handle?: string; sku?: string; price?: number; inventory?: number; image?: string; image_url?: string };
const GOALS: Option[] = [
  { value: "fat_loss", label: "Lose body fat" }, { value: "muscle", label: "Build lean muscle" },
  { value: "energy", label: "More energy & focus" }, { value: "reset", label: "Full reset & wellness" },
];
const ACTIVITIES: Option[] = [
  { value: "low", label: "Sedentary (desk work)" }, { value: "moderate", label: "Active 2–4×/week" }, { value: "high", label: "Athletic / daily training" },
];
const DIETS: Option[] = [
  { value: "omnivore", label: "Omnivore" }, { value: "pescatarian", label: "Pescatarian" }, { value: "vegetarian", label: "Vegetarian" }, { value: "vegan", label: "Vegan" },
];
async function canonicalRecommendation(a: Answers): Promise<Recommendation | null> {
  if (a.goal === "reset") return { title: "ResoFit Reset", summary: "Your reset journey is handled by the dedicated ResoFit Reset experience.", reason: "ChatB2K detected reset intent and is routing you to the Reset purchase journey.", url: EXTERNAL_RESET_URL, cta: "Continue to Reset" };
  if (!supabase) throw new Error("Assessment service is not configured. Please contact a specialist.");
  const sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `assessment-${Date.now()}`;
    const query = a.goal === "fat_loss" ? "fat loss body composition nutrition" : a.goal === "muscle" ? "lean muscle strength resistance training" : "energy focus nutrition recovery wellness";
    const { data, error } = await supabase.functions.invoke("chatb2k-recommend", { body: { query, goal: a.goal, interests: `${a.activity} ${a.diet}`, session_id: sessionId, limit: 1 } });
    if (error) throw error;
    if (!data?.recommendations?.length) return null;
    const winner = data.recommendations[0] as ChatB2KRecommendation;
    if (!winner.handle || !winner.sku || Number(winner.inventory ?? 0) <= 0) return null;
    return { title: winner.title, summary: winner.summary || "A personalized ResoFit offer selected from the live catalog.", reason: winner.rationale || "ChatB2K matched your goal, activity and lifestyle against the live ResoFit catalog and availability.", price: Number.isFinite(Number(winner.price)) ? Number(winner.price) : undefined, image: winner.image || winner.image_url, sku: winner.sku, url: `/recommendation/${encodeURIComponent(winner.handle)}?sku=${encodeURIComponent(winner.sku)}&goal=${encodeURIComponent(a.goal)}`, cta: "Continue to checkout" };
}
const RECOMMENDATION_TIMEOUT = Symbol("recommendation-timeout");
function resetAnswers(): Answers { return { goal: "", activity: "", diet: "" }; }
function MePage() {
  const [step, setStep] = useState(0); const [answers, setAnswers] = useState<Answers>(resetAnswers()); const [curating, setCurating] = useState(false); const [result, setResult] = useState<Recommendation | null>(null); const [timedOut, setTimedOut] = useState(false); const [serviceError, setServiceError] = useState(false);
  const restart = () => { setStep(0); setResult(null); setTimedOut(false); setServiceError(false); setAnswers(resetAnswers()); };
  async function submit(next: Answers) {
    if (curating) return;
    setCurating(true); setTimedOut(false); setServiceError(false); setResult(null);
    let timeoutId: number | undefined;
    try {
      const timeout = new Promise<typeof RECOMMENDATION_TIMEOUT>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(RECOMMENDATION_TIMEOUT), 8000);
      });
      const recommendation = await Promise.race([canonicalRecommendation(next), timeout]);
      if (recommendation === RECOMMENDATION_TIMEOUT) {
        setTimedOut(true);
      } else {
        setResult(recommendation);
      }
      setStep(3);
    } catch {
      setServiceError(true);
      setStep(3);
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setCurating(false);
    }
  }
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-12"><header className="mb-8 text-center"><p className="text-xs uppercase tracking-[0.3em] text-gold">ChatB2K Assessment</p><h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Your personalized <span className="text-gold">ResoFit</span> pathway</h1><p className="mt-3 text-sm text-muted-foreground">3 questions · about 60 seconds · your next step is curated for you</p></header>{step < 3 && <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-border/40"><div className="h-full bg-gold transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} /></div>}{step === 0 && <StepCard title="What's your primary goal?" options={GOALS} onSelect={(v) => { setAnswers((a) => ({ ...a, goal: v })); track("identity_started", { source: "me_assessment" }); setStep(1); }} />}{step === 1 && <StepCard title="How active are you right now?" options={ACTIVITIES} onBack={() => setStep(0)} onSelect={(v) => { setAnswers((a) => ({ ...a, activity: v })); setStep(2); }} />}{step === 2 && <StepCard title="Which best describes your diet?" options={DIETS} loading={curating} onBack={() => setStep(1)} onSelect={(v) => { const next = { ...answers, diet: v }; setAnswers(next); track("assessment_completed", { goal: next.goal, activity: next.activity, diet: next.diet, source: "me_assessment" }); submit(next); }} />}{curating && <CurationState />}{step === 3 && result && <ResultView result={result} answers={answers} onRestart={restart} />} {step === 3 && !result && <NoMatchView answers={answers} timedOut={timedOut} serviceError={serviceError} onRetry={() => submit(answers)} onRestart={restart} />}</main><SiteFooter /></div>;
}
function CurationState() { return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-6 backdrop-blur-xl"><div className="w-full max-w-md rounded-[2rem] border border-gold/30 bg-black/80 p-8 text-center shadow-2xl shadow-gold/10"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div><p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-gold">ChatB2K™</p><h2 className="mt-2 font-display text-3xl">Opening your matched offer…</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Preparing the exact product, live details, imagery and checkout path for you.</p><div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse bg-gold" /></div></div></div>; }
function StepCard({ title, options, onSelect, onBack, loading = false }: { title: string; options: Option[]; onSelect: (v: string) => void; onBack?: () => void; loading?: boolean }) { return <section aria-live="polite" className="rounded-[2rem] border border-gold/20 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-8"><h2 className="font-display text-2xl md:text-3xl">{title}</h2><div className="mt-6 grid gap-3">{options.map((o) => <button type="button" key={o.value} disabled={loading} aria-label={o.label} onClick={() => onSelect(o.value)} className="group flex min-h-14 w-full touch-manipulation items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition-all duration-150 hover:border-gold/50 hover:bg-gold/[0.06] active:scale-[0.99] active:border-gold/60 active:bg-gold/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:pointer-events-none disabled:opacity-50"><span>{o.label}</span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-gold group-active:text-gold" /></button>)}</div><div className="mt-6 flex justify-between">{onBack ? <button type="button" onClick={onBack} disabled={loading} className="min-h-11 touch-manipulation text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:pointer-events-none disabled:opacity-50">← Back</button> : <span />}</div></section>; }
function NoMatchView({ answers, timedOut, serviceError, onRetry, onRestart }: { answers: Answers; timedOut: boolean; serviceError: boolean; onRetry: () => void; onRestart: () => void }) { const goal = GOALS.find((x) => x.value === answers.goal)?.label ?? answers.goal; const helpUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi ResoFit, I completed my assessment. My goal is ${goal}. I need help with my recommended ResoFit pathway.`)}`; return <article aria-live="polite" className="rounded-[2rem] border border-gold/30 bg-black/70 p-6 text-center shadow-2xl shadow-gold/10 backdrop-blur-2xl md:p-10"><Sparkles className="mx-auto h-7 w-7 text-gold" /><h2 className="mt-4 font-display text-3xl">{timedOut ? "Your match is taking longer than expected" : serviceError ? "We couldn't reach the recommendation service" : "We need a specialist to complete your match"}</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{timedOut ? "Your answers are still available here, but the recommendation service did not respond in time. Retry without starting over, or contact a specialist." : serviceError ? "Your answers are preserved, but the service could not complete the match. Retry, or contact a specialist. We will not treat a service error as a genuine no-match." : "We could not safely identify an active purchase-ready offer for this exact profile, so we will not send you to a generic shop search."}</p>{(timedOut || serviceError) && <button type="button" onClick={onRetry} className="mt-6 inline-flex min-h-12 w-full touch-manipulation items-center justify-center rounded-xl bg-gold px-6 py-3 text-xs font-bold uppercase tracking-widest text-gold-foreground sm:w-auto">Retry recommendation</button>}<a href={helpUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl border border-gold/40 px-6 py-3 text-xs font-bold uppercase tracking-widest text-gold">Talk to a specialist</a><button onClick={onRestart} type="button" className="mt-5 block min-h-11 w-full touch-manipulation text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70">Retake assessment</button></article>; }
function ResultView({ result, answers, onRestart }: { result: Recommendation; answers: Answers; onRestart: () => void }) { const goal = GOALS.find((x) => x.value === answers.goal)?.label ?? answers.goal; return <article className="overflow-hidden rounded-[2rem] border border-gold/30 bg-black/70 shadow-2xl shadow-gold/10 backdrop-blur-2xl"><div className="grid md:grid-cols-[0.9fr_1.1fr]">{result.image ? <div className="min-h-56 bg-white/[0.03] md:min-h-full"><ProductImage src={result.image} alt={result.title} title={result.title} priority aspect="landscape" sizes="(min-width: 768px) 45vw, 100vw" className="h-full w-full" /></div> : <div className="flex min-h-56 items-center justify-center bg-gold/[0.06]"><Sparkles className="h-12 w-12 text-gold" /></div>}<div className="p-7 text-center md:p-9 md:text-left"><div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.22em] text-gold md:justify-start"><Check className="h-4 w-4" /> Matched for you</div><h2 className="mt-3 font-display text-3xl md:text-4xl">{result.title}</h2><p className="mt-2 text-sm text-gold">{goal}</p>{result.price !== undefined && <p className="mt-4 text-2xl font-semibold">₦{result.price.toLocaleString("en-NG")}</p>}<p className="mt-4 text-sm leading-relaxed text-muted-foreground">{result.summary}</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{result.reason}</p><a href={result.url} onClick={() => track("cta_click", { cta: "assessment_result_cta", destination: result.url, sku: result.sku })} className="mt-6 inline-flex min-h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-gold px-8 py-4 text-xs font-bold uppercase tracking-widest text-gold-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 md:w-auto">{result.cta} <ArrowRight className="h-4 w-4" /></a><button type="button" onClick={onRestart} className="mt-5 block min-h-11 w-full touch-manipulation text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70">Retake assessment</button></div></div></article>; }
