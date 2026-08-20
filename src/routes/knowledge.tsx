import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EcosystemCarousel } from "@/components/EcosystemCarousel";
import { KNOWLEDGE_CATEGORIES } from "@/content/knowledge";
import { ARTICLES } from "@/content/blog";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Hub — ResoFit" },
      {
        name: "description",
        content:
          "Practitioner-written guides on nutrition, movement, recovery, healthy ageing and body confidence.",
      },
      { property: "og:title", content: "Knowledge Hub — ResoFit" },
      { property: "og:description", content: "Practitioner-written wellness guides." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shopb2k.lovable.app/knowledge" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://resofit.fit/knowledge" }],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">Knowledge Hub</p>
            <h1 className="font-display text-5xl leading-[0.95] md:text-7xl">
              Wellness, translated.
            </h1>
            <p className="mt-6 max-w-xl text-muted-foreground">
              Practitioner-written guides across nutrition, movement, recovery and healthy ageing.
              Personalized recommendations delivered by ChatB2K™.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
              {KNOWLEDGE_CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  to="/blog"
                  className="bg-background p-6 transition-colors hover:bg-card"
                >
                  <h2 className="font-display text-2xl leading-tight">{c.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{c.tagline}</p>
                  <p className="mt-4 text-[10px] uppercase tracking-widest text-gold">
                    Read guides →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Latest</p>
            <h2 className="font-display text-4xl">From the journal</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {ARTICLES.slice(0, 3).map((a) => (
                <Link
                  key={a.slug}
                  to="/blog/$slug"
                  params={{ slug: a.slug }}
                  className="border border-border/60 bg-card/40 p-6 hover:border-gold/60"
                >
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold">{a.category}</p>
                  <h3 className="mt-3 font-display text-xl leading-tight">{a.title}</h3>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <EcosystemCarousel surface="knowledge" />
      </main>
      <SiteFooter />
    </div>
  );
}
