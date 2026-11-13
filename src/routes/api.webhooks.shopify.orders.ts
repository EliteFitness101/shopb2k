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
  test?: boolean;
  line_items?: ShopifyLineItem[];
};

const normalizeDomain = (value: string) =>
  value.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();

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

        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const webhookId = request.headers.get("x-shopify-webhook-id");

        // Test orders use a non-success payment state and a tightly allowlisted
        // delivery job. They can deliver only to the dedicated QA inbox and never
        // satisfy the production entitlement/payment triggers.
        if (order.test === true) {
          const testReference = `shopify-test:${orderId}`;
          const testEmail = String(order.email ?? order.customer?.email ?? "").trim().toLowerCase();
          const testRecipientAllowed = testEmail === "test@resofit.fit";
          const { data: priorTestEvent, error: priorTestLookupError } = await supabase
            .from("payment_events")
            .select("id,processed")
            .eq("paystack_ref", testReference)
            .eq("event", "orders/paid_test")
            .maybeSingle();
          if (priorTestLookupError) {
            console.error("Shopify test-order event lookup failed", { orderId, error: priorTestLookupError });
            return Response.json({ ok: false, error: "Test-order event lookup failed" }, { status: 500 });
          }
          if (priorTestEvent?.processed === true) {
            return Response.json({ ok: true, source: "shopify_test", order_id: orderId, duplicate: true });
          }
          if (!priorTestEvent) {
            const { error: testEventInsertError } = await supabase.from("payment_events").insert({
              paystack_ref: testReference,
              event: "orders/paid_test",
              payload: {
                source: "shopify_test",
                shop_domain: receivedStore,
                shopify_order_id: orderId,
                shopify_order_name: order.name ?? null,
                shopify_webhook_id: webhookId,
                sku_list: [...grouped.keys()],
                financial_status: "paid",
                payment_verification: "verified_shopify_hmac_orders_paid_test",
                test_recipient_allowed: testRecipientAllowed,
              },
              processed: false,
              signature_verified: true,
              source: "shopify_test",
            });
            if (testEventInsertError && testEventInsertError.code !== "23505") {
              console.error("Shopify test-order event insert failed", { orderId, error: testEventInsertError });
              return Response.json({ ok: false, error: "Test-order event persistence failed" }, { status: 500 });
            }
          }

          let testDeliveryQueued = 0;
          if (testRecipientAllowed && grouped.size > 0) {
            const testSkus = [...grouped.keys()];
            const { data: testProducts, error: testProductError } = await supabase
              .from("products")
              .select("id,sku,title,product_type,fulfillment_mode,published")
              .in("sku", testSkus);
            if (testProductError) {
              console.error("Shopify test-order product lookup failed", { orderId, error: testProductError });
              return Response.json({ ok: false, error: "Test product verification failed" }, { status: 500 });
            }
            const testEligible = new Map(
              (testProducts ?? [])
                .filter((product) =>
                  product.published === true &&
                  String(product.fulfillment_mode ?? "").toLowerCase() === "digital",
                )
                .map((product) => [String(product.sku), product]),
            );
            const testCurrency = String(order.currency ?? order.presentment_currency ?? "").trim().toUpperCase();
            if (!testCurrency) {
              return Response.json({ ok: false, error: "Test order currency is missing" }, { status: 422 });
            }
            const testPaidAt = order.processed_at ?? order.updated_at ?? order.created_at ?? new Date().toISOString();
            for (const [sku, line] of grouped) {
              const product = testEligible.get(sku);
              if (!product) continue;
              const testPaymentReference = `shopify-test:${orderId}:${encodeURIComponent(sku)}`;
              const testPaymentMetadata = {
                test_mode: true,
                source: "shopify_test",
                checkout_channel: "shopify_test",
                shop_domain: receivedStore,
                shopify_order_id: orderId,
                shopify_webhook_id: webhookId,
                product_sku: sku,
                quantity: line.quantity,
                currency: testCurrency,
                amount: line.total,
                customer_email: "test@resofit.fit",
                payment_verification: "verified_shopify_hmac_orders_paid_test",
              };
              const { error: testPaymentError } = await supabase.from("payments").upsert(
                {
                  user_id: null,
                  amount: line.total,
                  currency: testCurrency,
                  status: "test_success",
                  plan_type: product.title,
                  paystack_ref: testPaymentReference,
                  order_id: orderId,
                  customer_email: "test@resofit.fit",
                  paid_at: testPaidAt,
                  product_sku: sku,
                  funnel_origin: "shopify_test",
                  metadata: testPaymentMetadata,
                },
                { onConflict: "paystack_ref" },
              );
              if (testPaymentError) {
                console.error("Shopify test payment record failed", { orderId, sku, error: testPaymentError });
                return Response.json({ ok: false, error: "Test payment persistence failed" }, { status: 500 });
              }
              const { data: testPayment, error: testPaymentLookupError } = await supabase
                .from("payments")
                .select("id")
                .eq("paystack_ref", testPaymentReference)
                .single();
              if (testPaymentLookupError || !testPayment) {
                console.error("Shopify test payment lookup failed", { orderId, sku, error: testPaymentLookupError });
                return Response.json({ ok: false, error: "Test payment lookup failed" }, { status: 500 });
              }
              const { error: testJobError } = await supabase.from("digital_product_delivery_jobs").upsert(
                {
                  payment_id: testPayment.id,
                  payment_reference: testPaymentReference,
                  product_sku: sku,
                  product_id: product.id,
                  buyer_user_id: null,
                  buyer_email: "test@resofit.fit",
                  product_title: product.title,
                  status: "queued",
                  provenance: {
                    test_mode: true,
                    test_recipient: "test@resofit.fit",
                    source: "shopify_test_order",
                    shopify_order_id: orderId,
                    shopify_webhook_id: webhookId,
                    fulfillment_authority: "isolated_test_delivery_only",
                  },
                },
                { onConflict: "payment_id,product_sku", ignoreDuplicates: true },
              );
              if (testJobError) {
                console.error("Shopify test delivery job enqueue failed", { orderId, sku, error: testJobError });
                return Response.json({ ok: false, error: "Test delivery queue write failed" }, { status: 500 });
              }
              testDeliveryQueued += 1;
            }
          }

          const { error: testEventCompleteError } = await supabase
            .from("payment_events")
            .update({ processed: true, processed_at: new Date().toISOString() })
            .eq("paystack_ref", testReference)
            .eq("event", "orders/paid_test");
          if (testEventCompleteError) {
            console.error("Shopify test-order event completion failed", { orderId, error: testEventCompleteError });
            return Response.json({ ok: false, error: "Test-order event completion failed" }, { status: 500 });
          }
          return Response.json({
            ok: true,
            source: "shopify_test",
            order_id: orderId,
            recorded: true,
            test_recipient_allowed: testRecipientAllowed,
            paid_ledger_write: false,
            payment_state: testDeliveryQueued > 0 ? "test_success_only" : "not_created",
            entitlement_granted: false,
            delivery_queued: testDeliveryQueued,
            delivery_recipient: testDeliveryQueued > 0 ? "test@resofit.fit" : null,
          });
        }

        if (grouped.size === 0) {
          return Response.json({ ok: true, ignored: true, reason: "no_sku_line_items" });
        }

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
        let queued = 0;
        let skipped = 0;
        let duplicates = 0;

        for (const [sku, line] of grouped) {
          const product = eligible.get(sku);
          if (!product) {
            skipped += 1;
            continue;
          }

          const reference = `shopify:${orderId}:${encodeURIComponent(sku)}`;
          const eventPayload = {
            source: "shopify",
            shop_domain: receivedStore,
            shopify_order_id: orderId,
            shopify_order_name: order.name ?? null,
            shopify_webhook_id: webhookId,
            sku,
            quantity: line.quantity,
            line_item_ids: line.lineItemIds,
            currency,
            amount: line.total,
            financial_status: "paid",
            payment_verification: "verified_shopify_hmac_orders_paid",
            paid_at: paidAt,
          };

          const { data: priorEvent, error: priorEventError } = await supabase
            .from("payment_events")
            .select("id,processed")
            .eq("paystack_ref", reference)
            .eq("event", "orders/paid")
            .maybeSingle();

          if (priorEventError) {
            console.error("Shopify paid-order event lookup failed", { orderId, sku, error: priorEventError });
            return Response.json({ ok: false, error: "Payment event lookup failed" }, { status: 500 });
          }
          if (priorEvent?.processed === true) {
            duplicates += 1;
            continue;
          }

          if (!priorEvent) {
            const { error: eventInsertError } = await supabase.from("payment_events").insert({
              paystack_ref: reference,
              event: "orders/paid",
              payload: eventPayload,
              processed: false,
              signature_verified: true,
              source: "shopify",
            });
            if (eventInsertError && eventInsertError.code !== "23505") {
              console.error("Shopify paid-order event insert failed", { orderId, sku, error: eventInsertError });
              return Response.json({ ok: false, error: "Payment event persistence failed" }, { status: 500 });
            }
          }

          const metadata = {
            ...eventPayload,
            checkout_channel: "shopify_headless",
            customer_name: customerName || null,
            customer_email: email,
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
            console.error("Shopify paid-order payment ledger write failed", { orderId, sku, error: paymentError });
            return Response.json({ ok: false, error: "Payment ledger write failed" }, { status: 500 });
          }

          const { error: eventCompleteError } = await supabase
            .from("payment_events")
            .update({ processed: true, processed_at: new Date().toISOString() })
            .eq("paystack_ref", reference)
            .eq("event", "orders/paid");

          if (eventCompleteError) {
            console.error("Shopify paid-order event completion failed", { orderId, sku, error: eventCompleteError });
            return Response.json({ ok: false, error: "Payment event completion failed" }, { status: 500 });
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
          duplicate_products: duplicates,
          idempotency: "payment_events(paystack_ref,event)+payments(paystack_ref)",
        });
      },
    },
  },
});
