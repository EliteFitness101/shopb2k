import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import heroImg from "@/assets/hero-barbell.jpg";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrustBar } from "@/components/TrustBar";
import { TrustStories } from "@/components/TrustStories";
import { ProductImage } from "@/components/ProductImage";
import { EcosystemCarousel } from "@/components/EcosystemCarousel";
import { CinematicWellnessExperience } from "@/components/CinematicWellnessExperience";
import {
  PRODUCTS_QUERY,
  approxUSD,
  formatMoney,
  storefrontApiRequest,
  type ShopifyProduct,
} from "@/lib/shopify";
import { trackEvent } from "@/lib/revenueOS";
import { preloadOnIdle } from "@/lib/imagePriority";
import { CTA } from "@/lib/ctas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResoFit — Africa's Personalized Wellness Platform" },
      {
        name: "description",
        content:
          "Discover premium Services, Custom Equipment Offers & Proprietary ChatB2K™ Ancestral Intelligence deployment for clarity, strength, longevity & healthy living.",
      },
      { property: "og:title", content: "ResoFit — Africa's Personalized Wellness Platform" },
      {
        property: "og:description",
        content:
          "Discover premium Services, Custom Equipment Offers & Proprietary ChatB2K™ Ancestral Intelligence deployment for clarity, strength, longevity & healthy living.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://resofit.fit/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://resofit.fit/" },
      { rel: "preload", as: "image", href: heroImg, fetchpriority: "high" },
    ],
  }),
  component: Index,
});

const FALLBACK_FEATURED: ShopifyProduct[] = [
  {
    node: {
      id: "RF-ROL-MAT",
      sku: "RF-ROL-MAT",
      handle: "pro-foam-roller-mat-set",
      title: "ResoFlex Pro Foam Roller & Exercise Mat Set",
      description: "",
      productType: "Recovery",
      vendor: "ResoFlex",
      tags: [],
      priceRange: { minVariantPrice: { amount: "30000", currencyCode: "NGN" } },
      images: { edges: [{ node: { url: "https://ik.imagekit.io/resofit/catalog/rf-rol-mat.webp", altText: "ResoFlex Pro Foam Roller & Exercise Mat Set" } }] },
      variants: { edges: [{ node: { id: "RF-ROL-MAT", title: "Default Title", price: { amount: "30000", currencyCode: "NGN" }, availableForSale: true, selectedOptions: [] } }] },
      options: [],
    },
  },
  {
    node: {
      id: "RF-KIT-GLT",
      sku: "RF-KIT-GLT",
      handle: "glutes-sculpt-kit",
      title: "ResoFlex Glutes Sculpt Kit",
      description: "",
      productType: "Bundles",
      vendor: "ResoFlex",
      tags: [],
      priceRange: { minVariantPrice: { amount: "45000", currencyCode: "NGN" } },
      images: { edges: [{ node: { url: "https://ik.imagekit.io/resofit/catalog/rf-kit-glt.webp", altText: "ResoFlex Glutes Sculpt Kit" } }] },
      variants: { edges: [{ node: { id: "RF-KIT-GLT", title: "Default Title", price: { amount: "45000", currencyCode: "NGN" }, availableForSale: true, selectedOptions: [] } }] },
      options: [],
    },
  },
  {
    node: {
      id: "RF-BIKE-SPIN",
      sku: "RF-BIKE-SPIN",
      handle: "resoflex-pro-indoor-studio-cycle",
      title: "ResoFlex Pro Indoor Studio Cycle",
      description: "",
      productType: "Cardio",
      vendor: "ResoFlex",
      tags: [],
      priceRange: { minVariantPrice: { amount: "290000", currencyCode: "NGN" } },
      images: { edges: [{ node: { url: "https://ik.imagekit.io/resofit/catalog/rf-bike-spin.webp", altText: "ResoFlex Pro Indoor Studio Cycle" } }] },
      variants: { edges: [{ node: { id: "RF-BIKE-SPIN", title: "Default Title", price: { amount: "290000", currencyCode: "NGN" }, availableForSale: true, selectedOptions: [] } }] },
      options: [],
    },
  },
  {
    node: {
      id: "RF-TWR-PULL",
      sku: "RF-TWR-PULL",
      handle: "multi-station-power-tower",
      title: "ResoFlex Multi-Station Power Tower",
      description: "",
      productType: "Strength",
      vendor: "ResoFlex",
      tags: [],
      priceRange: { minVariantPrice: { amount: "210000", currencyCode: "NGN" } },
      images: { edges: [{ node: { url: "https://ik.imagekit.io/resofit/catalog/rf-twr-pull.webp", altText: "ResoFlex Multi-Station Power Tower" } }] },
      variants: { edges: [{ node: { id: "RF-TWR-PULL", title: "Default Title", price: { amount: "210000", currencyCode: "NGN" }, availableForSale: true, selectedOptions: [] } }] },
      options: [],
    },
  },
];

