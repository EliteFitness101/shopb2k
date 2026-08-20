import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const publishableKeySet = new Set(
  Object.values(publishableKeys).filter((value): value is string => typeof value === "string"),
);
const admin = createClient(supabaseUrl, serviceRoleKey);

const MAX_PAYLOAD_BYTES = 64_000;
const EVENT_NAME = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;
const PUBLIC_EVENTS = new Set([
  "funnel.page_viewed",
  "funnel.cta_clicked",
  "assessment.started",
  "conversation.whatsapp_clicked",
  "checkout.started",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = req.headers.get("apikey");
  if (!apiKey || !publishableKeySet.has(apiKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_PAYLOAD_BYTES) {
      return json({ error: "Payload too large" }, 413);
    }

    const body = JSON.parse(raw) as Record<string, unknown>;
    const eventName = String(body.event_name ?? "");
    const contractVersion = String(body.contract_version ?? "1.0");
    const idempotencyKey = String(body.idempotency_key ?? crypto.randomUUID());
    const adapters = Array.isArray(body.adapters) ? body.adapters.map(String).filter(Boolean) : [];

    if (!EVENT_NAME.test(eventName)) return json({ error: "Invalid event_name" }, 400);
    if (!/^[0-9]+\.[0-9]+$/.test(contractVersion))
      return json({ error: "Invalid contract_version" }, 400);
    if (idempotencyKey.length > 200) return json({ error: "Invalid idempotency_key" }, 400);
    if (adapters.length > 10) return json({ error: "Too many adapters" }, 400);

    // Browser callers may emit only non-financial telemetry. Payment, order,
    // fulfillment, qualification and retention events must be server-produced.
    if (!PUBLIC_EVENTS.has(eventName)) {
      return json({ error: "Event requires a trusted server producer" }, 403);
    }

    const { data: contract, error: contractError } = await admin
      .from("resofit_event_contracts")
      .select("event_name,contract_version,required_fields,critical")
      .eq("event_name", eventName)
      .eq("contract_version", contractVersion)
      .maybeSingle();

    if (contractError) throw contractError;
    if (!contract) return json({ error: "Unknown event contract" }, 400);

    const payload = (
      body.payload && typeof body.payload === "object" ? body.payload : {}
    ) as Record<string, unknown>;
    const missing = (contract.required_fields ?? []).filter(
      (field: string) =>
        payload[field] === undefined || payload[field] === null || payload[field] === "",
    );
    if (missing.length)
      return json({ error: "Missing required event fields", fields: missing }, 400);

    const { data: event, error: eventError } = await admin
      .from("resofit_events")
      .insert({
        event_name: eventName,
        contract_version: contractVersion,
        occurred_at: body.occurred_at ?? new Date().toISOString(),
        source_system: String(body.source_system ?? "resofit"),
        adapter: adapters[0] ?? null,
        idempotency_key: idempotencyKey,
        correlation_id: body.correlation_id ?? null,
        session_id: body.session_id ?? null,
        user_id: body.user_id ?? null,
        anonymous_id: body.anonymous_id ?? null,
        rsid: body.rsid ?? null,
        funnel_origin: body.funnel_origin ?? null,
        utm: body.utm && typeof body.utm === "object" ? body.utm : {},
        payload,
      })
      .select("id,event_name,contract_version,idempotency_key")
      .single();

    if (eventError) {
      if (eventError.code === "23505") {
        const { data: existing } = await admin
          .from("resofit_events")
          .select("id,event_name,contract_version,idempotency_key")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (existing) return json({ ok: true, replay: true, event: existing });
      }
      throw eventError;
    }

    if (adapters.length) {
      const { data: registered, error: registryError } = await admin
        .from("resofit_adapter_registry")
        .select("adapter,enabled")
        .in("adapter", adapters);
      if (registryError) throw registryError;

      const enabled = new Set((registered ?? []).filter((r) => r.enabled).map((r) => r.adapter));
      const deliveries = adapters
        .filter((adapter) => enabled.has(adapter))
        .map((adapter) => ({ event_id: event.id, adapter }));

      if (deliveries.length) {
        const { error: deliveryError } = await admin
          .from("resofit_adapter_deliveries")
          .upsert(deliveries, { onConflict: "event_id,adapter", ignoreDuplicates: true });
        if (deliveryError) throw deliveryError;
      }
    }

    return json({ ok: true, replay: false, event });
  } catch (error) {
    console.error("resofit-event-ingest", error);
    return json({ error: "Event ingestion failed" }, 500);
  }
});
