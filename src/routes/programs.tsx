import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EcosystemCarousel } from "@/components/EcosystemCarousel";
import { PROGRAMS } from "@/content/programs";
import { CTA } from "@/lib/ctas";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: "Wellness Programs — ResoFit" },
      { name: "description", content: "Signature ResoFit programs for strength, longevity, mobility, nutrition and recovery — personalized by ChatB2K™." },
      { property: "og:title", content: "Wellness Programs — ResoFit" },
      { property: "og:description", content: "Signature programs personalized by ChatB2K™." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.resofit.fit/programs" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.resofit.fit/programs" }],
  }),
  component: ProgramsIndex,
});

function ProgramsIndex() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">Signature Programs</p>
            <h1 className="font-display text-5xl leading-[0.95] md:text-7xl">
              Wellness paths,
              <br />
              <span className="text-gradient-gold">personalized to you.</span>
            </h1>
            <p className="mt-6 max-w-xl text-muted-foreground">
              Strength, longevity, mobility, nutrition and recovery — every program is adapted to
              your body and lifestyle by ChatB2K™.
            </p>
            <Link
              to="/personalize"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-sm bg-gold px-6 text-xs font-semibold uppercase tracking-widest text-gold-foreground hover:-translate-y-0.5 transition-transform"
            >
              {CTA.primary} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-px bg-border/60 md:grid-cols-2">
            {PROGRAMS.map((p) => (
              <Link
                key={p.slug}
                to="/programs/$slug"
                params={{ slug: p.slug }}
                className="group flex flex-col justify-between bg-background p-8 transition-colors hover:bg-card"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold">{p.eyebrow}</p>
                  <h2 className="mt-3 font-display text-3xl leading-tight">{p.title}</h2>
                  <p className="mt-3 text-sm text-muted-foreground">{p.summary}</p>
                </div>
                <p className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold group-hover:gap-3 transition-all">
                  Explore program <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Link>
            ))}
          </div>
        </section>

        <EcosystemCarousel surface="programs" title="Continue your journey" eyebrow="The ResoFit Ecosystem" />
      </main>
      <SiteFooter />
    </div>
  );
}
