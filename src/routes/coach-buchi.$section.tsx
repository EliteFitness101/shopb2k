import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Scale, Sparkles, Sun, Target } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const CONTENT: Record<string, { eyebrow: string; title: string; intro: string; principle: string; sections: { title: string; body: string }[]; episodes?: { title: string; body: string }[]; versions?: string[] }> = {
  "lord-b2k": { eyebrow: "LordB2K · Season 10", title: "Forged in the Furnace.", intro: "The survival intelligence that emerged from pressure, betrayal, isolation, failure and rebuilding — then became architecture.", principle: "Pain became data. Failure became control. Dependency became resilience.", sections: [
    { title: "The Furnace", body: "The furnace is the period in which pressure stops being only suffering and becomes information about people, systems, trust, risk and resilience." },
    { title: "The Architect", body: "LordB2K evolves from survival intelligence into architect intelligence: evidence is organized, dependencies are mapped, controls are designed and outcomes are verified." },
    { title: "The Learning Loop", body: "Life event → business event → problem → evidence → analysis → lesson → principle → control → measured outcome → new learning." },
  ] },
  "lord-b2k-state": { eyebrow: "LordB2K State · Evolution", title: "From Intelligence to State.", intro: "The next evolution is not another version number. It is a state-aware architecture that continuously evaluates where the system is and what transition is responsible.", principle: "Intelligence without state awareness can react. Intelligence with state awareness can govern.", sections: [
    { title: "The State Vector", body: "Evidence, confidence, risk, authority, objective, resources, constraints, dependencies, ethics, governance, readiness and learning form the current state." },
    { title: "The Transition", body: "Event → Evidence → Intelligence → Discernment → State → Governance → Action → Outcome → Learning → State." },
    { title: "The Relativity Analogy", body: "Einstein’s relativity is used here only as an intellectual analogy: observation depends on a frame of reference; LordB2K decisions depend on a state of reference. This is systems philosophy, not a new physical theory." },
  ] },
  "lord-of-light": { eyebrow: "Lord of Light · Season 15", title: "What the Furnace Could Not Destroy.", intro: "Light is not the erasure of darkness. It is the clarity produced by what was learned in it.", principle: "Truth becomes infrastructure.", episodes: [
    { title: "Episode 01 · After the Fire", body: "Survival gives way to deliberate living, creation and stewardship." },
    { title: "Episode 02 · Truth Becomes Infrastructure", body: "What is learned is converted into evidence, principles, controls and repeatable practice." },
    { title: "Episode 03 · The Architecture of Trust", body: "Evidence, authority, privacy, governance and verification protect people as well as systems." },
    { title: "Episode 04 · Turning Pain Into Protection", body: "Hard-earned lessons become safeguards so future people and systems do not have to relearn every lesson through damage." },
    { title: "Episode 05 · Light Is a System", body: "Darkness → Discovery → Truth → Understanding → Intelligence → Discernment → Governance → Creation → Service → Transformation → Light → Legacy." },
    { title: "Episode 06 · Legacy", body: "A living doctrine preserves the founding principle while methods, technology and stewards evolve." },
  ], versions: ["v1.0 · Founding narrative", "v1.1 · Factual clarification", "v2.0 · Evidence-expanded canonical edition", "v3.0 · Future steward edition"], sections: [
    { title: "After the Fire", body: "Survival gives way to deliberate living, creation and stewardship." },
    { title: "The Architecture of Trust", body: "Evidence, authority, privacy, governance and verification become mechanisms for protecting people rather than merely controlling systems." },
    { title: "Light Is a System", body: "Darkness → Discovery → Truth → Understanding → Intelligence → Discernment → Governance → Creation → Service → Transformation → Light → Legacy." },
  ] },
  "seasons": { eyebrow: "The Coach Buchi Story · Living Archive", title: "The Seasons.", intro: "A versioned founder narrative: biography, business, technology, relationships, resilience and the evolution of the ResoFit ecosystem.", principle: "The story is preserved as an evolving archive, with evidence and context separated from interpretation.", sections: [
    { title: "Seasons 1–6", body: "The Last Man Standing · The Builder · The Entrepreneur · The Wars · Candy · The iPhone." },
    { title: "Seasons 7–10", body: "ResoFit · ResoFlex · ChatB2K · LordB2K." },
    { title: "Seasons 11–14", body: "The Ecosystem · The Rebuild · The Revenue Machine · The Legacy." },
    { title: "Season 15", body: "Lord of Light — After the Fire, Truth Becomes Infrastructure, The Architecture of Trust, Turning Pain Into Protection, Light Is a System and Legacy." },
  ] },
  "resilience-lab": { eyebrow: "Resilience Lab · Real Life", title: "Train for real life.", intro: "A practical capability layer for strength, movement, recovery and decision-making across changing environments.", principle: "The environment changes. Your capability should adapt.", sections: [
    { title: "Bunker", body: "Minimal-space strength, conditioning and discipline for constrained environments." },
    { title: "Jungle", body: "Resource-aware movement, endurance and adaptability for demanding environments." },
    { title: "City", body: "Efficient routines for work, commuting, pressure and limited time." },
    { title: "Luxury", body: "Travel, hotel and premium-life routines without losing the state you built." },
  ] },
  "legal-governance": { eyebrow: "Legal · Governance · Case Intelligence", title: "Evidence Before Assumption.", intro: "A governance layer connecting real founder case studies to evidence, legal analysis, risk controls, verification and ecosystem learning.", principle: "Event → State → Evidence → Analysis → Decision → Control → Verification → Publication → Learning.", sections: [
    { title: "Case Intelligence", body: "Important events should produce a case record, evidence record, risk record, governance decision, system control, learning event or verified closure." },
    { title: "Publication Discipline", body: "Public material distinguishes FACTUAL, ALLEGED, ANALYSIS, DISPUTED, RESOLVED, ONGOING and VERIFIED SOURCE states, with privacy protection and legal review where required." },
    { title: "Legal Platform", body: "The planned legal.resofit.fit platform is the dedicated Legal, Governance & Case Intelligence layer; this Coach Buchi archive provides the founder-facing narrative entry point." },
  ] },
};

