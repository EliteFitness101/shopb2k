import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Package, Truck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { RESOFIT_CATALOG_URL } from "@/lib/shopify";

type DeliveryFee = {
  currency?: string;
  pickup_ngn?: number;
  door_delivery_ngn?: number;
  observed_location?: string;
};

type DeliveryEta = {
  from?: string;
  to?: string;
  observed_location?: string;
};

type CollectionItem = {
  kind?: string;
  title?: string;
  description?: string;
  source_code?: string;
  source_product_url?: string | null;
  source_listing_link_enabled?: boolean;
  source_listing_mode?: string;
  source_page_verified?: boolean;
  source_seller_name?: string | null;
  price?: number | null;
  supplier_price?: number | null;
  resale_price_ngn?: number | null;
  resale_price_markup_pct?: number | null;
  price_currency?: string;
  stock_status?: string;
  stock_label?: string;
  stock_quantity?: number | null;
  resofit_inventory_allocation?: number;
  delivery_fee?: DeliveryFee | null;
  delivery_eta?: DeliveryEta | null;
  image_url?: string | null;
  image_rights_verified?: boolean;
  purchase_enabled?: boolean;
  external_checkout_enabled?: boolean;
  fulfillment_ready?: boolean;
  status_label?: string;
  block_reason?: string | null;
};

type CollectionPage = {
  slug: string;
  canonical_path: string;
  status: string;
  manifest?: {
    title?: string;
    description?: string;
    items?: CollectionItem[];
  };
};

const formatNgn = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(value)
    : "Price unavailable";

async function fetchCollection(slug: string): Promise<CollectionPage> {
  const response = await fetch(
    `${RESOFIT_CATALOG_URL}/collections/${encodeURIComponent(slug)}`,
    { method: "GET", cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`Collection API returned HTTP ${response.status}`);
  }
  const payload = (await response.json()) as { data?: CollectionPage[] };
  const page = payload.data?.find((entry) => entry.slug === slug);
  if (!page || page.status !== "published") {
    throw new Error("This collection is not published.");
  }
  return page;
}

export const Route = createFileRoute("/shop/collection/$slug")({
  loader: ({ params }) => fetchCollection(params.slug),
  head: ({ loaderData }) => {
    const title = loaderData?.manifest?.title ?? "ResoFit Collection";
    const description =
      loaderData?.manifest?.description ??
      "Explore verified supplier listings and ResoFit collection recommendations.";
    const canonical = `https://www.resofit.fit${loaderData?.canonical_path ?? "/shop"}`;
    return {
      meta: [
        { title: `${title} | ResoFit` },
        { name: "description", content: description.slice(0, 160) },
        { property: "og:title", content: `${title} | ResoFit` },
        { property: "og:description", content: description.slice(0, 200) },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: CollectionPageView,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Collection unavailable</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {error.message || "The collection could not be loaded."}
        </p>
        <Link to="/shop" className="mt-8 inline-flex text-gold underline">
          Return to the shop
        </Link>
      </main>
      <SiteFooter />
    </div>
  ),
});

function CollectionPageView() {
  const page = Route.useLoaderData();
  const items = (page.manifest?.items ?? []).filter(
    (item) => item.kind === "external_candidate" && item.source_listing_link_enabled && item.source_product_url,
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
            <Link
              to="/shop"
              className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
            >
              <ArrowLeft className="h-4 w-4" /> Back to shop
            </Link>
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">
              Verified supplier collection
            </p>
            <h1 className="font-display text-5xl leading-[0.98] md:text-7xl">
              {page.manifest?.title ?? "Creator collection"}
            </h1>
            {page.manifest?.description && (
              <p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {page.manifest.description}
              </p>
            )}
            <p className="mt-5 text-xs text-muted-foreground">
              Supplier listings open on the supplier’s website. ResoFit checkout is enabled only
              for offers with independently verified resale, payment and fulfilment evidence.
            </p>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-6">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
                <Package className="mx-auto h-8 w-8 text-gold" />
                <h2 className="mt-4 font-display text-2xl">No verified supplier links yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Supplier listings will appear here after their product pages are verified.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <article
                    key={item.source_product_url}
                    className="overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-card via-background to-gold/5 shadow-lg shadow-black/20"
                  >
                    <div className="flex aspect-[16/9] items-center justify-center border-b border-border/60 bg-background/60">
                      {item.image_rights_verified && item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title ?? "Supplier product"}
                          className="h-full w-full object-contain p-5"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Package className="h-12 w-12 text-gold/80" />
                          <span className="text-[10px] uppercase tracking-[0.25em]">
                            Supplier image pending rights review
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest">
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-400">
                          Supplier page verified
                        </span>
                        <span className="text-muted-foreground">
                          {item.source_code?.replace(/_/g, " ") ?? "External source"}
                        </span>
                      </div>
                      <h2 className="mt-4 font-display text-2xl leading-tight">
                        {item.title ?? "Supplier product"}
                      </h2>
                      {item.description && (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-5 grid grid-cols-2 gap-3 border-y border-border/60 py-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Supplier price
                          </p>
                          <p className="mt-1 font-display text-xl text-gold">
                            {formatNgn(item.supplier_price ?? item.price)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Indicative ResoFit price
                          </p>
                          <p className="mt-1 font-display text-xl">
                            {formatNgn(item.resale_price_ngn)}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {item.resale_price_markup_pct ?? 30}% target markup · not a checkout price
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3 text-xs text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gold" />
                          Supplier availability: {item.stock_label ?? item.stock_status ?? "Not verified"}; exact supplier quantity not disclosed
                        </p>
                        {item.delivery_fee && (
                          <p className="flex items-start gap-2">
                            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                            <span>
                              Pickup {formatNgn(item.delivery_fee.pickup_ngn)} · Door delivery{" "}
                              {formatNgn(item.delivery_fee.door_delivery_ngn)}
                              {item.delivery_fee.observed_location
                                ? ` · ${item.delivery_fee.observed_location}`
                                : ""}
                            </span>
                          </p>
                        )}
                        {item.delivery_eta?.from && item.delivery_eta?.to && (
                          <p>
                            Observed delivery window: {item.delivery_eta.from} to {item.delivery_eta.to}
                            {item.delivery_eta.observed_location
                              ? ` · ${item.delivery_eta.observed_location}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <a
                        href={item.source_product_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gold px-5 text-xs font-semibold uppercase tracking-widest text-gold-foreground transition-colors hover:bg-gold/90"
                      >
                        View supplier listing <ExternalLink className="h-4 w-4" />
                      </a>
                      <p className="mt-3 text-center text-[10px] leading-5 text-muted-foreground">
                        Supplier purchase and delivery are governed by the supplier. ResoFit-managed
                        checkout is not enabled for this listing.
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
