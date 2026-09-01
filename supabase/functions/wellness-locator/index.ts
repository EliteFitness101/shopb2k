import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
});

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "nearby";

    if (action === "states") {
      const { data, error } = await db.from("resofit_wellness_states").select("id,state_code,name,slug").eq("status", "active").order("name");
      if (error) throw error;
      return json({ states: data ?? [] });
    }

    if (action === "cities") {
      const state = url.searchParams.get("state");
      if (!state) return json({ error: "state_required" }, 400);
      const { data: stateRow, error: stateError } = await db.from("resofit_wellness_states").select("id,name,slug,state_code").or(`slug.eq.${state},state_code.eq.${state}`).eq("status", "active").maybeSingle();
      if (stateError) throw stateError;
      if (!stateRow) return json({ cities: [] });
      const { data, error } = await db.from("resofit_wellness_cities").select("id,name,slug,latitude,longitude").eq("state_id", stateRow.id).eq("status", "active").order("name");
      if (error) throw error;
      return json({ state: stateRow, cities: data ?? [] });
    }

    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const state = url.searchParams.get("state");
    const city = url.searchParams.get("city");
    const service = (url.searchParams.get("service") ?? "").trim().toLowerCase();
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const radius = Math.min(Math.max(Number(url.searchParams.get("radius_km") ?? 25) || 25, 1), 100);

    // Unified public discovery source: verified Wellness hubs plus all discovered
    // Network entities. Private contract metadata is never selected or returned.
    const { data: network, error: networkError } = await db.from("resofit_network_directory")
      .select("id,entity_type,slug,name,tagline,description,country_code,state,city,latitude,longitude,public_location_label,phone,whatsapp,website,email,services,capabilities,verification_status,contract_status,status,discovery_source,source_url,public_metadata")
      .limit(500);
    if (networkError) throw networkError;

    const { data: wellness, error: wellnessError } = await db.from("resofit_wellness_hubs")
      .select("id,hub_code,name,slug,description,address,latitude,longitude,phone,whatsapp,website,state_id,city_id")
      .eq("status", "active").eq("verification_status", "verified").limit(250);
    if (wellnessError) throw wellnessError;

    const wellnessIds = new Set((wellness ?? []).map((h) => h.id));
    const legacyIds = (wellness ?? []).map((h) => h.id);
    let legacyServices: Array<Record<string, unknown>> = [];
    if (legacyIds.length) {
      const { data, error } = await db.from("resofit_wellness_hub_services")
        .select("id,hub_id,service_entity_id,service_name,description,price,currency,duration_minutes,booking_method")
        .in("hub_id", legacyIds).eq("status", "active").order("service_name");
      if (error) throw error;
      legacyServices = data ?? [];
    }
    const servicesByLegacyHub = new Map<string, Array<Record<string, unknown>>>();
    for (const item of legacyServices) {
      const list = servicesByLegacyHub.get(String(item.hub_id)) ?? [];
      list.push(item);
      servicesByLegacyHub.set(String(item.hub_id), list);
    }

    type Result = Record<string, unknown> & { distance_km: number | null; services: Array<Record<string, unknown>> };
    const results: Result[] = [];
    const seen = new Set<string>();

    for (const item of network ?? []) {
      const searchable = [item.name, item.tagline, item.description, item.state, item.city, ...(item.services ?? []), ...(item.capabilities ?? [])].filter(Boolean).join(" ").toLowerCase();
      const locationMatch = (!state || String(item.state ?? "").toLowerCase() === state.toLowerCase() || String(item.public_location_label ?? "").toLowerCase().includes(state.toLowerCase())) &&
        (!city || String(item.city ?? "").toLowerCase() === city.toLowerCase() || String(item.public_location_label ?? "").toLowerCase().includes(city.toLowerCase()));
      const queryMatch = !q || searchable.includes(q);
      const serviceMatch = !service || searchable.includes(service);
      if (!locationMatch || !queryMatch || !serviceMatch) continue;
      const distance = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
        ? haversineKm(lat, lng, Number(item.latitude), Number(item.longitude)) : null;
      if (distance !== null && distance > radius) continue;
      seen.add(String(item.name).toLowerCase());
      results.push({
        id: item.id, hub_code: item.slug, slug: item.slug, name: item.name, description: item.description ?? item.tagline ?? null,
        address: item.public_location_label ?? null, latitude: item.latitude, longitude: item.longitude, phone: item.phone, whatsapp: item.whatsapp,
        website: item.website, email: item.email, distance_km: distance,
        services: (item.services ?? []).map((name: string) => ({ id: `${item.id}:${name}`, service_name: name, price: null, currency: "NGN", booking_method: "external" })),
        entity_type: item.entity_type, discovery_status: item.status === "active" && item.verification_status === "verified" ? "verified" : "discovered",
        verification_status: item.verification_status, contract_status: item.contract_status, discovery_source: item.discovery_source, source_url: item.source_url,
      });
    }

    // Preserve verified Wellness records even if not yet mirrored into the Network table.
    for (const hub of wellness ?? []) {
      if (seen.has(String(hub.name).toLowerCase())) continue;
      const locationMatch = (!state && !city) || true;
      if (!locationMatch) continue;
      const searchable = [hub.name, hub.description].filter(Boolean).join(" ").toLowerCase();
      if (q && !searchable.includes(q)) continue;
      if (service && !(servicesByLegacyHub.get(hub.id) ?? []).some((s) => String(s.service_name).toLowerCase().includes(service))) continue;
      const distance = Number.isFinite(lat) && Number.isFinite(lng) ? haversineKm(lat, lng, hub.latitude, hub.longitude) : null;
      if (distance !== null && distance > radius) continue;
      results.push({ ...hub, distance_km: distance, services: servicesByLegacyHub.get(hub.id) ?? [], entity_type: "wellness_hub", discovery_status: "verified", verification_status: "verified", contract_status: "active", discovery_source: "resofit_wellness_registry", source_url: null });
    }

    results.sort((a, b) => a.distance_km !== null && b.distance_km !== null ? a.distance_km - b.distance_km : String(a.name).localeCompare(String(b.name)));
    return json({ query: { state, city, service: service || null, q: q || null, latitude: Number.isFinite(lat) ? lat : null, longitude: Number.isFinite(lng) ? lng : null, radius_km: radius }, results, count: results.length });
  } catch (error) {
    console.error("wellness-locator error", error);
    return json({ error: "internal_error" }, 500);
  }
});
