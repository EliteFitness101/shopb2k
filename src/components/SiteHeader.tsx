import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import { CartDrawer } from "@/components/CartDrawer";
import { CTA } from "@/lib/ctas";

const NAV = [
  {
    label: "Wellness",
    items: [
      { label: "Programs", to: "/programs" },
      { label: "Assessment", to: "/me" },
      { label: "Knowledge Hub", to: "/knowledge" },
      { label: "Success Stories", to: "/success-stories" },
    ],
  },
  {
    label: "Shop",
    items: [
      { label: "ResoFit Shop", href: "https://shop.resofit.fit" },
      { label: "ResoFlex Store", href: "https://store.resofit.fit" },
      { label: "Catalog", href: "https://catalog.resofit.fit" },
    ],
  },
  {
    label: "ChatB2K™",
    items: [
      { label: "Assessment", to: "/me" },
      { label: "Ask an Expert", href: "https://wa.me/2348132255842" },
    ],
  },
  {
    label: "Community",
    items: [
      { label: "Play", to: "/community/play" },
      { label: "Learn", to: "/knowledge" },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Member Login", to: "/auth" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

function NavLink({ item }: { item: { label: string; to?: string; href?: string } }) {
  const className =
    "flex items-center justify-between rounded-sm px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-gold/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold";
  if (item.href)
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {item.label}
        <ChevronRight className="h-3.5 w-3.5" />
      </a>
    );
  return (
    <Link to={item.to as never} className={className}>
      {item.label}
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function DesktopMenu({ group }: { group: (typeof NAV)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold"
      >
        {group.label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`absolute left-0 top-full pt-4 transition-all duration-200 ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}
      >
        <div className="w-72 rounded-md border border-gold/20 bg-black/95 p-2 shadow-2xl backdrop-blur-xl">
          <div className="px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-gold">
            {group.label}
          </div>
          {group.items.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="border-b border-border/40 bg-black/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:px-6">
          <span className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-gold" aria-hidden />
            <span className="hidden sm:inline">Africa's Personalized Wellness Platform</span>
            <span className="sm:hidden">Personalized Wellness</span>
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-gold" aria-hidden />
            Secure · Paystack
          </span>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-gold"
        >
          <span className="font-display text-2xl tracking-wider">
            RESO<span className="text-gold">FIT</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV.map((group) => (
            <DesktopMenu key={group.label} group={group} />
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/me"
            className="hidden h-10 items-center rounded-sm bg-gold px-4 text-[11px] font-semibold uppercase tracking-widest text-gold-foreground transition-transform hover:-translate-y-0.5 md:inline-flex focus-visible:outline-2 focus-visible:outline-gold"
          >
            {CTA.primary}
          </Link>
          <CartDrawer />
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-border lg:hidden focus-visible:outline-2 focus-visible:outline-gold"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-border/60 bg-black/95 px-4 py-4 lg:hidden">
          <div className="grid gap-2">
            {NAV.map((group) => (
              <details key={group.label} className="group rounded-md border border-border/50">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground">
                  {group.label}
                  <ChevronDown className="float-right mt-0.5 h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-border/50 p-2">
                  {group.items.map((item) => (
                    <NavLink key={item.label} item={item} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
