import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHOPIFY_APP_SECRET = process.env.SHOPIFY_APP_SECRET;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-01";
const ALLOWED_SHOPS = new Set((process.env.SHOPIFY_ALLOWED_SHOP_DOMAINS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
const HANDOFF_EVENT = "assessment.handoff_issued";
const HANDOFF_TTL_MS = 30 * 60 * 1000;
const SIGNATURE_MAX_AGE_SECONDS = 5 * 60;
const MAX_BODY_BYTES = 8_000;

type ProxyParams = {
  shop: string;
  timestamp: number;
  variantId: string;
  quantity: number;
  requestId: string;
  customerId: string | null;
  attribution: Record<string, string | null>;
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

function constantTimeHexEqual(expected: string, received: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const expectedBytes = Buffer.from(expected, "hex");
  const receivedBytes = Buffer.from(received, "hex");
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

/** Shopify App Proxy signatures use the app client secret and sorted query parameters. */
function verifyAppProxySignature(searchParams: URLSearchParams, secret: string): boolean {
  const received = searchParams.get("signature");
  if (!received) return false;

  const grouped = new Map<string, string[]>();
  for (const [key, value] of searchParams.entries()) {
    if (key === "signature") continue;
    const values = grouped.get(key) ?? [];
    values.push(value);
    grouped.set(key, values);
  }
  const message = [...grouped.entries()]
    .map(([key, values]) => `${key}=${values.join(",")}`)
    .sort()
    .join("");
  const expected = createHmac("sha256", secret).update(message, "utf8").digest("hex");
  return constantTimeHexEqual(expected, received);
}

function parseProxyParams(url: URL): ProxyParams | null {
  const params = url.searchParams;
  const shop = (params.get("shop") ?? "").toLowerCase();
  const timestamp = Number(params.get("timestamp"));
  const variantRaw = params.get("variant_id") ?? "";
  const quantityRaw = params.get("quantity") ?? "1";
  const requestId = params.get("request_id") ?? "";
  const quantity = Number(quantityRaw);

  // Accept only Shopify's canonical myshopify domain shape; the exact shop is allow-listed below.
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return null;
  if (!Number.isInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_MAX_AGE_SECONDS) return null;
  if (!/^(?:[0-9]+|gid:\/\/shopify\/ProductVariant\/[0-9]+)$/.test(variantRaw)) return null;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return null;

  const variantId = variantRaw.startsWith("gid://") ? variantRaw : `gid://shopify/ProductVariant/${variantRaw}`;
  const customerIdRaw = params.get("logged_in_customer_id") ?? "";
  const customerId = /^[0-9]+$/.test(customerIdRaw) ? customerIdRaw : null;
  const attribution = {
    utm_source: params.get("utm_source")?.slice(0, 128) ?? null,
    utm_medium: params.get("utm_medium")?.slice(0, 128) ?? null,
    utm_campaign: params.get("utm_campaign")?.slice(0, 128) ?? null,
  };

  return { shop, timestamp, variantId, quantity, requestId, customerId, attribution };
}

async function fetchVerifiedVariant(shop: string, variantId: string) {
  if (!SHOPIFY_ADMIN_ACCESS_TOKEN) throw new Error("Shopify Admin API token is not configured");
  const response = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      query: `query VerifyAssessmentVariant($id: ID!) {
        productVariant(id: $id) {
          id
          price
          product { id title }
        }
        shop { currencyCode }
      }`,
      variables: { id: variantId },
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Shopify Admin API returned ${response.status}`);
  const result = await response.json() as {
    data?: { productVariant?: { id: string; price: string; product: { id: string; title: string } } | null; shop?: { currencyCode: string } };
    errors?: Array<{ message?: string }>;
  };
  if (result.errors?.length) throw new Error("Shopify Admin GraphQL returned errors");
  const variant = result.data?.productVariant;
  if (!variant || !variant.id || !variant.product?.id || !variant.price?.amount || !variant.price?.currencyCode) return null;
  const amount = Number(variant.price.amount);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Shopify returned an invalid variant price");
  return { ...variant, priceAmount: amount };
}

export const Route = createFileRoute("/api/shopify-app-proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!SHOPIFY_APP_SECRET || !SERVICE_ROLE || !SHOPIFY_ADMIN_ACCESS_TOKEN || ALLOWED_SHOPS.size === 0) {
          return json({ ok: false, error: "Shopify orchestration is not configured." }, 503);
        }

        const url = new URL(request.url);
        if (!verifyAppProxySignature(url.searchParams, SHOPIFY_APP_SECRET)) {
          return json({ ok: false, error: "Invalid Shopify App Proxy signature." }, 401);
        }

        const params = parseProxyParams(url);
        if (!params || !ALLOWED_SHOPS.has(params.shop)) {
          return json({ ok: false, error: "Invalid or unauthorized Shopify request." }, 400);
        }

        try {
          const variant = await fetchVerifiedVariant(params.shop, params.variantId);
          if (!variant) return json({ ok: false, error: "Shopify variant was not found." }, 404);

          const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
          const idempotencyKey = `shopify-assessment:${params.shop}:${params.requestId}`;
          const { data: existing, error: existingError } = await admin
            .from("resofit_events")
            .select("correlation_id,payload")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();
          if (existingError) throw existingError;

          if (existing?.correlation_id && existing.payload && typeof existing.payload === "object") {
            const prior = existing.payload as Record<string, unknown>;
            if (prior.variant_id !== variant.id || prior.quantity !== params.quantity) {
              return json({ ok: false, error: "Idempotency key was already used for a different request." }, 409);
            }
            if (typeof prior.expires_at === "string" && Date.parse(prior.expires_at) > Date.now()) {
              return json({
                ok: true,
                correlation_id: existing.correlation_id,
                assessment_redirect_url: `https://resofit.fit/me?correlation_id=${encodeURIComponent(existing.correlation_id)}`,
                expires_at: prior.expires_at,
                replay: true,
              });
            }
            return json({ ok: false, error: "This request ID has expired. Retry with a new request ID." }, 409);
          }

          const correlationId = randomUUID();
          const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS).toISOString();
          const payload = {
            shop_domain: params.shop,
            customer_id: params.customerId,
            variant_id: variant.id,
            product_gid: variant.product.id,
            quantity: params.quantity,
            unit_price: variant.price.amount,
            currency: variant.currencyCode,
            product_title: variant.product.title,
            destination: "/me",
            expires_at: expiresAt,
            attribution: params.attribution,
            source: "shopify_app_proxy",
          };
          const { error: insertError } = await admin.from("resofit_events").insert({
            event_name: HANDOFF_EVENT,
            contract_version: "1.0",
            source_system: "shopify",
            idempotency_key: idempotencyKey,
            correlation_id: correlationId,
            user_id: null,
            anonymous_id: null,
            funnel_origin: "shopify",
            utm: params.attribution,
            payload,
          });
          if (insertError) {
            if (insertError.code === "23505") {
              const { data: raced } = await admin.from("resofit_events")
                .select("correlation_id,payload")
                .eq("idempotency_key", idempotencyKey)
                .maybeSingle();
              if (raced?.correlation_id && raced.payload && typeof raced.payload === "object") {
                const prior = raced.payload as Record<string, unknown>;
                if (prior.variant_id === variant.id && prior.quantity === params.quantity &&
                    typeof prior.expires_at === "string" && Date.parse(prior.expires_at) > Date.now()) {
                  return json({
                    ok: true,
                    correlation_id: raced.correlation_id,
                    assessment_redirect_url: `https://resofit.fit/me?correlation_id=${encodeURIComponent(raced.correlation_id)}`,
                    expires_at: prior.expires_at,
                    replay: true,
                  });
                }
              }
              return json({ ok: false, error: "Request conflicts with an existing idempotency record." }, 409);
            }
            throw insertError;
          }

          return json({
            ok: true,
            correlation_id: correlationId,
            assessment_redirect_url: `https://resofit.fit/me?correlation_id=${encodeURIComponent(correlationId)}`,
            expires_at: expiresAt,
            replay: false,
          }, 201);
        } catch (error) {
          console.error("Shopify app-proxy orchestration failed", error);
          return json({ ok: false, error: "Unable to start assessment right now." }, 500);
        }
      },
    },
  },
});
