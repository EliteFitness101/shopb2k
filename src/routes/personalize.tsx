import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Copy, Loader2, MessageCircle, Sparkles, Lock } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { trackEvent } from "@/lib/revenueOS";

export const Route = createFileRoute("/personalize")({
  component: PersonalizePage,
  head: () => ({ meta: [{ title: "ChatB2K Assessment — ResoFit" }, { name: "description", content: "Receive a personalized ResoFit pathway tailored to your goal, activity, and diet." }] }),
});

const WHATSAPP_NUMBER = "2348132255842";
const SHOP_URL = "https://shop.resofit.fit";
type Step = 0 | 1 | 2 | 3;
interface Answers { goal: string; activity: string; diet: string }
interface Recommendation { title: string; summary: string; href: string; cta: string }

const GOALS = [
  { value: "fat_loss", label: "Lose body fat" }, { value: "muscle", label: "Build lean muscle" },
  { value: "energy", label: "More energy & focus" }, { value: "reset", label: "Full reset & detox" },
];
const ACTIVITIES = [
  { value: "low", label: "Sedentary (desk work)" }, { value: "moderate", label: "Active 2–4×/week" }, { value: "high", label: "Athletic / daily training" },
];
const DIETS = [
  { value: "omnivore", label: "Omnivore" }, { value: "pescatarian", label: "Pescatarian" }, { value: "vegetarian", label: "Vegetarian" }, { value: "vegan", label: "Vegan" },
];

function getRecommendation(answers: Answers): Recommendation {
  const routes: Record<string, Recommendation> = {
    fat_loss: { title: "ResoFit Fat-Loss Pathway", summary: "A focused ResoFit pathway built around sustainable fat loss, movement and nutrition consistency.", href: `${SHOP_URL}/collections/reset`, cta: "View My Fat-Loss Recommendation" },
    muscle: { title: "ResoFit Strength & Muscle", summary: "A strength-focused pathway designed to support lean muscle, training consistency and recovery.", href: `${SHOP_URL}/collections/strength`, cta: "View My Strength Recommendation" },
    energy: { title: "ResoFit Energy & Performance", summary: "A practical pathway focused on daily energy, movement, nutrition and performance habits.", href: `${SHOP_URL}/collections/wellness`, cta: "View My Energy Recommendation" },
    reset: { title: "ResoFit 7-Day Reset", summary: "A simple entry pathway to reset routines, nutrition and movement before building your longer-term plan.", href: `${SHOP_URL}/collections/reset`, cta: "Start My Reset" },
  };
  return routes[answers.goal] ?? { title: "Your ResoFit Personalized Pathway", summary: "Your assessment is complete. Explore ResoFit options and choose the pathway that best fits your current goal.", href: SHOP_URL, cta: "Explore My ResoFit Options" };
}

