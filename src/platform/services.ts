// Shared platform services registry. Registration only — no behavior change.
export type ServiceId = "supabase" | "paystack" | "resend" | "storage" | "analytics" | "attribution";

export interface PlatformService {
  id: ServiceId;
  name: string;
  /** Public env vars required in the browser bundle. */
  publicEnv: string[];
  /** Server-side secrets (names only — never values). */
  serverSecrets: string[];
  configured: boolean;
  notes?: string;
}

const env = import.meta.env as Record<string, string | undefined>;
const has = (k: string) => Boolean(env[k]);

export const PLATFORM_SERVICES: Record<ServiceId, PlatformService> = {
  supabase: {
    id: "supabase",
    name: "Lovable Cloud (database, auth, functions)",
    publicEnv: ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"],
    serverSecrets: ["SUPABASE_SERVICE_ROLE_KEY"],
    configured: has("VITE_SUPABASE_URL") && has("VITE_SUPABASE_PUBLISHABLE_KEY"),
  },
  paystack: {
    id: "paystack",
    name: "Paystack payments",
    publicEnv: ["VITE_PAYSTACK_PUBLIC_KEY"],
    serverSecrets: ["PAYSTACK_SECRET_KEY"],
    configured: has("VITE_PAYSTACK_PUBLIC_KEY"),
    notes: "Checkout currently completes through Shopify; Paystack registered for direct flows.",
  },
  resend: {
    id: "resend",
    name: "Resend transactional email",
    publicEnv: [],
    serverSecrets: ["RESEND_API_KEY"],
    configured: true,
    notes: "Server-side only; presence verified at runtime inside handlers.",
  },
  storage: {
    id: "storage",
    name: "Platform object storage",
    publicEnv: ["VITE_SUPABASE_URL"],
    serverSecrets: [],
    configured: has("VITE_SUPABASE_URL"),
  },
  analytics: {
    id: "analytics",
    name: "Analytics & ad pixels (GA4, Meta, TikTok)",
    publicEnv: ["VITE_GA4_ID", "VITE_META_PIXEL_ID", "VITE_TIKTOK_PIXEL_ID"],
    serverSecrets: [],
    configured: has("VITE_GA4_ID") || has("VITE_META_PIXEL_ID") || has("VITE_TIKTOK_PIXEL_ID"),
    notes: "Inert until at least one pixel ID is provided.",
  },
  attribution: {
    id: "attribution",
    name: "RSID + UTM attribution pipeline",
    publicEnv: [],
    serverSecrets: [],
    configured: true,
  },
};

export function getService(id: ServiceId): PlatformService {
  return PLATFORM_SERVICES[id];
}

export function listServices(): PlatformService[] {
  return Object.values(PLATFORM_SERVICES);
}
