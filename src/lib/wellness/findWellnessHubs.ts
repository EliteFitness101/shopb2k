export type WellnessHubQuery = {
  state?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  service?: string;
};

export type WellnessHubResult = {
  id: string;
  hub_code: string;
  name: string;
  slug: string;
  description?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  distance_km: number | null;
  verification_status: string;
  services: Array<{
    id: string;
    service_entity_id?: string | null;
    service_name: string;
    description?: string | null;
    price?: number | null;
    currency: string;
    duration_minutes?: number | null;
    booking_method: string;
  }>;
};

/**
 * ChatB2K Wellness capability: resolve verified wellness hubs from the
 * canonical ResoFit Wellness Locator. This is intentionally a thin tool
 * adapter so ChatB2K and the public Geo-Locator use the same source of truth.
 */
export async function findWellnessHubs(query: WellnessHubQuery) {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!baseUrl) throw new Error("Wellness locator is not configured");

  const params = new URLSearchParams({ action: "nearby" });
  if (query.state) params.set("state", query.state);
  if (query.city) params.set("city", query.city);
  if (query.service) params.set("service", query.service);
  if (query.latitude !== undefined) params.set("lat", String(query.latitude));
  if (query.longitude !== undefined) params.set("lng", String(query.longitude));
  if (query.radiusKm !== undefined) params.set("radius_km", String(query.radiusKm));

  const response = await fetch(`${baseUrl}/functions/v1/wellness-locator?${params.toString()}`, {
    headers: publishableKey ? { apikey: publishableKey } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Wellness locator failed with HTTP ${response.status}`);
  }

  return (await response.json()) as {
    query: Record<string, unknown>;
    results: WellnessHubResult[];
    count: number;
  };
}