function PersonalizePage() {
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({ goal: "", activity: "", diet: "" });
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const progress = useMemo(() => (step / 3) * 100, [step]);

  const select = (field: keyof Answers, value: string) => {
    const next = { ...answers, [field]: value };
    setAnswers(next);
    if (field === "goal") setStep(1);
    else if (field === "activity") setStep(2);
    else { setLoading(true); trackEvent("assessment_click"); window.setTimeout(() => { setLoading(false); setStep(3); }, 200); }
  };
  const restart = () => { setStep(0); setAnswers({ goal: "", activity: "", diet: "" }); setRevealed(false); };
  const recommendation = step === 3 ? getRecommendation(answers) : null;

  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-12">
    <header className="mb-8 text-center"><p className="text-xs uppercase tracking-[0.3em] text-gold">ChatB2K Assessment</p><h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Your personalized <span className="text-gold">ResoFit</span> protocol</h1><p className="mt-3 text-sm text-muted-foreground">3 questions · 60 seconds · personalized ResoFit pathway</p></header>
    {step < 3 && <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-border/40"><div className="h-full bg-gold transition-all duration-500" style={{ width: `${progress}%` }} /></div>}
    {step === 0 && <StepCard title="What's your primary goal?" options={GOALS} value={answers.goal} onSelect={(v) => select("goal", v)} />}
    {step === 1 && <StepCard title="How active are you right now?" options={ACTIVITIES} value={answers.activity} onSelect={(v) => select("activity", v)} onBack={() => setStep(0)} />}
    {step === 2 && <StepCard title="Which best describes your diet?" options={DIETS} value={answers.diet} onSelect={(v) => select("diet", v)} onBack={() => setStep(1)} loading={loading} />}
    {step === 3 && recommendation && <ResultView recommendation={recommendation} revealed={revealed} onReveal={() => setRevealed(true)} onRestart={restart} answers={answers} />}
  </main><SiteFooter /></div>;
}

function StepCard({ title, options, value, onSelect, onBack, loading }: { title: string; options: Array<{ value: string; label: string }>; value: string; onSelect: (v: string) => void; onBack?: () => void; loading?: boolean }) {
  return <section className="rounded-lg border border-border/60 bg-card/40 p-6 md:p-8"><h2 className="font-display text-2xl md:text-3xl">{title}</h2><div className="mt-6 grid gap-3">{options.map((o) => <button key={o.value} type="button" disabled={loading} onClick={() => onSelect(o.value)} className={`group flex items-center justify-between rounded-md border px-5 py-4 text-left transition-colors ${value === o.value ? "border-gold bg-gold/10 text-foreground" : "border-border hover:border-gold/60 hover:bg-card"} disabled:opacity-50`}><span className="text-sm md:text-base">{o.label}</span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold" /></button>)}</div><div className="mt-6 flex items-center justify-between">{onBack ? <button type="button" onClick={onBack} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Back</button> : <span />}{loading && <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold"><Loader2 className="h-3 w-3 animate-spin" /> Matching your protocol…</span>}</div></section>;
}

function ResultView({ recommendation, revealed, onReveal, onRestart, answers }: { recommendation: Recommendation; revealed: boolean; onReveal: () => void; onRestart: () => void; answers: Answers }) {
  const copy = async () => { try { await navigator.clipboard.writeText(`ResoFit Protocol — ${recommendation.title}\nGoal: ${answers.goal} · Activity: ${answers.activity} · Diet: ${answers.diet}\n\n${recommendation.summary}`); toast.success("Copied to clipboard"); } catch { toast.error("Couldn't copy"); } };
  const expertUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi CoachB2K, I completed the ResoFit assessment (${answers.goal}/${answers.activity}/${answers.diet}) and need help choosing my pathway.`)}`;
  return <article className="relative overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-b from-black via-black to-black/80 p-6 text-foreground shadow-2xl shadow-gold/10 md:p-10"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.3em] text-gold">CoachB2K Result</p><h2 className="mt-2 font-display text-3xl text-gold md:text-4xl">{recommendation.title}</h2></div><button type="button" onClick={copy} aria-label="Copy result" className="rounded-md border border-gold/40 p-2 text-gold hover:bg-gold/10"><Copy className="h-4 w-4" /></button></div>
  <div className="relative mt-6"><div className={`space-y-6 transition-all duration-500 ${revealed ? "blur-0" : "pointer-events-none select-none blur-md"}`} aria-hidden={!revealed}><p className="text-sm leading-relaxed text-muted-foreground md:text-base">{recommendation.summary}</p><div className="rounded-md border border-gold/30 bg-card/40 p-5"><p className="text-xs uppercase tracking-widest text-gold">Recommended next step</p><p className="mt-2 text-sm text-muted-foreground">Your assessment points to this ResoFit pathway. Continue to the canonical ResoFit shop to view the available offer.</p><a href={recommendation.href} className="mt-5 inline-flex items-center gap-2 rounded-md bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground">{recommendation.cta}<ArrowRight className="h-4 w-4" /></a></div></div>{!revealed && <button type="button" onClick={onReveal} className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-black/30 backdrop-blur-sm"><span className="flex items-center gap-2 rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground shadow-lg shadow-gold/30"><Lock className="h-3.5 w-3.5" /> Reveal my protocol</span><span className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-white/80"><Sparkles className="h-3 w-3 text-gold" /> Curated for you</span></button>}</div>
  <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/40 pt-6"><a href={expertUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-gold/40 px-4 py-3 text-xs uppercase tracking-widest text-gold"><MessageCircle className="h-4 w-4" /> Ask an Expert</a><button type="button" onClick={onRestart} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">Retake Assessment</button><Link to="/elite" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold hover:underline">Upgrade to Elite Coaching <ArrowRight className="h-3 w-3" /></Link></div>
  </article>;
}
