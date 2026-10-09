import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const publishableKeySet = new Set<string>([
  ...Object.values(publishableKeys).filter((value): value is string => typeof value === "string"),
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
].filter(Boolean));
const admin = createClient(supabaseUrl, serviceRoleKey);

const MAX_PAYLOAD_BYTES = 64_000;
const EVENT_NAME = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]+)+$/;
const PUBLIC_EVENTS = new Set([
  "funnel.page_viewed",
  "funnel.cta_clicked",
  "assessment.started",
  "assessment.completed",
  "conversation.whatsapp_clicked",
  "checkout.started",
  "application.submitted",
  "commerce.search",
  "commerce.product_viewed",
  "commerce.product_clicked",
  "commerce.compare",
  "commerce.price_filtered",
  "commerce.wishlist_added",
  "commerce.wishlist_removed",
  "commerce.cart_added",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAuthorized(req: Request) {
  const apiKey = req.headers.get("apikey");
  if (apiKey && publishableKeySet.has(apiKey)) return true;
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return Boolean(bearer && publishableKeySet.has(bearer));
}

function safeObs(payload: Record<string, unknown>) {
  const keys = [
    "application_id", "application_reference", "application_track", "programme",
    "training_interest", "location", "source", "farm_position", "farm_unit",
    "checkout_id", "assessment_id", "page", "cta", "destination", "sku",
    "product_id", "order_id", "hub_code", "service_id", "booking_method",
    "channel", "content_id", "goal", "amount", "currency", "payment_reference",
  ];
  return Object.fromEntries(keys.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
}

async function orchestrate(eventName: string, payload: Record<string, unknown>, eventId: string) {
  const critical = new Set(["application.submitted", "checkout.started", "assessment.started", "funnel.cta_clicked"]);
  if (!critical.has(eventName)) return { requested: false, ok: false, reason: "non_critical_event" };

  const query = eventName === "application.submitted"
    ? `Martial X recruitment event: ${String(payload.application_track ?? "Security")} application submitted; determine the next operational intelligence action.`
    : `ResoFit event ${eventName}; determine the next operational intelligence action from verified event data.`;
  const context = {
    event_id: eventId,
    event_name: eventName,
    source_system: eventName.startsWith("application.") ? "redzone-recruit" : "resofit",
    application_track: payload.application_track ?? null,
    programme: payload.programme ?? null,
    training_interest: payload.training_interest ?? null,
    farm_position: payload.farm_position ?? null,
    farm_unit: payload.farm_unit ?? null,
    location: payload.location ?? null,
    source: payload.source ?? null,
  };

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/chatb2k-orchestrator`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ mode: "revenue", q: query, domain: "ecosystem", discover: "false", execute: "false", context }),
    });
    const raw = await response.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch { /* retain an empty result */ }
    return {
      requested: true,
      ok: response.ok,
      status: response.status,
      production_routable: Boolean(data?.agent_routing?.production_routable),
      selected_agent: data?.agent_routing?.selected_agent?.agent_code ?? null,
      enrichment_ok: Boolean(data?.gemini_enrichment?.ok),
    };
  } catch (error) {
    return { requested: true, ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

function learningPlatform(eventName: string) {
  if (eventName.startsWith("application.") || eventName.startsWith("farm.")) return "martial_x";
  if (eventName.startsWith("wellness.")) return "wellness";
  if (/^(commerce|funnel|checkout|assessment|conversation|payment|order|fulfillment|lead|retention)\\./.test(eventName)) return "resofit";
  return "ecosystem";
}

async function learn(eventName: string, payload: Record<string, unknown>, action: string) {
  const { error } = await admin.from("chatb2k_learning_events").insert({
    platform: learningPlatform(eventName),
    source: "resofit_event_ingest",
    event_type: eventName,
    topic: String(payload.sku ?? payload.product_id ?? payload.application_track ?? payload.programme ?? payload.cta ?? eventName),
    observation: safeObs(payload),
    confidence: 1,
    action,
  });
  if (error) console.error("chatb2k-learning-write", error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401);

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
    if (!/^[0-9]+\.[0-9]+$/.test(contractVersion)) return json({ error: "Invalid contract_version" }, 400);
    if (idempotencyKey.length > 200) return json({ error: "Invalid idempotency_key" }, 400);
    if (adapters.length > 10) return json({ error: "Too many adapters" }, 400);
    if (!PUBLIC_EVENTS.has(eventName)) return json({ error: "Event requires a trusted server producer" }, 403);

    const { data: contract, error: contractError } = await admin
      .from("resofit_event_contracts")
      .select("event_name,contract_version,required_fields,critical")
      .eq("event_name", eventName)
      .eq("contract_version", contractVersion)
      .maybeSingle();
    if (contractError) throw contractError;
    if (!contract) return json({ error: "Unknown event contract" }, 400);

    const payload = (body.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>;
    const missing = (contract.required_fields ?? []).filter((field: string) => payload[field] === undefined || payload[field] === null || payload[field] === "");
    if (missing.length) return json({ error: "Missing required event fields", fields: missing }, 400);

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
        const { data: existing } = await admin.from("resofit_events").select("id,event_name,contract_version,idempotency_key").eq("idempotency_key", idempotencyKey).maybeSingle();
        if (existing) return json({ ok: true, replay: true, event: existing });
      }
      throw eventError;
    }

    if (eventName.startsWith("commerce.")) {
      const productId = typeof payload.product_id === "string" ? payload.product_id : null;
      const sku = typeof payload.sku === "string" ? payload.sku : null;
      const source = typeof payload.source === "string" ? payload.source : "resofit";
      const sessionId = typeof body.session_id === "string" ? body.session_id : null;
      const { error: commerceError } = await admin.from("commerce_events").insert({
        event_name: eventName,
        product_id: productId,
        sku,
        source,
        session_id: sessionId,
        metadata: {
          ...payload,
          anonymous_id: body.anonymous_id ?? null,
          rsid: body.rsid ?? null,
          funnel_origin: body.funnel_origin ?? null,
          utm: body.utm ?? {},
        },
      });
      if (commerceError) throw commerceError;

      if (eventName === "commerce.search") {
        const query = String(payload.query ?? "").trim();
        if (query) {
          const { error: intentError } = await admin.from("commerce_intents").insert({
            session_id: sessionId,
            intent: "search",
            query,
            country_code: typeof payload.country_code === "string" ? payload.country_code : null,
            city: typeof payload.city === "string" ? payload.city : null,
            budget: typeof payload.budget === "number" ? payload.budget : null,
            metadata: {
              ...payload,
              anonymous_id: body.anonymous_id ?? null,
              rsid: body.rsid ?? null,
              funnel_origin: body.funnel_origin ?? null,
            },
          });
          if (intentError) throw intentError;
        }
      }
    }

    if (adapters.length) {
      const { data: registered, error: registryError } = await admin.from("resofit_adapter_registry").select("adapter,enabled").in("adapter", adapters);
      if (registryError) throw registryError;
      const enabled = new Set((registered ?? []).filter((r) => r.enabled).map((r) => r.adapter));
      const deliveries = adapters.filter((adapter) => enabled.has(adapter)).map((adapter) => ({ event_id: event.id, adapter }));
      if (deliveries.length) {
        const { error: deliveryError } = await admin.from("resofit_adapter_deliveries").upsert(deliveries, { onConflict: "event_id,adapter", ignoreDuplicates: true });
        if (deliveryError) throw deliveryError;
      }
    }
    const task = await orchestrate(eventName, payload, event.id);
    await learn(eventName, payload, task.requested ? (task.ok ? "chatb2k_orchestration_completed" : "chatb2k_orchestration_failed") : "event_observed");
    return json({ ok: true, replay: false, event, chatb2k: task });
  } catch (error) {
    console.error("resofit-event-ingest", error);
    return json({ error: "Event ingestion failed" }, 500);
  }
});
