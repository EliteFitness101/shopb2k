const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  },
});

function getHeader(request, name) {
  return request.headers?.get?.(name) ?? null;
}

function getSecret() {
  return process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET || null;
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyHmac(rawBody, header, secret) {
  if (!header) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)),
  );
  try {
    return bytesEqual(signature, base64ToBytes(header));
  } catch {
    return false;
  }
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

export default async function handler(request) {
  if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405);

  const secret = getSecret();
  if (!secret) return json({ ok: false, error: "Shopify webhook secret is not configured" }, 500);

  const rawBody = await request.text();
  const hmac = getHeader(request, "x-shopify-hmac-sha256");
  if (!(await verifyHmac(rawBody, hmac, secret))) {
    return json({ ok: false, error: "Invalid Shopify webhook signature" }, 401);
  }

  const webhookId = getHeader(request, "x-shopify-webhook-id");
  if (!webhookId) return json({ ok: false, error: "Missing Shopify webhook ID" }, 400);

  const topic = getHeader(request, "x-shopify-topic") || "orders/create";
  const shopDomain = getHeader(request, "x-shopify-shop-domain");
  const eventId = getHeader(request, "x-shopify-event-id");
  const triggeredAt = getHeader(request, "x-shopify-triggered-at");

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "Invalid JSON payload" }, 400);
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
      return json({ ok: true, duplicate: true, webhook_id: webhookId });
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

  if (insert.ok) {
    return json({ ok: true, duplicate: false, webhook_id: webhookId }, 200);
  }

  if (insert.status === 409) {
    return json({ ok: true, duplicate: true, webhook_id: webhookId }, 200);
  }

  const errorBody = await insert.text().catch(() => "");
  console.error("[Shopify webhook] Failed to persist order event", insert.status, errorBody);
  return json({ ok: false, error: "Failed to persist Shopify order event" }, 500);
}
