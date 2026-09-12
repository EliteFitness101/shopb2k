import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowRight, Check, Loader2, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PRODUCT_BY_HANDLE_QUERY, formatMoney, storefrontApiRequest, type ShopifyProductNode } from "@/lib/shopify";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductImage } from "@/components/ProductImage";
import { trackEvent } from "@/lib/revenueOS";

export const Route = createFileRoute("/recommendation/$handle")({ component: RecommendationPage });

async function fetchProduct(handle: string): Promise<ShopifyProductNode | null> {
  const res = await storefrontApiRequest<{ product: ShopifyProductNode | null }>(PRODUCT_BY_HANDLE_QUERY, { handle });
  return res?.data?.product ?? null;
}

function RecommendationPage() {
  const { handle } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["recommendation", handle], queryFn: async () => { const p = await fetchProduct(handle); if (!p) throw notFound(); return p; } });
  if (isLoading || !data) return <div className="min-h-screen bg-background"><SiteHeader /><div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;
  return <PremiumRecommendation product={data} />;
}

function PremiumRecommendation({ product }: { product: ShopifyProductNode }) {
  const image = product.images.edges[0]?.node;
  const variant = product.variants.edges.find((v) => v.node.availableForSale)?.node ?? product.variants.edges[0]?.node;
  const numericVariantId = String(variant?.id ?? "").match(/(\d+)$/)?.[1] ?? "";
  const configuredDomain = String(import.meta.env.VITE_SHOPIFY_PRIMARY_DOMAIN ?? "resocart.myshopify.com").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const directCheckout = numericVariantId ? `https://${configuredDomain}/cart/${numericVariantId}:1` : `/product/${encodeURIComponent(product.handle)}`;

  const handleCheckout = () => {
    trackEvent("assessment_result_cta");
    window.location.assign(directCheckout);
  };

  return <div className="min-h-screen bg-black text-white"><SiteHeader /><main>
    <section className="relative isolate min-h-[78vh] overflow-hidden border-b border-gold/20">
      {image?.url && <div className="absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `url(${image.url})` }} aria-hidden="true" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/75 to-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_25%,rgba(255,196,75,0.18),transparent_38%)]" />
      <div className="mx-auto flex min-h-[78vh] max-w-7xl items-end px-6 pb-12 pt-24 md:px-10 md:pb-16">
        <div className="max-w-4xl">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-gold"><Sparkles className="h-3 w-3" /> ChatB2K personalized match</p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] md:text-7xl">{product.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">This is your matched ResoFit offer—opened directly from your assessment, with no return to the shop and no second assessment.</p>
          <div className="mt-7 flex flex-wrap items-center gap-4"><span className="font-display text-4xl text-gold">{variant ? formatMoney(variant.price) : ""}</span>{product.productType && <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-widest text-white/75">{product.productType}</span>}</div>
          <button type="button" onClick={handleCheckout} disabled={!variant?.availableForSale} className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gold px-7 py-4 text-xs font-bold uppercase tracking-widest text-gold-foreground shadow-2xl shadow-gold/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">{variant?.availableForSale ? "Continue to checkout" : "Currently unavailable"}<ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[2rem] border border-gold/20 bg-white/[0.03] p-3 shadow-2xl shadow-black/30"><ProductImage src={image?.url} alt={image?.altText ?? product.title} title={product.title} category={product.productType} productId={product.id} priority /></div>
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Why ChatB2K selected it</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl">Your offer, fully opened.</h2>
          <p className="mt-5 text-sm leading-relaxed text-white/65">The assessment context brought you here. You do not need to search again, repeat your answers, or complete another identity form before reaching the purchase path.</p>
          <div className="mt-7 space-y-3 text-sm">{["Exact recommended product", "Live price and availability", "Product imagery and full description", "Direct checkout action", "No generic shop browsing"].map((item) => <div key={item} className="flex items-center gap-3"><Check className="h-4 w-4 text-gold" /><span>{item}</span></div>)}</div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><ShieldCheck className="h-4 w-4 text-gold" /><p className="mt-2 text-xs uppercase tracking-widest text-white/55">Secure</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><Truck className="h-4 w-4 text-gold" /><p className="mt-2 text-xs uppercase tracking-widest text-white/55">Fulfillment</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><Sparkles className="h-4 w-4 text-gold" /><p className="mt-2 text-xs uppercase tracking-widest text-white/55">Personalized</p></div></div>
        </div>
      </div>
      <article className="mt-12 rounded-[2rem] border border-gold/20 bg-white/[0.03] p-6 md:p-10"><p className="text-xs uppercase tracking-[0.3em] text-gold">Product details & features</p>{product.descriptionHtml ? <div className="prose prose-invert mt-6 max-w-none text-white/70" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} /> : <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-white/70">{product.description || "Product details are being prepared from the canonical catalog."}</p>}</article>
    </section>
  </main><SiteFooter /></div>;
}
