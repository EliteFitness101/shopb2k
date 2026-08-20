import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EcosystemCarousel } from "@/components/EcosystemCarousel";
import { SUCCESS_STORIES } from "@/content/successStories";
import { CTA } from "@/lib/ctas";
import { ArrowRight, Quote } from "lucide-react";

export const Route = createFileRoute("/success-stories")({
  head: () => ({
    meta: [
      { title: "Success Stories — ResoFit" },
      {
        name: "description",
        content:
          "Real ResoFit members share their wellness, strength and longevity transformations.",
      },
      { property: "og:title", content: "Success Stories — ResoFit" },
      {
        property: "og:description",
        content: "Verified member transformations from across Africa.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shopb2k.lovable.app/success-stories" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://resofit.fit/success-stories" }],
  }),
  component: Stories,
});

function Stories() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">Verified Results</p>
            <h1 className="font-display text-5xl leading-[0.95] md:text-7xl">
              Real people.
              <br />
              <span className="text-gradient-gold">Real outcomes.</span>
            </h1>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-px bg-border/60 md:grid-cols-3">
              {SUCCESS_STORIES.map((s) => (
                <article key={s.id} className="bg-background p-8">
                  <Quote className="h-6 w-6 text-gold" />
                  <p className="mt-4 font-display text-2xl leading-tight">"{s.quote}"</p>
                  <p className="mt-6 text-sm text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.location} · {s.program}
                  </p>
                  <p className="mt-4 text-xs uppercase tracking-widest text-gold">{s.outcome}</p>
                </article>
              ))}
            </div>
            <div className="mt-16 text-center">
              <Link
                to="/personalize"
                className="inline-flex h-12 items-center gap-2 rounded-sm bg-gold px-6 text-xs font-semibold uppercase tracking-widest text-gold-foreground"
              >
                {CTA.primary} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <EcosystemCarousel surface="success-stories" />
      </main>
      <SiteFooter />
    </div>
  );
}
