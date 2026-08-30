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

    if (action === "hub") {
      const hub = url.searchParams.get("hub");
      if (!hub) return json({ error: "hub_required" }, 400);
      const { data, error } = await db.from("resofit_wellness_hubs").select("id,hub_code,name,slug,description,address,latitude,longitude,phone,whatsapp,website,state_id,city_id").eq("hub_code", hub).eq("status", "active").eq("verification_status", "verified").maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "hub_not_found" }, 404);
      const { data: services, error: serviceError } = await db.from("resofit_wellness_hub_services").select("id,service_entity_id,service_name,description,price,currency,duration_minutes,booking_method").eq("hub_id", data.id).eq("status", "active").order("service_name");
      if (serviceError) throw serviceError;
      return json({ hub: data, services: services ?? [] });
    }

    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const state = url.searchParams.get("state");
    const city = url.searchParams.get("city");
    const service = url.searchParams.get("service");
    const radius = Math.min(Math.max(Number(url.searchParams.get("radius_km") ?? 25) || 25, 1), 100);

    let query = db.from("resofit_wellness_hubs").select("id,hub_code,name,slug,description,address,latitude,longitude,phone,whatsapp,website,state_id,city_id").eq("status", "active").eq("verification_status", "verified");
    if (state) {
      const { data, error } = await db.from("resofit_wellness_states").select("id").or(`slug.eq.${state},state_code.eq.${state}`).eq("status", "active").maybeSingle();
      if (error) throw error;
      if (!data) return json({ results: [], count: 0 });
      query = query.eq("state_id", data.id);
    }
    if (city) {
      const { data, error } = await db.from("resofit_wellness_cities").select("id").eq("slug", city).eq("status", "active").maybeSingle();
      if (error) throw error;
      if (!data) return json({ results: [], count: 0 });
      query = query.eq("city_id", data.id);
    }

    const { data: hubs, error: hubError } = await query.limit(250);
    if (hubError) throw hubError;

    let results = (hubs ?? []).map((hub) => ({ ...hub, distance_km: Number.isFinite(lat) && Number.isFinite(lng) ? haversineKm(lat, lng, hub.latitude, hub.longitude) : null }));
    if (Number.isFinite(lat) && Number.isFinite(lng)) results = results.filter((hub) => (hub.distance_km ?? Infinity) <= radius).sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
    else results.sort((a, b) => a.name.localeCompare(b.name));

    const ids = results.map((hub) => hub.id);
    let services: Array<Record<string, unknown>> = [];
    if (ids.length) {
      const { data, error } = await db.from("resofit_wellness_hub_services").select("id,hub_id,service_entity_id,service_name,description,price,currency,duration_minutes,booking_method").in("hub_id", ids).eq("status", "active").order("service_name");
      if (error) throw error;
      services = data ?? [];
    }
    if (service) {
      const serviceHubIds = new Set(services.filter((item) => String(item.service_name).toLowerCase().includes(service.toLowerCase())).map((item) => item.hub_id));
      results = results.filter((hub) => serviceHubIds.has(hub.id));
    }
    const servicesByHub = new Map<string, Array<Record<string, unknown>>>();
    for (const item of services) {
      const list = servicesByHub.get(String(item.hub_id)) ?? [];
      list.push(item);
      servicesByHub.set(String(item.hub_id), list);
    }

    return json({ query: { state, city, service, latitude: Number.isFinite(lat) ? lat : null, longitude: Number.isFinite(lng) ? lng : null, radius_km: radius }, results: results.map((hub) => ({ ...hub, services: servicesByHub.get(hub.id) ?? [] })), count: results.length });
  } catch (error) {
    console.error("wellness-locator error", error);
    return json({ error: "internal_error" }, 500);
  }
});
