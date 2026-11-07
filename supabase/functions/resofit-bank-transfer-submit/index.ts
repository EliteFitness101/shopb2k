import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const allowedOrigins = new Set(["https://resofit.fit", "https://www.resofit.fit", "https://store.resofit.fit"]);
const accountId = "Union Bank | Resonance Fitness | 0149704422";
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://www.resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, origin);

  try {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }, origin); }

    const sku = String(body.sku ?? "").trim().slice(0, 128);
    const name = String(body.name ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 255);
    const phone = String(body.phone ?? "").trim().slice(0, 32);
    const evidenceUrl = String(body.evidence_url ?? "").trim().slice(0, 2048);
    const transactionRef = String(body.transaction_reference ?? "").trim().slice(0, 128);

    if (!sku || !name || !email || !phone) return json(400, { error: "missing_required_fields" }, origin);
    const emailParts = email.split("@");
    if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]?.includes(".")) {
      return json(400, { error: "invalid_email" }, origin);
    }
    if (evidenceUrl) {
      try {
        if (new URL(evidenceUrl).protocol !== "https:") return json(400, { error: "evidence_url_must_be_https" }, origin);
      } catch {
        return json(400, { error: "invalid_evidence_url" }, origin);
      }
    }

    let userId: string | null = null;
    const authorization = req.headers.get("authorization") ?? "";
    const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
    if (bearer) {
      const { data, error } = await admin.auth.getUser(bearer);
      if (error || !data.user) return json(401, { error: "invalid_session" }, origin);
      userId = data.user.id;
    }

    const { data: product, error: productError } = await admin
      .from("products")
      .select("sku,title,variant_price,published,fulfillment_mode")
      .eq("sku", sku)
      .eq("published", true)
      .maybeSingle();
    if (productError) return json(500, { error: "catalog_lookup_failed" }, origin);
    if (!product) return json(404, { error: "published_product_not_found" }, origin);
    if (String(product.fulfillment_mode).toLowerCase() !== "service") {
      return json(409, { error: "bank_transfer_submission_only_available_for_service_products" }, origin);
    }

    const amount = Number(product.variant_price);
    if (!Number.isFinite(amount) || amount <= 0) return json(409, { error: "product_not_sellable" }, origin);

    const reference = "RF-BT-" + Date.now() + "-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    const note = [
      "SKU: " + sku,
      "Product: " + String(product.title).slice(0, 180),
      transactionRef ? "Customer transaction reference: " + transactionRef : null,
    ].filter(Boolean).join(" | ");

    const { data: request, error: insertError } = await admin
      .from("custom_payment_requests")
      .insert({
        order_reference: reference,
        user_id: userId,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        amount_ngn: amount,
        method: "bank_transfer",
        account_id: accountId,
        evidence_url: evidenceUrl || null,
        customer_note: note,
        product_sku: sku,
        status: "pending_review",
      })
      .select("id,order_reference,amount_ngn,status,product_sku,created_at")
      .single();

    if (insertError) {
      console.error("bank transfer request persistence failed", insertError.message);
      return json(500, { error: "submission_persistence_failed" }, origin);
    }

    return json(201, {
      ok: true,
      request_id: request.id,
      reference: request.order_reference,
      amount_ngn: Number(request.amount_ngn),
      product_sku: request.product_sku,
      status: request.status,
      message: "Transfer details submitted. Your coaching access remains pending until the payment is manually verified.",
    }, origin);
  } catch (error) {
    console.error("bank transfer submission failed", String(error));
    return json(500, { error: "bank_transfer_submission_failed" }, origin);
  }
});