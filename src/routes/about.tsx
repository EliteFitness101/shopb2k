import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EcosystemCarousel } from "@/components/EcosystemCarousel";
import { CTA } from "@/lib/ctas";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — ResoFit, Africa's Personalized Wellness Platform" },
      { name: "description", content: "ResoFit is Africa's personalized wellness platform, powered by ResoFlex™ hardware and the ChatB2K™ wellness intelligence." },
      { property: "og:title", content: "About ResoFit" },
      { property: "og:description", content: "Africa's personalized wellness platform." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.resofit.fit/about" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.resofit.fit/about" }],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-4xl px-6 py-24">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">About</p>
            <h1 className="font-display text-5xl leading-[0.95] md:text-7xl">
              Africa's personalized
              <br />
              <span className="text-gradient-gold">wellness platform.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg text-muted-foreground">
              ResoFit exists to make world-class wellness personal, practical and African. We
              combine ResoFlex™ hardware, signature programs and the ChatB2K™ wellness intelligence
              to help you build strength, mobility, longevity and confidence — for life.
            </p>
            <Link
              to="/personalize"
              className="mt-10 inline-flex h-12 items-center gap-2 rounded-sm bg-gold px-6 text-xs font-semibold uppercase tracking-widest text-gold-foreground"
            >
              {CTA.primary} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-16">
          <div className="grid gap-10 md:grid-cols-3">
            {[
              { t: "Personalized", d: "Every plan is shaped by your goals, kitchen and schedule." },
              { t: "Practitioner-led", d: "Programs designed by coaches, not marketers." },
              { t: "African by design", d: "Rooted in real African lifestyles, foods and communities." },
            ].map((v) => (
              <div key={v.t}>
                <p className="text-xs uppercase tracking-[0.3em] text-gold">{v.t}</p>
                <p className="mt-3 text-sm text-muted-foreground">{v.d}</p>
              </div>
            ))}
          </div>
        </section>

        <EcosystemCarousel surface="about" />
      </main>
      <SiteFooter />
    </div>
  );
}
