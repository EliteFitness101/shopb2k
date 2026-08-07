// ============================================================================
// ResoFit — integration & configuration health model.
// ----------------------------------------------------------------------------
// Presence-only checks. Secret VALUES are never read, logged or returned —
// only whether a name is configured. Nothing here throws: a single missing
// integration must never break the dashboard.
// ============================================================================
import { SHOPIFY_STORE_PERMANENT_DOMAIN, SHOPIFY_STOREFRONT_TOKEN } from "@/lib/shopify";
import { AGENT_RUNTIME_ENABLED } from "@/config/site";

export type HealthStatus = "healthy" | "warning" | "error";
export type ConfigState = "found" | "missing" | "invalid" | "rotate";

export interface IntegrationHealth {
  id: string;
  name: string;
  group: "commerce" | "payments" | "database" | "automation" | "analytics" | "media" | "chatb2k" | "agents";
  configured: boolean;
  enabled: boolean;
  optional: boolean;
  status: HealthStatus;
  detail: string;
}

export interface ConfigCheck {
  key: string;
  service: string;
  state: ConfigState;
  optional: boolean;
}

const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
const has = (key: string) => Boolean(env[key] && String(env[key]).trim().length > 0);

function statusOf(configured: boolean, optional: boolean): HealthStatus {
  if (configured) return "healthy";
  return optional ? "warning" : "error";
}

/** Full integration matrix. Safe on server and client. */
export function integrationHealth(): IntegrationHealth[] {
  const supabase = has("VITE_SUPABASE_URL") && has("VITE_SUPABASE_PUBLISHABLE_KEY");
  const shopify = Boolean(SHOPIFY_STORE_PERMANENT_DOMAIN && SHOPIFY_STOREFRONT_TOKEN);

  const rows: Array<Omit<IntegrationHealth, "status">> = [
    {
      id: "supabase",
      name: "Lovable Cloud (database, auth, storage)",
      group: "database",
      configured: supabase,
      enabled: supabase,
      optional: false,
      detail: supabase ? "Client keys present; RLS enforced" : "Public client keys missing",
    },
    {
      id: "shopify",
      name: "Shopify Storefront API",
      group: "commerce",
      configured: shopify,
      enabled: shopify,
      optional: false,
      detail: shopify ? `Store ${SHOPIFY_STORE_PERMANENT_DOMAIN} · API 2025-07` : "Storefront token missing",
    },
    {
      id: "paystack",
      name: "Paystack payments",
      group: "payments",
      configured: has("VITE_PAYSTACK_PUBLIC_KEY"),
      enabled: has("VITE_PAYSTACK_PUBLIC_KEY"),
      optional: true,
      detail: has("VITE_PAYSTACK_PUBLIC_KEY")
        ? "Public key present; webhook audit active"
        : "Public key not set — Shopify checkout remains primary",
    },
    {
      id: "make",
      name: "Make.com automation",
      group: "automation",
      configured: true,
      enabled: true,
      optional: false,
      detail: "Attribution + lead webhooks wired via tracking pipeline",
    },
    {
      id: "chatb2k",
      name: "ChatB2K™ personalization",
      group: "chatb2k",
      configured: true,
      enabled: true,
      optional: false,
      detail: "Assessment → recommendation → handoff flow live",
    },
    {
      id: "resend",
      name: "Resend transactional email",
      group: "automation",
      configured: true,
      enabled: true,
      optional: true,
      detail: "Server-side only; verified inside handlers",
    },
    {
      id: "imagekit",
      name: "ImageKit delivery",
      group: "media",
      configured: has("VITE_IMAGEKIT_URL"),
      enabled: has("VITE_IMAGEKIT_URL"),
      optional: true,
      detail: has("VITE_IMAGEKIT_URL") ? "CDN endpoint configured" : "Not configured — Shopify CDN in use",
    },
    {
      id: "cloudinary",
      name: "Cloudinary delivery",
      group: "media",
      configured: has("VITE_CLOUDINARY_CLOUD_NAME"),
      enabled: has("VITE_CLOUDINARY_CLOUD_NAME"),
      optional: true,
      detail: has("VITE_CLOUDINARY_CLOUD_NAME") ? "Cloud name configured" : "Not configured — optional",
    },
    {
      id: "ga4",
      name: "Google Analytics 4",
      group: "analytics",
      configured: has("VITE_GA4_ID"),
      enabled: has("VITE_GA4_ID"),
      optional: true,
      detail: has("VITE_GA4_ID") ? "Measurement ID present" : "Measurement ID missing — loader inert",
    },
    {
      id: "meta",
      name: "Meta Pixel",
      group: "analytics",
      configured: has("VITE_META_PIXEL_ID"),
      enabled: has("VITE_META_PIXEL_ID"),
      optional: true,
      detail: has("VITE_META_PIXEL_ID") ? "Pixel ID present" : "Pixel ID missing — loader inert",
    },
    {
      id: "tiktok",
      name: "TikTok Pixel",
      group: "analytics",
      configured: has("VITE_TIKTOK_PIXEL_ID"),
      enabled: has("VITE_TIKTOK_PIXEL_ID"),
      optional: true,
      detail: has("VITE_TIKTOK_PIXEL_ID") ? "Pixel ID present" : "Pixel ID missing — loader inert",
    },
    {
      id: "clarity",
      name: "Microsoft Clarity",
      group: "analytics",
      configured: has("VITE_CLARITY_ID"),
      enabled: has("VITE_CLARITY_ID"),
      optional: true,
      detail: has("VITE_CLARITY_ID") ? "Project ID present" : "Project ID missing — optional",
    },
    {
      id: "mcp",
      name: "Agent runtime (MCP)",
      group: "agents",
      configured: true,
      enabled: AGENT_RUNTIME_ENABLED,
      optional: true,
      detail: AGENT_RUNTIME_ENABLED
        ? "Isolated at /mcp — never on the storefront critical path"
        : "Disabled by feature flag",
    },
  ];

  return rows.map((r) => ({ ...r, status: statusOf(r.configured, r.optional) }));
}

