// Platform CTA layer — every button resolves its URL from the manifest.
import { PlatformRoutes } from "./routes";
import { withPlatformAttribution } from "./attribution";

export interface PlatformCta {
  key: string;
  label: string;
  href: string;
  external: boolean;
}

function cta(key: string, label: string, href: string, external = false): PlatformCta {
  return { key, label, href, external: external || /^https?:\/\//i.test(href) };
}

export const PlatformCtas = {
  startProgram: () => cta("start_program", "Start My Personalized Plan", PlatformRoutes.personalize),
  bookConsultation: () => cta("book_consultation", "Book a Consultation", PlatformRoutes.contact),
  browseEquipment: () => cta("browse_equipment", "Browse Equipment", PlatformRoutes.shopPage),
  visitShop: () => cta("visit_shop", "Visit Shop", PlatformRoutes.shop, true),
  openDashboard: () => cta("open_dashboard", "Open Dashboard", PlatformRoutes.dashboard, true),
  applyElite: () => cta("apply_elite", "Apply to Elite", PlatformRoutes.joinElite, true),
  exploreCatalog: () => cta("explore_catalog", "Explore Catalog", PlatformRoutes.catalog, true),
  startOnboarding: () => cta("start_onboarding", "Create My RSID", PlatformRoutes.joyFunnel, true),
} as const;

export type PlatformCtaKey = keyof typeof PlatformCtas;

export function getCta(key: PlatformCtaKey): PlatformCta {
  return PlatformCtas[key]();
}

/**
 * Resolve a CTA and, for cross-application links, append platform attribution
 * (rsid, utm_*, application) so journeys stay attributed across domains.
 */
export function resolveCtaHref(key: PlatformCtaKey): string {
  const c = getCta(key);
  return c.external ? withPlatformAttribution(c.href, { cta: c.key }) : c.href;
}
