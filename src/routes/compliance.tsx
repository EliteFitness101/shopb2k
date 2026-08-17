import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/compliance")({ component: CompliancePage });

function CompliancePage() {
  const controls = [
    ["Privacy & consent", "Privacy, Terms and Cookies are exposed from the footer, with a persistent mechanism for resetting non-essential analytics consent."],
    ["Security boundaries", "Authentication, payment-provider boundaries and server-side access controls remain separate from customer-facing navigation and presentation."],
    ["Payment handling", "Checkout is handed to the configured payment provider rather than collecting payment credentials directly in the ResoFit frontend."],
    ["Member onboarding", "Assessment, member authentication and future ecosystem services are routed through explicit entry points so onboarding can evolve without replacing the commerce storefront."],
    ["Measurement governance", "Analytics and advertising pixels are loaded only after analytics consent in this frontend. Essential operational storage remains available where needed to provide requested functionality."],
    ["Operational separation", "shop.resofit.fit and store.resofit.fit remain distinct destinations; this navigation change does not merge, redirect or rebind those storefronts."],
  ];
  return <><SiteHeader /><main className="mx-auto max-w-5xl px-6 py-16"><p className="text-xs uppercase tracking-[0.3em] text-gold">Enterprise foundation</p><h1 className="mt-3 font-display text-4xl">Compliance & Data Practices</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">A transparent operational view of the controls represented by this frontend. This page is not a certification or a substitute for jurisdiction-specific legal, security or privacy review.</p><div className="mt-10 grid gap-4 md:grid-cols-2">{controls.map(([title, body]) => <section key={title} className="rounded-lg border border-border/60 bg-card/30 p-6"><h2 className="text-lg font-semibold text-foreground">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></section>)}</div><section className="mt-8 rounded-lg border border-gold/30 bg-gold/5 p-6"><h2 className="text-lg font-semibold text-foreground">Governance boundary</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Production compliance requires validation of the live Vercel environment, Supabase policies, payment webhooks, DNS, vendor agreements, access controls, data retention, incident response, backups and jurisdiction-specific obligations. The frontend should not be represented as fully enterprise-compliant until those controls have been independently verified.</p></section></main><SiteFooter /></>;
}
