import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getShopifyWebhookSecret, verifyShopifyWebhook } from "@/lib/shopify-webhook";

export const Route = createFileRoute("/api/webhooks/shopify/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = getShopifyWebhookSecret();
        if (!secret) {
          return Response.json(
            { ok: false, error: "Shopify webhook secret is not configured" },
            { status: 500 },
          );
        }

        const rawBody = await request.text();
        const hmac = request.headers.get("x-shopify-hmac-sha256");
        if (!verifyShopifyWebhook(rawBody, hmac, secret)) {
          return Response.json({ ok: false, error: "Invalid Shopify webhook signature" }, { status: 401 });
        }

        const webhookId = request.headers.get("x-shopify-webhook-id");
        const topic = request.headers.get("x-shopify-topic") ?? "orders/create";
        const shopDomain = request.headers.get("x-shopify-shop-domain");
        const eventId = request.headers.get("x-shopify-event-id");
        const triggeredAt = request.headers.get("x-shopify-triggered-at");

        if (!webhookId) {
          return Response.json({ ok: false, error: "Missing Shopify webhook ID" }, { status: 400 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
        }

        const orderId =
          typeof payload.id === "string" || typeof payload.id === "number"
            ? String(payload.id)
            : eventId ?? webhookId;
        const occurredAt = triggeredAt ?? new Date().toISOString();

        const { error } = await supabaseAdmin.from("resofit_events").insert({
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
        });

        if (error) {
          if (error.code === "23505") {
            return Response.json({ ok: true, duplicate: true, webhook_id: webhookId });
          }

          console.error("[Shopify webhook] Failed to persist order event", {
            code: error.code,
            message: error.message,
          });
          return Response.json({ ok: false, error: "Failed to persist Shopify order event" }, { status: 500 });
        }

        return Response.json({ ok: true, duplicate: false, webhook_id: webhookId }, { status: 200 });
      },
    },
  },
});
