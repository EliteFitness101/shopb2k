import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrustBar } from "@/components/TrustBar";
import { TrustStories } from "@/components/TrustStories";

export const Route = createFileRoute("/stories")({
  head: () => ({
    meta: [
      { title: "Stories & Trust | ResoFit" },
      {
        name: "description",
        content: "Explore ResoFit's evidence-led wellness stories, ecosystem proof and verified member experiences.",
      },
      { property: "og:title", content: "Stories & Trust | ResoFit" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://resofit.fit/stories" },
    ],
    links: [{ rel: "canonical", href: "https://resofit.fit/stories" }],
  }),
  component: StoriesPage,
});

function StoriesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-border/60 py-24 md:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,hsl(var(--gold)/0.12),transparent_45%)]" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <p className="mb-5 text-xs uppercase tracking-[0.35em] text-gold">ResoFit Stories</p>
            <h1 className="font-display text-5xl leading-[0.95] md:text-8xl">Trust is earned.<br /><span className="text-gradient-gold">Proof is shown.</span></h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              A premium home for verified member experiences, ecosystem proof and the people behind the ResoFit journey.
            </p>
          </div>
        </section>
        <TrustBar />
        <TrustStories />
        <section className="border-t border-border/60 py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Editorial standard</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">No invented testimonials.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
              When a member story is published here, the experience, attribution and visual identity should be backed by an approved source. Premium presentation never replaces evidence.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
