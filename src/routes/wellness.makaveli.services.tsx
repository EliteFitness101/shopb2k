import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Check, MessageCircle, Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MAKAVELI_CATEGORIES, MAKAVELI_SERVICES, formatNGN } from "@/lib/makaveliCatalog";

export const Route = createFileRoute("/wellness/makaveli/services")({
  head: () => ({ meta: [
    { title: "Makaveli Wellness Services & Pricelist — ResoFit" },
    { name: "description", content: "Makaveli Wellness Services catalogue, launch pricing, features and direct booking options." },
  ], links: [{ rel: "canonical", href: "https://resofit.fit/wellness/makaveli/services" }] }),
  component: MakaveliServices,
});

const tierStyles: Record<string, string> = {
  "Campaign Offer": "border-gold/70 bg-gold/[0.08] shadow-[0_0_40px_rgba(212,175,55,0.12)]",
  "Core Wellness & Recovery": "border-border/70 bg-card/30",
  "Beauty & Personal Care": "border-border/70 bg-card/30",
  "Couples & Private": "border-gold/30 bg-card/40",
  Hospitality: "border-border/70 bg-card/30",
  "Women's Wellness": "border-border/70 bg-card/30",
  "Men's Wellness": "border-border/70 bg-card/30",
  "Mobility & Recovery": "border-border/70 bg-card/30",
  "Corporate & Group": "border-border/70 bg-card/30",
  "Packages & Membership": "border-gold/30 bg-card/40",
  "Future Services": "border-dashed border-border/60 bg-card/20 opacity-90",
};

const badges: Record<string, string> = {
  "wellness-reset": "Campaign Special",
  "private-couples-relaxation": "Couples Experience",
  "romantic-wellness-experience": "Premium Experience",
  "executive-guest-wellness": "Executive Tier",
  "corporate-wellness-day": "Group Activation",
  "vip-private-wellness-membership": "VIP Access",
};

function MakaveliServices() {
  const [selectedCategory, setSelectedCategory] = useState(MAKAVELI_CATEGORIES[0] ?? "Core Wellness & Recovery");
  const services = useMemo(() => MAKAVELI_SERVICES.filter(service => service.category === selectedCategory), [selectedCategory]);

  return <div className="min-h-screen bg-background"><SiteHeader/><main>
    <section className="border-b border-border/60 bg-gradient-to-b from-gold/[0.06] to-transparent"><div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      <p className="text-xs uppercase tracking-[0.35em] text-gold">Makaveli Wellness Services · Aba</p>
      <h1 className="mt-4 max-w-5xl font-display text-5xl leading-[.95] md:text-8xl">The complete<br/><span className="text-gradient-gold">wellness menu.</span></h1>
      <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">Choose a category, review the available services and book directly. Fixed-price services can be paid online; request-only services open a booking enquiry.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link to="/wellness/makaveli/book" className="inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground">Book a service <ArrowRight className="h-4 w-4"/></Link><a href="https://wa.me/2349032712393" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest"><MessageCircle className="h-4 w-4"/>WhatsApp</a></div>
    </div></section>

    <section className="py-10"><div className="mx-auto max-w-7xl px-6">
      <div className="mb-8 rounded-2xl border border-border/60 bg-card/20 p-3">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Makaveli service categories">
          {MAKAVELI_CATEGORIES.map(category => <button key={category} type="button" role="tab" aria-selected={selectedCategory === category} onClick={() => setSelectedCategory(category)} className={`shrink-0 rounded-full border px-4 py-2 text-[10px] uppercase tracking-widest transition-colors ${selectedCategory === category ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-gold hover:text-gold"}`}>{category}</button>)}
        </div>
      </div>

      <section aria-labelledby="selected-category"><div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.25em] text-gold">Catalogue</p><h2 id="selected-category" className="mt-2 font-display text-3xl md:text-5xl">{selectedCategory}</h2></div><span className="text-xs text-muted-foreground">{services.length} options</span></div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{services.map(service => {
          const isCampaign = service.slug === "wellness-reset";
          const isFuture = service.status === "coming_soon";
          const isRequest = service.booking === "request";
          const price = service.priceMode === "fixed" && service.price ? formatNGN(service.price) : service.priceLabel ?? (service.priceMode === "referral" ? "Referral" : "Custom quote");
          const whatsappText = `Inquiring about ${service.name}`;
          const primaryLabel = isFuture ? "View / Request" : isRequest ? "Request Booking" : isCampaign ? "Book & Pay ₦1,000" : selectedCategory === "Packages & Membership" ? "Select Package" : "Book Now";
          return <article key={service.slug} className={`group flex min-h-[440px] flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 ${tierStyles[selectedCategory] ?? "border-border/70 bg-card/30"}`}>
            <div className="flex min-h-6 items-start justify-between gap-4">{badges[service.slug] ? <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-widest text-gold"><Sparkles className="h-3 w-3"/>{badges[service.slug]}</span> : <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{isFuture ? "Coming soon" : isRequest ? "Request" : "Book & pay"}</span>}<span className="text-right font-display text-xl text-gold">{price}</span></div>
            <div className="mt-5"><span className="text-[10px] uppercase tracking-widest text-muted-foreground">{selectedCategory}</span><h3 className="mt-2 font-display text-2xl leading-tight">{service.name}</h3></div>
            {isCampaign && <p className="mt-3 text-sm font-medium text-gold">Purpose: Make Makaveli Wellness easy to try.</p>}
            {!isCampaign && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{service.description}</p>}
            <ul className="mt-5 space-y-2">{service.features.slice(0,4).map(feature => <li key={feature} className="flex gap-2 text-xs leading-relaxed text-muted-foreground"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"/>{feature}</li>)}</ul>
            <div className="mt-auto pt-5"><div className="border-t border-border/50 pt-4"><p className="text-[11px] text-muted-foreground">{isCampaign ? "Ideal for: New customers and campaign traffic" : `Best for: ${service.suitableFor}`}</p>{service.duration && <p className="mt-1 text-[11px] text-muted-foreground">Typical duration: {service.duration} min</p>}</div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2"><Link to="/wellness/makaveli/book" search={{ service: service.slug }} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-3 text-[10px] font-semibold uppercase tracking-widest ${isFuture ? "border border-border text-muted-foreground" : "bg-gold/90 text-gold-foreground"}`}>{primaryLabel}<ArrowRight className="h-3.5 w-3.5"/></Link><a href={`https://wa.me/2349032712393?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:border-gold hover:text-gold"><MessageCircle className="h-3.5 w-3.5"/>WhatsApp Us</a></div>
              <Link to="/wellness/makaveli/services/$slug" params={{slug:service.slug}} className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gold">View service details <ArrowRight className="h-3.5 w-3.5"/></Link>
            </div>
          </article>;
        })}</div>
      </section>
    </div></section>
  </main><SiteFooter/></div>;
}
