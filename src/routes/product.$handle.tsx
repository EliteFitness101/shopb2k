import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { preloadOnIdle, recordEngagement } from "@/lib/imagePriority";
import { getCachedPerf } from "@/lib/productIntelligence";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Truck, ShieldCheck, Package, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductImage } from "@/components/ProductImage";
import { RecommendedProducts } from "@/components/RecommendedProducts";
import { RecentlyViewed, recordRecentlyViewed } from "@/components/RecentlyViewed";
import { PRODUCT_BY_HANDLE_QUERY, approxUSD, formatMoney, storefrontApiRequest, RESOFIT_SUPABASE_URL, type ShopifyProductNode } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { track } from "@/lib/tracking";

export const Route = createFileRoute("/product/$handle")({
  component: ProductPage,
  errorComponent: function ErrorComponent({ error, reset }) {
    const router = useRouter();
    return <div className="min-h-screen bg-background"><SiteHeader /><div className="mx-auto max-w-3xl px-6 py-24 text-center"><p className="text-sm text-muted-foreground">{error.message}</p><button onClick={() => { router.invalidate(); reset(); }} className="mt-6 underline hover:text-gold">Try again</button></div></div>;
  },
  notFoundComponent: function NotFoundComponent() {
    const { handle } = Route.useParams();
    return <div className="min-h-screen bg-background"><SiteHeader /><div className="mx-auto max-w-3xl px-6 py-24 text-center"><h1 className="font-display text-5xl">Product not found</h1><p className="mt-4 text-muted-foreground">We couldn't find <span className="text-foreground">{handle}</span>.</p><Link to="/shop" className="mt-8 inline-block text-gold underline">Back to shop →</Link></div></div>;
  },
});

async function fetchProductByHandle(handle: string): Promise<ShopifyProductNode | null> {
  const res = await storefrontApiRequest<{ product: ShopifyProductNode | null }>(PRODUCT_BY_HANDLE_QUERY, { handle });
  return res?.data?.product ?? null;
}

function ProductPage() {
  const { handle } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["product", handle], queryFn: async () => { const p = await fetchProductByHandle(handle); if (!p) throw notFound(); return p; } });
  if (isLoading || !data) return <div className="min-h-screen bg-background"><SiteHeader /><div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></div>;
  return <div className="min-h-screen bg-background"><SiteHeader /><ProductDetail product={data} /><SiteFooter /></div>;
}

