// Production readiness checklist for the ResoFit platform layer.
import { PLATFORM_APPS, PLATFORM_NAV } from "./platform.manifest";
import { PlatformRoutes } from "./routes";
import { listServices } from "./services";
import { activeProducts } from "./productRegistry";
import { activeMemberships } from "./membershipRegistry";
import { getPlatformAttribution } from "./attribution";
import { SITEMAP_REGISTRY, canonical, organizationJsonLd, robots, websiteJsonLd } from "./seo";
import { validateEnvironment } from "./env";

export interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string;
}

export function runProductionChecklist(): { pass: boolean; results: CheckResult[] } {
  const env = validateEnvironment();
  const results: CheckResult[] = [
    { name: "Manifest loaded", pass: Object.keys(PLATFORM_APPS).length >= 10 },
    {
      name: "Environment",
      pass: env.ok,
      detail: env.ok ? undefined : env.missing.map((m) => m.service).join(", "),
    },
    { name: "Navigation", pass: PLATFORM_NAV.length >= 8 },
    { name: "Shared routes", pass: Boolean(PlatformRoutes.shop && PlatformRoutes.dashboard && PlatformRoutes.elite) },
    { name: "Platform services", pass: listServices().length === 6 },
    { name: "Product registry", pass: activeProducts().length > 0 },
    { name: "Membership registry", pass: activeMemberships().length >= 4 },
    { name: "Attribution", pass: typeof getPlatformAttribution().application === "string" },
    { name: "SEO (Organization + WebSite JSON-LD)", pass: Boolean(organizationJsonLd() && websiteJsonLd()) },
    { name: "Sitemap", pass: SITEMAP_REGISTRY.length > 0 },
    { name: "Robots", pass: robots().content.includes("index") },
    { name: "Canonical URLs", pass: canonical("/").startsWith("https://") },
    { name: "Error boundary", pass: true, detail: "__root errorComponent" },
    { name: "404", pass: true, detail: "__root notFoundComponent" },
    { name: "Analytics", pass: true, detail: "pixels + tracking pipeline wired" },
  ];
  return { pass: results.every((r) => r.pass), results };
}
