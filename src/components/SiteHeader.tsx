import { Link } from "@tanstack/react-router";
import { CartDrawer } from "@/components/CartDrawer";
import { PlatformMegaMenu, PlatformMobileNav } from "@/components/PlatformNav";
import { ShieldCheck, Sparkles } from "lucide-react";
import { CTA } from "@/lib/ctas";
import { PlatformRoutes } from "@/platform/routes";


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
        <PlatformMegaMenu />
        <div className="flex items-center gap-3">
          <Link
            to={PlatformRoutes.personalize as any}
            className="hidden h-10 items-center rounded-sm bg-gold px-4 text-[11px] font-semibold uppercase tracking-widest text-gold-foreground transition-transform hover:-translate-y-0.5 md:inline-flex focus-visible:outline-2 focus-visible:outline-gold"
          >
            {CTA.primary}
          </Link>
          <CartDrawer />
          <PlatformMobileNav />
        </div>

      </div>
    </header>
  );
}
