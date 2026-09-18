import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ShopGrid } from "./shop";

const PRODUCT_INDEX_URL = "https://www.resofit.fit/product";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "Products — ResoFit" },
      { name: "description", content: "Browse the verified ResoFit product catalogue. Premium equipment and wellness products with secure Paystack checkout." },
      { property: "og:title", content: "Products — ResoFit" },
      { property: "og:description", content: "Browse the verified ResoFit product catalogue." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PRODUCT_INDEX_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PRODUCT_INDEX_URL }],
  }),
  component: ProductIndex,
});

function ProductIndex() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border/60 bg-black px-6 py-14 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">ResoFlex™ · Powered by Resonance Fitness</p>
        <h1 className="mt-3 font-display text-5xl md:text-7xl">Verified Products</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">Browse the canonical ResoFit catalogue with product images, pricing, availability and secure checkout.</p>
      </section>
      <ShopGrid />
      <SiteFooter />
    </div>
  );
}
