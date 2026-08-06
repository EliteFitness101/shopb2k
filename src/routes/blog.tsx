import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EcosystemCarousel } from "@/components/EcosystemCarousel";
import { ARTICLES, ARTICLE_CATEGORIES } from "@/content/blog";
import { Search } from "lucide-react";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "The ResoFit Journal — Wellness, Strength & Longevity" },
      { name: "description", content: "Field notes on personalized wellness, strength, mobility, nutrition and healthy ageing." },
      { property: "og:title", content: "The ResoFit Journal" },
      { property: "og:description", content: "Field notes on personalized wellness for Africa." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.resofit.fit/blog" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.resofit.fit/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const filtered = useMemo(() => {
    return ARTICLES.filter((a) => {
      const matchesQ = q ? (a.title + a.excerpt).toLowerCase().includes(q.toLowerCase()) : true;
      const matchesCat = cat === "All" ? true : a.category === cat;
      return matchesQ && matchesCat;
    });
  }, [q, cat]);
  const featured = ARTICLES.filter((a) => a.featured);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">The Journal</p>
            <h1 className="font-display text-5xl leading-[0.95] md:text-7xl">
              Field notes on
              <br />
              <span className="text-gradient-gold">personalized wellness.</span>
            </h1>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="border-b border-border/60 py-12">
            <div className="mx-auto max-w-7xl px-6">
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">Featured</p>
              <div className="grid gap-px bg-border/60 md:grid-cols-2">
                {featured.map((a) => (
                  <Link
                    key={a.slug}
                    to="/blog/$slug"
                    params={{ slug: a.slug }}
                    className="bg-background p-8 hover:bg-card"
                  >
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gold">{a.category}</p>
                    <h2 className="mt-3 font-display text-3xl leading-tight">{a.title}</h2>
                    <p className="mt-3 text-sm text-muted-foreground">{a.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="py-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search articles"
                  aria-label="Search articles"
                  className="h-11 w-full border border-border bg-background pl-10 pr-3 text-sm focus:border-gold focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["All", ...ARTICLE_CATEGORIES].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`h-9 border px-3 text-[11px] uppercase tracking-widest ${
                      cat === c
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-muted-foreground hover:border-gold/60"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => (
                <Link
                  key={a.slug}
                  to="/blog/$slug"
                  params={{ slug: a.slug }}
                  className="group border border-border/60 bg-card/40 p-6 transition-colors hover:border-gold/60"
                >
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold">{a.category}</p>
                  <h3 className="mt-3 font-display text-2xl leading-tight group-hover:text-gold">
                    {a.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{a.excerpt}</p>
                  <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {a.readingMinutes} min read
                  </p>
                </Link>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                  No articles match your filter.
                </p>
              )}
            </div>
          </div>
        </section>

        <EcosystemCarousel surface="blog-index" />
      </main>
      <SiteFooter />
    </div>
  );
}
