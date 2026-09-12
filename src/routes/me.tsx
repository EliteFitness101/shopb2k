import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { trackEvent } from "@/lib/revenueOS";

export const Route = createFileRoute("/me")({ component: MePage });
const WHATSAPP_NUMBER = "2348132255842";
const EXTERNAL_RESET_URL = "https://reset.resofit.fit";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
type Answers = { goal: string; activity: string; diet: string };
type Recommendation = { title: string; summary: string; reason: string; url: string; cta: string };
type Option = { value: string; label: string };
type ChatB2KRecommendation = { title: string; summary?: string; rationale?: string; route?: string; handle?: string; sku?: string; price?: number; inventory?: number };
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
  if (!supabase) return null;
  try {
    const sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `assessment-${Date.now()}`;
    const query = a.goal === "fat_loss" ? "fat loss body composition nutrition" : a.goal === "muscle" ? "lean muscle strength resistance training" : "energy focus nutrition recovery wellness";
    const { data, error } = await supabase.functions.invoke("chatb2k-recommend", { body: { query, goal: a.goal, interests: `${a.activity} ${a.diet}`, session_id: sessionId, limit: 1 } });
    if (error || !data?.recommendations?.length) return null;
    const winner = data.recommendations[0] as ChatB2KRecommendation;
    if (!winner.handle || !winner.sku || Number(winner.inventory ?? 0) <= 0) return null;
    return { title: winner.title, summary: winner.summary || "A personalized ResoFit offer selected from the live catalog.", reason: winner.rationale || "ChatB2K matched your goal, activity and lifestyle against the live ResoFit catalog and availability.", url: `/recommendation/${encodeURIComponent(winner.handle)}?sku=${encodeURIComponent(winner.sku)}&goal=${encodeURIComponent(a.goal)}`, cta: "Continue to checkout" };
  } catch { return null; }
}
function resetAnswers(): Answers { return { goal: "", activity: "", diet: "" }; }
function MePage() {
  const [step, setStep] = useState(0); const [answers, setAnswers] = useState<Answers>(resetAnswers()); const [curating, setCurating] = useState(false); const [result, setResult] = useState<Recommendation | null>(null);
  const restart = () => { setStep(0); setResult(null); setAnswers(resetAnswers()); };
  async function submit(next: Answers) { setCurating(true); trackEvent("assessment_click"); const recommendation = await canonicalRecommendation(next); window.setTimeout(() => { setResult(recommendation); setStep(3); setCurating(false); trackEvent("assessment_complete"); if (recommendation) window.location.assign(recommendation.url); }, 900); }
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-12"><header className="mb-8 text-center"><p className="text-xs uppercase tracking-[0.3em] text-gold">ChatB2K Assessment</p><h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Your personalized <span className="text-gold">ResoFit</span> pathway</h1><p className="mt-3 text-sm text-muted-foreground">3 questions · about 60 seconds · your next step is curated for you</p></header>{step < 3 && <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-border/40"><div className="h-full bg-gold transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} /></div>}{step === 0 && <StepCard title="What's your primary goal?" options={GOALS} onSelect={(v) => { setAnswers((a) => ({ ...a, goal: v })); setStep(1); }} />}{step === 1 && <StepCard title="How active are you right now?" options={ACTIVITIES} onBack={() => setStep(0)} onSelect={(v) => { setAnswers((a) => ({ ...a, activity: v })); setStep(2); }} />}{step === 2 && <StepCard title="Which best describes your diet?" options={DIETS} loading={curating} onBack={() => setStep(1)} onSelect={(v) => { const next = { ...answers, diet: v }; setAnswers(next); submit(next); }} />}{curating && <CurationState />}{step === 3 && !result && <NoMatchView answers={answers} onRestart={restart} />}</main><SiteFooter /></div>;
}
function CurationState() { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-xl"><div className="w-full max-w-md rounded-[2rem] border border-gold/30 bg-black/80 p-8 text-center shadow-2xl shadow-gold/10"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div><p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-gold">ChatB2K™</p><h2 className="mt-2 font-display text-3xl">Opening your matched offer…</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Preparing the exact product, live details, imagery and checkout path for you.</p><div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse bg-gold" /></div></div></div>; }
function StepCard({ title, options, onSelect, onBack, loading = false }: { title: string; options: Option[]; onSelect: (v: string) => void; onBack?: () => void; loading?: boolean }) { return <section className="rounded-[2rem] border border-gold/20 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-8"><h2 className="font-display text-2xl md:text-3xl">{title}</h2><div className="mt-6 grid gap-3">{options.map((o) => <button key={o.value} disabled={loading} onClick={() => onSelect(o.value)} className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition-all hover:border-gold/50 hover:bg-gold/[0.06] disabled:opacity-50"><span>{o.label}</span><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-gold" /></button>)}</div><div className="mt-6 flex justify-between">{onBack ? <button onClick={onBack} disabled={loading} className="text-xs uppercase tracking-widest text-muted-foreground">← Back</button> : <span />}</div></section>; }
function NoMatchView({ answers, onRestart }: { answers: Answers; onRestart: () => void }) { const goal = GOALS.find((x) => x.value === answers.goal)?.label ?? answers.goal; const helpUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi ResoFit, I completed my assessment. My goal is ${goal}. I need help with my recommended ResoFit pathway.`)}`; return <article className="rounded-[2rem] border border-gold/30 bg-black/70 p-6 text-center shadow-2xl shadow-gold/10 backdrop-blur-2xl md:p-10"><Sparkles className="mx-auto h-7 w-7 text-gold" /><h2 className="mt-4 font-display text-3xl">We need a specialist to complete your match</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">We could not safely identify an active purchase-ready offer for this exact profile, so we will not send you to a generic shop search.</p><a href={helpUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-6 py-3 text-xs font-bold uppercase tracking-widest text-gold-foreground">Talk to a specialist</a><button onClick={onRestart} className="mt-5 block w-full text-xs uppercase tracking-widest text-muted-foreground">Retake assessment</button></article>; }
function ResultView({ result, answers, onRestart }: { result: Recommendation; answers: Answers; onRestart: () => void }) { const goal = GOALS.find((x) => x.value === answers.goal)?.label ?? answers.goal; return <article className="rounded-[2rem] border border-gold/30 bg-black/70 p-8 text-center"><Check className="mx-auto h-5 w-5 text-gold" /><h2 className="mt-3 font-display text-3xl text-gold">{result.title}</h2><p className="mt-3 text-sm text-muted-foreground">{goal}</p><a href={result.url} onClick={() => trackEvent("assessment_result_cta")} className="mt-6 inline-flex min-h-14 items-center gap-2 rounded-xl bg-gold px-8 py-4 text-xs font-bold uppercase tracking-widest text-gold-foreground">{result.cta} <ArrowRight className="h-4 w-4" /></a><button onClick={onRestart} className="mt-6 block w-full text-xs uppercase tracking-widest text-muted-foreground">Retake assessment</button></article>; }
