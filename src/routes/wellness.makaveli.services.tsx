import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MAKAVELI_CATEGORIES, MAKAVELI_SERVICES, formatNGN } from "@/lib/makaveliCatalog";

export const Route = createFileRoute("/wellness/makaveli/services")({
  head: () => ({ meta: [
    { title: "Makaveli Wellness Services & Pricelist — ResoFit" },
    { name: "description", content: "Complete Makaveli Wellness Services catalogue, prices, features and booking options." },
  ], links: [{ rel: "canonical", href: "https://resofit.fit/wellness/makaveli/services" }] }),
  component: MakaveliServices,
});

function MakaveliServices() {
  return <div className="min-h-screen bg-background"><SiteHeader/><main>
    <section className="border-b border-border/60"><div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
      <p className="text-xs uppercase tracking-[0.35em] text-gold">Makaveli Wellness Services · Aba</p>
      <h1 className="mt-4 max-w-5xl font-display text-5xl leading-[.95] md:text-8xl">The complete<br/><span className="text-gradient-gold">wellness menu.</span></h1>
      <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">Explore the full service catalogue, features and launch pricing. Fixed-price services can be paid online; request-only and future services open a booking enquiry.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link to="/wellness/makaveli/book" className="inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground">Book a service <ArrowRight className="h-4 w-4"/></Link><a href="https://wa.me/2349032712393" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest"><MessageCircle className="h-4 w-4"/>WhatsApp</a></div>
    </div></section>
    <section className="py-12"><div className="mx-auto max-w-7xl px-6"><div className="flex flex-wrap gap-2 border-b border-border/60 pb-6">{MAKAVELI_CATEGORIES.map(category => <a key={category} href={`#${category.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="rounded-full border border-border px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-gold hover:text-gold">{category}</a>)}</div>
      {MAKAVELI_CATEGORIES.map(category => { const services = MAKAVELI_SERVICES.filter(s => s.category === category); const id=category.toLowerCase().replace(/[^a-z0-9]+/g,"-"); return <section key={category} id={id} className="scroll-mt-24 py-12"><div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.25em] text-gold">Catalogue</p><h2 className="mt-2 font-display text-3xl md:text-5xl">{category}</h2></div><span className="text-xs text-muted-foreground">{services.length} options</span></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{services.map(service => <article key={service.slug} className="flex flex-col border border-border/60 bg-card/30 p-6 transition-colors hover:border-gold/50"><div className="flex items-start justify-between gap-4"><span className="text-[10px] uppercase tracking-widest text-muted-foreground">{service.status === "coming_soon" ? "Coming soon" : service.booking === "pay" ? "Book & pay" : "Request"}</span><span className="font-display text-xl text-gold">{service.priceMode === "fixed" && service.price ? formatNGN(service.price) : service.priceLabel ?? (service.priceMode === "referral" ? "Referral" : "Custom")}</span></div><h3 className="mt-4 font-display text-2xl leading-tight">{service.name}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{service.description}</p><ul className="mt-5 space-y-2">{service.features.slice(0,4).map(feature => <li key={feature} className="flex gap-2 text-xs text-muted-foreground"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"/>{feature}</li>)}</ul><div className="mt-6 border-t border-border/50 pt-4"><p className="text-[11px] text-muted-foreground">Best for: {service.suitableFor}</p>{service.duration && <p className="mt-1 text-[11px] text-muted-foreground">Typical duration: {service.duration} min</p>}</div><Link to="/wellness/makaveli/services/$slug" params={{slug:service.slug}} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">View service <ArrowRight className="h-4 w-4"/></Link></article>)}</div></section> })}
    </div></section>
  </main><SiteFooter/></div>;
}
