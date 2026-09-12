import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowRight, Check, Loader2, ShieldCheck, Sparkles, Truck, Package, Tag } from "lucide-react";
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
  const images = product.images.edges.map((edge) => edge.node).filter((item) => item.url);
  const variant = product.variants.edges.find((v) => v.node.availableForSale)?.node ?? product.variants.edges[0]?.node;
  const numericVariantId = String(variant?.id ?? "").match(/(\d+)$/)?.[1] ?? "";
  const configuredDomain = String(import.meta.env.VITE_SHOPIFY_PRIMARY_DOMAIN ?? "resocart.myshopify.com").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const directCheckout = numericVariantId ? `https://${configuredDomain}/cart/${numericVariantId}:1` : `/product/${encodeURIComponent(product.handle)}`;
  const tags = (product.tags ?? []).filter(Boolean).slice(0, 8);
  const details = product.description?.trim() || product.descriptionHtml?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "";
  const derivedFeatures = [
    product.productType && `Category: ${product.productType}`,
    product.vendor && `Brand: ${product.vendor}`,
    product.sku && `SKU: ${product.sku}`,
    variant?.availableForSale ? "Currently available" : "Availability confirmed at checkout",
    tags.length ? `Catalog tags: ${tags.slice(0, 4).join(" · ")}` : null,
  ].filter(Boolean) as string[];

  const handleCheckout = () => {
    trackEvent("assessment_result_cta");
    window.location.assign(directCheckout);
  };

  return <div className="min-h-screen bg-black text-white"><SiteHeader /><main>
    <section className="relative isolate min-h-[78vh] overflow-hidden border-b border-gold/20">
      {image?.url ? <div className="absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `url(${image.url})` }} aria-hidden="true" /> : <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_72%_24%,rgba(255,196,75,0.30),transparent_30%),radial-gradient(circle_at_18%_78%,rgba(255,255,255,0.08),transparent_34%),linear-gradient(135deg,#111111,#050505_58%,#1a1205)]" aria-hidden="true" />}
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
        <div className="overflow-hidden rounded-[2rem] border border-gold/20 bg-white/[0.03] p-3 shadow-2xl shadow-black/30">
          {image?.url ? <ProductImage src={image.url} alt={image.altText ?? product.title} title={product.title} category={product.productType} productId={product.id} priority /> : <div className="flex aspect-square min-h-[360px] items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(255,196,75,0.22),transparent_35%),linear-gradient(145deg,#181818,#050505)]"><div className="text-center"><Sparkles className="mx-auto h-8 w-8 text-gold" /><p className="mt-4 font-display text-2xl">{product.title}</p><p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-white/40">Premium catalog presentation</p></div></div>}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Why ChatB2K selected it</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl">Your offer, fully opened.</h2>
          <p className="mt-5 text-sm leading-relaxed text-white/65">The assessment context brought you here. You do not need to search again, repeat your answers, or complete another identity form before reaching the purchase path.</p>
          <div className="mt-7 space-y-3 text-sm">{["Exact recommended product", "Live price and availability", image?.url ? "Product imagery and full description" : "Premium product presentation with canonical catalog details", "Direct checkout action", "No generic shop browsing"].map((item) => <div key={item} className="flex items-center gap-3"><Check className="h-4 w-4 text-gold" /><span>{item}</span></div>)}</div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><ShieldCheck className="h-4 w-4 text-gold" /><p className="mt-2 text-xs uppercase tracking-widest text-white/55">Secure</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><Truck className="h-4 w-4 text-gold" /><p className="mt-2 text-xs uppercase tracking-widest text-white/55">Fulfillment</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><Sparkles className="h-4 w-4 text-gold" /><p className="mt-2 text-xs uppercase tracking-widest text-white/55">Personalized</p></div></div>
        </div>
      </div>

      {images.length > 1 && <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">{images.slice(0, 4).map((item, index) => <div key={`${item.url}-${index}`} className="overflow-hidden rounded-2xl border border-white/10"><ProductImage src={item.url} alt={item.altText ?? `${product.title} view ${index + 1}`} title={`${product.title} view ${index + 1}`} category={product.productType} productId={product.id} tier="low" /></div>)}</div>}

      <article className="mt-12 rounded-[2rem] border border-gold/20 bg-white/[0.03] p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-3"><p className="text-xs uppercase tracking-[0.3em] text-gold">Product details & features</p><span className="rounded-full border border-white/10 px-3 py-1 text-[9px] uppercase tracking-widest text-white/45">Canonical catalog</span></div>
        {details ? <div className="prose prose-invert mt-6 max-w-none text-white/70" dangerouslySetInnerHTML={{ __html: product.descriptionHtml || details }} /> : <p className="mt-6 text-sm leading-relaxed text-white/70">This offer is presented from the live canonical product record. Product specifications and commercial availability are kept synchronized with the production catalog.</p>}
        {derivedFeatures.length > 0 && <div className="mt-8 grid gap-3 sm:grid-cols-2">{derivedFeatures.map((feature) => <div key={feature} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4"><Tag className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span className="text-sm text-white/70">{feature}</span></div>)}</div>}
        <div className="mt-8 flex flex-wrap gap-3 text-[10px] uppercase tracking-widest text-white/45"><span className="inline-flex items-center gap-2"><Package className="h-3 w-3" /> Live inventory</span><span className="inline-flex items-center gap-2"><ShieldCheck className="h-3 w-3" /> Secure purchase path</span><span className="inline-flex items-center gap-2"><Sparkles className="h-3 w-3" /> Personalized experience</span></div>
      </article>
    </section>
  </main><SiteFooter /></div>;
}
