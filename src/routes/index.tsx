import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import heroImg from "@/assets/hero-barbell.jpg";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  PRODUCTS_QUERY,
  approxUSD,
  formatMoney,
  storefrontApiRequest,
  type ShopifyProduct,
} from "@/lib/shopify";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResoFit — Premium Fitness Hardware" },
      {
        name: "description",
        content:
          "Engineered barbells, plates, and racks for athletes who train with intent. Built in Lagos. Shipped worldwide.",
      },
      { property: "og:title", content: "ResoFit — Premium Fitness Hardware" },
      {
        property: "og:description",
        content: "Engineered barbells, plates, and racks for athletes who train with intent.",
      },
    ],
  }),
  component: Index,
});

async function fetchFeaturedProducts(): Promise<ShopifyProduct[]> {
  const res = await storefrontApiRequest<{ products: { edges: ShopifyProduct[] } }>(
    PRODUCTS_QUERY,
    { first: 8 },
  );
  return res?.data?.products?.edges ?? [];
}

function Index() {
  const { data: featured } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: fetchFeaturedProducts,
    staleTime: 60_000,
  });

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
            className="h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center px-6 py-24">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-gold">
              <span className="h-px w-10 bg-gold" />
              Volume 01 — Forged Edition
            </p>
            <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl md:text-8xl lg:text-9xl">
              Built for the
              <br />
              <span className="text-gradient-gold">heaviest</span> set
              <br />
              of your life.
            </h1>
            <p className="mt-8 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Competition-grade barbells, bumper plates, and racks engineered in Lagos. No
              marketing fluff. Just steel that holds its tolerance under load.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/shop"
                className="group inline-flex h-14 items-center justify-center gap-3 rounded-sm bg-gold px-8 text-sm font-semibold uppercase tracking-widest text-gold-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              >
                Enter the Shop
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <a
                href="#featured"
                className="inline-flex h-14 items-center justify-center rounded-sm border border-border px-8 text-sm font-semibold uppercase tracking-widest text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                Featured Gear
              </a>
            </div>

            <dl className="mt-16 grid max-w-md grid-cols-3 gap-6 border-t border-border/60 pt-8">
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">PSI</dt>
                <dd className="mt-1 font-display text-3xl text-foreground">190k</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                  Warranty
                </dt>
                <dd className="mt-1 font-display text-3xl text-foreground">Life</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">Ships</dt>
                <dd className="mt-1 font-display text-3xl text-foreground">Global</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

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
              {featured.slice(0, 8).map((p) => {
                const img = p.node.images.edges[0]?.node;
                const price = p.node.priceRange.minVariantPrice;
                return (
                  <Link
                    key={p.node.id}
                    to="/product/$handle"
                    params={{ handle: p.node.handle }}
                    className="group flex flex-col bg-background p-6 transition-colors hover:bg-card"
                  >
                    <div className="relative aspect-square overflow-hidden bg-card">
                      {img && (
                        <img
                          src={img.url}
                          alt={img.altText ?? p.node.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                    </div>
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

      {/* Manifesto */}
      <section className="border-t border-border/60 bg-card">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <p className="mb-6 text-xs uppercase tracking-[0.3em] text-gold">Manifesto</p>
          <p className="font-display text-3xl leading-tight md:text-5xl">
            We don't make equipment for everyone.
            <br />
            <span className="text-muted-foreground">We make it for the ones who </span>
            <span className="text-gradient-gold">come back tomorrow.</span>
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
