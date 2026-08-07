// ============================================================================
// ResoFit — canonical site configuration (single source of truth for URLs).
// ----------------------------------------------------------------------------
// Every production URL, canonical tag, OpenGraph tag, sitemap entry and
// JSON-LD node must derive from SITE_URL. Never hardcode a deployment or
// preview domain anywhere in the codebase.
// ============================================================================
import { PLATFORM_ORIGIN, appUrl } from "@/platform/platform.manifest";

export const SITE_URL = PLATFORM_ORIGIN;
export const SITE_NAME = "ResoFit";
export const COMPANY_NAME = "ResoFit Wellness";
export const SHOP_URL = appUrl("shop");
export const SUPPORT_EMAIL = "support@resofit.fit";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

/** Absolute production URL for any internal path. */
export function siteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Optional runtime surfaces (agent/MCP layer) are feature-flagged so the
 * storefront, checkout, auth and SEO paths never depend on them. Intended
 * long-term home: agents.resofit.fit as an independent service.
 */
export const AGENT_RUNTIME_ENABLED =
  (import.meta.env['VITE_ENABLE_AGENT_RUNTIME'] ?? "true") !== "false";