function ProductDetail({ product }: { product: ShopifyProductNode }) {
  const images = product.images.edges.map((e) => e.node);
  const variants = product.variants.edges.map((e) => e.node);
  const [variantId, setVariantId] = useState<string>((variants.find((v) => v.availableForSale) ?? variants[0])?.id ?? "");
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const selectedVariant = useMemo(() => variants.find((v) => v.id === variantId) ?? variants[0], [variantId, variants]);
  const { data: experience } = useQuery({
    queryKey: ["product-experience", product.sku],
    enabled: Boolean(product.sku),
    queryFn: async () => {
      const response = await fetch(`${RESOFIT_SUPABASE_URL}/functions/v1/resofit-product-experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_sku: product.sku }),
      });
      if (!response.ok) return null;
      return response.json() as Promise<{
        experience?: { teaser?: { headline?: string; cta?: string }; promise?: { primary?: string }; delivery?: { mode?: string; entry?: string }; plan?: Record<string, unknown>; meal_workout?: Record<string, unknown>; lifestyle_hacks?: Record<string, unknown> };
        accessories?: Array<{ sku: string; title: string; handle: string; variant_price: number }>;
      }>;
    },
  });
  const { data: specialOffer } = useQuery({
    queryKey: ["commerce-offer", product.sku],
    enabled: Boolean(product.sku),
    staleTime: 30000,
    queryFn: async () => {
      if (!product.sku) return null;
      const url = new URL(RESOFIT_SUPABASE_URL + "/rest/v1/commerce_offers");
      url.searchParams.set("product_sku", "eq." + product.sku);
      url.searchParams.set("status", "eq.approved");
      url.searchParams.set("select", "id,offer_code,canonical_price_ngn,final_selling_price_ngn,min_selling_price_ngn,max_selling_price_ngn,expires_at");
      url.searchParams.set("order", "created_at.desc");
      url.searchParams.set("limit", "1");
      const response = await fetch(url.toString(), { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } });
      if (!response.ok) return null;
      const rows = await response.json() as Array<{ id:string; offer_code:string; canonical_price_ngn:number; final_selling_price_ngn:number|null; min_selling_price_ngn:number; max_selling_price_ngn:number; expires_at:string|null }>;
      const offer = rows[0];
      if (!offer) return null;
      if (offer.expires_at && new Date(offer.expires_at).getTime() <= Date.now()) return null;
      const finalPrice = Number(offer.final_selling_price_ngn ?? offer.canonical_price_ngn);
      if (!Number.isFinite(finalPrice) || finalPrice <= 0) return null;
      if (finalPrice < Number(offer.min_selling_price_ngn) || finalPrice > Number(offer.max_selling_price_ngn)) return null;
      return { ...offer, finalPrice };
    },
  });
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const isResoFitTrial = product.sku === "RESO-PT-TRIAL-7D";
  const [trialStarting, setTrialStarting] = useState(false);

  useEffect(() => {
    recordEngagement(product.id, "pdp_depth");
    preloadOnIdle(images.slice(1, 4).map((i) => i.url));
    recordRecentlyViewed({ handle: product.handle, title: product.title, image: images[0]?.url, price: formatMoney(variants[0]?.price ?? { amount: "0", currencyCode: "NGN" }) });
  }, [product.id, product.handle, product.title, images, variants]);

  // One TikTok ViewContent per product-detail page visit; do not emit from reusable image components.
  useEffect(() => {
    track("product_view", {
      product_id: product.sku || product.id,
      product_title: product.title,
      value: Number(selectedVariant?.price.amount ?? 0),
      currency: selectedVariant?.price.currencyCode ?? "NGN",
    });
  }, [product.id, product.sku, product.title]);

  const perf = getCachedPerf(product.id);
  const confident = perf && perf.pps >= 60;

  const handleAdd = async () => {
    if (!selectedVariant) return;
    if (isResoFitTrial) {
      setTrialStarting(true);
      try {
        const response = await fetch(`${RESOFIT_SUPABASE_URL}/functions/v1/resofit-entitlement`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_sku: product.sku }),
        });
        const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string; end_at?: string } | null;
        if (!response.ok || payload?.ok !== true) {
          throw new Error(payload?.error ?? (response.status === 401 ? "Sign in to start your ResoFit trial." : "Unable to start your trial."));
        }
        recordEngagement(product.id, "trial_started");
        toast.success("Your 7-day Personal Trainer trial is active.", { position: "top-center" });
        window.location.assign("https://dashboard.resofit.fit/trainer");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to start your trial.", { position: "top-center" });
      } finally {
        setTrialStarting(false);
      }
      return;
    }
    await addItem({ product: { id: product.id, title: product.title, handle: product.handle, sku: product.sku, images: product.images }, variantId: selectedVariant.id, variantTitle: selectedVariant.title, price: selectedVariant.price, quantity: qty, selectedOptions: selectedVariant.selectedOptions });
    track("add_to_cart", { product_id: product.sku || product.id, product_title: product.title, quantity: qty, value: Number(selectedVariant.price.amount) * qty, currency: selectedVariant.price.currencyCode ?? "NGN" });
    recordEngagement(product.id, "add_to_cart");
    toast.success(`Added ${qty}× ${product.title} to cart`, { position: "top-center" });
  };

  useEffect(() => {
    if (typeof window === "undefined" || !selectedVariant?.availableForSale) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("assessment") !== "1") return;
    if (!product.sku) return;
    if (sessionStorage.getItem("resofit:assessment_checkout_started") === selectedVariant.id) return;
    const saved = localStorage.getItem("resofit-checkout-contact");
    if (!saved) return;
    let contact: { fullName?: string; email?: string; phone?: string; address?: string };
    try { contact = JSON.parse(saved); } catch { return; }
    if (!contact.fullName?.trim() || !contact.email?.trim() || !contact.phone?.trim()) return;
    sessionStorage.setItem("resofit:assessment_checkout_started", selectedVariant.id);
    recordEngagement(product.id, "add_to_cart");
    void fetch(`${RESOFIT_SUPABASE_URL}/functions/v1/paystack-init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ sku: product.sku, quantity: 1 }],
        name: contact.fullName.trim(),
        email: contact.email.trim().toLowerCase(),
        phone: contact.phone.trim(),
        address: contact.address?.trim() ?? "",
      }),
    }).then(async (response) => {
      const payload = await response.json().catch(() => null) as { authorization_url?: string; error?: string } | null;
      if (!response.ok || !payload?.authorization_url) throw new Error(payload?.error ?? "Unable to start secure checkout");
      window.location.assign(payload.authorization_url);
    }).catch((error) => {
      sessionStorage.removeItem("resofit:assessment_checkout_started");
      toast.error(error instanceof Error ? error.message : "Unable to start secure checkout");
    });
  }, [product.id, product.sku, selectedVariant]);

  return <article className="mx-auto max-w-7xl px-6 py-12">
    <Link to="/shop" className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-gold"><ArrowLeft className="h-3 w-3" /> Back to shop</Link>
    <div className="grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
      <div className="lg:sticky lg:top-6 lg:self-start"><div className="overflow-hidden rounded-[1.5rem] border border-gold/15 bg-card shadow-2xl shadow-black/20"><ProductImage src={images[activeImg]?.url} alt={images[activeImg]?.altText} title={product.title} category={product.productType} productId={product.id} priority aspect="square" /> </div>{images.length > 1 && <div className="grid grid-cols-5 gap-2">{images.map((img, i) => <button key={img.url} type="button" onClick={() => setActiveImg(i)} aria-label={`View image ${i + 1}`} className={`overflow-hidden border ${i === activeImg ? "border-gold" : "border-border/60"}`}><ProductImage src={img.url} alt={img.altText} title={`${product.title} view ${i + 1}`} category={product.productType} tier={i === 0 ? "medium" : "low"} /></button>)}</div>}</div>
      <div className="pt-2">
        <div className="flex flex-wrap gap-2 text-[9px] uppercase tracking-[.22em]">{product.productType && <span className="rounded-full border border-gold/30 bg-gold/5 px-3 py-1.5 text-gold">{product.productType}</span>}<span className="rounded-full border border-border/60 px-3 py-1.5 text-muted-foreground">{((product.fulfillmentMode ?? "").toLowerCase().includes("digital") && !(product.fulfillmentMode ?? "").toLowerCase().includes("hybrid")) ? "Digital delivery" : (product.fulfillmentMode ?? "").toLowerCase().includes("hybrid") ? "Physical + digital delivery" : "Physical delivery"}</span>{selectedVariant?.availableForSale && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-emerald-300">Available now</span>}</div>
        <h1 className="mt-3 font-display text-5xl leading-tight md:text-6xl">{product.title}</h1>
        {confident && <div className="mt-4 inline-flex items-center gap-2 rounded-sm border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-widest text-gold"><Sparkles className="h-3 w-3" /> Community pick · high engagement</div>}
        <div className="mt-7 flex flex-wrap items-end gap-x-5 gap-y-2"><p className="font-display text-4xl text-gold">{formatMoney(selectedVariant.price)}</p><p className="text-sm uppercase tracking-widest text-muted-foreground">≈ {approxUSD(selectedVariant.price)}</p></div>
        {specialOffer && specialOffer.finalPrice < Number(selectedVariant.price.amount) && <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.25em] text-gold">ChatB2K™ special offer</p><p className="mt-1 text-sm text-muted-foreground">Verified offer · {specialOffer.offer_code}</p></div><p className="font-display text-2xl text-gold">₦{specialOffer.finalPrice.toLocaleString("en-NG")}</p></div><p className="mt-2 text-xs text-muted-foreground">Offer pricing is validated by the ResoFit commercial-offer authority.</p></div>}
        {product.descriptionHtml ? <div className="prose prose-invert mt-8 max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} /> : <p className="mt-8 whitespace-pre-line text-muted-foreground">{product.description}</p>}
        {experience?.experience && <section className="mt-8 rounded-2xl border border-gold/25 bg-gold/5 p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold">ResoFit Personalized Experience</p>
          <h2 className="mt-2 font-display text-2xl">{experience.experience.teaser?.headline ?? "Built around your goals, meals and movement."}</h2>
          {experience.experience.promise?.primary && <p className="mt-2 text-sm leading-6 text-muted-foreground">{experience.experience.promise.primary}</p>}
          <div className="mt-4 grid gap-2 text-[11px]">
            <div className="rounded-xl border border-border bg-background/30 p-3"><b>Meal + workout:</b> {experience.experience.meal_workout?.personalized ? "Personalized" : "Included"}</div>
            <div className="rounded-xl border border-border bg-background/30 p-3"><b>Lifestyle:</b> {experience.experience.lifestyle_hacks?.included ? "Consistency, recovery and habit support included" : "See product details"}</div>
          </div>
          {experience.accessories?.length ? <div className="mt-4"><p className="text-[9px] uppercase tracking-widest text-gold">Consistency accessories</p><div className="mt-2 grid gap-2">{experience.accessories.map((a) => <Link key={a.sku} to="/product/$handle" params={{ handle: a.handle }} className="flex items-center justify-between rounded-xl border border-border p-3 text-[11px]"><span>{a.title}</span><span className="text-gold">₦{Number(a.variant_price || 0).toLocaleString()}</span></Link>)}</div></div> : null}
        </section>}
        {variants.length > 1 && variants[0].title !== "Default Title" && <div className="mt-8 border-t border-border/60 pt-6"><p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Option</p><div className="flex flex-wrap gap-2">{variants.map((v) => <button key={v.id} type="button" onClick={() => setVariantId(v.id)} disabled={!v.availableForSale} className={`rounded-sm border px-4 py-2 text-xs uppercase tracking-widest transition-colors ${v.id === variantId ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-gold/60 hover:text-foreground"} disabled:line-through disabled:opacity-40`}>{v.title}</button>)}</div></div>}
        <div className="mt-8 flex flex-wrap items-center gap-4">{!isResoFitTrial && <div className="flex h-12 items-center border border-border"><button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-full w-12 text-lg hover:text-gold" aria-label="Decrease quantity">−</button><span className="w-10 text-center">{qty}</span><button type="button" onClick={() => setQty((q) => q + 1)} className="h-full w-12 text-lg hover:text-gold" aria-label="Increase quantity">+</button></div>}<button type="button" onClick={handleAdd} disabled={trialStarting || isLoading || !selectedVariant?.availableForSale} className="inline-flex h-12 flex-1 items-center justify-center rounded-sm bg-gold px-8 text-xs font-semibold uppercase tracking-widest text-gold-foreground hover:bg-gold/90 disabled:opacity-50">{trialStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : isResoFitTrial ? "Start 7-Day Trial" : isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedVariant?.availableForSale ? ((product.fulfillmentMode ?? "").toLowerCase().includes("hybrid") ? "Get my bundle" : "Add to cart") : "Sold out"}</button></div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border/60 bg-card/30 p-4"><div className="flex items-center gap-2 text-gold"><ShieldCheck className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-widest text-foreground">Secure payment</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Paystack checkout with payment options shown at checkout.</p></div><div className="rounded-xl border border-border/60 bg-card/30 p-4"><div className="flex items-center gap-2 text-gold"><Package className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-widest text-foreground">Fulfillment</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Digital delivery, physical delivery, or both according to the canonical product configuration.</p></div></div>
        <div className="mt-8 border-t border-border/60 pt-6 text-sm">{!((product.fulfillmentMode ?? "").toLowerCase().includes("digital") && !(product.fulfillmentMode ?? "").toLowerCase().includes("hybrid")) && <div className="space-y-3"><div className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 text-gold"/><span><strong className="text-foreground">Nigeria delivery:</strong> <span className="text-muted-foreground">Shipping options and charges are confirmed at checkout.</span></span></div><div className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 text-gold"/><span><strong className="text-foreground">International:</strong> <span className="text-muted-foreground">International fulfillment where supported.</span></span></div></div>}{((product.fulfillmentMode ?? "").toLowerCase().includes("digital") && !(product.fulfillmentMode ?? "").toLowerCase().includes("hybrid")) && <div className="flex items-start gap-3"><Package className="mt-0.5 h-4 w-4 text-gold"/><span><strong className="text-foreground">Digital delivery:</strong> <span className="text-muted-foreground">No physical shipping required.</span></span></div>}<div className="mt-3 flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-gold"/><span><strong className="text-foreground">Secure checkout:</strong> <span className="text-muted-foreground">ResoFit Paystack checkout · payment options shown at checkout.</span></span></div></div>
      </div>
    </div>
    <RecommendedProducts currentHandle={product.handle} productType={product.productType} title="Pairs well with" />
    <RecentlyViewed excludeHandle={product.handle} />
  </article>;
}
