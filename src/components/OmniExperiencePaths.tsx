import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import heroBarbell from "@/assets/hero-barbell.jpg";
import dumbbellImage from "@/assets/product-dumbbell.jpg";
import barbellImage from "@/assets/product-barbell.jpg";
import plateImage from "@/assets/product-plate.jpg";
import rackImage from "@/assets/product-rack.jpg";

type Path = {
  eyebrow: string;
  title: string;
  text: string;
  to: "/me" | "/programs" | "/wellness" | "/shop" | "/martial-x3";
  tag: string;
  image: string;
  imageAlt: string;
  position?: string;
};

const PATHS: Path[] = [
  {
    eyebrow: "PERSONALIZE",
    title: "Find My Path",
    text: "A short ChatB2K™ assessment matches your goals to the next best ResoFit step.",
    to: "/me",
    tag: "START HERE",
    image: heroBarbell,
    imageAlt: "Barbell in a dramatic, premium training studio",
    position: "center 55%",
  },
  {
    eyebrow: "LIFE",
    title: "Every Stage",
    text: "Wellness pathways for kids, youth, young adults, adults, families and healthy ageing.",
    to: "/me",
    tag: "ALL AGES",
    image: rackImage,
    imageAlt: "Strength training equipment in a gym",
  },
  {
    eyebrow: "BODY",
    title: "Weight · Muscle · Glutes",
    text: "Explore body-composition goals through personalized, age-appropriate programs.",
    to: "/programs",
    tag: "GOALS",
    image: dumbbellImage,
    imageAlt: "Dumbbell fitness equipment",
  },
  {
    eyebrow: "WELLNESS",
    title: "Nutrition · Mobility · Recovery",
    text: "Build sustainable routines around how you eat, move, recover and live.",
    to: "/wellness",
    tag: "WELLNESS",
    image: plateImage,
    imageAlt: "Strength training plate equipment",
  },
  {
    eyebrow: "PERFORMANCE",
    title: "Martial-X",
    text: "Capability, self-defence, bootcamp and performance pathways.",
    to: "/martial-x3",
    tag: "CAPABILITY",
    image: heroBarbell,
    imageAlt: "Premium training environment for strength and performance",
    position: "center 35%",
  },
  {
    eyebrow: "COMMERCE",
    title: "ResoFlex™ Shop",
    text: "Explore equipment and products through the existing live commerce journey.",
    to: "/shop",
    tag: "SHOP",
    image: barbellImage,
    imageAlt: "Barbell product photography",
  },
];

export function OmniExperiencePaths() {
  return (
    <section
      className="relative overflow-hidden border-y border-border/60 bg-black/40 py-16 sm:py-20"
      aria-labelledby="omni-paths"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(212,175,55,.10),transparent_28%),radial-gradient(circle_at_85%_70%,rgba(212,175,55,.06),transparent_30%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.3em] text-gold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              ResoFit Experience Gateway
            </div>
            <h2 id="omni-paths" className="font-display text-4xl leading-tight sm:text-5xl md:text-6xl">
              One platform. <span className="text-gradient-gold">Your path.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Start with who you are, what you want to change, or the experience you want next. ChatB2K™ and the existing ResoFit journeys do the matching.
            </p>
          </div>
          <Link
            to="/me"
            className="group inline-flex min-h-12 items-center gap-2 self-start rounded-xl border border-gold/40 bg-gold/10 px-5 text-xs font-semibold uppercase tracking-widest text-gold transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold/15 hover:shadow-[0_12px_45px_rgba(212,175,55,.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 md:self-auto"
          >
            Personalize now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PATHS.map((path) => (
            <Link
              key={path.title}
              to={path.to}
              className="group relative isolate flex min-h-[330px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b] shadow-[0_12px_40px_rgba(0,0,0,.18)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_24px_70px_rgba(0,0,0,.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <div className="absolute inset-0 -z-10" aria-hidden="true">
                <img
                  src={path.image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  width={960}
                  height={640}
                  style={{ objectPosition: path.position ?? "center" }}
                  className="h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/5" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />
              </div>

              <div className="flex items-center justify-between gap-3 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[.28em] text-gold">{path.eyebrow}</p>
                <span className="rounded-full border border-gold/30 bg-black/65 px-2.5 py-1 text-[9px] font-semibold tracking-[.16em] text-gold backdrop-blur">
                  {path.tag}
                </span>
              </div>

              <div className="mt-auto p-5 pt-12 sm:p-6">
                <h3 className="max-w-[18rem] font-display text-2xl leading-tight text-white sm:text-3xl">{path.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">{path.text}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-white">
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
