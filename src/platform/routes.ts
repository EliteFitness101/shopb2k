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
  play: "/community/play",
  admin: "/admin",
} as const;

/** Cross-application platform routes, resolved from the manifest. */
export const PlatformRoutes = {
  main: appUrl("main"),
  shop: appUrl("shop"),
  catalog: appUrl("catalog"),
  dashboard: appUrl("dashboard"),
  joyFunnel: appUrl("joyFunnel"),
  elite: appUrl("elite"),
  joinElite: appUrl("joinElite"),
  eliteGlobal: appUrl("eliteGlobal"),
  candera: appUrl("candera"),
  commander: appUrl("commander"),
  academy: appUrl("academy"),
  ...InternalRoutes,
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
