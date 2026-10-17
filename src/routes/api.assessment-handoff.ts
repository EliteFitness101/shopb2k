import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HANDOFF_EVENT = "assessment.handoff_issued";
const HANDOFF_TTL_MS = 30 * 60 * 1000;
const MAX_BODY_BYTES = 8_000;

function allowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const productionHost = /^(?:[a-z0-9-]+\.)*resofit\.fit$/i.test(url.hostname);
    const localHost = /^localhost$/.test(url.hostname) && /^\d+$/.test(url.port);
    return (url.protocol === "https:" && productionHost)
      || (url.protocol === "http:" && localHost);
  } catch {
    return false;
  }
}

function headers(origin: string | null): Record<string, string> {
  return {
    ...(allowedOrigin(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store, max-age=0",
    "Vary": "Origin",
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return Response.json(data, { status, headers: { ...headers(origin), "Content-Type": "application/json" } });
}

function clean(value: unknown, max = 255): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isLive(payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const expiresAt = (payload as Record<string, unknown>).expires_at;
  return typeof expiresAt === "string" && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > Date.now();
}

function redirectFor(correlationId: string): string {
  return `https://resofit.fit/me?correlation_id=${encodeURIComponent(correlationId)}`;
}

export const Route = createFileRoute("/api/assessment-handoff")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const origin = request.headers.get("origin");
        return new Response(null, { status: allowedOrigin(origin) ? 204 : 403, headers: headers(origin) });
      },
      GET: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && !allowedOrigin(origin)) return json({ ok: false, error: "Origin not allowed." }, 403, origin);
        const correlationId = clean(new URL(request.url).searchParams.get("correlation_id"), 64);
        if (!UUID.test(correlationId)) return json({ ok: false, error: "Invalid correlation ID." }, 400, origin);
        if (!SERVICE_ROLE) return json({ ok: false, error: "Handoff service is not configured." }, 503, origin);

        try {
          const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
          const { data, error } = await admin
            .from("resofit_events")
            .select("payload,occurred_at")
            .eq("event_name", HANDOFF_EVENT)
            .eq("correlation_id", correlationId)
            .maybeSingle();
          if (error) throw error;
          if (!data) return json({ ok: false, error: "Handoff not found." }, 404, origin);
          if (!isLive(data.payload)) return json({ ok: false, error: "Handoff expired." }, 410, origin);

          const payload = data.payload as Record<string, unknown>;
          return json({
            ok: true,
            correlationId,
            sku: clean(payload.sku, 200),
            variantId: clean(payload.variant_id, 255),
            issuedAt: data.occurred_at,
          }, 200, origin);
        } catch (error) {
          console.error("Assessment handoff verification failed", error);
          return json({ ok: false, error: "Unable to verify handoff." }, 500, origin);
        }
      },
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (!allowedOrigin(origin)) return json({ ok: false, error: "Origin not allowed." }, 403, origin);
        if (!SERVICE_ROLE) return json({ ok: false, error: "Handoff service is not configured." }, 503, origin);
        if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
          return json({ ok: false, error: "Content-Type must be application/json." }, 415, origin);
        }

        try {
          const raw = await request.text();
          if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
            return json({ ok: false, error: "Payload too large." }, 413, origin);
          }
          let body: Record<string, unknown>;
          try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
            body = parsed as Record<string, unknown>;
          } catch {
            return json({ ok: false, error: "Invalid JSON body." }, 400, origin);
          }

          const cartToken = clean(body.cartToken, 128);
          const sessionId = clean(body.sessionId, 128);
          const anonymousId = clean(body.anonymousId, 128);
          const sku = clean(body.sku, 200);
          const variantId = clean(body.variantId, 255);
          const requestId = clean(body.requestId, 64);
          if (!cartToken || /\s/.test(cartToken) || /[\u0000-\u001f]/.test(cartToken) || !UUID.test(sessionId) || !UUID.test(requestId) || !sku || !variantId) {
            return json({ ok: false, error: "Cart, session, request, SKU and variant identifiers are required." }, 400, origin);
          }

          const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
          const { data: cart, error: cartError } = await admin
            .from("resofit_cart_sessions")
            .select("id,session_id,anonymous_id,rsid,funnel_origin,utm,user_id,status,last_activity_at")
            .eq("cart_token", cartToken)
            .maybeSingle();
          if (cartError) throw cartError;
          if (!cart || cart.status !== "active" || cart.session_id !== sessionId) {
            return json({ ok: false, error: "The active cart session could not be verified." }, 409, origin);
          }
          if (anonymousId && cart.anonymous_id && anonymousId !== cart.anonymous_id) {
            return json({ ok: false, error: "Cart session does not match this browser session." }, 409, origin);
          }
          const lastActivity = Date.parse(cart.last_activity_at);
          if (!Number.isFinite(lastActivity) || Date.now() - lastActivity > 24 * 60 * 60 * 1000) {
            return json({ ok: false, error: "Cart session is stale. Please add the item again." }, 409, origin);
          }

          const { data: items, error: itemsError } = await admin
            .from("resofit_cart_items")
            .select("sku,quantity,metadata")
            .eq("cart_id", cart.id);
          if (itemsError) throw itemsError;
          const itemExists = (items ?? []).some((item: { sku: string; quantity: number; metadata: unknown }) => {
            const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
              ? item.metadata as Record<string, unknown>
              : {};
            return Number(item.quantity) > 0 && ((item.sku === sku && metadata.variantId === variantId) || item.sku === variantId && sku === variantId);
          });
          if (!itemExists) return json({ ok: false, error: "The selected product is not present in the saved cart." }, 409, origin);

          const idempotencyKey = `assessment-handoff:${cart.id}:${variantId}:${requestId}`;
          const { data: existing, error: existingError } = await admin
            .from("resofit_events")
            .select("correlation_id,payload,occurred_at")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();
          if (existingError) throw existingError;
          if (existing?.correlation_id && isLive(existing.payload)) {
            return json({
              ok: true,
              correlationId: existing.correlation_id,
              redirectUrl: redirectFor(existing.correlation_id),
              expiresAt: (existing.payload as Record<string, unknown>).expires_at,
              replay: true,
            }, 200, origin);
          }

          const correlationId = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS).toISOString();
          const payload = {
            cart_session_id: cart.id,
            sku,
            variant_id: variantId,
            destination: "/me",
            expires_at: expiresAt,
          };
          const { error: insertError } = await admin.from("resofit_events").insert({
            event_name: HANDOFF_EVENT,
            contract_version: "1.0",
            source_system: "resofit",
            idempotency_key: idempotencyKey,
            correlation_id: correlationId,
            session_id: cart.session_id,
            user_id: cart.user_id ?? null,
            anonymous_id: (cart.anonymous_id ?? anonymousId) || null,
            rsid: cart.rsid ?? null,
            funnel_origin: cart.funnel_origin ?? null,
            utm: cart.utm ?? {},
            payload: { ...payload, source: clean(body.source, 40) === "shopify_theme" ? "shopify_theme" : "resofit_app" },
          });
          if (insertError) {
            // Concurrent retries can race the unique idempotency index; return the winning handoff.
            if (insertError.code === "23505") {
              const { data: raced } = await admin.from("resofit_events")
                .select("correlation_id,payload")
                .eq("idempotency_key", idempotencyKey)
                .maybeSingle();
              if (raced?.correlation_id && isLive(raced.payload)) {
                return json({ ok: true, correlationId: raced.correlation_id, redirectUrl: redirectFor(raced.correlation_id), expiresAt: (raced.payload as Record<string, unknown>).expires_at, replay: true }, 200, origin);
              }
            }
            throw insertError;
          }

          return json({ ok: true, correlationId, redirectUrl: redirectFor(correlationId), expiresAt, replay: false }, 201, origin);
        } catch (error) {
          console.error("Assessment handoff issuance failed", error);
          return json({ ok: false, error: "Unable to issue assessment handoff." }, 500, origin);
        }
      },
    },
  },
});
