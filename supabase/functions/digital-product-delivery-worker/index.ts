import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import JSZip from "npm:jszip@3.10.1";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = "resofit-paid-deliverables";
const SIGNED_TTL_SECONDS = 7 * 24 * 60 * 60;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
async function makeDigitalPdf(buyerName: string, reference: string, productTitle: string, productSku: string, productType: string, experience: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(productTitle);
  pdf.setAuthor("ResoFit / ResoFlex");
  pdf.setSubject("Digital wellness and fitness guide");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.72, 0.59, 0.36), ink = rgb(0.12, 0.12, 0.13), muted = rgb(0.34, 0.34, 0.36);
  const category = (productSku + " " + productTitle + " " + productType).toLowerCase();
  const curves = /butt|curve|b2k|glute/.test(category);
  const core = /abs|core|six.?pack/.test(category);
  const lifestyle = /lifestyle|habit/.test(category) || (/reset/.test(category) && !/meal|workout|body|fitness|nutrition|program/.test(category));
  const durationRaw = Number(experience?.plan?.duration_days ?? experience?.plan?.days ?? (/90|ninety/.test(category) ? 90 : /30|thirty/.test(category) ? 30 : 7));
  const duration = Math.max(7, Math.min(90, Number.isFinite(durationRaw) ? durationRaw : 7));
  let page: any, y = 0;
  const newPage = (cover = false) => {
    page = pdf.addPage([612, 792]);
    page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: rgb(0.985, 0.982, 0.972) });
    page.drawRectangle({ x: 0, y: 744, width: 612, height: 48, color: ink });
    page.drawText("RESOFIT / RESOFLEX", { x: 42, y: 762, size: 11, font: bold, color: gold });
    page.drawText("OBSERVE. DECIDE. EXECUTE. VERIFY. RECOVER. LEARN. CARE.", { x: 42, y: 28, size: 7, font: regular, color: muted });
    y = cover ? 690 : 710;
  };
  const paragraph = (text: string, size = 10, isBold = false, color = muted, gap = 5) => {
    const font = isBold ? bold : regular;
    for (const line of wrap(text, font, size, 526)) {
      if (y < 58) newPage();
      page.drawText(line, { x: 43, y, size, font, color });
      y -= size + 4;
    }
    y -= gap;
  };
  const heading = (text: string) => {
    if (y < 95) newPage();
    y -= 5;
    page.drawText(text, { x: 43, y, size: 13, font: bold, color: ink });
    y -= 21;
  };
  const listText = (value: any): string => {
    if (Array.isArray(value)) return value.map((x) => String(x)).join("; ");
    if (value && typeof value === "object") return Object.entries(value).map(([k, v]) => k + ": " + (Array.isArray(v) ? v.join(", ") : String(v))).join(". ");
    return String(value ?? "").trim();
  };
  newPage(true);
  let titleY = 650;
  for (const line of wrap(productTitle, bold, 20, 526)) {
    page.drawText(line, { x: 42, y: titleY, size: 20, font: bold, color: ink });
    titleY -= 25;
  }
  page.drawText("A practical ResoFit digital guide", { x: 43, y: titleY - 5, size: 12, font: regular, color: gold });
  y = titleY - 45;
  paragraph("Prepared for: " + buyerName, 11, true, ink, 2);
  paragraph("Order reference: " + reference, 8, false, muted, 10);
  const summary = listText(experience?.promise?.summary);
  if (summary) paragraph(summary, 10, false, ink, 6);
  const focus = listText(experience?.plan?.focus);
  if (focus) paragraph("Program focus: " + focus, 9.5, false, muted, 8);
  heading("HOW TO USE THIS GUIDE");
  paragraph("Build repeatable routines rather than chasing a perfect week. Scale activity to your current ability, use affordable foods you enjoy, and adjust portions to appetite and needs. Progress is individual; this guide does not guarantee a particular result.", 10);
  if (curves) {
    heading("WEEKLY TRAINING STRUCTURE");
    paragraph("Train on three non-consecutive days each week. Alternate lower-body strength, full-body support and lower-body technique sessions. Use other days for walking, mobility or recovery.", 10);
    heading("MOVEMENT LIBRARY");
    paragraph("Options: chair squat or bodyweight squat, hip bridge, hip hinge, supported split squat, step-up to a stable low step, side-lying leg raise and calf raise. Choose 4-5 movements per session, 2-3 controlled sets, and stop with good form.", 10);
    paragraph("Progression: begin with a range of motion and resistance you can control. When repetitions feel steady, add a few repetitions or a small amount of resistance, not both at once. Rest between sessions and avoid training through sharp pain.", 10);
    heading("SUPPORTING HABITS");
    paragraph("Include protein foods at main meals, eat enough to support activity, hydrate regularly and get adequate sleep. No exercise or food guarantees a particular body shape; health, training history and consistency influence outcomes.", 10);
  } else if (core) {
    heading("CORE TRAINING STRUCTURE");
    paragraph("Use two or three non-consecutive sessions each week. Keep repetitions controlled, breathe continuously, and stop before form breaks down. Pair training with walking, adequate recovery and balanced meals; abdominal exercises do not selectively remove body fat.", 10);
    heading("MOVEMENT LIBRARY");
    paragraph("Choose 4-5 movements: dead bug, bird dog, front plank from knees or toes, side plank from knees, reverse crunch, glute bridge and controlled mountain climber. Start with 2 sets of a comfortable duration or 6-10 controlled repetitions. Rest between sets.", 10);
    heading("PROGRESSION");
    paragraph("When the current variation feels steady, add a few seconds or repetitions, or choose a slightly harder variation. Change one variable at a time. Stop for sharp pain, dizziness or unusual shortness of breath.", 10);
    heading("SUPPORTING HABITS");
    paragraph("Eat regular balanced meals, include protein and vegetables or fruit where practical, hydrate and prioritize sleep. No exercise guarantees a particular appearance or timeline.", 10);
  } else if (lifestyle) {
    heading("SEVEN-DAY HABIT RESET");
    for (const item of [
      "Day 1: plan two simple meals and place water where you can see it.",
      "Day 2: add a comfortable walk or movement break to your day.",
      "Day 3: prepare one protein option and one staple for tomorrow.",
      "Day 4: set a wind-down cue and protect your sleep routine.",
      "Day 5: notice stress triggers and take a short breathing or stretching break.",
      "Day 6: organize your space so one healthy action is easier.",
      "Day 7: review what worked and choose three habits to repeat."
    ]) paragraph(item, 10, false, muted, 2);
    heading("MAKE IT SUSTAINABLE");
    paragraph("Start small, connect a new habit to an existing routine, and track consistency rather than perfection. If a day goes off plan, return to the next helpful action without punishment or extreme restriction.", 10);
  } else {
    heading("YOUR 7-DAY NIGERIAN MEAL GUIDE");
    const days = [
      ["DAY 1", "Breakfast: oats, banana and eggs. Lunch: jollof rice, grilled chicken and vegetables. Dinner: beans, boiled plantain and greens. Snack: orange and a small handful of groundnuts.", "Movement: squat or sit-to-stand, wall push-up, hip hinge, row with a bag, and plank. Do 2-3 comfortable sets."],
      ["DAY 2", "Breakfast: pap, moi moi and fruit. Lunch: ofada rice, lean beef or beans, and vegetables. Dinner: grilled fish, sweet potato and salad. Snack: fruit with yoghurt or fortified soy yoghurt.", "Movement: brisk walk, dance or cycle for 20-30 minutes, then gentle mobility."],
      ["DAY 3", "Breakfast: whole-grain toast, eggs and avocado. Lunch: beans, rice, grilled fish and vegetables. Dinner: chicken pepper soup, yam and greens. Snack: apple and unsalted nuts.", "Movement: squat variation, supported step-back, hip bridge, calf raise and dead bug. Scale range and sets to comfort."],
      ["DAY 4", "Breakfast: yam with egg and tomato sauce. Lunch: rice, beans, chicken and vegetables. Dinner: efo riro with protein and a sensible swallow portion. Snack: banana with peanut butter.", "Recovery: easy walk for 15-25 minutes and light stretching."],
      ["DAY 5", "Breakfast: oats, pawpaw and eggs. Lunch: sweet potato, grilled chicken and vegetables. Dinner: beans porridge, fish and greens. Snack: watermelon and nuts.", "Movement: wall or incline push-up, row, shoulder raise with light bottles, curl and side plank. Keep movements controlled."],
      ["DAY 6", "Breakfast: moi moi, fruit and an unsweetened drink. Lunch: jollof rice, fish and vegetables. Dinner: boiled plantain, egg sauce and salad. Snack: pear or seasonal fruit with nuts.", "Movement: 20-30 minutes of walking, dancing or another activity you enjoy. Keep the pace conversational."],
      ["DAY 7", "Breakfast: pap, eggs and fruit. Lunch: yam, fish and vegetable sauce. Dinner: beans, rice and vegetables. Snack: pawpaw with yoghurt or fortified soy yoghurt.", "Review the week. Repeat choices that felt realistic; plan two protein options and one staple ahead for the next week."]
    ];
    for (const item of days) {
      heading(item[0]);
      paragraph(item[1], 9.5, false, muted, 2);
      paragraph(item[2], 9.5, false, ink, 7);
    }
    heading("PROGRAM TIMELINE");
    if (duration > 7) paragraph("Use this flexible seven-day cycle throughout the " + duration + "-day program. Weeks 1-2: establish routine and comfortable technique. Weeks 3-4: repeat habits and add a small progression only when recovery is good. For longer programs, repeat the cycle, review progress every two weeks, and adjust variety or resistance gradually.", 10);
    else paragraph("Repeat meals you enjoy, substitute familiar affordable foods, and choose movement that fits your current ability.", 10);
  }
  const mealGuidance = listText(experience?.meal_workout?.guidance);
  if (mealGuidance) { heading("PRODUCT GUIDANCE"); paragraph(mealGuidance, 9.5, false, muted, 4); }
  const lifestyleFocus = listText(experience?.lifestyle_hacks?.focus);
  if (lifestyleFocus) paragraph("Lifestyle focus: " + lifestyleFocus, 9.5, false, muted, 4);
  heading("DAILY CHECKLIST");
  for (const item of [
    "Include protein at main meals and add vegetables or fruit where practical.",
    "Drink water regularly and keep a bottle visible.",
    "Move in a way that fits your current ability.",
    "Set a consistent wind-down time and aim for adequate sleep.",
    "Prepare one thing that makes tomorrow easier.",
    "Note energy, hunger, mood and what you want to repeat."
  ]) paragraph("[ ] " + item, 9.5, false, muted, 1);
  heading("SAFE, FLEXIBLE SUBSTITUTIONS");
  paragraph("Protein options include eggs, beans, moi moi, fish, chicken, lean meat, tofu or fortified soy options. Staples include rice, yam, plantain, potatoes, oats, maize, beans or whole-grain bread. Use affordable seasonal vegetables and fruit. Swap foods that do not suit your budget, preference or tolerance.", 10);
  heading("IMPORTANT NOTE");
  paragraph("This guide is general education, not medical advice or a personalized prescription. It does not promise weight loss or a particular result. If pregnant, managing a medical condition, recovering from injury, or unsure whether an activity is appropriate, consult a qualified health professional before making major changes.", 9);
  for (const p of pdf.getPages()) p.drawText("RESOFIT DIGITAL GUIDE - PERSONAL USE", { x: 385, y: 28, size: 7, font: regular, color: gold });
  return await pdf.save();
}
const ALLOWED_MEDIA_MIME = new Set(["image/png","image/jpeg","image/webp","video/mp4","video/webm","audio/mpeg","audio/mp4","audio/wav","audio/ogg","application/pdf","text/plain"]);
const MEDIA_MAX_ASSET_BYTES = 20 * 1024 * 1024;
const MEDIA_MAX_BUNDLE_BYTES = 60 * 1024 * 1024;
async function buildApprovedMediaBundle(productSku: string, pdfBytes: Uint8Array) {
  const { data: factoryJob, error: factoryError } = await db.from("digital_product_factory_jobs")
    .select("id,approved_asset_count,updated_at")
    .eq("product_sku", productSku)
    .gt("approved_asset_count", 0)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (factoryError) throw factoryError;
  if (!factoryJob) return null;
  const { data: links, error: linksError } = await db.from("digital_product_factory_assets")
    .select("content_asset_id,role,status")
    .eq("job_id", factoryJob.id)
    .eq("status", "attached");
  if (linksError) throw linksError;
  const assetIds = [...new Set((links ?? []).map((row: any) => String(row.content_asset_id)).filter(Boolean))];
  if (!assetIds.length) return null;
  const { data: rows, error: assetsError } = await db.from("content_asset_registry")
    .select("id,canonical_url,mime_type,asset_type,qa_status,rights_status,commercial_status")
    .in("id", assetIds);
  if (assetsError) throw assetsError;
  const roleById = new Map((links ?? []).map((row: any) => [String(row.content_asset_id), String(row.role ?? "media")]));
  const eligible = (rows ?? []).filter((asset: any) =>
    asset.qa_status === "approved" &&
    asset.rights_status === "verified" &&
    asset.commercial_status === "authorized" &&
    ALLOWED_MEDIA_MIME.has(String(asset.mime_type ?? "").toLowerCase())
  );
  if (!eligible.length) return null;
  if (eligible.length > 10) throw new Error("MEDIA_BUNDLE_ASSET_LIMIT_EXCEEDED");
  const zip = new JSZip();
  zip.file("ResoFit-Digital-Guide.pdf", pdfBytes);
  const included: string[] = [];
  let totalBytes = pdfBytes.byteLength;
  const supabaseHost = new URL(url).hostname;
  const extensions: Record<string, string> = {
    "image/png":"png","image/jpeg":"jpg","image/webp":"webp",
    "video/mp4":"mp4","video/webm":"webm",
    "audio/mpeg":"mp3","audio/mp4":"m4a","audio/wav":"wav","audio/ogg":"ogg",
    "application/pdf":"pdf","text/plain":"txt"
  };
  for (const asset of eligible) {
    const parsed = new URL(String(asset.canonical_url ?? ""));
    const isSupabasePublicStorage = parsed.hostname === supabaseHost && parsed.pathname.startsWith("/storage/v1/object/public/");
    const isVercelBlob = parsed.hostname.endsWith(".public.blob.vercel-storage.com");
    if (parsed.protocol !== "https:" || (!isSupabasePublicStorage && !isVercelBlob)) throw new Error("MEDIA_SOURCE_HOST_NOT_ALLOWED");
    const response = await fetch(parsed.toString(), { redirect: "error" });
    if (!response.ok) throw new Error("MEDIA_SOURCE_FETCH_FAILED:" + response.status);
    const declaredMime = String(asset.mime_type).toLowerCase();
    const responseMime = String(response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (responseMime && responseMime !== declaredMime) throw new Error("MEDIA_MIME_TYPE_MISMATCH");
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MEDIA_MAX_ASSET_BYTES) throw new Error("MEDIA_ASSET_SIZE_OUT_OF_RANGE");
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (!buffer.byteLength || buffer.byteLength > MEDIA_MAX_ASSET_BYTES) throw new Error("MEDIA_ASSET_SIZE_OUT_OF_RANGE");
    totalBytes += buffer.byteLength;
    if (totalBytes > MEDIA_MAX_BUNDLE_BYTES) throw new Error("MEDIA_BUNDLE_SIZE_LIMIT_EXCEEDED");
    const role = (roleById.get(String(asset.id)) ?? String(asset.asset_type ?? "media")).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) || "media";
    zip.file("media/" + role + "-" + String(asset.id).slice(0, 8) + "." + extensions[declaredMime], buffer);
    included.push(String(asset.id));
  }
  if (!included.length) return null;
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { bytes, sha256, asset_ids: included, asset_count: included.length, factory_job_id: factoryJob.id };
}

