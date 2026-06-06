import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductImage } from "@/components/ProductImage";
import { recordEngagement } from "@/lib/imagePriority";
import {
  PRODUCTS_QUERY,
  approxUSD,
  formatMoney,
  storefrontApiRequest,
  type ShopifyProduct,
} from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — ResoFit Hardware" },
      {
        name: "description",
        content:
          "Shop competition-grade barbells, bumper plates, dumbbells, and power racks. Real Shopify checkout with shipping and Paystack.",
      },
      { property: "og:title", content: "Shop — ResoFit Hardware" },
      {
        property: "og:description",
        content:
          "Competition-grade barbells, bumper plates, dumbbells, and power racks. Ships from Lagos.",
      },
    ],
  }),
  component: Shop,
});

async function fetchProducts(): Promise<ShopifyProduct[]> {
  const res = await storefrontApiRequest<{ products: { edges: ShopifyProduct[] } }>(
    PRODUCTS_QUERY,
    { first: 60 },
  );
  return res?.data?.products?.edges ?? [];
}

function Shop() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">The Shop</p>
          <h1 className="font-display text-6xl leading-[0.95] md:text-8xl">
            Hardware,
            <br />
            <span className="text-gradient-gold">no compromise.</span>
          </h1>
          <p className="mt-6 max-w-xl text-muted-foreground">
            Every piece spec'd, tested, and shipped from our Lagos workshop. Prices in ₦ with
            ≈USD shown. Shipping calculated at secure checkout.
          </p>
        </div>
      </section>

      <ShopGrid />

      <SiteFooter />
    </div>
  );
}

function ShopGrid() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", "all"],
    queryFn: fetchProducts,
    staleTime: 60_000,
  });

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-6">
        {isLoading && (
          <div className="flex justify-center py-32 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {isError && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Couldn't load products. Try refreshing.
          </p>
        )}

        {data && data.length === 0 && (
          <div className="py-24 text-center">
            <p className="font-display text-2xl">No products found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tell the AI what you'd like to add to your Shopify catalogue.
            </p>
          </div>
        )}

        {data && data.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p, i) => (
              <ProductCard key={p.node.id} product={p} placement={i} />
            ))}
          </div>
        )}

        <p className="mt-16 text-center text-xs uppercase tracking-widest text-muted-foreground">
          Checkout secured by Shopify · Paystack · Card · Worldwide shipping
        </p>
      </div>
    </section>
  );
}

function ProductCard({ product, placement = 99 }: { product: ShopifyProduct; placement?: number }) {
  const node = product.node;
  const variants = node.variants.edges.map((e) => e.node);
  const firstAvail = variants.find((v) => v.availableForSale) ?? variants[0];
  const image = node.images.edges[0]?.node;
  const price = node.priceRange.minVariantPrice;

  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (!firstAvail) return;
    setBusy(true);
    try {
      await addItem({
        product: {
          id: node.id,
          title: node.title,
          handle: node.handle,
          images: node.images,
        },
        variantId: firstAvail.id,
        variantTitle: firstAvail.title,
        price: firstAvail.price,
        quantity: 1,
        selectedOptions: firstAvail.selectedOptions,
      });
      recordEngagement(node.id, "add_to_cart");
      toast.success(`Added ${node.title} to cart`, { position: "top-center" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="group flex flex-col border border-border/60 bg-card transition-colors hover:border-gold/60">
      <Link
        to="/product/$handle"
        params={{ handle: node.handle }}
        className="relative block"
      >
        <ProductImage
          src={image?.url}
          alt={image?.altText}
          title={node.title}
          category={node.productType}
          productId={node.id}
          placement={placement}
          className="group-hover:[&>img]:scale-105"
        />
        {node.productType && (
          <span className="absolute left-4 top-4 z-10 rounded-sm bg-background/80 px-3 py-1 text-[10px] uppercase tracking-widest text-gold backdrop-blur">
            {node.productType}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <Link to="/product/$handle" params={{ handle: node.handle }}>
          <h2 className="font-display text-2xl leading-tight hover:text-gold">{node.title}</h2>
        </Link>
        {node.description && (
          <p className="mt-3 flex-1 line-clamp-3 text-sm text-muted-foreground">
            {node.description}
          </p>
        )}
        <div className="mt-6 flex items-end justify-between gap-4 border-t border-border/60 pt-5">
          <div>
            <p className="font-display text-2xl text-gold">{formatMoney(price)}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              ≈ {approxUSD(price)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || isLoading || !firstAvail?.availableForSale}
            className="inline-flex h-11 items-center justify-center rounded-sm bg-foreground px-5 text-xs font-semibold uppercase tracking-widest text-background transition-colors hover:bg-gold hover:text-gold-foreground disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : firstAvail?.availableForSale ? (
              "Add to cart"
            ) : (
              "Sold out"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
