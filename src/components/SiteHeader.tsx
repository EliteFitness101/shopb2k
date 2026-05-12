import { Link } from "@tanstack/react-router";
import { CartDrawer } from "@/components/CartDrawer";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
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
          <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
            Journal
          </a>
          <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}
