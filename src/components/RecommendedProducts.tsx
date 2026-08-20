import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PRODUCTS_QUERY,
  formatMoney,
  storefrontApiRequest,
  type ShopifyProduct,
} from "@/lib/shopify";
import { ProductImage } from "@/components/ProductImage";
import { getCachedPerf } from "@/lib/productIntelligence";

interface Props {
  currentHandle: string;
  productType?: string;
  title?: string;
}

export function RecommendedProducts({
  currentHandle,
  productType,
  title = "Frequently bought together",
}: Props) {
  const { data } = useQuery({
    queryKey: ["recommended", productType ?? "all"],
    queryFn: async () => {
      const query = productType ? `product_type:${JSON.stringify(productType)}` : undefined;
      const res = await storefrontApiRequest<{ products: { edges: ShopifyProduct[] } }>(
        PRODUCTS_QUERY,
        { first: 8, query },
      );
      return res?.data?.products.edges ?? [];
    },
    staleTime: 60_000,
  });

  const items = (data ?? []).filter((e) => e.node.handle !== currentHandle).slice(0, 3);
  if (!items.length) return null;

  return (
    <section className="mt-16 border-t border-border/60 pt-10">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="font-display text-2xl">{title}</h2>
        <Link
          to="/shop"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-gold"
        >
          Shop all →
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map((e) => {
          const p = e.node;
          const perf = getCachedPerf(p.id);
          const confident = perf && perf.pps >= 60;
          return (
            <Link
              key={p.id}
              to="/product/$handle"
              params={{ handle: p.handle }}
              className="group block"
            >
              <div className="relative overflow-hidden border border-border/60">
                <ProductImage
                  src={p.images.edges[0]?.node.url}
                  alt={p.images.edges[0]?.node.altText}
                  title={p.title}
                  category={p.productType}
                  productId={p.id}
                  tier="medium"
                />
                {confident && (
                  <span className="absolute left-2 top-2 rounded-sm bg-gold/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold-foreground">
                    Community pick
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-foreground group-hover:text-gold">{p.title}</p>
              <p className="mt-1 text-xs text-gold">{formatMoney(p.priceRange.minVariantPrice)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
