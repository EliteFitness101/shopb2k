import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { preloadOnIdle, recordEngagement } from "@/lib/imagePriority";
import { getCachedPerf } from "@/lib/productIntelligence";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Truck, ShieldCheck, Package, Sparkles, Check, BadgePercent, Heart, ShoppingBag } from "lucide-react";
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
  const compareAt = (selectedVariant as any)?.compareAtPrice;
  const currentAmount = Number(selectedVariant?.price.amount ?? 0);
  const compareAmount = Number(compareAt?.amount ?? 0);
  const discountPct = compareAmount > currentAmount ? Math.round((1 - currentAmount / compareAmount) * 100) : 0;
  const experienceData = experience?.experience ?? {};
  const planItems = Object.entries(experienceData.plan ?? {}).filter(([,v]) => v !== null && v !== undefined && v !== false).slice(0, 6);
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
    <div className="grid gap-12 lg:grid-cols-2">
      <div className="space-y-4"><ProductImage src={images[activeImg]?.url} alt={images[activeImg]?.altText} title={product.title} category={product.productType} productId={product.id} priority />{images.length > 1 && <div className="grid grid-cols-5 gap-2">{images.map((img, i) => <button key={img.url} type="button" onClick={() => setActiveImg(i)} aria-label={`View image ${i + 1}`} className={`overflow-hidden border ${i === activeImg ? "border-gold" : "border-border/60"}`}><ProductImage src={img.url} alt={img.altText} title={`${product.title} view ${i + 1}`} category={product.productType} tier={i === 0 ? "medium" : "low"} /></button>)}</div>}</div>
      <div>
        {product.productType && <p className="text-xs uppercase tracking-[0.3em] text-gold">{product.productType}</p>}
        <h1 className="mt-3 font-display text-5xl leading-tight md:text-6xl">{product.title}</h1>
        {confident && <div className="mt-4 inline-flex items-center gap-2 rounded-sm border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-widest text-gold"><Sparkles className="h-3 w-3" /> Community pick · high engagement</div>}
        <div className="mt-6 flex flex-wrap items-end gap-4"><p className="font-display text-4xl text-gold">{formatMoney(selectedVariant.price)}</p>{discountPct > 0 && <><p className="text-lg text-muted-foreground line-through">{formatMoney(compareAt)}</p><span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold"><BadgePercent className="h-3 w-3" /> Save {discountPct}%</span></>}<p className="text-sm uppercase tracking-widest text-muted-foreground">≈ {approxUSD(selectedVariant.price)}</p></div>
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
        <div className="mt-8 flex flex-wrap items-center gap-4">{!isResoFitTrial && <div className="flex h-12 items-center border border-border"><button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-full w-12 text-lg hover:text-gold" aria-label="Decrease quantity">−</button><span className="w-10 text-center">{qty}</span><button type="button" onClick={() => setQty((q) => q + 1)} className="h-full w-12 text-lg hover:text-gold" aria-label="Increase quantity">+</button></div>}<button type="button" onClick={handleAdd} disabled={trialStarting || isLoading || !selectedVariant?.availableForSale} className="inline-flex h-12 flex-1 items-center justify-center rounded-sm bg-gold px-8 text-xs font-semibold uppercase tracking-widest text-gold-foreground hover:bg-gold/90 disabled:opacity-50">{trialStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : isResoFitTrial ? "Start 7-Day Trial" : isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedVariant?.availableForSale ? "Add to cart" : "Sold out"}</button></div>
        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/30 p-5"><p className="text-[10px] uppercase tracking-[0.25em] text-gold">What you receive</p><h2 className="mt-2 font-display text-2xl">A clear, premium delivery experience.</h2><div className="mt-4 space-y-3 text-sm text-muted-foreground">{(experienceData.delivery?.entry ? [String(experienceData.delivery.entry)] : []).concat(planItems.map(([k,v]) => String(k).replaceAll("_"," ") + ": " + (typeof v === "string" ? v : JSON.stringify(v)))).slice(0,6).map((x,i)=><div key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold"/><span>{x}</span></div>)}</div></div>
          <div className="rounded-2xl border border-border/60 bg-card/30 p-5"><p className="text-[10px] uppercase tracking-[0.25em] text-gold">Choose with confidence</p><h2 className="mt-2 font-display text-2xl">Built for the way you actually use it.</h2><div className="mt-4 space-y-3 text-sm text-muted-foreground"><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold"/><span>Secure ResoFit checkout with payment confirmation before fulfillment.</span></div><div className="flex gap-2"><ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-gold"/><span>{product.productType?.toLowerCase().includes("digital") || product.productType?.toLowerCase().includes("plan") ? "Digital delivery is tied to the purchased product and entitlement." : "Physical fulfillment and delivery details are confirmed at checkout."}</span></div><div className="flex gap-2"><Heart className="mt-0.5 h-4 w-4 shrink-0 text-gold"/><span>Recommendations adapt to this product and your shopping journey.</span></div></div></div>
        </section>
        <RecommendedProducts currentHandle={product.handle} productType={product.productType} title="Frequently paired with this" />
        <section className="mt-12 rounded-2xl border border-border/60 p-6"><div className="flex items-center gap-3"><Sparkles className="h-4 w-4 text-gold"/><div><p className="text-[10px] uppercase tracking-[0.25em] text-gold">Compare & explore</p><h2 className="font-display text-2xl">Not sure which ResoFit option fits?</h2></div></div><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Use the personalized recommendations below to compare adjacent products by purpose, delivery type and price. There is no second checkout or separate commerce authority.</p><Link to="/shop" className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold">Compare the full collection →</Link></section>
        <ul className="mt-10 space-y-3 border-t border-border/60 pt-6 text-sm"><li className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 text-gold" /><span><strong className="text-foreground">Lagos:</strong> <span className="text-muted-foreground">2–4 business days · from ₦5,000</span></span></li><li className="flex items-start gap-3"><Package className="mt-0.5 h-4 w-4 text-gold" /><span><strong className="text-foreground">Nigeria nationwide:</strong> <span className="text-muted-foreground">4–7 business days · calculated at checkout</span></span></li><li className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 text-gold" /><span><strong className="text-foreground">International:</strong> <span className="text-muted-foreground">7–21 business days · DHL / freight</span></span></li><li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-gold" /><span><strong className="text-foreground">Secure checkout:</strong> <span className="text-muted-foreground">ResoFit Paystack checkout · payment options shown at checkout</span></span></li></ul>
      </div>
    </div>
    <RecentlyViewed excludeHandle={product.handle} />
  </article>;
}
