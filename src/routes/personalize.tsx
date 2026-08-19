import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { trackEvent } from "@/lib/revenueOS";

export const Route = createFileRoute("/personalize")({ component: PersonalizePage });

const WHATSAPP_NUMBER = "2348132255842";
type Answers = { goal: string; activity: string; diet: string };
type Recommendation = { title: string; summary: string; reason: string; url: string; cta: string };

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

function recommendationFor(a: Answers): Recommendation {
  const base = "https://www.resofit.fit";
  switch (a.goal) {
    case "fat_loss":
      return { title: "ResoFit Body Reset Pathway", summary: "A focused starting point for body-composition goals, built around sustainable nutrition, movement and accountability.", reason: "Your primary goal is body-fat reduction. We are taking you directly to the relevant ResoFit experience instead of a generic catalogue.", url: `${base}/bellyfat`, cta: "Start My Body Reset" };
    case "muscle":
      return { title: "ResoFit Muscle Pathway", summary: "A strength-focused pathway for building lean muscle with progressive training and supportive nutrition.", reason: "Your primary goal is lean muscle, so your next step is the dedicated ResoFit muscle pathway.", url: `${base}/muscle`, cta: "Start My Muscle Pathway" };
    case "energy":
      return { title: "ResoFit Longevity & Energy Pathway", summary: "A personalized starting point for energy, healthy ageing, recovery and sustainable wellness habits.", reason: "Your priority is energy and focus, so we are taking you directly to the relevant longevity pathway.", url: `${base}/longevity`, cta: "Start My Energy Pathway" };
    default:
      return { title: "ResoFit 7-Day Reset", summary: "A simple, guided starting point to reset your routine and begin your personalized wellness journey.", reason: "You selected a full reset, so we are taking you directly to the Reset experience.", url: `${base}/reset`, cta: "Start My ₦1,000 Reset" };
  }
}

function PersonalizePage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ goal: "", activity: "", diet: "" });
  const [curating, setCurating] = useState(false);
  const [result, setResult] = useState<Recommendation | null>(null);

  function submit(next: Answers) {
    setCurating(true);
    trackEvent("assessment_click");
    window.setTimeout(() => {
      setResult(recommendationFor(next));
      setStep(3);
      setCurating(false);
      trackEvent("assessment_complete");
    }, 1100);
  }

  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-12">
    <header className="mb-8 text-center"><p className="text-xs uppercase tracking-[0.3em] text-gold">ChatB2K Assessment</p><h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Your personalized <span className="text-gold">ResoFit</span> protocol</h1><p className="mt-3 text-sm text-muted-foreground">3 questions · about 60 seconds · your next step is curated for you</p></header>
    {step < 3 && <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-border/40"><div className="h-full bg-gold transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} /></div>}
    {step === 0 && <StepCard title="What's your primary goal?" options={GOALS} onSelect={v => { setAnswers(a => ({ ...a, goal: v })); setStep(1); }} />}
    {step === 1 && <StepCard title="How active are you right now?" options={ACTIVITIES} onBack={() => setStep(0)} onSelect={v => { setAnswers(a => ({ ...a, activity: v })); setStep(2); }} />}
    {step === 2 && <StepCard title="Which best describes your diet?" options={DIETS} loading={curating} onBack={() => setStep(1)} onSelect={v => { const next = { ...answers, diet: v }; setAnswers(next); submit(next); }} />}
    {curating && <CurationState />}
    {step === 3 && result && <ResultView result={result} answers={answers} onRestart={() => { setStep(0); setResult(null); setAnswers({ goal: "", activity: "", diet: "" }); }} />}
  </main><SiteFooter /></div>;
}

function CurationState() {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-xl"><div className="w-full max-w-md rounded-[2rem] border border-gold/30 bg-black/80 p-8 text-center shadow-2xl shadow-gold/10"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div><p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-gold">ChatB2K™</p><h2 className="mt-2 font-display text-3xl">Curating your recommendation…</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Matching your goal, activity and lifestyle so you can go directly to the right ResoFit experience.</p><div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse bg-gold" /></div></div></div>;
}

function StepCard({ title, options, onSelect, onBack, loading = false }: { title: string; options: Array<{value:string;label:string}>; onSelect:(v:string)=>void; onBack?:()=>void; loading?:boolean }) {
  return <section className="rounded-[2rem] border border-gold/20 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-8"><h2 className="font-display text-2xl md:text-3xl">{title}</h2><div className="mt-6 grid gap-3">{options.map(o => <button key={o.value} disabled={loading} onClick={() => onSelect(o.value)} className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition-all hover:border-gold/50 hover:bg-gold/[0.06] disabled:opacity-50"><span>{o.label}</span><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-gold" /></button>)}</div><div className="mt-6 flex justify-between">{onBack ? <button onClick={onBack} disabled={loading} className="text-xs uppercase tracking-widest text-muted-foreground">← Back</button> : <span />}</div></section>;
}

function ResultView({ result, answers, onRestart }: { result: Recommendation; answers: Answers; onRestart: () => void }) {
  const goal = GOALS.find(x=>x.value===answers.goal)?.label ?? answers.goal;
  const helpUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi ResoFit, I completed my 60-second assessment. My goal is ${goal}. I need help with my recommended ResoFit pathway.`)}`;
  return <article className="overflow-hidden rounded-[2rem] border border-gold/30 bg-black/70 p-5 shadow-2xl shadow-gold/10 backdrop-blur-2xl md:p-10"><p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold"><Sparkles className="h-3 w-3" /> Your ResoFit match</p><h2 className="mt-2 font-display text-3xl text-gold md:text-4xl">{result.title}</h2>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Primary goal",goal],["Current activity",ACTIVITIES.find(x=>x.value===answers.activity)?.label ?? answers.activity],["Lifestyle fit",DIETS.find(x=>x.value===answers.diet)?.label ?? answers.diet]].map(([k,v])=><div key={k} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><Check className="h-4 w-4 text-gold"/><p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{k}</p><p className="mt-1 text-sm">{v}</p></div>)}</div>
    <div className="mt-6 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-6"><div className="flex items-center gap-2 text-gold"><Sparkles className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-widest">Why this fits you</span></div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result.reason}</p><p className="mt-3 text-sm leading-relaxed text-foreground/90">{result.summary}</p></div>
    <div className="mt-8 rounded-[1.5rem] border border-gold/60 bg-gradient-to-br from-gold/15 to-transparent p-6 text-center"><p className="text-xs uppercase tracking-[0.25em] text-gold">Your next move</p><h3 className="mt-2 font-display text-2xl">Your exact ResoFit experience is ready</h3><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">No browsing. No guessing. Continue directly to the experience selected for your goal.</p><a href={result.url} onClick={() => trackEvent("assessment_result_cta")} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-4 text-xs font-bold uppercase tracking-widest text-gold-foreground md:w-auto">{result.cta} <ArrowRight className="h-4 w-4"/></a><div><a href={helpUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs uppercase tracking-widest text-muted-foreground underline underline-offset-4">Need a specialist?</a></div></div>
    <button onClick={onRestart} className="mt-6 w-full text-xs uppercase tracking-widest text-muted-foreground">Retake assessment</button>
  </article>;
}