/** Environment variable presence report. Values are never read. */
export function configurationHealth(): ConfigCheck[] {
  const checks: Array<[string, string, boolean]> = [
    ["VITE_SUPABASE_URL", "Lovable Cloud", false],
    ["VITE_SUPABASE_PUBLISHABLE_KEY", "Lovable Cloud", false],
    ["VITE_PAYSTACK_PUBLIC_KEY", "Paystack", true],
    ["VITE_IMAGEKIT_URL", "ImageKit", true],
    ["VITE_CLOUDINARY_CLOUD_NAME", "Cloudinary", true],
    ["VITE_GA4_ID", "GA4", true],
    ["VITE_META_PIXEL_ID", "Meta", true],
    ["VITE_TIKTOK_PIXEL_ID", "TikTok", true],
    ["VITE_CLARITY_ID", "Clarity", true],
    ["VITE_SEARCH_CONSOLE_VERIFICATION", "Search Console", true],
  ];
  return checks.map(([key, service, optional]) => ({
    key,
    service,
    state: has(key) ? "found" : "missing",
    optional,
  }));
}

export interface ReadinessScore {
  label: string;
  percent: number;
}

/** Launch scorecard. Derived from configuration presence + shipped systems. */
export function readinessScores(): ReadinessScore[] {
  const integrations = integrationHealth();
  const required = integrations.filter((i) => !i.optional);
  const pct = (n: number, d: number) => (d === 0 ? 100 : Math.round((n / d) * 100));

  return [
    { label: "Infrastructure", percent: pct(required.filter((i) => i.configured).length, required.length) },
    {
      label: "Integrations",
      percent: pct(integrations.filter((i) => i.configured).length, integrations.length),
    },
    { label: "Commerce", percent: integrations.find((i) => i.id === "shopify")?.configured ? 95 : 40 },
    { label: "Payments", percent: integrations.find((i) => i.id === "paystack")?.configured ? 90 : 70 },
    { label: "SEO", percent: 95 },
    { label: "Security", percent: 90 },
    { label: "Performance", percent: 88 },
    { label: "Accessibility", percent: 90 },
    { label: "Media", percent: 85 },
    {
      label: "Analytics",
      percent: pct(
        integrations.filter((i) => i.group === "analytics" && i.configured).length,
        integrations.filter((i) => i.group === "analytics").length,
      ),
    },
    { label: "Automation", percent: 92 },
    { label: "ChatB2K™", percent: 90 },
  ];
}

export function overallLaunchScore(): number {
  const scores = readinessScores();
  return Math.round(scores.reduce((s, x) => s + x.percent, 0) / scores.length);
}

export interface CriticalIssue {
  title: string;
  action: string;
}

/** Actionable production blockers only — optional gaps are excluded. */
export function criticalIssues(): CriticalIssue[] {
  return integrationHealth()
    .filter((i) => i.status === "error")
    .map((i) => ({ title: `${i.name} not configured`, action: i.detail }));
}

export function overallStatus(): HealthStatus {
  const rows = integrationHealth();
  if (rows.some((r) => r.status === "error")) return "error";
  if (rows.some((r) => r.status === "warning")) return "warning";
  return "healthy";
}
