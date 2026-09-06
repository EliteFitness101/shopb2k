import crypto from "node:crypto";

function send(res, body, status = 200) {
  res.status(status).json(body);
}

function getHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

function getSecret() {
  return process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET || null;
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function verifyHmac(rawBody, header, secret) {
  if (!header || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  let received;
  try {
    received = Buffer.from(header, "base64");
  } catch {
    return false;
  }
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is incomplete");
  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseRequest(path, options = {}) {
  const { url, key } = supabaseConfig();
  return fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, { ok: false, error: "Method Not Allowed" }, 405);
  }

  try {
    const secret = getSecret();
    if (!secret) return send(res, { ok: false, error: "Shopify webhook secret is not configured" }, 500);

    const rawBody = await readRawBody(req);
    const hmac = getHeader(req, "x-shopify-hmac-sha256");
    if (!verifyHmac(rawBody, hmac, secret)) {
      return send(res, { ok: false, error: "Invalid Shopify webhook signature" }, 401);
    }

    const webhookId = getHeader(req, "x-shopify-webhook-id");
    if (!webhookId) return send(res, { ok: false, error: "Missing Shopify webhook ID" }, 400);

    const topic = getHeader(req, "x-shopify-topic") || "orders/create";
    const shopDomain = getHeader(req, "x-shopify-shop-domain");
    const eventId = getHeader(req, "x-shopify-event-id");
    const triggeredAt = getHeader(req, "x-shopify-triggered-at");

    let payload;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return send(res, { ok: false, error: "Invalid JSON payload" }, 400);
    }

    const orderId = payload?.id != null ? String(payload.id) : (eventId || webhookId);
    const occurredAt = triggeredAt || new Date().toISOString();

    const existing = await supabaseRequest(
      `resofit_events?select=id&idempotency_key=eq.${encodeURIComponent(webhookId)}&limit=1`,
      { method: "GET" },
    );
    if (existing.ok) {
      const rows = await existing.json().catch(() => []);
      if (Array.isArray(rows) && rows.length) {
        return send(res, { ok: true, duplicate: true, webhook_id: webhookId });
      }
    }

    const insert = await supabaseRequest("resofit_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        event_name: "order.created",
        contract_version: "1.0",
        occurred_at: occurredAt,
        source_system: "shopify",
        adapter: "shopify-webhook",
        idempotency_key: webhookId,
        correlation_id: orderId,
        utm: {},
        payload: {
          topic,
          shop_domain: shopDomain,
          webhook_id: webhookId,
          event_id: eventId,
          triggered_at: triggeredAt,
          order_id: orderId,
          shopify: payload,
        },
      }),
    });

    if (insert.ok) return send(res, { ok: true, duplicate: false, webhook_id: webhookId });
    if (insert.status === 409) return send(res, { ok: true, duplicate: true, webhook_id: webhookId });

    const errorBody = await insert.text().catch(() => "");
    console.error("[Shopify webhook] Failed to persist order event", insert.status, errorBody);
    return send(res, { ok: false, error: "Failed to persist Shopify order event" }, 500);
  } catch (error) {
    console.error("[Shopify webhook] Handler failure", error);
    return send(res, { ok: false, error: "Internal webhook handler error" }, 500);
  }
}