export const Route = createFileRoute("/coach-buchi/$section")({
  beforeLoad: ({ params }) => { if (!CONTENT[params.section]) throw notFound(); },
  head: ({ params }) => { const item = CONTENT[params.section]; return { meta: [{ title: `${item.title} | Coach Buchi · LordB2K · ResoFit` }, { name: "description", content: item.intro }], links: [{ rel: "canonical", href: `https://www.resofit.fit/coach-buchi/${params.section}` }] }; },
  component: ArchivePage,
});

function ArchivePage() {
  const { section } = Route.useParams();
  const item = CONTENT[section];
  const Icon = section === "lord-of-light" ? Sun : section === "legal-governance" ? Scale : section === "lord-b2k-state" ? Target : BookOpen;
  return <div className="min-h-screen bg-background text-foreground"><SiteHeader /><main>
    <section className="relative overflow-hidden border-b border-border/60 bg-black"><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(212,175,55,.14),transparent_42%)]" /><div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Link to="/coach-buchi" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-gold"><ArrowLeft className="h-4 w-4" /> Coach Buchi</Link>
      <div className="mt-12 flex items-start gap-5"><Icon className="mt-1 h-7 w-7 flex-none text-gold" /><div><p className="text-xs uppercase tracking-[.32em] text-gold">{item.eyebrow}</p><h1 className="mt-4 max-w-5xl font-display text-6xl leading-[.9] sm:text-8xl">{item.title}</h1><p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{item.intro}</p></div></div>
      <div className="mt-10 inline-flex max-w-3xl rounded-2xl border border-gold/20 bg-background/50 px-6 py-5 text-sm leading-relaxed backdrop-blur-xl"><span className="mr-3 text-gold">Principle</span>{item.principle}</div>
    </div></section>
    {item.episodes && <section className="border-b border-border/60 py-16"><div className="mx-auto max-w-6xl px-6"><p className="text-xs uppercase tracking-[.3em] text-gold">Episode index</p><div className="mt-6 grid gap-4 md:grid-cols-2">{item.episodes.map((episode) => <article key={episode.title} className="rounded-2xl border border-gold/15 bg-card/20 p-6"><h2 className="font-display text-2xl">{episode.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{episode.body}</p></article>)}</div>{item.versions && <div className="mt-10"><p className="text-xs uppercase tracking-[.3em] text-gold">Version ledger</p><div className="mt-4 flex flex-wrap gap-2">{item.versions.map((version) => <span key={version} className="rounded-full border border-border/60 px-3 py-2 text-xs text-muted-foreground">{version}</span>)}</div></div>}</div></section>}
    <section className="py-20 sm:py-28"><div className="mx-auto grid max-w-6xl gap-5 px-6 md:grid-cols-2">{item.sections.map((s, i) => <article key={s.title} className="group rounded-3xl border border-border/60 bg-card/20 p-7 transition-all hover:-translate-y-1 hover:border-gold/40 hover:bg-card/40"><div className="flex items-center justify-between"><span className="text-xs text-gold">0{i+1}</span><Sparkles className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-gold" /></div><h2 className="mt-12 font-display text-3xl">{s.title}</h2><p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{s.body}</p></article>)}</div></section>
    <section className="border-t border-border/60 py-16"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6"><div><p className="text-xs uppercase tracking-widest text-gold">Living archive</p><p className="mt-2 text-sm text-muted-foreground">The next state is always a learning state.</p></div><Link to="/coach-buchi" className="inline-flex items-center gap-2 rounded-sm border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:border-gold hover:text-gold">Return to Coach Buchi <ArrowRight className="h-4 w-4" /></Link></div></section>
  </main><SiteFooter /></div>;
}