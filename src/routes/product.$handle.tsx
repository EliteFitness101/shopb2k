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
  if (handle === "coach-b2k-pull-up-bar") return <div className="min-h-screen bg-[#09090b] text-zinc-100"><SiteHeader /><CoachB2KPullUpLuxury product={data} /><SiteFooter /></div>;
  return <div className="min-h-screen bg-background"><SiteHeader /><ProductDetail product={data} /><SiteFooter /></div>;
}

function CoachB2KPullUpLuxury({ product }: { product: ShopifyProductNode }) {
  const variant = product.variants.edges.map((e) => e.node).find((v) => v.availableForSale) ?? product.variants.edges[0]?.node;
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const [qty, setQty] = useState(1);
  const [activeHero, setActiveHero] = useState(0);
  const registryImages = product.images.edges.map((edge) => edge.node.url).filter(Boolean);
  const heroImages = registryImages.length ? registryImages : [
    "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/hero/pull_up_001.jpeg",
    "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/hero/pull_up_002.jpeg",
    "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/hero/pull_up_003.jpeg",
    "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/hero/pull_up_004.jpeg",
    "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/hero/pull_up_005.jpeg",
    "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/hero/pull_up_006.jpeg",
    "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/hero/pull_up_007.png",
    "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/hero/pull_up_008.png",
  ];
  const bufferVideos = [
    { src: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/ResoFlex_Vault/ResoFlex_Buchi_Power_commercial_202608151451.mp4", poster: heroImages[0], title: "Coach B2K Power Commercial" },
    { src: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/ResoFlex_Vault/ResoFlex_wall-mounted_station_pr%E2%80%A6_20260918141303.mp4", poster: heroImages[3], title: "Wall-Mounted Station Preview" },
    { src: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/ResoFlex_Vault/Athlete_performing_pull-up_comme%E2%80%A6_20260918120251.mp4", poster: heroImages[5], title: "Athlete Pull-Up Commercial" },
  ];
  const buy = async () => {
    if (!variant) return;
    await addItem({ product: { id: product.id, title: product.title, handle: product.handle, sku: product.sku, images: product.images }, variantId: variant.id, variantTitle: variant.title, price: variant.price, quantity: qty, selectedOptions: variant.selectedOptions });
    recordEngagement(product.id, "add_to_cart");
    toast.success("Added to your ResoFit cart. Open the cart above to continue to secure checkout.", { position: "top-center" });
  };
  useEffect(() => {
    const id = window.setInterval(() => setActiveHero((v) => (v + 1) % heroImages.length), 4500);
    return () => window.clearInterval(id);
  }, []);
  const hero = heroImages[activeHero];
  return <main className="overflow-hidden">
    <section className="relative min-h-[760px] border-b border-white/10 bg-black">
      {heroImages.map((src, i) => <img key={src} src={src} alt="" aria-hidden={i !== activeHero} className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000" style={{ opacity: i === activeHero ? 1 : 0 }} />)}
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(212,175,55,.22),transparent_35%),linear-gradient(90deg,rgba(0,0,0,.9),rgba(0,0,0,.35),rgba(0,0,0,.82))]" />
      <div className="relative z-10 mx-auto grid min-h-[760px] max-w-7xl items-end gap-10 px-6 py-16 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-black/45 px-4 py-2 text-[10px] font-semibold uppercase tracking-[.28em] text-amber-300 backdrop-blur-xl">🇳🇬 Engineered in Nigeria · First Production Run</div>
          <p className="text-xs uppercase tracking-[.35em] text-amber-400">ResoFlex™ · Coach B2K</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[.95] md:text-7xl">Heavy-Duty Strength.<br/><span className="text-gradient-gold">Zero Compromise.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-200">Your wall is already there. Now put it to work. A serious wall-mounted training station for pull-ups, chin-ups, dips and hanging core work — locally fabricated for the first ResoFlex production run.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button onClick={buy} disabled={isLoading || !variant?.availableForSale} className="inline-flex h-14 items-center justify-center rounded-sm bg-amber-400 px-7 text-sm font-extrabold uppercase tracking-widest text-black shadow-[0_12px_50px_rgba(212,175,55,.18)] transition hover:bg-amber-300 disabled:opacity-50">Pre-order · ₦65,000</button>
            <Link to="/shop" className="inline-flex h-14 items-center justify-center rounded-sm border border-white/20 bg-black/30 px-7 text-sm font-semibold uppercase tracking-widest text-white backdrop-blur-xl transition hover:border-amber-400/50 hover:text-amber-300">Back to Shop</Link>
          </div>
          <p className="mt-4 text-xs uppercase tracking-[.18em] text-zinc-300">Secure checkout · Paystack · Card · Bank · USSD · Nationwide delivery</p>
          <div className="mt-8 flex flex-wrap gap-2">{heroImages.map((_, i) => <button key={i} onClick={() => setActiveHero(i)} aria-label={`Show hero image ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === activeHero ? "w-10 bg-amber-300" : "w-5 bg-white/30"}`} />)}</div>
        </div>
        <div className="rounded-2xl border border-amber-300/20 bg-black/35 p-2 shadow-2xl backdrop-blur-xl">
          <img src={hero} alt="Coach B2K ResoFlex wall-mounted pull-up bar" className="aspect-[4/3] w-full rounded-xl object-cover" />
          <div className="flex items-center justify-between px-3 py-4"><span className="text-xs uppercase tracking-[.22em] text-zinc-300">Made in Nigeria</span><span className="font-display text-xl text-amber-300">₦65K</span></div>
        </div>
      </div>
    </section>
    <section className="border-b border-white/10 bg-[#0c0c0e]"><div className="mx-auto grid max-w-7xl gap-px px-6 py-8 sm:grid-cols-3">{[["02 MM","Structural steel profile"],["2″ × 2″","Square steel pipe"],["1″","Round pull-up handles"]].map(([a,b]) => <div key={a} className="border border-white/10 bg-white/[.02] p-6"><p className="font-display text-3xl text-amber-300">{a}</p><p className="mt-2 text-xs uppercase tracking-[.2em] text-zinc-500">{b}</p></div>)}</div></section>
    <section className="mx-auto max-w-7xl px-6 py-20"><div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]"><div><p className="text-xs uppercase tracking-[.3em] text-amber-400">Why this bar</p><h2 className="mt-3 font-display text-4xl md:text-5xl">One bar.<br/><span className="text-gradient-gold">Serious training.</span></h2><p className="mt-6 max-w-xl leading-8 text-zinc-400">No gym membership. No waiting for equipment. Just a properly installed station, your bodyweight and a training system you can actually repeat.</p></div><div className="grid gap-4 sm:grid-cols-2">{[["01","Wide-grip pull-ups","Build pulling strength and control."],["02","Neutral chin-ups","Train your back, arms and grip."],["03","Tricep dips","Add pushing work to the same station."],["04","Hanging core work","Use vertical knee raises and controlled holds."]].map(([n,t,d]) => <div key={n} className="rounded-xl border border-white/10 bg-white/[.025] p-6"><span className="text-xs tracking-[.25em] text-amber-400">{n}</span><h3 className="mt-5 font-display text-2xl">{t}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{d}</p></div>)}</div></div></section>
    <section className="border-y border-amber-400/15 bg-[radial-gradient(circle_at_20%_50%,rgba(212,175,55,.12),transparent_35%),#0b0b0d]"><div className="mx-auto max-w-7xl px-6 py-20"><div className="max-w-3xl"><p className="text-xs uppercase tracking-[.3em] text-amber-400">Buffer content vault</p><h2 className="mt-3 font-display text-4xl md:text-5xl">Built to move.<br/><span className="text-gradient-gold">Built to be seen.</span></h2><p className="mt-5 text-zinc-400">The production page is wired to the existing ResoFit content asset pattern, keeping campaign media close to the product experience without changing checkout.</p></div><div className="mt-10 grid gap-5 lg:grid-cols-3">{bufferVideos.map((video,i) => <div key={video.src} className="overflow-hidden rounded-2xl border border-amber-300/15 bg-black/60 shadow-2xl"><div className="relative"><video src={video.src} poster={video.poster} controls muted playsInline preload="metadata" className="aspect-video w-full bg-black object-cover" aria-label={video.title} /><div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3"><span className="text-[9px] font-semibold uppercase tracking-[.25em] text-amber-300">ResoFlex™ · Premium Media</span><span className="text-[9px] uppercase tracking-widest text-white/70">{String(i+1).padStart(2,"0")}</span></div></div><div className="px-4 py-3"><p className="font-display text-lg text-white">{video.title}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">Tap to play · Made in Nigeria</p></div></div>)}</div></div></section>
    <section className="border-y border-white/10 bg-[#0c0c0e]"><div className="mx-auto max-w-7xl px-6 py-20"><div className="max-w-3xl"><p className="text-xs uppercase tracking-[.3em] text-amber-400">Pre-order package</p><h2 className="mt-3 font-display text-4xl md:text-5xl">₦65,000.<br/><span className="text-gradient-gold">More than the bar.</span></h2><p className="mt-5 text-zinc-400">Your pre-order includes the equipment plus the supplied ₦10,000-value 90-Day Metabolic Transformation Journey and ChatB2K™ coaching access.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{[["THE HARDWARE","Coach B2K wall-mounted station","2 mm structural steel · locally fabricated"],["THE JOURNEY","90-Day Metabolic Transformation","Daily customized nutrition guidance"],["THE INTELLIGENCE","ChatB2K™ coaching access","Guidance, form checks and routine tracking"]].map(([k,t,d]) => <div key={k} className="rounded-2xl border border-white/10 bg-black/30 p-7"><p className="text-[10px] font-bold tracking-[.25em] text-amber-400">{k}</p><h3 className="mt-4 font-display text-2xl">{t}</h3><p className="mt-3 text-sm leading-6 text-zinc-400">{d}</p></div>)}</div></div></section>
    <section className="mx-auto max-w-5xl px-6 py-20 text-center"><p className="text-xs uppercase tracking-[.3em] text-amber-400">First batch</p><h2 className="mt-4 font-display text-4xl md:text-6xl">Build your home gym<br/><span className="text-gradient-gold">one serious piece at a time.</span></h2><div className="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-2"><button onClick={() => setQty((q) => Math.max(1,q-1))} className="h-12 w-12 rounded-lg border border-white/10 text-xl hover:text-amber-300">−</button><span className="flex-1 font-semibold">{qty} × ₦65,000</span><button onClick={() => setQty((q) => q+1)} className="h-12 w-12 rounded-lg border border-white/10 text-xl hover:text-amber-300">+</button></div><button onClick={buy} disabled={isLoading || !variant?.availableForSale} className="mt-5 h-14 w-full max-w-md rounded-sm bg-amber-400 px-8 text-sm font-extrabold uppercase tracking-widest text-black hover:bg-amber-300 disabled:opacity-50">Secure Pre-order · ₦{(65000*qty).toLocaleString("en-NG")}</button><p className="mt-4 text-xs text-zinc-500">Add to cart first. Your existing ResoFit cart then handles secure Paystack checkout, order persistence and fulfillment.</p></section>
  </main>;
}
function ProductDetail({ product }: { product: ShopifyProductNode }) {
  const images = product.images.edges.map((e) => e.node);
  const variants = product.variants.edges.map((e) => e.node);
  const [variantId, setVariantId] = useState<string>((variants.find((v) => v.availableForSale) ?? variants[0])?.id ?? "");
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const selectedVariant = useMemo(() => variants.find((v) => v.id === variantId) ?? variants[0], [variantId, variants]);
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);

  useEffect(() => {
    recordEngagement(product.id, "pdp_depth");
    preloadOnIdle(images.slice(1, 4).map((i) => i.url));
    recordRecentlyViewed({ handle: product.handle, title: product.title, image: images[0]?.url, price: formatMoney(variants[0]?.price ?? { amount: "0", currencyCode: "NGN" }) });
  }, [product.id, product.handle, product.title, images, variants]);

  const perf = getCachedPerf(product.id);
  const confident = perf && perf.pps >= 60;

  const handleAdd = async () => {
    if (!selectedVariant) return;
    await addItem({ product: { id: product.id, title: product.title, handle: product.handle, sku: product.sku, images: product.images }, variantId: selectedVariant.id, variantTitle: selectedVariant.title, price: selectedVariant.price, quantity: qty, selectedOptions: selectedVariant.selectedOptions });
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
        <div className="mt-6 flex items-baseline gap-4"><p className="font-display text-4xl text-gold">{formatMoney(selectedVariant.price)}</p><p className="text-sm uppercase tracking-widest text-muted-foreground">≈ {approxUSD(selectedVariant.price)}</p></div>
        {product.descriptionHtml ? <div className="prose prose-invert mt-8 max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} /> : <p className="mt-8 whitespace-pre-line text-muted-foreground">{product.description}</p>}
        {variants.length > 1 && variants[0].title !== "Default Title" && <div className="mt-8 border-t border-border/60 pt-6"><p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Option</p><div className="flex flex-wrap gap-2">{variants.map((v) => <button key={v.id} type="button" onClick={() => setVariantId(v.id)} disabled={!v.availableForSale} className={`rounded-sm border px-4 py-2 text-xs uppercase tracking-widest transition-colors ${v.id === variantId ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-gold/60 hover:text-foreground"} disabled:line-through disabled:opacity-40`}>{v.title}</button>)}</div></div>}
        <div className="mt-8 flex flex-wrap items-center gap-4"><div className="flex h-12 items-center border border-border"><button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-full w-12 text-lg hover:text-gold" aria-label="Decrease quantity">−</button><span className="w-10 text-center">{qty}</span><button type="button" onClick={() => setQty((q) => q + 1)} className="h-full w-12 text-lg hover:text-gold" aria-label="Increase quantity">+</button></div><button type="button" onClick={handleAdd} disabled={isLoading || !selectedVariant?.availableForSale} className="inline-flex h-12 flex-1 items-center justify-center rounded-sm bg-gold px-8 text-xs font-semibold uppercase tracking-widest text-gold-foreground hover:bg-gold/90 disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedVariant?.availableForSale ? "Add to cart" : "Sold out"}</button></div>
        <ul className="mt-10 space-y-3 border-t border-border/60 pt-6 text-sm"><li className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 text-gold" /><span><strong className="text-foreground">Lagos:</strong> <span className="text-muted-foreground">2–4 business days · from ₦5,000</span></span></li><li className="flex items-start gap-3"><Package className="mt-0.5 h-4 w-4 text-gold" /><span><strong className="text-foreground">Nigeria nationwide:</strong> <span className="text-muted-foreground">4–7 business days · calculated at checkout</span></span></li><li className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 text-gold" /><span><strong className="text-foreground">International:</strong> <span className="text-muted-foreground">7–21 business days · DHL / freight</span></span></li><li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-gold" /><span><strong className="text-foreground">Secure checkout:</strong> <span className="text-muted-foreground">ResoFit Paystack checkout · payment options shown at checkout</span></span></li></ul>
      </div>
    </div>
    <RecommendedProducts currentHandle={product.handle} productType={product.productType} />
    <RecentlyViewed excludeHandle={product.handle} />
  </article>;
}