async function updateFulfillment(reference: string, job: any, signedExpiry: string) {
  const { data: order } = await db.from("resofit_fulfillment_orders").select("id,status,metadata").eq("payment_reference", reference).maybeSingle();
  if (order) {
    await db.from("resofit_fulfillment_orders").update({
      status: "completed",
      metadata: { ...(order.metadata ?? {}), digital_delivery_status: "delivered", digital_delivery_job_id: job.id, output_bucket: job.output_bucket, output_path: job.output_path, signed_link_expires_at: signedExpiry, fulfillment_hold_reason: null, fulfilled_by: "private signed digital delivery" },
      updated_at: new Date().toISOString()
    }).eq("id", order.id);
    await db.from("resofit_fulfillment_events").insert({
      fulfillment_order_id: order.id, from_status: order.status, to_status: "completed",
      detail: { reason: "private digital download link issued", delivery_job_id: job.id, payment_reference: reference, signed_link_expires_at: signedExpiry }
    });
  }
  await db.from("store_orders").update({ fulfillment_status: "ready", fulfilled_at: new Date().toISOString(), metadata: { digital_delivery_status: "delivered", digital_delivery_job_id: job.id, output_bucket: job.output_bucket, output_path: job.output_path }, updated_at: new Date().toISOString() }).eq("gateway_reference", reference);
}
let claimedJob: any = null;
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204 });
  if (req.method !== "POST") return json({ ok: false, error: "POST required" }, 405);
  const secret = req.headers.get("x-digital-delivery-cron-secret") ?? "";
  const { data: authorized, error: authError } = await db.rpc("verify_digital_delivery_cron_secret", { p_secret: secret });
  if (authError || authorized !== true) return json({ ok: false, error: "Unauthorized" }, 401);
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action === "self_test") {
      const sample = await makeDigitalPdf("ResoFit QA", "QA-NO-PAYMENT", "ResoFit 7-Day Meal & Workout Reset", "res-dig-reset", "Digital", {});
      const digest = await crypto.subtle.digest("SHA-256", sample);
      const sha256 = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const fromEmail = Deno.env.get("RESOFIT_FROM_EMAIL") ?? "no-reply@resofit.fit";
      return json({ ok: true, status: "self_test", byte_length: sample.length, output_sha256: sha256, resend_configured: Boolean(Deno.env.get("RESEND_API_KEY")), from_email_configured: /^[^\s@]+@resofit\.fit$/i.test(fromEmail), from_email_source: Deno.env.get("RESOFIT_FROM_EMAIL") ? "environment" : "verified-default" });
    }
    const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const { data: jobs, error: claimError } = await db.rpc("claim_resofit_digital_delivery_job", { p_email_configured: Boolean(resendKey) });
    if (claimError) throw claimError;
    const job = Array.isArray(jobs) ? jobs[0] : jobs;
    claimedJob = job ?? null;
    if (!job) return json({ ok: true, status: "idle" });
    const { data: payment, error: paymentError } = await db.from("payments").select("id,customer_email,metadata,product_sku,status").eq("id", job.payment_id).maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment || payment.status !== "success" || payment.product_sku !== job.product_sku) throw new Error("Payment ledger is not verified for this delivery job");
    const { data: product, error: productError } = await db.from("products").select("id,sku,title,published,fulfillment_mode,product_type").eq("id", job.product_id).maybeSingle();
    if (productError) throw productError;
    if (!product || product.sku !== job.product_sku || product.published !== true || product.fulfillment_mode !== "digital" || String(product.sku).startsWith("MX-")) throw new Error("Canonical product is not eligible for ResoFit digital delivery");
    const name = String(payment.metadata?.customer_name ?? payment.metadata?.name ?? payment.customer_email?.split("@")[0] ?? "ResoFit Customer").trim().slice(0, 100) || "ResoFit Customer";
    const { data: experience } = await db.from("resofit_product_experience_config").select("promise,plan,meal_workout,lifestyle_hacks").eq("product_sku", product.sku).maybeSingle();
    const bytes = await makeDigitalPdf(name, String(job.payment_reference), product.title, product.sku, product.product_type ?? "", experience);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const folder = String(product.sku).replace(/[^A-Za-z0-9_-]/g, "_");
    const path = folder + "/" + job.id + ".pdf";
    const { error: uploadError } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: true, cacheControl: "0" });
    if (uploadError) throw uploadError;
    let mediaBundle: { path: string; sha256: string; asset_ids: string[]; asset_count: number; factory_job_id: string } | null = null;
    let mediaBundleStatus = "not_available";
    let mediaBundleError: string | null = null;
    try {
      const bundle = await buildApprovedMediaBundle(product.sku, bytes);
      if (bundle) {
        const bundlePath = folder + "/" + job.id + ".bundle.zip";
        const { error: bundleUploadError } = await db.storage.from(BUCKET).upload(bundlePath, bundle.bytes, { contentType: "application/zip", upsert: true, cacheControl: "0" });
        if (bundleUploadError) throw bundleUploadError;
        mediaBundle = { path: bundlePath, sha256: bundle.sha256, asset_ids: bundle.asset_ids, asset_count: bundle.asset_count, factory_job_id: bundle.factory_job_id };
        mediaBundleStatus = "available";
      }
    } catch (bundleError) {
      mediaBundleStatus = "failed";
      mediaBundleError = (bundleError instanceof Error ? bundleError.message : String(bundleError)).slice(0, 240);
      console.error("digital media bundle unavailable", { job_id: job.id, reason: mediaBundleError });
    }
    const provenance = { ...(job.provenance ?? {}), generated_by: "digital-product-delivery-worker", generator_version: "1.1", source_payment_id: payment.id, payment_reference: job.payment_reference, product_sku: job.product_sku, content_sha256: sha256, generated_at: new Date().toISOString(), delivery_bucket: BUCKET, delivery_path: path, media_bundle_status: mediaBundleStatus, media_bundle_bucket: mediaBundle ? BUCKET : null, media_bundle_path: mediaBundle?.path ?? null, media_bundle_sha256: mediaBundle?.sha256 ?? null, media_bundle_asset_ids: mediaBundle?.asset_ids ?? [], media_bundle_asset_count: mediaBundle?.asset_count ?? 0, media_bundle_factory_job_id: mediaBundle?.factory_job_id ?? null, media_bundle_error: mediaBundleError, content_policy: "general wellness education; no medical or guaranteed-outcome claims" };
    const { data: updated, error: updateError } = await db.from("digital_product_delivery_jobs").update({ status: "ready", output_bucket: BUCKET, output_path: path, output_sha256: sha256, watermark_label: name, provenance, last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id).select("*").single();
    if (updateError) throw updateError;
    let emailSent = false;
    const buyerEmail = String(job.buyer_email ?? payment.customer_email ?? "").trim().toLowerCase();
    if (resendKey && buyerEmail) {
      const { data: signed, error: signError } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS, { download: "ResoFit-Digital-Guide.pdf" });
      const signedBundle = mediaBundle ? await db.storage.from(BUCKET).createSignedUrl(mediaBundle.path, SIGNED_TTL_SECONDS, { download: "ResoFit-Media-Bundle.zip" }) : null;
      if (!signError && signed?.signedUrl) {
        const from = Deno.env.get("RESOFIT_FROM_EMAIL") ?? "no-reply@resofit.fit";
        const greeting = name.replace(/[&<>"]/g, "");
        const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [buyerEmail], subject: "Your " + product.title + " download", html: "<p>Hello " + greeting + ",</p><p>Your payment is verified and your " + product.title.replace(/[&<>"]/g, "") + " guide is ready.</p><p><a href=\"" + signed.signedUrl + "\">Download your private PDF guide</a> (link valid for 7 days).</p>" + (mediaBundle && signedBundle?.data?.signedUrl && !signedBundle.error ? "<p><a href=\"" + signedBundle.data.signedUrl + "\">Download the complete media bundle (PDF + approved images/video/audio/documents)</a> (link valid for 7 days).</p>" : "") + (mediaBundleStatus === "failed" ? "<p>Your PDF is ready. The optional media bundle could not be prepared yet; support can retry it.</p>" : "") + "<p>Keep these links private. If a link expires, return to your payment confirmation page to request a fresh link.</p><p>ResoFit / ResoFlex</p>" }) });
        emailSent = response.ok;
        if (!response.ok) console.error("delivery email failed", { status: response.status, job_id: job.id });
        if (emailSent) {
          const expiry = new Date(Date.now() + SIGNED_TTL_SECONDS * 1000).toISOString();
          const { error: deliveredError } = await db.from("digital_product_delivery_jobs").update({ status: "delivered", signed_link_issued_at: new Date().toISOString(), signed_link_expires_at: expiry, delivered_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id);
          if (deliveredError) throw deliveredError;
          await updateFulfillment(job.payment_reference, updated, expiry);
        }
      }
    }
    return json({ ok: true, status: emailSent ? "delivered" : "ready", job_id: job.id, email_sent: emailSent, output_sha256: sha256, media_bundle_status: mediaBundleStatus, media_bundle_asset_count: mediaBundle?.asset_count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (claimedJob?.id) await db.from("digital_product_delivery_jobs").update({ status: "failed", last_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", claimedJob.id);
    console.error("digital delivery worker failed", message);
    return json({ ok: false, error: message }, 500);
  }
});