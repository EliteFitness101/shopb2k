import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Search, ShieldCheck, Sparkles } from "lucide-react";
import { CartDrawer } from "@/components/CartDrawer";
import { ChatB2KSmartAssistant } from "@/components/ChatB2KSmartAssistant";
import { CTA } from "@/lib/ctas";
import { track } from "@/lib/tracking";

type NavItem = { label: string; purpose: string; to?: string; href?: string; params?: Record<string, string> };
type NavGroup = { label: string; items: NavItem[] };

const REVENUE_NAV: NavGroup = {
  label: "Start",
  items: [
    { label: "Personalized Assessment", purpose: "60 seconds to your matched next step", to: "/me" },
    { label: "Wellness Programs", purpose: "Structured strength, longevity, mobility and nutrition", to: "/programs" },
    { label: "Premium Equipment", purpose: "ResoFlex™ hardware and home training", to: "/shop" },
    { label: "ResoLuxe Privé", purpose: "Members-only concierge wellness", to: "/programs/$slug", params: { slug: "resoluxe" } },
    { label: "Elite Coaching", purpose: "1:1 CoachB2K™ support", href: "https://wa.me/2348132255842?text=I%27d%20like%20to%20upgrade%20to%20Elite%20Coaching." },
  ],
};

const EXPLORE_NAV: NavGroup = {
  label: "Explore",
  items: [
    { label: "Wellness", purpose: "Find wellness services and hubs", to: "/wellness" },
    { label: "Knowledge Hub", purpose: "Learn before you decide", to: "/knowledge" },
    { label: "Success Stories", purpose: "See verified journeys and outcomes", to: "/success-stories" },
    { label: "Community", purpose: "Move, compete and engage", to: "/community/play" },
    { label: "Journal", purpose: "Read practical wellness field notes", to: "/blog" },
  ],
};

const MORE_NAV: NavGroup = {
  label: "More",
  items: [
    { label: "Coach Buchi", purpose: "Founder story, philosophy and archive", to: "/coach-buchi" },
    { label: "Founder Legal & Governance", purpose: "Evidence-first case intelligence", to: "/legal" },
    { label: "About", purpose: "Why ResoFit exists", to: "/about" },
    { label: "Contact", purpose: "Reach the team", to: "/contact" },
    { label: "Member Login", purpose: "Access your account", to: "/auth" },
    { label: "Privacy", purpose: "Privacy information", to: "/privacy" },
    { label: "Terms", purpose: "Service terms", to: "/terms" },
  ],
};

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const className = "flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-gold/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold";
  const content = <><span><span className="block text-foreground">{item.label}</span><span className="block text-[11px] text-muted-foreground">{item.purpose}</span></span><ChevronRight className="h-3.5 w-3.5 flex-none" /></>;
  if (item.href) return <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>{content}</a>;
  return <Link to={item.to as never} params={item.params as never} onClick={onNavigate} className={className}>{content}</Link>;
}

function DesktopMenu({ group }: { group: NavGroup }) {
  return <details className="group relative">
    <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-1 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold">
      {group.label}<ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
    </summary>
    <div className="pointer-events-none invisible absolute left-0 top-full z-[70] pt-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100 group-open:pointer-events-auto group-open:visible group-open:opacity-100">
      <div className="w-[22rem] rounded-2xl border border-gold/20 bg-black/95 p-2 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-2xl">
        <div className="px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-gold">{group.label}</div>
        {group.items.map(item => <NavLink key={item.label} item={item} />)}
      </div>
    </div>
  </details>;
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = q.trim();
    if (!value) return;
    track("search", { query: value });
    void navigate({ to: "/shop", search: { q: value } });
  };
  return <form onSubmit={submit} className="flex min-w-0 flex-1 max-w-md" role="search">
    <div className="flex w-full items-center rounded-xl border border-border/70 bg-background/60 px-3 focus-within:border-gold">
      <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search ResoFit" placeholder="Search ResoFit, products, wellness…" className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none" />
      <button type="submit" aria-label="Search" disabled={!q.trim()} className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold disabled:opacity-40">Search</button>
    </div>
  </form>;
}

function MobileGroup({ group, onNavigate }: { group: NavGroup; onNavigate: () => void }) {
  return <details className="group/menu rounded-2xl border border-border/50 bg-background/20">
    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground">{group.label}<ChevronDown className="float-right mt-0.5 h-4 w-4 transition-transform motion-reduce:transition-none group-open/menu:rotate-180" /></summary>
    <div className="border-t border-border/50 p-2">{group.items.map(item => <NavLink key={item.label} item={item} onNavigate={onNavigate} />)}</div>
  </details>;
}

export function SiteHeader() {
  const groups = [REVENUE_NAV, EXPLORE_NAV, MORE_NAV];
  return <>
    <header className="sticky top-0 z-[60] border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="border-b border-border/40 bg-black/70"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:px-6">
        <span className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-gold" aria-hidden /><span className="hidden sm:inline">Africa's Personalized Wellness Platform</span><span className="sm:hidden">Personalized Wellness</span></span>
        <span className="flex items-center gap-2"><ShieldCheck className="h-3 w-3 text-gold" aria-hidden />Secure · Paystack</span>
      </div></div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="order-2 flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-gold lg:order-1"><span className="font-display text-2xl tracking-wider">RESO<span className="text-gold">FIT</span></span></Link>
        <GlobalSearch />
        <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex">
          <DesktopMenu group={REVENUE_NAV} />
          <Link to="/programs" className="text-[13px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold">Programs</Link>
          <Link to="/shop" className="text-[13px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold">Shop</Link>
          <Link to="/programs/$slug" params={{ slug: "resoluxe" }} className="text-[13px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold">Membership</Link>
          <DesktopMenu group={EXPLORE_NAV} />
          <DesktopMenu group={MORE_NAV} />
        </nav>
        <div className="order-1 flex items-center gap-2 lg:order-3">
          <Link to="/me" className="hidden h-10 items-center rounded-xl bg-gold px-4 text-[11px] font-semibold uppercase tracking-widest text-gold-foreground transition-transform hover:-translate-y-0.5 md:inline-flex focus-visible:outline-2 focus-visible:outline-gold motion-reduce:transition-none">{CTA.primary}</Link>
          <CartDrawer />
          <details className="group relative lg:hidden">
            <summary aria-label="Open menu" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-border bg-background/60 focus-visible:outline-2 focus-visible:outline-gold"><span className="text-lg leading-none group-open:hidden" aria-hidden>☰</span><span className="hidden text-lg leading-none group-open:inline" aria-hidden>×</span></summary>
            <div className="absolute right-0 top-full z-[70] mt-2 w-[min(92vw,28rem)] rounded-2xl border border-border/60 bg-black/95 p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 rounded-2xl border border-gold/20 bg-gold/5 p-3">
                <Link to="/me" className="flex min-h-11 items-center justify-center rounded-xl bg-gold px-4 text-xs font-semibold uppercase tracking-widest text-gold-foreground">Start My Personalized Plan</Link>
              </div>
              <div className="grid gap-2">
                {groups.map(group => <MobileGroup key={group.label} group={group} onNavigate={() => {}} />)}
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
    <ChatB2KSmartAssistant />
  </>;
}
