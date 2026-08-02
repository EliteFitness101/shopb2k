// ============================================================================
// ResoFit Platform Manifest — SINGLE SOURCE OF TRUTH
// ----------------------------------------------------------------------------
// Domains, applications, navigation, and shared services all resolve from
// this file. Never hardcode a platform URL anywhere else in the codebase.
// ============================================================================

export type AppId =
  | "main"
  | "shop"
  | "catalog"
  | "dashboard"
  | "joyFunnel"
  | "elite"
  | "joinElite"
  | "eliteGlobal"
  | "candera"
  | "commander"
  | "academy";

export interface PlatformApplication {
  id: AppId;
  name: string;
  /** Live, production-reachable URL today. */
  url: string;
  /** Planned canonical URL once DNS cutover completes. */
  futureUrl?: string;
  roles: string[];
  status: "live" | "planned";
}

export const PLATFORM_DOMAIN = "resofit.fit";
export const PLATFORM_ORIGIN = "https://www.resofit.fit";

export const PLATFORM_APPS: Record<AppId, PlatformApplication> = {
  main: {
    id: "main",
    name: "ResoFit",
    url: "https://www.resofit.fit",
    roles: ["Marketing", "Corporate", "Landing Pages", "Equipment", "SEO"],
    status: "live",
  },
  shop: {
    id: "shop",
    name: "ResoFit Shop",
    url: "https://shop.resofit.fit",
    roles: ["Equipment commerce"],
    status: "live",
  },
  catalog: {
    id: "catalog",
    name: "ResoCatalog",
    url: "https://catalog.resofit.fit",
    roles: ["Master Product PIM", "Source of Truth"],
    status: "live",
  },
  dashboard: {
    id: "dashboard",
    name: "ResoFlex OS",
    url: "https://bellyfat.resofit.fit",
    roles: ["Member dashboard", "ResoFlex OS"],
    status: "live",
  },
  joyFunnel: {
    id: "joyFunnel",
    name: "Joy Funnel",
    url: "https://joy-funnel-ai.lovable.app",
    futureUrl: "https://app.resofit.fit",
    roles: ["Customer onboarding", "RSID creation", "Payments"],
    status: "live",
  },
  elite: {
    id: "elite",
    name: "ResoFit Elite",
    url: "https://elite.resofit.fit",
    roles: ["Elite recruitment"],
    status: "live",
  },
  joinElite: {
    id: "joinElite",
    name: "Join Elite",
    url: "https://joinelite.lovable.app",
    futureUrl: "https://join.resofit.fit",
    roles: ["Elite application"],
    status: "live",
  },
  eliteGlobal: {
    id: "eliteGlobal",
    name: "Elite Global",
    url: "https://elite-global.lovable.app",
    futureUrl: "https://global.resofit.fit",
    roles: ["Global Elite network"],
    status: "live",
  },
  candera: {
    id: "candera",
    name: "Candera",
    url: "https://candera.resofit.fit",
    roles: ["Creator economy"],
    status: "live",
  },
  commander: {
    id: "commander",
    name: "Commander",
    url: "https://commander.resofit.fit",
    roles: ["Internal operations"],
    status: "live",
  },
  academy: {
    id: "academy",
    name: "ResoFit Academy",
    url: "https://www.resofit.fit/knowledge",
    futureUrl: "https://academy.resofit.fit",
    roles: ["Education", "Placeholder"],
    status: "planned",
  },
};

/** Prefer the live URL; fall back to the planned canonical domain. */
export function appUrl(id: AppId): string {
  const app = PLATFORM_APPS[id];
  return app.url || app.futureUrl || PLATFORM_ORIGIN;
}

// ---------------------------------------------------------------------------
// Navigation model — consumed by desktop mega menu and mobile bottom sheet.
// ---------------------------------------------------------------------------

export interface NavLink {
  label: string;
  /** Internal route (starts with "/") or absolute platform URL. */
  href: string;
  external?: boolean;
  description?: string;
  badge?: string;
}

export interface NavSection {
  key: string;
  label: string;
  href?: string;
  links: NavLink[];
}

export const PLATFORM_NAV: NavSection[] = [
  {
    key: "home",
    label: "Home",
    href: "/",
    links: [
      { label: "Overview", href: "/", description: "Africa's personalized wellness platform" },
      { label: "About ResoFit", href: "/about", description: "Our mission and method" },
      { label: "Success Stories", href: "/success-stories", description: "Real member results" },
    ],
  },
  {
    key: "programs",
    label: "Programs",
    href: "/programs",
    links: [
      { label: "All Programs", href: "/programs", description: "Structured wellness tracks" },
      { label: "ChatB2K™ Assessment", href: "/personalize", description: "Get your personalized plan" },
      { label: "Journal", href: "/blog", description: "Wellness insights" },
    ],
  },
  {
    key: "equipment",
    label: "Equipment",
    href: "/shop",
    links: [
      { label: "Browse Equipment", href: "/shop", description: "Premium home gym hardware" },
      {
        label: "Full Storefront",
        href: appUrl("shop"),
        external: true,
        description: "Dedicated commerce experience",
      },
    ],
  },
  {
    key: "shop",
    label: "Shop",
    href: "/shop",
    links: [
      { label: "All Products", href: "/shop" },
      { label: "Shop Platform", href: appUrl("shop"), external: true },
    ],
  },
  {
    key: "dashboard",
    label: "Dashboard",
    href: appUrl("dashboard"),
    links: [
      {
        label: "ResoFlex OS",
        href: appUrl("dashboard"),
        external: true,
        description: "Track your journey and metrics",
      },
      {
        label: "Start Onboarding",
        href: appUrl("joyFunnel"),
        external: true,
        description: "Create your RSID",
      },
      { label: "Community Play", href: "/community/play", badge: "⭐" },
    ],
  },
  {
    key: "elite",
    label: "Elite",
    href: appUrl("elite"),
    links: [
      { label: "ResoFit Elite", href: appUrl("elite"), external: true, description: "Elite coaching tier" },
      { label: "Apply to Elite", href: appUrl("joinElite"), external: true, description: "Start your application" },
      { label: "Elite Global", href: appUrl("eliteGlobal"), external: true, description: "International network" },
    ],
  },
  {
    key: "catalog",
    label: "Catalog",
    href: appUrl("catalog"),
    links: [
      {
        label: "ResoCatalog",
        href: appUrl("catalog"),
        external: true,
        description: "Master product intelligence",
      },
      { label: "Creator Economy", href: appUrl("candera"), external: true, description: "Candera" },
    ],
  },
  {
    key: "academy",
    label: "Academy",
    href: "/knowledge",
    links: [
      { label: "Knowledge Hub", href: "/knowledge", description: "Guides and protocols" },
      { label: "Academy (coming soon)", href: appUrl("academy"), external: true, badge: "Soon" },
    ],
  },
  {
    key: "support",
    label: "Support",
    href: "/contact",
    links: [
      { label: "Contact", href: "/contact", description: "Talk to the team" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];
