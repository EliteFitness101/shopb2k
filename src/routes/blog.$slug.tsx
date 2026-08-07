import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EcosystemCarousel } from "@/components/EcosystemCarousel";
import { ARTICLES, getArticle } from "@/content/blog";
import { CTA } from "@/lib/ctas";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const a = getArticle(params.slug);
    if (!a) throw notFound();
    return a;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article not found — ResoFit" }, { name: "robots", content: "noindex" }] };
    }
    const url = `https://shopb2k.lovable.app/blog/${params.slug}`;
    return {
      meta: [
        { title: `${loaderData.title} — ResoFit Journal` },
        { name: "description", content: loaderData.excerpt },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: loaderData.title,
            description: loaderData.excerpt,
            datePublished: loaderData.publishedAt,
            author: { "@type": "Organization", name: "ResoFit" },
          }),
        },
      ],
    };
  },
  component: ArticleView,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-5xl">Article not found</h1>
        <Link to="/blog" className="mt-6 inline-block text-gold underline">
          Back to journal →
        </Link>
      </div>
      <SiteFooter />
    </div>
  ),
});

function ArticleView() {
  const a = Route.useLoaderData();
  const related = ARTICLES.filter((x) => x.slug !== a.slug && x.category === a.category).slice(0, 3);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link to="/blog" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-gold">
          ← Journal
        </Link>
        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-gold">{a.category}</p>
        <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">{a.title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {new Date(a.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          {" · "}
          {a.readingMinutes} min read
        </p>

        <article className="prose prose-invert mt-10 max-w-none text-muted-foreground">
          {a.body.split("\n\n").map((p: string, i: number) => (
            <p key={i}>{p}</p>
          ))}
        </article>

        <div className="mt-12 flex flex-col items-start gap-4 border border-gold/40 bg-gold/5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gold">Ready to personalize?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Take the ChatB2K™ Wellness Assessment and get your plan.
            </p>
          </div>
          <Link
            to="/personalize"
            className="inline-flex h-12 items-center gap-2 rounded-sm bg-gold px-6 text-xs font-semibold uppercase tracking-widest text-gold-foreground"
          >
            {CTA.primary} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl">Related reading</h2>
            <ul className="mt-4 space-y-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: r.slug }}
                    className="text-sm text-muted-foreground hover:text-gold"
                  >
                    → {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <EcosystemCarousel surface="blog-detail" />
      <SiteFooter />
    </div>
  );
}
