import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Menu, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { CartDrawer } from "@/components/CartDrawer";
import { ChatB2KSmartAssistant } from "@/components/ChatB2KSmartAssistant";
import { CTA } from "@/lib/ctas";

const NAV = [
  { label: "Coach Buchi", items: [
    { label: "Coach Buchi HQ", purpose: "LordB2K · Founder vision and philosophy", to: "/coach-buchi" },
    { label: "The State", purpose: "Body, mind, food, movement and purpose", to: "/coach-buchi" },
    { label: "AI-SI Academy", purpose: "Human capability and intelligent systems", to: "/coach-buchi" },
    { label: "Community XP", purpose: "Learning, participation and stewardship", to: "/coach-buchi" },
    { label: "Resilience Lab", purpose: "Bunker, jungle, city and luxury readiness", to: "/coach-buchi" },\n    { label: "Opportunity Centre", purpose: "Train, work, create, earn, partner and lead", to: "/network" },
  ] },
  { label: "Wellness", items: [
    { label: "Wellness Network", purpose: "Discover wellness options", to: "/wellness" },
    { label: "Find a Wellness Hub", purpose: "Explore nearby hubs", to: "/wellness/states/cities/hubs/geo-locator" },
    { label: "Programs", purpose: "Choose a structured goal", to: "/programs" },
    { label: "Assessment", purpose: "Get your personalized next step", to: "/me" },
    { label: "Knowledge Hub", purpose: "Learn before you decide", to: "/knowledge" },
    { label: "Success Stories", purpose: "See real journeys", to: "/stories" },
  ] },
  { label: "Shop", items: [
    { label: "ResoFit Shop", purpose: "Shop personalized products", to: "/shop" },
    { label: "Marketplace", purpose: "Open the wider marketplace", href: "https://shop.resofit.fit" },
  ] },
  { label: "ChatB2K™", items: [
    { label: "Assessment", purpose: "Start with your goal", to: "/me" },
    { label: "Ask an Expert", purpose: "Continue with WhatsApp", href: "https://wa.me/2348132255842" },
  ] },
  { label: "Community", items: [
    { label: "Play", purpose: "Move, compete and engage", to: "/community/play" },
    { label: "Learn", purpose: "Explore practical knowledge", to: "/knowledge" },
  ] },
  { label: "Company", items: [
    { label: "About", purpose: "Learn about ResoFit", to: "/about" },
    { label: "Contact", purpose: "Reach the team", to: "/contact" },
    { label: "Member Login", purpose: "Access your account", to: "/auth" },
    { label: "Privacy", purpose: "Read privacy information", to: "/privacy" },
    { label: "Terms", purpose: "Read service terms", to: "/terms" },
  ] },
];

type NavItem = { label: string; purpose: string; to?: string; href?: string };

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const className = "flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-gold/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold";
  const content = <><span><span className="block text-foreground">{item.label}</span><span className="block text-[11px] text-muted-foreground">{item.purpose}</span></span><ChevronRight className="h-3.5 w-3.5 flex-none" /></>;
  if (item.href) return <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>{content}</a>;
  return <Link to={item.to as never} onClick={onNavigate} className={className}>{content}</Link>;
}

function DesktopMenu({ group }: { group: (typeof NAV)[number] }) {
  const [open, setOpen] = useState(false);
  return <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" aria-expanded={open} onFocus={() => setOpen(true)} onClick={() => setOpen(v => !v)} className="flex items-center gap-1 rounded-md px-1 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold">
      {group.label}<ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
    </button>
    <div className={`absolute left-0 top-full pt-2 transition-all duration-150 motion-reduce:transition-none ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"}`}>
      <div className="w-80 rounded-2xl border border-gold/20 bg-black/95 p-2 shadow-2xl backdrop-blur-xl">
        <div className="px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-gold">{group.label}</div>
        {group.items.map(item => <NavLink key={item.label} item={item} />)}
      </div>
    </div>
  </div>;
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = q.trim();
    if (!value) return;
    window.location.href = `/wellness/states/cities/hubs/geo-locator?q=${encodeURIComponent(value)}`;
  };
  return <form onSubmit={submit} className="hidden min-w-0 flex-1 max-w-sm lg:flex" role="search">
    <div className="flex w-full items-center rounded-xl border border-border/70 bg-background/60 px-3 focus-within:border-gold">
      <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search ResoFit" placeholder="Search ResoFit, products, wellness…" className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none" />
      <button type="submit" aria-label="Search" disabled={!q.trim()} className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold disabled:opacity-40">Search</button>
    </div>
  </form>;
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <>
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="border-b border-border/40 bg-black/70"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:px-6">
        <span className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-gold" aria-hidden /><span className="hidden sm:inline">Africa's Personalized Wellness Platform</span><span className="sm:hidden">Personalized Wellness</span></span>
        <span className="flex items-center gap-2"><ShieldCheck className="h-3 w-3 text-gold" aria-hidden />Secure · Paystack</span>
      </div></div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"><GlobalSearch />
        <Link to="/" className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-gold"><span className="font-display text-2xl tracking-wider">RESO<span className="text-gold">FIT</span></span></Link>
        <nav aria-label="Primary" className="hidden items-center gap-4 xl:gap-6 lg:flex">{NAV.map(group => <DesktopMenu key={group.label} group={group} />)}</nav>
        <div className="flex items-center gap-2"><Link to="/me" className="hidden h-10 items-center rounded-xl bg-gold px-4 text-[11px] font-semibold uppercase tracking-widest text-gold-foreground transition-transform hover:-translate-y-0.5 md:inline-flex focus-visible:outline-2 focus-visible:outline-gold motion-reduce:transition-none">{CTA.primary}</Link><CartDrawer /><button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/60 lg:hidden focus-visible:outline-2 focus-visible:outline-gold">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
      </div>
      {mobileOpen && <div className="border-t border-border/60 bg-black/95 px-4 py-4 shadow-2xl lg:hidden"><div className="mx-auto max-w-2xl grid gap-2">{NAV.map(group => <details key={group.label} className="group rounded-2xl border border-border/50 bg-background/20"><summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-gold">{group.label}<ChevronDown className="float-right mt-0.5 h-4 w-4 transition-transform motion-reduce:transition-none group-open:rotate-180" /></summary><div className="border-t border-border/50 p-2">{group.items.map(item => <NavLink key={item.label} item={item} onNavigate={() => setMobileOpen(false)} />)}</div></details>)}</div></div>}
    </header>
    <ChatB2KSmartAssistant />
  </>;
}
