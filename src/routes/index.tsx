import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import heroImg from "@/assets/hero-barbell.jpg";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrustBar } from "@/components/TrustBar";
import { ProductImage } from "@/components/ProductImage";
import {
  PRODUCTS_QUERY,
  approxUSD,
  formatMoney,
  storefrontApiRequest,
  type ShopifyProduct,
} from "@/lib/shopify";
import {
  CTA_VARIANTS,
  getActiveVariant,
  trackEvent,
  type CtaVariant,
} from "@/lib/revenueOS";

const RESET_URL = "https://joy-funnel-ai.lovable.app";
const ASSESSMENT_URL = "https://reso-fit.lovable.app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResoFit — Start Your ₦1,000 Reset" },
      {
        name: "description",
        content:
          "Join the ₦1,000 Reset with CoachB2K. Personalized fitness coaching, premium hardware, nationwide delivery.",
      },
      { property: "og:title", content: "ResoFit — Start Your ₦1,000 Reset" },
      {
        property: "og:description",
        content: "Personalized coaching with CoachB2K. Start your transformation today.",
      },
    ],
    links: [
      { rel: "preload", as: "image", href: heroImg, fetchpriority: "high" },
    ],
  }),
  component: Index,
});

async function fetchFeaturedProducts(): Promise<ShopifyProduct[]> {
  // Source of truth: Shopify. Pull a tight curated set for the homepage.
  // Strategy: try "featured" tag first; fall back to best sellers / newest.
  const tryQueries = ["tag:featured", "tag:best-seller", ""];
  for (const q of tryQueries) {
    const res = await storefrontApiRequest<{ products: { edges: ShopifyProduct[] } }>(
      PRODUCTS_QUERY,
      { first: 8, query: q || undefined },
    );
    const edges = res?.data?.products?.edges ?? [];
    if (edges.length > 0) return edges.slice(0, 8);
  }
  return [];
}

function Index() {
  const { data: featured } = useQuery({
    queryKey: ["products", "homepage-featured"],
    queryFn: fetchFeaturedProducts,
    staleTime: 60_000,
  });

  const [variant, setVariant] = useState<{ variant: CtaVariant; label: string }>({
    variant: "A",
    label: CTA_VARIANTS.A,
  });

  useEffect(() => {
    setVariant(getActiveVariant());
    trackEvent("landing_view");
  }, []);

  const handlePrimaryCta = () => {
    trackEvent("cta_click");
    trackEvent("checkout_start");
  };

  const handleAssessment = () => {
    trackEvent("assessment_click");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Loaded olympic barbell in dramatic studio light"
            width={1536}
            height={1280}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center px-6 py-24">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-gold">
              <span className="h-px w-10 bg-gold" />
              CoachB2K · ResoFit
            </p>
            <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl md:text-8xl lg:text-9xl">
              Built for the
              <br />
              <span className="text-gradient-gold">heaviest</span> set
              <br />
              of your life.
            </h1>
            <p className="mt-8 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Start your ₦1,000 Reset today. Personalized coaching, premium hardware, and a
              transformation built around how you actually train.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href={RESET_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePrimaryCta}
                className="group inline-flex h-14 items-center justify-center gap-3 rounded-sm bg-gold px-8 text-sm font-semibold uppercase tracking-widest text-gold-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              >
                {variant.label}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href={ASSESSMENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleAssessment}
                className="inline-flex h-14 items-center justify-center rounded-sm border border-border px-8 text-sm font-semibold uppercase tracking-widest text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                Take Assessment
              </a>
            </div>

            <dl className="mt-16 grid max-w-md grid-cols-3 gap-6 border-t border-border/60 pt-8">
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">Reset</dt>
                <dd className="mt-1 font-display text-3xl text-foreground">₦1k</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">Warranty</dt>
                <dd className="mt-1 font-display text-3xl text-foreground">Life</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">Ships</dt>
                <dd className="mt-1 font-display text-3xl text-foreground">NG</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Trust */}
      <TrustBar />

      {/* Featured */}
      <section id="featured" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 flex items-end justify-between gap-6">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">The Catalogue</p>
              <h2 className="font-display text-5xl md:text-6xl">Featured Hardware</h2>
            </div>
            <Link
              to="/shop"
              className="hidden text-xs uppercase tracking-widest text-muted-foreground hover:text-gold md:inline-block"
            >
              View all →
            </Link>
          </div>

          {featured && featured.length > 0 ? (
            <div className="grid gap-px bg-border/60 md:grid-cols-2 lg:grid-cols-4">
              {featured.map((p, i) => {
                const img = p.node.images.edges[0]?.node;
                const price = p.node.priceRange.minVariantPrice;
                return (
                  <Link
                    key={p.node.id}
                    to="/product/$handle"
                    params={{ handle: p.node.handle }}
                    className="group flex flex-col bg-background p-6 transition-colors hover:bg-card"
                  >
                    <ProductImage
                      src={img?.url}
                      alt={img?.altText}
                      title={p.node.title}
                      category={p.node.productType}
                      priority={i < 2}
                      className="group-hover:[&>img]:scale-105"
                    />
                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {p.node.productType && (
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            {p.node.productType}
                          </p>
                        )}
                        <h3 className="mt-2 truncate font-display text-xl leading-tight">
                          {p.node.title}
                        </h3>
                      </div>
                      <p className="whitespace-nowrap text-right">
                        <span className="block font-display text-lg text-gold">
                          {formatMoney(price)}
                        </span>
                        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                          {approxUSD(price)}
                        </span>
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading catalogue…</p>
          )}
        </div>
      </section>

      {/* Testimonials — structural only, no fabricated reviews */}
      <section className="border-t border-border/60 bg-card/30 py-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Verified Results</p>
          <h2 className="font-display text-4xl md:text-5xl">Real customer wins.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            Verified transformations from the ResoFit community. New stories drop weekly inside the Reset.
          </p>
          <div className="mt-10 grid gap-px bg-border/40 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-background p-6 text-left">
                <div className="h-2 w-12 bg-gold/60" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Customer story #{i} — coming soon.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">Start Today</p>
          <h2 className="font-display text-4xl leading-tight md:text-6xl">
            One thousand naira.
            <br />
            <span className="text-gradient-gold">A new body by next quarter.</span>
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href={RESET_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handlePrimaryCta}
              className="inline-flex h-14 items-center justify-center gap-3 rounded-sm bg-gold px-8 text-sm font-semibold uppercase tracking-widest text-gold-foreground shadow-gold transition-transform hover:-translate-y-0.5"
            >
              {variant.label}
              <span>→</span>
            </a>
            <a
              href={ASSESSMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleAssessment}
              className="inline-flex h-14 items-center justify-center rounded-sm border border-border px-8 text-sm font-semibold uppercase tracking-widest text-foreground transition-colors hover:border-gold hover:text-gold"
            >
              Take Assessment
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
