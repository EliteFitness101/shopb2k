import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { RESOFIT_CATALOG_URL } from "@/lib/shopify";
import { withAttribution } from "@/lib/attribution";
import { track } from "@/lib/tracking";

type PartnerProduct = { handle: string; title: string; body_html: string | null; variant_price: number; variant_inventory_qty: number; image_src: string | null; product_type: string | null; sku: string | null; fulfillment_mode: string | null };

const recommendedHandles = ["25-steel-boned-latex-waist-shaper", "res-dig-reset", "fitness-evolution"];

async function loadPartnerProducts(): Promise<PartnerProduct[]> {
  try {
    const url = new URL(RESOFIT_CATALOG_URL);
    url.searchParams.set("limit", "200");
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return [];
    const payload = await response.json() as { data?: PartnerProduct[] };
    const products = Array.isArray(payload.data) ? payload.data : [];
    return recommendedHandles.map((handle) => products.find((product) => product.handle === handle && (product.fulfillment_mode === "digital" || product.variant_inventory_qty > 0))).filter((product): product is PartnerProduct => Boolean(product));
  } catch {
    return [];
  }
}

const formatNgn = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

const referral = "ZAPHIRA";
const attribution = "ref=zaphira&utm_source=bigo&utm_medium=affiliate&utm_campaign=zaphira_partner&utm_content=mszap_storefront";
const partnerHref = (path: string) => withAttribution(`https://shop.resofit.fit${path}?${attribution}`);
function trackPartnerProductClick(product: PartnerProduct) {
  track("product_click", { sku: product.sku ?? product.handle, product_id: product.sku ?? product.handle, product_title: product.title, value: product.variant_price, currency: "NGN", partner_ref: "zaphira", funnel_origin: "zaphira_partner" });
}

const coaching = [
  {
    tier: "01 · SPRINT",
    name: "Hourglass Glow 30-Day Live Sprint",
    duration: "30 days",
    price: "Enquire for confirmed pricing",
    description:
      "A guided group coaching sprint with live workouts, waist and glute routines, and practical nutrition accountability.",
    features: [
      "Four weekly private live-stream workouts",
      "Home- or gym-based waist and glute routines",
      "Nutrition and habit accountability",
    ],
    action: "Request sprint enrolment",
  },
  {
    tier: "02 · PRIVATE",
    name: "MsZap VIP 1-on-1 Live Coaching",
    duration: "Monthly",
    price: "Enquire for confirmed pricing",
    description:
      "A private coaching relationship with direct live check-ins and a structured personal routine.",
    features: [
      "Private 1-on-1 live coaching",
      "Personalised routine and progress check-ins",
      "Direct accountability with MsZap",
    ],
    action: "Request VIP coaching",
  },
  {
    tier: "03 · TRANSFORMATION",
    name: "90-Day Sovereign Body Transformation",
    duration: "90 days",
    price: "Request a quote",
    description:
      "A longer-form coaching pathway for customers who want a structured 90-day plan and consistent support.",
    features: [
      "90-day coaching pathway",
      "Progress and habit reviews",
      "Equipment and nutrition guidance",
    ],
    action: "Enquire about the 90-day plan",
  },
];

function whatsappRequest(name: string) {
  const message = encodeURIComponent(
    `Hello ResoFit, I came through Zaphira (MsZap). I would like to enquire about: ${name}. Referral code: ZAPHIRA.`,
  );
  return `https://wa.me/?text=${message}`;
}

export const Route = createFileRoute("/zaphira")({
  loader: async () => ({ recommendedProducts: await loadPartnerProducts() }),
  head: () => ({
    meta: [
      { title: "Zaphira (MsZap) | ResoFlex Elite Partner — ResoFit" },
      {
        name: "description",
        content:
          "Explore Zaphira (MsZap)'s ResoFlex partner coaching and wellness equipment through ResoFit.",
      },
      { property: "og:title", content: "Zaphira (MsZap) | ResoFlex Elite Partner" },
      {
        property: "og:description",
        content: "Live coaching enquiries and ResoFlex equipment, powered by ResoFit.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.resofit.fit/zaphira" }],
  }),
  component: ZaphiraPage,
});

