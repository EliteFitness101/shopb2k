import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getShopifyWebhookSecret, verifyShopifyWebhook } from "@/lib/shopify-webhook";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

type ShopifyLineItem = {
  id?: number | string;
  sku?: string | null;
  title?: string | null;
  price?: string | number;
  quantity?: number;
  total_discount?: string | number;
};

type ShopifyPaidOrder = {
  id?: number | string;
  name?: string;
  email?: string | null;
  customer?: { email?: string | null; first_name?: string | null; last_name?: string | null } | null;
  financial_status?: string | null;
  currency?: string | null;
  presentment_currency?: string | null;
  processed_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  line_items?: ShopifyLineItem[];
};

const normalizeDomain = (value: string) =>
  value.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();

function minorUnitAmount(amount: number, currency: string) {
  const digits = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits;
  return Math.round(amount * 10 ** digits);
}

function lineTotal(item: ShopifyLineItem) {
  const unitPrice = Number(item.price);
  const quantity = Number(item.quantity ?? 0);
  const discount = Number(item.total_discount ?? 0);
  if (!Number.isFinite(unitPrice) || !Number.isInteger(quantity) || quantity < 1) {
    return null;
  }
  const total = Math.max(0, unitPrice * quantity - (Number.isFinite(discount) ? discount : 0));
  return { quantity, total };
}

export const Route = createFileRoute("/api/webhooks/shopify/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-shopify-hmac-sha256");
        const webhookSecret = getShopifyWebhookSecret();

        if (!webhookSecret || !verifyShopifyWebhook(rawBody, signature, webhookSecret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const configuredStore = process.env.SHOPIFY_STORE_DOMAIN ?? "w7hm0i-8w.myshopify.com";
        const receivedStore = normalizeDomain(request.headers.get("x-shopify-shop-domain") ?? "");
        if (receivedStore !== normalizeDomain(configuredStore)) {
          return new Response("Shop mismatch", { status: 401 });
        }

        const topic = (request.headers.get("x-shopify-topic") ?? "").toLowerCase();
        if (topic !== "orders/paid") {
          return Response.json({ ok: true, ignored: true, reason: "unsupported_topic", topic });
        }

        if (!SERVICE_ROLE) {
          return Response.json({ ok: false, error: "Supabase server configuration is incomplete" }, { status: 503 });
        }

        let order: ShopifyPaidOrder;
        try {
          order = JSON.parse(rawBody) as ShopifyPaidOrder;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const orderId = String(order.id ?? "").trim();
        if (!orderId || order.financial_status !== "paid") {
          return Response.json({ ok: true, ignored: true, reason: "order_not_fully_paid" });
        }

        const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
        const grouped = new Map<string, { quantity: number; total: number; lineItemIds: string[] }>();
        for (const item of lineItems) {
          const sku = String(item.sku ?? "").trim();
          const calculated = lineTotal(item);
          if (!sku || !calculated) continue;
          const existing = grouped.get(sku) ?? { quantity: 0, total: 0, lineItemIds: [] };
          existing.quantity += calculated.quantity;
          existing.total += calculated.total;
          if (item.id != null) existing.lineItemIds.push(String(item.id));
          grouped.set(sku, existing);
        }

        if (grouped.size === 0) {
          return Response.json({ ok: true, ignored: true, reason: "no_sku_line_items" });
        }

        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const skus = [...grouped.keys()];
        const { data: products, error: productError } = await supabase
          .from("products")
          .select("id,sku,title,product_type,fulfillment_mode,published")
          .in("sku", skus);

        if (productError) {
          console.error("Shopify paid-order product lookup failed", productError);
          return Response.json({ ok: false, error: "Product verification failed" }, { status: 500 });
        }

        const eligible = new Map(
          (products ?? [])
            .filter(
              (product) =>
                product.published === true &&
                String(product.fulfillment_mode ?? "").toLowerCase() === "digital",
            )
            .map((product) => [String(product.sku), product]),
        );

        const email = String(order.email ?? order.customer?.email ?? "").trim().toLowerCase() || null;
        const customerName = [order.customer?.first_name, order.customer?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        const currency = String(order.currency ?? order.presentment_currency ?? "").trim().toUpperCase();
        if (!currency) {
          return Response.json({ ok: false, error: "Order currency is missing" }, { status: 422 });
        }

        const paidAt = order.processed_at ?? order.updated_at ?? order.created_at ?? new Date().toISOString();
        const webhookId = request.headers.get("x-shopify-webhook-id");
        let queued = 0;
        let skipped = 0;

        for (const [sku, line] of grouped) {
          const product = eligible.get(sku);
          if (!product) {
            skipped += 1;
            continue;
          }

          const reference = `shopify:${orderId}:${encodeURIComponent(sku)}`;
          const metadata = {
            source: "shopify",
            checkout_channel: "shopify_headless",
            shop_domain: receivedStore,
            shopify_order_id: orderId,
            shopify_order_name: order.name ?? null,
            shopify_webhook_id: webhookId,
            shopify_line_item_ids: line.lineItemIds,
            quantity: line.quantity,
            customer_name: customerName || null,
            customer_email: email,
            financial_status: "paid",
            payment_verification: "verified_shopify_hmac_orders_paid",
            paid_at: paidAt,
          };

          const { error: paymentError } = await supabase.from("payments").upsert(
            {
              user_id: null,
              amount: line.total,
              currency,
              status: "success",
              plan_type: product.title,
              paystack_ref: reference,
              order_id: orderId,
              customer_email: email,
              paid_at: paidAt,
              product_sku: sku,
              funnel_origin: "shopify_headless",
              metadata,
            },
            { onConflict: "paystack_ref" },
          );

          if (paymentError) {
            console.error("Shopify paid-order payment ledger write failed", {
              orderId,
              sku,
              error: paymentError,
            });
            return Response.json({ ok: false, error: "Payment ledger write failed" }, { status: 500 });
          }
          queued += 1;
        }

        return Response.json({
          ok: true,
          source: "shopify",
          topic,
          order_id: orderId,
          queued_products: queued,
          skipped_products: skipped,
          idempotency: "shopify-order-id-plus-product-sku",
        });
      },
    },
  },
});
