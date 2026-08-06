// Centralized platform routing. Replaces hardcoded URLs across the app.
import { appUrl, PLATFORM_ORIGIN } from "./platform.manifest";

/** Internal routes served by this application (www.resofit.fit). */
export const InternalRoutes = {
  home: "/",
  programs: "/programs",
  personalize: "/personalize",
  assessment: "/personalize",
  shop: "/shop",
  blog: "/blog",
  knowledge: "/knowledge",
  successStories: "/success-stories",
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
  refundPolicy: "/refund-policy",
  shippingPolicy: "/shipping-policy",
  accessibility: "/accessibility",
  play: "/community/play",
  admin: "/admin",
} as const;

/** Cross-application platform routes, resolved from the manifest. */
export const PlatformRoutes = {
  ...InternalRoutes,
  main: appUrl("main"),
  /** Dedicated commerce app (shop.resofit.fit). Internal grid stays at `shopPage`. */
  shop: appUrl("shop"),
  shopPage: InternalRoutes.shop,
  catalog: appUrl("catalog"),
  dashboard: appUrl("dashboard"),
  joyFunnel: appUrl("joyFunnel"),
  elite: appUrl("elite"),
  joinElite: appUrl("joinElite"),
  eliteGlobal: appUrl("eliteGlobal"),
  candera: appUrl("candera"),
  commander: appUrl("commander"),
  academy: appUrl("academy"),
} as const;

export type PlatformRouteKey = keyof typeof PlatformRoutes;

export function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** Absolute URL for any internal path (canonical/SEO use). */
export function absoluteUrl(path: string): string {
  if (isExternal(path)) return path;
  return `${PLATFORM_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
