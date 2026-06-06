import { Link } from "@tanstack/react-router";
import { CartDrawer } from "@/components/CartDrawer";
import { ShieldCheck, Sparkles } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="border-b border-border/40 bg-black/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-gold" />
            <span className="hidden sm:inline">Trusted Nigerian Wellness Brand</span>
            <span className="sm:hidden">Trusted NG Brand</span>
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-gold" />
            <span>Secure · Paystack</span>
          </span>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl tracking-wider">
            RESO<span className="text-gold">FIT</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Home
          </Link>
          <Link
            to="/shop"
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Shop
          </Link>
          <Link
            to="/personalize"
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Personalize
          </Link>
          <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
            Journal
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}
