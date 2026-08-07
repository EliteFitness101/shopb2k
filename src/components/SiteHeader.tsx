import { Link } from "@tanstack/react-router";
import { CartDrawer } from "@/components/CartDrawer";
import { ShieldCheck, Sparkles } from "lucide-react";
import { CTA } from "@/lib/ctas";

const NAV: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/", label: "Home", exact: true },
  { to: "/programs", label: "Programs" },
  { to: "/personalize", label: "Assessment" },
  { to: "/shop", label: "Shop" },
  { to: "/blog", label: "Blog" },
  { to: "/community/play", label: "Play ⭐" },
  { to: "/success-stories", label: "Success Stories" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="border-b border-border/40 bg-black/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-gold" aria-hidden />
            <span className="hidden sm:inline">Africa's Personalized Wellness Platform</span>
            <span className="sm:hidden">Personalized Wellness</span>
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-gold" aria-hidden />
            <span>Secure · Paystack</span>
          </span>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <Link to="/" className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-gold">
          <span className="font-display text-2xl tracking-wider">
            RESO<span className="text-gold">FIT</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 text-[13px] lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to as any}
              activeOptions={n.exact ? { exact: true } : undefined}
              className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/personalize"
            className="hidden h-10 items-center rounded-sm bg-gold px-4 text-[11px] font-semibold uppercase tracking-widest text-gold-foreground transition-transform hover:-translate-y-0.5 md:inline-flex focus-visible:outline-2 focus-visible:outline-gold"
          >
            {CTA.primary}
          </Link>
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}
