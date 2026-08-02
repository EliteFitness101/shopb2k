// Platform SEO helpers. Additive only — existing route metadata is unchanged.
import { PLATFORM_ORIGIN } from "./platform.manifest";
import { absoluteUrl, InternalRoutes } from "./routes";

export function canonical(path: string): string {
  return absoluteUrl(path);
}

export function robots(index = true, follow = true): { name: string; content: string } {
  return { name: "robots", content: `${index ? "index" : "noindex"},${follow ? "follow" : "nofollow"}` };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ResoFit",
    url: PLATFORM_ORIGIN,
    description: "Africa's personalized wellness platform, powered by ResoFlex™ and ChatB2K™.",
    sameAs: [
      "https://instagram.com",
      "https://x.com",
      "https://youtube.com",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ResoFit",
    url: PLATFORM_ORIGIN,
    potentialAction: {
      "@type": "SearchAction",
      target: `${PLATFORM_ORIGIN}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/** Sitemap registration interface — consumed by src/routes/sitemap[.]xml.ts. */
export interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const SITEMAP_REGISTRY: SitemapEntry[] = [
  { path: InternalRoutes.home, changefreq: "weekly", priority: "1.0" },
  { path: InternalRoutes.programs, changefreq: "weekly", priority: "0.9" },
  { path: InternalRoutes.personalize, changefreq: "monthly", priority: "0.9" },
  { path: InternalRoutes.shop, changefreq: "daily", priority: "0.9" },
  { path: InternalRoutes.blog, changefreq: "weekly", priority: "0.7" },
  { path: InternalRoutes.knowledge, changefreq: "weekly", priority: "0.7" },
  { path: InternalRoutes.successStories, changefreq: "monthly", priority: "0.6" },
  { path: InternalRoutes.about, changefreq: "monthly", priority: "0.5" },
  { path: InternalRoutes.contact, changefreq: "monthly", priority: "0.5" },
];

export function registerSitemapEntries(entries: SitemapEntry[]): SitemapEntry[] {
  for (const e of entries) {
    if (!SITEMAP_REGISTRY.some((x) => x.path === e.path)) SITEMAP_REGISTRY.push(e);
  }
  return SITEMAP_REGISTRY;
}
