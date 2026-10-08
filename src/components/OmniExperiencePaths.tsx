import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Path = { eyebrow:string; title:string; text:string; to:"/me"|"/programs"|"/wellness"|"/shop"|"/martial-x3"; tag?:string };

const PATHS: Path[] = [
  { eyebrow:"PERSONALIZE", title:"Find My Path", text:"A short ChatB2K™ assessment matches your goals to the next best ResoFit step.", to:"/me", tag:"60 SEC" },
  { eyebrow:"LIFE", title:"Every Stage", text:"Wellness pathways for kids, youth, young adults, adults, families and healthy ageing.", to:"/me", tag:"ALL AGES" },
  { eyebrow:"BODY", title:"Weight · Muscle · Glutes", text:"Explore body-composition goals through personalized, age-appropriate programs.", to:"/programs", tag:"GOALS" },
  { eyebrow:"WELLNESS", title:"Nutrition · Mobility · Recovery", text:"Build sustainable routines around how you eat, move, recover and live.", to:"/wellness", tag:"WELLNESS" },
  { eyebrow:"PERFORMANCE", title:"Martial-X", text:"Capability, self-defence, bootcamp and performance pathways.", to:"/martial-x3", tag:"CAPABILITY" },
  { eyebrow:"COMMERCE", title:"ResoFlex™ Shop", text:"Premium equipment and products connected to the live commerce journey.", to:"/shop", tag:"SHOP" },
];

export function OmniExperiencePaths() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-black/40 py-20 sm:py-24" aria-labelledby="omni-paths">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(212,175,55,.10),transparent_28%),radial-gradient(circle_at_85%_70%,rgba(212,175,55,.06),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.3em] text-gold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> ResoFit Experience Gateway
            </div>
            <h2 id="omni-paths" className="font-display text-4xl leading-tight sm:text-5xl md:text-6xl">
              One platform. <span className="text-gradient-gold">Your path.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Start with who you are, what you want to change, or the experience you want next. ChatB2K™ and the existing ResoFit journeys do the matching.
            </p>
          </div>
          <Link to="/me" className="group inline-flex min-h-12 items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-5 text-xs font-semibold uppercase tracking-widest text-gold transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold/15 hover:shadow-[0_12px_45px_rgba(212,175,55,.14)]">
            Personalize now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PATHS.map((path) => (
            <Link key={path.title} to={path.to} className="group relative min-h-[210px] overflow-hidden rounded-3xl border border-border/70 bg-white/[.025] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-gold/45 hover:bg-gold/[.045] hover:shadow-[0_24px_80px_rgba(0,0,0,.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70">
              <div className="absolute right-5 top-5 rounded-full border border-gold/20 bg-black/40 px-2.5 py-1 text-[9px] font-semibold tracking-[.18em] text-gold">{path.tag}</div>
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[.28em] text-gold">{path.eyebrow}</p>
                  <h3 className="mt-4 max-w-[12rem] font-display text-2xl leading-tight sm:text-3xl">{path.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{path.text}</p>
                </div>
                <span className="mt-7 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-foreground">
                  Explore <ArrowRight className="h-3.5 w-3.5 text-gold transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
