import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BUCKET = "digital-product-deliverables";
const MODEL = "gemini-2.5-flash";
const MAX_HTML_BYTES = 5_000_000;

type Row = Record<string, any>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}
function sanitizeHtmlFragment(input: string): string {
  return input
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta|base|svg|math|video|audio|picture|source|track)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta|base|svg|math|img|video|audio|picture|source|track)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src|srcset|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "")
    .trim();
}
function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safePathSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 120);
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const geminiKey = Deno.env.get("GEMINI_API_KEY");

function restHeaders(extra: Record<string, string> = {}) {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is unavailable");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}
async function restRows(table: string, query: string): Promise<Row[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: restHeaders(),
  });
  if (!response.ok) throw new Error(`Database read failed for ${table}: ${response.status}`);
  return await response.json();
}
async function patchRows(table: string, query: string, body: Row): Promise<Row[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Database update failed for ${table}: ${response.status}`);
  return await response.json();
}
async function ensurePrivateBucket() {
  const listResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, { headers: restHeaders() });
  if (listResponse.ok) {
    const buckets: Row[] = await listResponse.json();
    if (buckets.some((b) => b.id === BUCKET || b.name === BUCKET)) {
      const found = buckets.find((b) => b.id === BUCKET || b.name === BUCKET);
      if (found?.public === true) throw new Error("Digital delivery bucket exists but is public; refusing to store buyer deliverables there");
      return;
    }
  }
  const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: restHeaders(),
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: false,
      file_size_limit: MAX_HTML_BYTES,
      allowed_mime_types: ["text/html"],
    }),
  });
  if (createResponse.ok || createResponse.status === 409) {
    const verify = await fetch(`${supabaseUrl}/storage/v1/bucket/${BUCKET}`, { headers: restHeaders() });
    if (verify.ok) {
      const bucket = await verify.json();
      if (bucket.public === true) throw new Error("Digital delivery bucket is public; refusing to store buyer deliverables there");
      return;
    }
  }
  throw new Error(`Unable to ensure private storage bucket (HTTP ${createResponse.status})`);
}
async function generateGuide(product: Row, job: Row, buyerLabel: string): Promise<string> {
  if (!geminiKey) throw new Error("GEMINI_API_KEY is not configured for the delivery worker");
  const prompt = `Create a practical, high-quality customer digital guide for the purchased product below. Return ONLY a semantic HTML fragment (no markdown fences, no html/head/body wrapper, no scripts, no external links or images). Include headings, short paragraphs, lists, a clear getting-started section, a structured 7-day action plan where appropriate, progress tracking, adaptation options, and sensible safety notes. Do not invent product guarantees or medical outcomes. Avoid diagnosis/treatment claims, blood pressure/cholesterol claims, or promises of guaranteed body changes. For fitness content, encourage appropriate warm-up, gradual progression, rest, and stopping for pain or concerning symptoms. Do not include buyer personal data in the content; the system adds a separate visible ownership watermark.\n\nProduct title: ${product.title}\nSKU: ${job.product_sku}\nProduct type: ${product.product_type ?? "digital guide"}\nProduct description: ${String(product.body_html ?? "").replace(/<[^>]*>/g, " ").slice(0, 3000)}\nPurchase reference: ${job.payment_reference}\n\nWrite the guide for the actual product, not a generic advertisement.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 5000 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini content generation failed: HTTP ${response.status}`);
  const payload = await response.json();
  const raw = payload?.candidates?.[0]?.content?.parts?.map((p: Row) => p.text ?? "").join("\n") ?? "";
  if (!raw.trim()) throw new Error("Gemini returned no guide content");
  const fragment = sanitizeHtmlFragment(raw.replace(/^\s*```(?:html)?/i, "").replace(/```\s*$/, ""));
  if (fragment.length < 500) throw new Error("Generated guide is too short to count as a deliverable");
  return fragment;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "POST required" });
  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: "Supabase runtime configuration missing" });

  // Supabase JWT verification is enabled, and this worker additionally restricts calls to the service-role bearer.
  const authorization = req.headers.get("Authorization") ?? "";
  if (authorization !== `Bearer ${serviceRoleKey}`) return json(403, { error: "Service-role caller required" });

  let body: Row;
  try { body = await req.json(); } catch { return json(400, { error: "Expected JSON body" }); }
  const jobId = typeof body.job_id === "string" ? body.job_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
    return json(400, { error: "A valid job_id UUID is required" });
  }

  let claimed = false;
  try {
    const jobs = await restRows("digital_product_delivery_jobs", `id=eq.${jobId}&select=*`);
    const job = jobs[0];
    if (!job) return json(404, { error: "Delivery job not found" });
    if (job.status === "ready" || job.status === "delivered") {
      return json(200, { job_id: job.id, status: job.status, already_processed: true, output_sha256: job.output_sha256 });
    }
    if (!["queued", "failed"].includes(job.status)) {
      return json(409, { error: "Job is not claimable", status: job.status });
    }

    const claimedRows = await patchRows(
      "digital_product_delivery_jobs",
      `id=eq.${jobId}&status=in.(queued,failed)`,
      { status: "processing", attempts: Number(job.attempts ?? 0) + 1, last_error: null, updated_at: new Date().toISOString() },
    );
    if (claimedRows.length !== 1) return json(409, { error: "Job was claimed by another worker" });
    claimed = true;

    const payments = await restRows("payments", `id=eq.${encodeURIComponent(job.payment_id)}&select=id,status,paystack_ref,order_id,product_sku,user_id,customer_email,paid_at`);
    const payment = payments[0];
    if (!payment || payment.status !== "success" || !payment.paid_at) throw new Error("Payment is not verified as successful and paid");
    if (![payment.paystack_ref, payment.order_id].filter(Boolean).includes(job.payment_reference)) {
      throw new Error("Payment reference does not match the queued purchase");
    }
    if (payment.product_sku && payment.product_sku !== job.product_sku) throw new Error("Payment SKU does not match the queued product");

    const products = await restRows("products", `id=eq.${encodeURIComponent(job.product_id)}&select=id,title,sku,fulfillment_mode,body_html,product_type,handle`);
    const product = products[0];
    if (!product || product.sku !== job.product_sku || !["digital", "hybrid", "service", "subscription"].includes(product.fulfillment_mode)) {
      throw new Error("Canonical product record is missing or not eligible for digital fulfillment");
    }

    const buyerEmail = String(job.buyer_email ?? payment.customer_email ?? "").trim();
    const buyerUserId = String(job.buyer_user_id ?? payment.user_id ?? "").trim();
    if (!buyerEmail && !buyerUserId) throw new Error("No verified buyer identity is available for watermarking");
    const buyerLabel = buyerEmail || `user:${buyerUserId}`;
    const generatedAt = new Date().toISOString();
    const fragment = await generateGuide(product, job, buyerLabel);
    const watermark = `Licensed buyer: ${buyerLabel} | User ID: ${buyerUserId || "not available"} | Order reference: ${job.payment_reference}`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(product.title)}</title><style>body{font:16px/1.65 system-ui,-apple-system,sans-serif;max-width:860px;margin:0 auto;padding:24px;color:#191919}h1,h2,h3{line-height:1.25}header{border-bottom:2px solid #c7a34b;padding-bottom:12px;margin-bottom:24px}.ownership{border:1px solid #c7a34b;background:#fff9e8;padding:12px;margin:24px 0;overflow-wrap:anywhere;font-size:13px}.ownership strong{display:block}.disclaimer{font-size:12px;color:#555;border-top:1px solid #ddd;padding-top:12px;margin-top:28px}li{margin:.35em 0}@media print{body{max-width:none}.ownership{break-inside:avoid}}</style></head><body><header><p>RESOFIT · CHATB2K PERSONAL DIGITAL PRODUCT</p><h1>${escapeHtml(product.title)}</h1><p>Prepared for the verified purchaser</p></header><aside class="ownership"><strong>PERSONAL LICENSE — DO NOT REDISTRIBUTE</strong>${escapeHtml(watermark)}<br>Generated: ${escapeHtml(generatedAt)}</aside><main>${fragment}</main><footer class="disclaimer"><p>This educational guide is not medical advice. Adapt activities to your abilities and seek qualified professional guidance when appropriate.</p><p>${escapeHtml(watermark)}</p><p>Purchase reference: ${escapeHtml(job.payment_reference)} · SKU: ${escapeHtml(job.product_sku)}</p></footer></body></html>`;
    const bytes = new TextEncoder().encode(html);
    if (bytes.length > MAX_HTML_BYTES) throw new Error("Generated document exceeds the private bucket size limit");
    const sha256 = hex(await crypto.subtle.digest("SHA-256", bytes));
    await ensurePrivateBucket();

    const sku = safePathSegment(String(job.product_sku));
    const reference = safePathSegment(String(job.payment_reference));
    const objectPath = `${job.id}/${sku}-${reference}.html`;
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    const upload = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${encodedPath}`, {
      method: "POST",
      headers: restHeaders({ "Content-Type": "text/html; charset=utf-8", "x-upsert": "true" }),
      body: bytes,
    });
    if (!upload.ok) throw new Error(`Private asset upload failed: HTTP ${upload.status}`);

    const updated = await patchRows(
      "digital_product_delivery_jobs",
      `id=eq.${jobId}&status=eq.processing`,
      {
        status: "ready",
        output_bucket: BUCKET,
        output_path: objectPath,
        output_sha256: sha256,
        watermark_label: watermark,
        signed_link_issued_at: null,
        signed_link_expires_at: null,
        delivered_at: null,
        provenance: {
          generator: "gemini_api",
          model: MODEL,
          mime_type: "text/html",
          generated_at: generatedAt,
          payment_id: payment.id,
          product_id: product.id,
          storage_visibility: "private",
          output_sha256: sha256,
          notification_status: "pending",
          delivery_status: "asset_ready_link_not_issued",
        },
        updated_at: new Date().toISOString(),
      },
    );
    if (updated.length !== 1) throw new Error("Asset uploaded but delivery job state could not be finalized");
    return json(200, {
      job_id: job.id,
      status: "ready",
      output_bucket: BUCKET,
      output_path: objectPath,
      output_sha256: sha256,
      watermark_applied: true,
      private_storage: true,
      signed_link_issued: false,
      buyer_notification: "pending",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown delivery worker failure";
    if (claimed) {
      try {
        await patchRows("digital_product_delivery_jobs", `id=eq.${jobId}&status=eq.processing`, {
          status: "failed",
          last_error: message.slice(0, 1000),
          updated_at: new Date().toISOString(),
        });
      } catch { /* preserve the original failure */ }
    }
    return json(500, { error: message, job_id: jobId, status: claimed ? "failed" : "not_started" });
  }
});