function ZaphiraPage() {
  const { recommendedProducts } = Route.useLoaderData();
  const [copied, setCopied] = useState(false);

  async function copyReferral() {
    try {
      await navigator.clipboard.writeText(referral);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#09090B] text-zinc-100">
      <div className="border-b border-[#D4AF37]/30 bg-gradient-to-r from-[#2A0510] via-[#881337] to-[#2A0510] px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-100">Official ResoFlex™ Elite Partner · Referral code</span>
            <button
              type="button"
              onClick={copyReferral}
              className="rounded-full border border-[#D4AF37]/60 bg-black/40 px-3 py-1 font-mono font-bold tracking-widest text-[#FDE68A]"
            >
              {copied ? "COPIED" : "ZAPHIRA"}
            </button>
          </div>
          <span className="text-zinc-300">ResoFit · Creator partner storefront</span>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090B]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/50 bg-gradient-to-br from-[#BE123C] to-[#4C0519] font-serif text-xl font-bold text-[#FDE68A]">
              Z
            </span>
            <span>
              <span className="block font-serif text-sm font-bold tracking-[.18em]">ZAPHIRA</span>
              <span className="block text-[10px] uppercase tracking-widest text-[#D4AF37]">
                ResoFlex Elite Partner
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
            <a href="#coaching" className="hover:text-[#FDE68A]">Live coaching</a>
            <a href="#store" className="hover:text-[#FDE68A]">Shop equipment</a>
            <Link to="/" className="hover:text-[#FDE68A]">ResoFit home</Link>
          </nav>
          <a
            href={`https://shop.resofit.fit?${attribution}`}
            className="rounded-full border border-[#D4AF37]/50 px-4 py-2 text-xs font-semibold text-[#FDE68A]"
          >
            Shop ResoFlex
          </a>
        </div>
      </header>

      <section id="top" className="relative border-b border-white/10 bg-[radial-gradient(ellipse_at_80%_15%,rgba(190,18,60,.32),transparent_48%),linear-gradient(135deg,#17060c,#09090b_65%)]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <span className="inline-flex rounded-full border border-[#D4AF37]/40 bg-black/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#FDE68A]">
              BIGO LIVE · MsZap · Official partner
            </span>
            <h1 className="mt-7 font-serif text-4xl font-bold leading-tight sm:text-6xl">
              Sculpted confidence.
              <span className="block bg-gradient-to-r from-[#FDE68A] via-[#D4AF37] to-[#B48A1E] bg-clip-text text-transparent">
                Live accountability.
              </span>
              <span className="mt-2 block font-sans text-xl font-semibold text-zinc-200 sm:text-2xl">
                Powered by ResoFlex™.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Welcome to Zaphira (MsZap)'s official ResoFit partner page. Explore coaching
              enquiries and shop wellness equipment through the ResoFit storefront. Your
              ZAPHIRA referral attribution is carried into the shop journey.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#coaching" className="rounded-xl bg-gradient-to-r from-[#BE123C] to-[#881337] px-6 py-4 text-center text-sm font-bold text-white shadow-lg shadow-rose-950/40">
                Explore live coaching
              </a>
              <a href={`https://shop.resofit.fit?${attribution}`} className="rounded-xl border border-[#D4AF37]/50 bg-black/40 px-6 py-4 text-center text-sm font-bold text-[#FDE68A]">
                Shop equipment & wellness
              </a>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["25 Steel-Boned", "Waist shaper option"],
                ["Live 1:1", "Private coaching"],
                ["ZAPHIRA", "Partner referral"],
              ].map(([value, label]) => (
                <div key={value} className="rounded-2xl border border-[#D4AF37]/20 bg-white/[.04] p-3 text-center">
                  <p className="text-sm font-extrabold text-[#FDE68A] sm:text-lg">{value}</p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-[2rem] bg-gradient-to-br from-[#FDE68A] via-[#BE123C] to-[#B48A1E] p-1.5 shadow-2xl shadow-rose-950/40">
              <div className="flex aspect-[4/5] flex-col items-center justify-between rounded-[1.7rem] bg-gradient-to-b from-[#4C0519] via-[#17060c] to-[#09090B] p-7 text-center">
                <div className="flex w-full justify-between text-[10px] font-bold uppercase tracking-widest text-[#FDE68A]">
                  <span>VIP partner</span><span>BIGO LIVE</span>
                </div>
                <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-dashed border-[#D4AF37]/60">
                  <div className="absolute h-44 w-44 rounded-full border border-rose-500/40" />
                  <span className="font-serif text-8xl text-[#D4AF37]">Z</span>
                </div>
                <div className="w-full rounded-2xl border border-[#D4AF37]/30 bg-black/40 p-4">
                  <p className="font-serif text-xl font-bold">Zaphira · MsZap</p>
                  <p className="mt-1 text-xs text-[#FDE68A]">ResoFlex Elite Partner</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="coaching" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-[#D4AF37]">B2K-ELITE aligned</p>
          <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
            Personal <span className="text-[#D4AF37]">live coaching</span>
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Choose a coaching pathway and send an enquiry. Booking and payment are not confirmed
            until ResoFit publishes the matching offer in its verified commerce catalogue.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {coaching.map((item) => (
            <article key={item.name} className="flex flex-col rounded-3xl border border-[#D4AF37]/20 bg-white/[.04] p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold tracking-widest text-[#FDE68A]">{item.tier}</span>
                <span className="rounded-full bg-rose-950/70 px-3 py-1 text-xs text-rose-200">{item.duration}</span>
              </div>
              <h3 className="mt-5 text-xl font-bold">{item.name}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{item.description}</p>
              <p className="mt-6 border-b border-white/10 pb-5 text-2xl font-extrabold text-[#FDE68A]">{item.price}</p>
              <ul className="my-6 flex-1 space-y-3 text-sm text-zinc-300">
                {item.features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-[#D4AF37]">✦</span>{feature}</li>)}
              </ul>
              <a href={whatsappRequest(item.name)} target="_blank" rel="noreferrer" className="rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B48A1E] px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wider text-black">
                {item.action}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="recommended-products" className="border-y border-[#D4AF37]/15 bg-[#10090B]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.25em] text-[#D4AF37]">Live ResoFit catalogue</p>
              <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">MsZap’s recommended <span className="text-[#D4AF37]">training essentials</span></h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">Live product records, current catalogue pricing, inventory and product imagery. Select an item to view its full details and secure ResoFit checkout.</p>
            </div>
            <a href={`https://shop.resofit.fit?${attribution}`} className="rounded-full border border-[#D4AF37]/50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#FDE68A]">Browse full shop</a>
          </div>
          {recommendedProducts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommendedProducts.map((product) => (
                <article key={product.handle} className="overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-white/[.04]">
                  <a href={partnerHref(`/product/${product.handle}`)} onClick={() => trackPartnerProductClick(product)} className="block">
                    <ProductImage src={product.image_src} title={product.title} category={product.product_type ?? "Wellness"} aspect="square" fit="contain" priority />
                  </a>
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">{product.product_type}</p>
                    <h3 className="mt-2 text-lg font-bold">{product.title}</h3>
                    <p className="mt-3 text-xl font-extrabold text-[#FDE68A]">{formatNgn(product.variant_price)}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{product.fulfillment_mode === "digital" ? "Digital delivery · Paystack checkout" : "Inventory verified · Paystack checkout"}</p>
                    <a href={partnerHref(`/product/${product.handle}`)} onClick={() => trackPartnerProductClick(product)} className="mt-5 block rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B48A1E] px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wider text-black">View product & checkout</a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#D4AF37]/20 p-8 text-center text-sm text-zinc-400">
              The live product feed is temporarily unavailable. Open the ResoFit shop to browse current listings.
              <a href={partnerHref("/shop")} className="mt-4 inline-block text-[#FDE68A] underline">Open ResoFit shop</a>
            </div>
          )}
        </div>
      </section>

      <section id="store" className="border-y border-white/10 bg-gradient-to-b from-[#17060c] to-[#09090B]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-[#D4AF37]">ResoFlex partner storefront</p>
            <h2 className="mt-3 font-serif text-3xl font-bold">Shop the equipment. Build your routine.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              Browse the live ResoFit catalogue for waist shapers, resistance equipment and
              available wellness products. Product availability, prices and secure payment are
              supplied by the canonical store rather than duplicated on this partner page.
            </p>
          </div>
          <a href={partnerHref("/shop")} className="rounded-xl border border-[#D4AF37]/50 px-7 py-4 text-center text-sm font-bold text-[#FDE68A]">
            Browse ResoFit shop →
          </a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-xs text-zinc-500 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} ResoFit · Zaphira (MsZap) Elite Partner</p>
        <div className="flex gap-5"><Link to="/privacy" className="hover:text-[#FDE68A]">Privacy</Link><Link to="/terms" className="hover:text-[#FDE68A]">Terms</Link><Link to="/" className="hover:text-[#FDE68A]">ResoFit home</Link></div>
      </footer>
    </main>
  );
}