async function fetchFeaturedProducts(): Promise<ShopifyProduct[]> {
  const tryQueries = ["tag:featured", "tag:best-seller", ""];
  for (const q of tryQueries) {
    const res = await storefrontApiRequest<{ products: { edges: ShopifyProduct[] } }>(
      PRODUCTS_QUERY,
      { first: 8, query: q || undefined },
    );
    const edges = res?.data?.products?.edges ?? [];
    if (edges.length > 0) return edges.slice(0, 8);
  }
  return FALLBACK_FEATURED;
}

function Index() {
  const { data: featured = FALLBACK_FEATURED } = useQuery({
    queryKey: ["products", "homepage-featured"],
    queryFn: fetchFeaturedProducts,
    initialData: FALLBACK_FEATURED,
    staleTime: 60_000,
  });
  useEffect(() => {
    trackEvent("landing_view");
  }, []);
  useEffect(() => {
    if (!featured || featured.length === 0) return;
    preloadOnIdle(featured.slice(2, 6).map((p) => p.node.images.edges[0]?.node.url));
  }, [featured]);
  const handlePrimaryCta = () => trackEvent("cta_click");
  const handleAssessment = () => trackEvent("assessment_click");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <CinematicWellnessExperience />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Loaded olympic barbell in dramatic studio light" width={1536} height={1280} fetchPriority="high" decoding="async" className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center px-6 py-24">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-gold"><span className="h-px w-10 bg-gold" />ChatB2K™ · ResoFit</p>
            <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl md:text-8xl lg:text-9xl">Africa's<br /><span className="text-gradient-gold">personalized</span><br />wellness platform.</h1>
            <p className="mt-8 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">Programs, premium equipment and ChatB2K™ wellness intelligence — matched to how you live, eat and move.</p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/me" onClick={handlePrimaryCta} className="group inline-flex h-14 items-center justify-center gap-3 rounded-sm bg-gold px-8 text-sm font-semibold uppercase tracking-widest text-gold-foreground shadow-gold transition-transform hover:-translate-y-0.5">{CTA.primary}<span className="transition-transform group-hover:translate-x-1">→</span></Link>
              <Link to="/me" onClick={handleAssessment} className="inline-flex h-14 items-center justify-center rounded-sm border border-border px-8 text-sm font-semibold uppercase tracking-widest text-foreground transition-colors hover:border-gold hover:text-gold">{CTA.assessment}</Link>
            </div>
            <dl className="mt-16 grid max-w-md grid-cols-3 gap-6 border-t border-border/60 pt-8">
              <div><dt className="text-xs uppercase tracking-widest text-muted-foreground">Reset</dt><dd className="mt-1 font-display text-3xl text-foreground">₦1k</dd></div>
              <div><dt className="text-xs uppercase tracking-widest text-muted-foreground">Warranty</dt><dd className="mt-1 font-display text-3xl text-foreground">Life</dd></div>
              <div><dt className="text-xs uppercase tracking-widest text-muted-foreground">Ships</dt><dd className="mt-1 font-display text-3xl text-foreground">NG</dd></div>
            </dl>
          </div>
        </div>
      </section>
      <TrustBar />
      <section className="border-t border-border/60 bg-card/20 py-20"><div className="mx-auto max-w-7xl px-6"><p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Who We Help</p><h2 className="font-display text-4xl md:text-5xl">Built for every wellness path.</h2><div className="mt-10 grid gap-px bg-border/60 md:grid-cols-3">{[{t:"Longevity seekers",d:"Healthy ageing, energy and biomarker-backed protocols."},{t:"Strength builders",d:"Mobility, recovery and progressive strength — coached."},{t:"Body-confidence journeys",d:"Sustainable nutrition and habit systems that stick."}].map((x)=><div key={x.t} className="bg-background p-6"><div className="h-2 w-10 bg-gold/70"/><h3 className="mt-4 font-display text-xl">{x.t}</h3><p className="mt-2 text-sm text-muted-foreground">{x.d}</p></div>)}</div></div></section>
      <section className="border-t border-border/60 py-20"><div className="mx-auto max-w-7xl px-6"><p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">How It Works</p><h2 className="font-display text-4xl md:text-5xl">Three steps to your plan.</h2><ol className="mt-10 grid gap-px bg-border/60 md:grid-cols-3">{[{n:"01",t:"Assess",d:"60-second ChatB2K™ wellness assessment."},{n:"02",t:"Personalize",d:"We match programs, nutrition and equipment to you."},{n:"03",t:"Live it",d:"Coaching, guides and community keep you consistent."}].map((s)=><li key={s.n} className="bg-background p-6"><p className="font-display text-4xl text-gold">{s.n}</p><h3 className="mt-3 font-display text-xl">{s.t}</h3><p className="mt-2 text-sm text-muted-foreground">{s.d}</p></li>)}</ol></div></section>
      <section id="featured" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 flex items-end justify-between gap-6"><div><p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">The Catalogue</p><h2 className="font-display text-5xl md:text-6xl">Featured Hardware</h2></div><Link to="/shop" className="hidden text-xs uppercase tracking-widest text-muted-foreground hover:text-gold md:inline-block">View all →</Link></div>
          <div className="grid gap-px bg-border/60 md:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 8).map((p, i) => {
              const img = p.node.images.edges[0]?.node;
              const price = p.node.priceRange.minVariantPrice;
              return <Link key={p.node.id} to="/product/$handle" params={{ handle: p.node.handle }} className="group flex flex-col bg-background p-6 transition-colors hover:bg-card"><ProductImage src={img?.url} alt={img?.altText} title={p.node.title} category={p.node.productType} productId={p.node.id} placement={i} priority={i < 2} className="group-hover:[&>img]:scale-105"/><div className="mt-5 flex items-start justify-between gap-4"><div className="min-w-0">{p.node.productType && <p className="text-xs uppercase tracking-widest text-muted-foreground">{p.node.productType}</p>}<h3 className="mt-2 truncate font-display text-xl leading-tight">{p.node.title}</h3></div><p className="whitespace-nowrap text-right"><span className="block font-display text-lg text-gold">{formatMoney(price)}</span><span className="block text-[10px] uppercase tracking-widest text-muted-foreground">{approxUSD(price)}</span></p></div></Link>;
            })}
          </div>
        </div>
      </section>
      <TrustStories compact />
      <EcosystemCarousel surface="home" />
      <section className="border-t border-border/60 py-24"><div className="mx-auto max-w-3xl px-6 text-center"><p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">Start Today</p><h2 className="font-display text-4xl leading-tight md:text-6xl">Your body,<br /><span className="text-gradient-gold">personalized for life.</span></h2><div className="mt-10 flex flex-wrap justify-center gap-4"><Link to="/me" onClick={handlePrimaryCta} className="inline-flex h-14 items-center justify-center gap-3 rounded-sm bg-gold px-8 text-sm font-semibold uppercase tracking-widest text-gold-foreground shadow-gold transition-transform hover:-translate-y-0.5">{CTA.primary}<span>→</span></Link><Link to="/programs" onClick={handleAssessment} className="inline-flex h-14 items-center justify-center rounded-sm border border-border px-8 text-sm font-semibold uppercase tracking-widest text-foreground transition-colors hover:border-gold hover:text-gold">Explore Programs</Link></div></div></section>
      <SiteFooter />
    </div>
  );
}
