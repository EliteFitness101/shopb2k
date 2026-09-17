import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle } from "lucide-react";
import { CTA } from "@/lib/ctas";
import { CookiePreferencesLink } from "@/components/CookieConsent";

const WHATSAPP_URL = "https://wa.me/message/IU7LWQR7PSSSH1";

const COLUMNS = [
  {
    heading: "Wellness",
    links: [
      { to: "/programs", label: "Programs" },
      { to: "/me", label: "ChatB2K™ Assessment" },
      { to: "/knowledge", label: "Knowledge Hub" },
      { to: "/success-stories", label: "Success Stories" },
    ],
  },
  {
    heading: "Ecosystem",
    links: [
      { to: "/shop", label: "Shop" },
      { to: "/community/play", label: "Community" },
      { to: "/auth", label: "Member Login" },
      { to: "/me", label: "ChatB2K™" },
      { href: "https://forge.resofit.fit", label: "ResoForge" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
      { to: "/privacy", label: "Privacy" },
      { to: "/terms", label: "Terms" },
      { to: "/cookies", label: "Cookies" },
      { to: "/compliance", label: "Compliance & Data Practices" },
    ],
  },
];

function WhatsAppCard() {
  return (
    <aside className="rounded-2xl border border-[#25D366]/30 bg-[#25D366]/[0.06] p-4 shadow-[0_0_30px_rgba(37,211,102,0.08)]" aria-label="Resonance Fitness WhatsApp contact">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-[#25D366]" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">Chat with Resonance Fitness</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Questions, personalized support, or ready to start? Message us directly on WhatsApp.</p>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-bold text-black transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Chat on WhatsApp
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
      <div className="mt-4 rounded-xl bg-white p-3">
        <img src="/whatsapp-resonance-fitness-qr.svg" alt="Scan to message Resonance Fitness on WhatsApp" className="mx-auto aspect-square w-full max-w-[180px]" loading="lazy" decoding="async" />
      </div>
      <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Scan to chat</p>
    </aside>
  );
}

export function SiteFooter() {
  return (
    <>
      <footer className="border-t border-border/60 bg-black/40">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="mb-12 rounded-2xl border border-[#25D366]/20 bg-gradient-to-r from-[#25D366]/10 via-background to-background p-5 md:p-7">
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex items-center gap-2 text-[#25D366]"><MessageCircle className="h-6 w-6" aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[0.22em]">Direct WhatsApp Support</p></div>
                <h2 className="mt-2 font-display text-2xl leading-tight md:text-3xl">Send Resonance Fitness a message on WhatsApp.</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Get personalized support, ask questions, or start your wellness journey directly with the team.</p>
              </div>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Chat on WhatsApp
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr_260px]">
            <div>
              <div className="font-display text-2xl tracking-wider">RESO<span className="text-gold">FIT</span></div>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">Africa's personalized wellness platform. Powered by ResoFlex™ and ChatB2K™.</p>
              <form className="mt-5 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="footer-email" className="sr-only">Email</label>
                <input id="footer-email" type="email" placeholder="you@example.com" autoComplete="email" className="h-10 flex-1 border border-border bg-background px-3 text-sm focus:border-gold focus:outline-none" />
                <button type="submit" className="h-10 border border-gold px-4 text-[11px] font-semibold uppercase tracking-widest text-gold hover:bg-gold hover:text-gold-foreground">Subscribe</button>
              </form>
            </div>
            {COLUMNS.map((c) => (
              <div key={c.heading}>
                <p className="text-xs uppercase tracking-[0.25em] text-gold">{c.heading}</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {c.links.map((l) => <li key={l.label}>{"href" in l ? <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold">{l.label}</a> : <Link to={l.to as never} className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold">{l.label}</Link>}</li>)}
                </ul>
              </div>
            ))}
            <WhatsAppCard />
          </div>

          <div className="mt-14 border-t border-border/60 pt-8">
            <div className="flex flex-col gap-4 text-xs uppercase tracking-widest text-muted-foreground md:flex-row md:items-center md:justify-between">
              <p>© {new Date().getFullYear()} ResoFit. Africa's Personalized Wellness Platform.</p>
              <div className="flex flex-wrap items-center gap-5"><CookiePreferencesLink /></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-widest text-muted-foreground/80">
              <span>Secure checkout · Paystack</span>
              <span>Analytics by consent</span>
              <span>Privacy controls available</span>
              <span>Member access protected</span>
            </div>
          </div>
          <p className="sr-only">Primary CTA: {CTA.primary}</p>
        </div>
      </footer>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat with Resonance Fitness on WhatsApp" className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-black shadow-[0_10px_35px_rgba(37,211,102,0.28)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] md:bottom-6 md:right-6">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Chat on WhatsApp</span>
        <span className="sm:hidden">WhatsApp</span>
      </a>
    </>
  );
}
