import { supabase } from "@/integrations/supabase/client";

export type AssetProvider = string;
export type AssetCandidate = { provider: AssetProvider; url: string; priority?: number };
export type MediaProvider = {
  provider_id: string;
  priority: number;
  enabled: boolean;
  public_delivery: boolean;
  health_status: "unknown" | "healthy" | "degraded" | "unhealthy";
  roles: string[];
};
type RegisteredLocation = { provider_id: string; asset_url: string; priority: number; verified_at: string | null };

const FALLBACK_PLACEHOLDER = "/assets/placeholder.svg";
const REGISTRY_TTL_MS = 30_000;
const PROBE_TIMEOUT_MS = 1_500;
let providerCache: { at: number; providers: MediaProvider[] } | null = null;

function db() {
  return supabase as unknown as { from: (table: string) => any };
}

function isSafeDeliveryUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:"
      && !host.endsWith("blob.vercel-storage.com")
      && !host.endsWith(".r2.dev")
      && !host.includes("localhost");
  } catch {
    return false;
  }
}

export async function getMediaProviderRegistry(forceRefresh = false): Promise<MediaProvider[]> {
  if (!forceRefresh && providerCache && Date.now() - providerCache.at < REGISTRY_TTL_MS) return providerCache.providers;
  const { data, error } = await db().from("media_provider_registry")
    .select("provider_id,priority,enabled,public_delivery,health_status,roles")
    .eq("enabled", true).eq("public_delivery", true).eq("health_status", "healthy")
    .overlaps("roles", ["delivery", "transform"]).order("priority", { ascending: true });
  if (error) throw new Error("Media provider registry is unavailable");
  const providers = (Array.isArray(data) ? data : []).filter((p: MediaProvider) =>
    p && typeof p.provider_id === "string" && Number.isFinite(Number(p.priority)) && p.enabled
    && p.public_delivery && p.health_status === "healthy" && Array.isArray(p.roles) && p.roles.some((role) => ["delivery", "transform"].includes(role)));
  providerCache = { at: Date.now(), providers };
  return providers;
}

async function probeUrl(url: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "HEAD", signal: controller.signal, cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves an asset only from enabled, healthy, registry-approved public delivery locations. */
export async function resolveRegisteredAssetUrl(assetKey: string): Promise<string | null> {
  if (!/^[a-z0-9][a-z0-9._:-]{0,119}$/i.test(assetKey)) return null;
  let providers: MediaProvider[];
  try { providers = await getMediaProviderRegistry(); } catch { return null; }
  if (!providers.length) return null;
  const providerById = new Map(providers.map((provider) => [provider.provider_id, provider]));
  const { data, error } = await db().from("media_asset_locations")
    .select("provider_id,asset_url,priority,verified_at")
    .eq("asset_key", assetKey).eq("enabled", true).not("verified_at", "is", null);
  if (error || !Array.isArray(data)) return null;
  const locations = (data as RegisteredLocation[])
    .filter((location) => providerById.has(location.provider_id) && isSafeDeliveryUrl(location.asset_url))
    .sort((a, b) => (providerById.get(a.provider_id)!.priority - providerById.get(b.provider_id)!.priority)
      || (a.priority - b.priority));
  for (const location of locations) {
    if (await probeUrl(location.asset_url)) return location.asset_url;
  }
  return null;
}

/** Candidate-based helper retained for callers; provider order comes from the live registry, never a hardcoded list. */
export async function resolveAssetUrl(candidates: AssetCandidate[], timeoutMs = PROBE_TIMEOUT_MS): Promise<string> {
  if (!Array.isArray(candidates) || candidates.length === 0) return FALLBACK_PLACEHOLDER;
  let providers: MediaProvider[];
  try { providers = await getMediaProviderRegistry(); } catch { return FALLBACK_PLACEHOLDER; }
  const providerOrder = new Map(providers.map((provider) => [provider.provider_id, provider.priority]));
  const ordered = candidates.filter((candidate) => isSafeDeliveryUrl(candidate?.url) && providerOrder.has(candidate.provider))
    .sort((a, b) => (providerOrder.get(a.provider)! - providerOrder.get(b.provider)!)
      || ((a.priority ?? 100) - (b.priority ?? 100)));
  for (const candidate of ordered) if (await probeUrl(candidate.url, timeoutMs)) return candidate.url;
  return FALLBACK_PLACEHOLDER;
}

export function normalizeAssetCandidate(url: string, provider: AssetProvider, priority?: number): AssetCandidate {
  return { provider, url, priority };
}
