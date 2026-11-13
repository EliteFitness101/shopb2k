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
  test?: boolean | null;
  currency?: string | null;
  presentment_currency?: string | null;
  processed_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
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


function buildShopifyTestMediaSpec(product: any, orderId: string) {
  const destination = \`https://www.resofit.fit/product/\${product.handle || product.sku}\`;
  const title = String(product.title);
  const prompt = (brief: string) =>
    \`ResoFlex powered by Resonance Fitness. Use only supplied product facts. No medical claims, guaranteed outcomes, fake testimonials, before/after claims, pricing, discounts, stock claims or unsupported features. \${brief} Product: \${title}. Destination: \${destination}.\`;
  const asset_slots = [
    { role: "hero_video", type: "video", required: true, aspect_ratio: "9:16", duration_seconds: 8, prompt: prompt("Create a premium vertical hero video with authentic Nigerian/African wellness-commerce context and a clean CTA ending.") },
    { role: "problem_solution_video", type: "video", required: true, aspect_ratio: "9:16", duration_seconds: 8, prompt: prompt("Create an 8-second problem-to-solution story without before/after or guaranteed-result claims.") },
    { role: "product_cover", type: "image", required: true, aspect_ratio: "1:1", prompt: prompt("Create a premium square product cover with clear hierarchy and room for title overlay; no fake badges or price.") },
    { role: "lifestyle_image", type: "image", required: true, aspect_ratio: "4:5", prompt: prompt("Create a premium, authentic Nigerian/African wellness lifestyle image, natural and non-medical.") },
    { role: "education_video", type: "video", required: true, aspect_ratio: "9:16", duration_seconds: 8, prompt: prompt("Create an educational vertical clip showing what the product is and how it fits into a wellness journey; no diagnosis or treatment claims.") },
    { role: "cta_video", type: "video", required: true, aspect_ratio: "9:16", duration_seconds: 8, prompt: prompt("Create a clean vertical conversion clip focused on clarity and next step; do not invent price, availability or discounts.") },
    { role: "social_support_image", type: "image", required: false, aspect_ratio: "9:16", prompt: prompt("Create a premium vertical social-support image suitable for a truthful caption.") },
  ];
  return {
    shopify_test_mode: true,
    shopify_order_id: orderId,
    media_factory_entitled: true,
    provider: "gemini_api",
    source_of_truth: "public.products",
    product: {
      sku: product.sku, title, handle: product.handle,
      product_type: product.product_type, fulfillment_mode: product.fulfillment_mode,
      canonical_destination: destination,
    },
    generation_policy: {
      media_origin: "Google Gemini API / Veo 3.1 and Gemini image generation",
      ingest_target: "content_asset_registry",
      qa_target: "content-intelligence-enricher",
      test_only: true,
      no_publication: true,
    },
    asset_slots,
    qa_checks: [
      "Verify all seven requested media slots have generated outputs.",
      "Verify no medical, guaranteed outcome, testimonial or before/after claims.",
      "Verify product facts, Nigerian cultural context and ResoFlex brand alignment.",
      "Keep all test assets unpublished and tagged as test-only until separately approved.",
    ],
  };
}

async function enqueueShopifyTestMedia(
  supabase: any,
  order: ShopifyPaidOrder,
  orderId: string,
  email: string | null,
  currency: string,
  grouped: Map<string, { quantity: number; total: number; lineItemIds: string[] }>,
  eligible: Map<string, any>,
  webhookId: string | null,
  receivedStore: string,
) {
  if (email !== "test@resofit.fit") {
    return Response.json({ ok: false, error: "Shopify test orders must use test@resofit.fit" }, { status: 422 });
  }
  const { data: inserted, error: eventInsertError } = await supabase
    .from("shopify_test_order_events")
    .upsert({
      shopify_order_id: orderId,
      shopify_webhook_id: webhookId,
      shop_domain: receivedStore,
      customer_email: email,
      financial_status: "paid",
      currency,
      line_items: order.line_items ?? [],
      status: "received",
      media_factory_entitled: true,
    }, { onConflict: "shopify_order_id", ignoreDuplicates: true })
    .select("id,status")
    .maybeSingle();
  if (eventInsertError) {
    console.error("Shopify test event persistence failed", eventInsertError);
    return Response.json({ ok: false, error: "Test event persistence failed" }, { status: 500 });
  }
  const { data: event } = inserted
    ? { data: inserted }
    : await supabase.from("shopify_test_order_events").select("id,status").eq("shopify_order_id", orderId).single();
  if (!event?.id) return Response.json({ ok: false, error: "Test event could not be recovered" }, { status: 500 });

  const jobs: Array<{ sku: string; job_id: string; status: string }> = [];
  for (const [sku, line] of grouped) {
    const product = eligible.get(sku);
    if (!product) continue;
    const { error: itemInsertError } = await supabase.from("shopify_test_order_items").upsert({
      event_id: event.id,
      product_sku: sku,
      product_id: product.id,
      product_title: product.title,
      quantity: line.quantity,
      line_total: line.total,
      status: "queued",
    }, { onConflict: "event_id,product_sku", ignoreDuplicates: true });
    if (itemInsertError) {
      console.error("Shopify test item persistence failed", { sku, itemInsertError });
      return Response.json({ ok: false, error: "Test item persistence failed", sku }, { status: 500 });
    }
    const { data: item } = await supabase.from("shopify_test_order_items")
      .select("id,factory_job_id,status")
      .eq("event_id", event.id).eq("product_sku", sku).single();
    if (!item) return Response.json({ ok: false, error: "Test item could not be recovered", sku }, { status: 500 });

    let jobId = item.factory_job_id as string | null;
    let jobStatus = item.status as string;
    if (!jobId) {
      const { data: latest } = await supabase.from("digital_product_factory_jobs")
        .select("version").eq("product_sku", sku).order("version", { ascending: false }).limit(1).maybeSingle();
      const version = Number(latest?.version ?? 0) + 1;
      const spec = buildShopifyTestMediaSpec(product, orderId);
      const { data: job, error: jobError } = await supabase.from("digital_product_factory_jobs").insert({
        product_id: product.id,
        product_sku: sku,
        product_title: product.title,
        provider: "gemini_api",
        status: "ready_for_generation",
        version,
        generation_spec: spec,
        package_spec: {
          package_type: "shopify_test_media_package",
          roles: spec.asset_slots.map((slot: any) => slot.role),
          test_only: true,
          publication_allowed: false,
        },
      }).select("id,status").single();
      if (jobError || !job) {
        console.error("Shopify test media job creation failed", { sku, jobError });
        return Response.json({ ok: false, error: "Test media job creation failed", sku }, { status: 500 });
      }
      jobId = job.id;
      jobStatus = job.status;
      const { error: linkError } = await supabase.from("shopify_test_order_items")
        .update({ factory_job_id: jobId, status: "queued", updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (linkError) return Response.json({ ok: false, error: "Test media job link failed", sku }, { status: 500 });
    }

    if (["queued", "failed"].includes(jobStatus)) {
      const { error: dispatchError } = await supabase.rpc("start_shopify_test_media_job", { _job_id: jobId });
      if (dispatchError) {
        await supabase.from("shopify_test_order_items")
          .update({ status: "failed", last_error: "Media generator dispatch failed", updated_at: new Date().toISOString() })
          .eq("id", item.id);
        console.error("Shopify test media dispatch failed", { sku, dispatchError });
        return Response.json({ ok: false, error: "Test media generator dispatch failed", sku }, { status: 502 });
      }
      jobStatus = "generating";
      await supabase.from("shopify_test_order_items")
        .update({ status: "generating", updated_at: new Date().toISOString() }).eq("id", item.id);
    }
    jobs.push({ sku, job_id: jobId, status: jobStatus });
  }

  const jobIds = jobs.map((job) => job.job_id);
  await supabase.from("shopify_test_order_events").update({
    factory_job_ids: jobIds,
    status: "media_generation_queued",
    updated_at: new Date().toISOString(),
  }).eq("id", event.id);
  return Response.json({
    ok: true,
    source: "shopify_test_order",
    test_only: true,
    order_id: orderId,
    test_entitlement: "digital_product_media_factory",
    media_jobs: jobs,
    required_asset_slots_per_product: 6,
    optional_asset_slots_per_product: 1,
    real_payment_ledger_written: false,
    production_entitlement_granted: false,
    customer_delivery_email_sent: false,
  });
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
        if (order.test === true) {
          return enqueueShopifyTestMedia(
            supabase, order, orderId, email, currency, grouped, eligible,
            webhookId, receivedStore,
          );
        }
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
