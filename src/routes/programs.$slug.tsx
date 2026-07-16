import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EcosystemCarousel } from "@/components/EcosystemCarousel";
import { getProgram } from "@/content/programs";
import { CTA } from "@/lib/ctas";
import { ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/programs/$slug")({
  loader: ({ params }) => {
    const p = getProgram(params.slug);
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Program not found — ResoFit" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const url = `https://shopb2k.lovable.app/programs/${params.slug}`;
    return {
      meta: [
        { title: `${loaderData.title} — ResoFit Programs` },
        { name: "description", content: loaderData.summary },
        { property: "og:title", content: `${loaderData.title} — ResoFit` },
        { property: "og:description", content: loaderData.summary },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ProgramDetail,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-5xl">Program not found</h1>
        <Link to="/programs" className="mt-6 inline-block text-gold underline">
          Back to programs →
        </Link>
      </div>
      <SiteFooter />
    </div>
  ),
});

function ProgramDetail() {
  const p = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <Link
              to="/programs"
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-gold"
            >
              ← All programs
            </Link>
            <p className="mt-6 text-xs uppercase tracking-[0.3em] text-gold">{p.eyebrow}</p>
            <h1 className="mt-3 font-display text-5xl leading-tight md:text-7xl">{p.title}</h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{p.summary}</p>
            <Link
              to="/personalize"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-sm bg-gold px-6 text-xs font-semibold uppercase tracking-widest text-gold-foreground"
            >
              {CTA.primary} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-3">
          <div className="md:col-span-2 space-y-12">
            <section>
              <h2 className="font-display text-3xl">Overview</h2>
              <p className="mt-4 text-muted-foreground">{p.overview}</p>
            </section>
            <section>
              <h2 className="font-display text-3xl">Benefits</h2>
              <ul className="mt-4 space-y-3">
                {p.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="font-display text-3xl">Who it's for</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {p.audience.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="font-display text-3xl">Expected outcomes</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {p.outcomes.map((o) => (
                  <li key={o}>• {o}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="font-display text-3xl">FAQs</h2>
              <div className="mt-4 space-y-4">
                {p.faqs.map((f) => (
                  <details key={f.q} className="group border border-border/60 p-4">
                    <summary className="cursor-pointer font-semibold">{f.q}</summary>
                    <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="border border-gold/40 bg-gold/5 p-6">
              <p className="text-xs uppercase tracking-widest text-gold">Get started</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Take the ChatB2K™ Wellness Assessment and get a plan matched to your lifestyle.
              </p>
              <Link
                to="/personalize"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-gold px-4 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground"
              >
                {CTA.assessment}
              </Link>
            </div>
            <div className="border border-border/60 p-6">
              <p className="text-xs uppercase tracking-widest text-gold">Related</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link to="/shop" className="hover:text-gold">
                    Equipment for this program →
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="hover:text-gold">
                    Wellness journal →
                  </Link>
                </li>
                <li>
                  <Link to="/knowledge" className="hover:text-gold">
                    Knowledge hub →
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <EcosystemCarousel surface="program-detail" title="Continue your journey" />
      </main>
      <SiteFooter />
    </div>
  );
}
