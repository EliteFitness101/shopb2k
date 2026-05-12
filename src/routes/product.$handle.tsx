import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Truck, ShieldCheck, Package } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  PRODUCT_BY_HANDLE_QUERY,
  approxUSD,
  formatMoney,
  storefrontApiRequest,
  type ShopifyProductNode,
} from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

export const Route = createFileRoute("/product/$handle")({
  component: ProductPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="mt-6 underline hover:text-gold"
          >
            Try again
          </button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => {
    const { handle } = Route.useParams();
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="font-display text-5xl">Product not found</h1>
          <p className="mt-4 text-muted-foreground">
            We couldn't find <span className="text-foreground">{handle}</span>.
          </p>
          <Link to="/shop" className="mt-8 inline-block text-gold underline">
            Back to shop →
          </Link>
        </div>
      </div>
    );
  },
});

async function fetchProductByHandle(handle: string): Promise<ShopifyProductNode | null> {
  const res = await storefrontApiRequest<{ product: ShopifyProductNode | null }>(
    PRODUCT_BY_HANDLE_QUERY,
    { handle },
  );
  return res?.data?.product ?? null;
}

function ProductPage() {
  const { handle } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["product", handle],
    queryFn: async () => {
      const p = await fetchProductByHandle(handle);
      if (!p) throw notFound();
      return p;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <ProductDetail product={data} />
      <SiteFooter />
    </div>
  );
}

function ProductDetail({ product }: { product: ShopifyProductNode }) {
  const images = product.images.edges.map((e) => e.node);
  const variants = product.variants.edges.map((e) => e.node);
  const [variantId, setVariantId] = useState<string>(
    (variants.find((v) => v.availableForSale) ?? variants[0])?.id ?? "",
  );
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === variantId) ?? variants[0],
    [variantId, variants],
  );

  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);

  const handleAdd = async () => {
    if (!selectedVariant) return;
    await addItem({
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        images: product.images,
      },
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: qty,
      selectedOptions: selectedVariant.selectedOptions,
    });
    toast.success(`Added ${qty}× ${product.title} to cart`, { position: "top-center" });
  };

  return (
    <article className="mx-auto max-w-7xl px-6 py-12">
      <Link
        to="/shop"
        className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-3 w-3" /> Back to shop
      </Link>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden bg-card">
            {images[activeImg] ? (
              <img
                src={images[activeImg].url}
                alt={images[activeImg].altText ?? product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square overflow-hidden border ${i === activeImg ? "border-gold" : "border-border/60"}`}
                >
                  <img
                    src={img.url}
                    alt={img.altText ?? `${product.title} ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.productType && (
            <p className="text-xs uppercase tracking-[0.3em] text-gold">{product.productType}</p>
          )}
          <h1 className="mt-3 font-display text-5xl leading-tight md:text-6xl">{product.title}</h1>

          <div className="mt-6 flex items-baseline gap-4">
            <p className="font-display text-4xl text-gold">{formatMoney(selectedVariant.price)}</p>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">
              ≈ {approxUSD(selectedVariant.price)}
            </p>
          </div>

          {product.descriptionHtml ? (
            <div
              className="prose prose-invert mt-8 max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          ) : (
            <p className="mt-8 whitespace-pre-line text-muted-foreground">{product.description}</p>
          )}

          {/* Variant selection */}
          {variants.length > 1 && variants[0].title !== "Default Title" && (
            <div className="mt-8 border-t border-border/60 pt-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
                Option
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    disabled={!v.availableForSale}
                    className={`rounded-sm border px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                      v.id === variantId
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-muted-foreground hover:border-gold/60 hover:text-foreground"
                    } disabled:line-through disabled:opacity-40`}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex h-12 items-center border border-border">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-full w-12 text-lg hover:text-gold"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="h-full w-12 text-lg hover:text-gold"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isLoading || !selectedVariant?.availableForSale}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-sm bg-gold px-8 text-xs font-semibold uppercase tracking-widest text-gold-foreground hover:bg-gold/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : selectedVariant?.availableForSale ? (
                "Add to cart"
              ) : (
                "Sold out"
              )}
            </button>
          </div>

          {/* Shipping & delivery */}
          <ul className="mt-10 space-y-3 border-t border-border/60 pt-6 text-sm">
            <li className="flex items-start gap-3">
              <Truck className="mt-0.5 h-4 w-4 text-gold" />
              <span>
                <strong className="text-foreground">Lagos:</strong>{" "}
                <span className="text-muted-foreground">2–4 business days · from ₦5,000</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Package className="mt-0.5 h-4 w-4 text-gold" />
              <span>
                <strong className="text-foreground">Nigeria nationwide:</strong>{" "}
                <span className="text-muted-foreground">
                  4–7 business days · calculated at checkout
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Truck className="mt-0.5 h-4 w-4 text-gold" />
              <span>
                <strong className="text-foreground">International:</strong>{" "}
                <span className="text-muted-foreground">7–21 business days · DHL / freight</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-gold" />
              <span>
                <strong className="text-foreground">Secure checkout:</strong>{" "}
                <span className="text-muted-foreground">
                  Paystack (₦) · Card (USD) · Pay on delivery in Lagos
                </span>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </article>
  );
}
