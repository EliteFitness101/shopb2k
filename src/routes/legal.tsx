import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const AREAS = [
  ["casebook","Casebook","Founder and ecosystem cases, classified by status and subject."],
  ["coach-buchi","Coach Buchi","Chronology, origins, entrepreneurship, disputes and rebuilding."],
  ["seasons","Seasons","The Last Man Standing through LordB2K and the Legacy."],
  ["legal","Legal Research","Contracts, company, commerce, employment, property, AI, privacy and disputes."],
  ["research","Research","Legislation, regulations, cases, judgments and regulatory guidance."],
  ["evidence","Evidence","Indexes, chronology, documents, communications, transactions and provenance."],
  ["governance","Governance","Principles, authorities, controls, audit, risk and decisions."],
  ["ecosystem","Ecosystem","ResoFit, ResoFlex, ChatB2K, commerce, attribution and architecture."],
  ["case-studies","Case Studies","Business, technology, automation, commerce, revenue, AI and recovery."],
  ["risk","Risk","Active, controlled, accepted and resolved legal, commercial, technical and privacy risk."],
  ["principles","Principles","LordB2K, resilience, evidence-first, zero-assumption and auditability."],
  ["tools","Tools","Timeline, case map, risk matrix, evidence map and governance checklist."],
  ["admin","Admin","Restricted case, evidence, review, redaction, publishing and audit controls."]
];

export const Route = createFileRoute("/legal")({ component: LegalHome });

function LegalHome() {
 return <div className="min-h-screen bg-background text-foreground"><SiteHeader/><main>
  <section className="relative overflow-hidden border-b border-border/60 bg-black"><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(212,175,55,.16),transparent_42%)]"/><div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
   <p className="text-xs uppercase tracking-[.32em] text-gold">ResoFit · Legal & Governance</p><h1 className="mt-5 max-w-5xl font-display text-6xl leading-[.9] sm:text-8xl">Evidence before assumption.</h1>
   <p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">A living Legal, Governance & Case Intelligence layer connecting the Coach Buchi story, ResoFit ecosystem case studies, evidence, risk, decisions, controls and verified learning.</p>
   <div className="mt-10 flex flex-wrap gap-3"><span className="rounded-full border border-gold/20 bg-background/50 px-4 py-2 text-xs uppercase tracking-widest">FACTUAL</span><span className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest">ANALYSIS</span><span className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest">DISPUTED</span><span className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest">VERIFIED SOURCE</span></div>
  </div></section>
  <section className="py-16 sm:py-24"><div className="mx-auto max-w-7xl px-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{AREAS.map(([slug,title,desc])=><Link key={slug} to="/legal/$section" params={{section:slug}} className="group rounded-3xl border border-border/60 bg-card/20 p-7 transition-all hover:-translate-y-1 hover:border-gold/45 hover:bg-card/40"><div className="flex justify-between"><Scale className="h-5 w-5 text-gold"/><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold"/></div><h2 className="mt-10 font-display text-3xl">{title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p></Link>)}</div></div></section>
 </main><SiteFooter/></div>;
}