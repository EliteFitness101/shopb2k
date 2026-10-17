import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = "resofit-paid-deliverables";
const DOWNLOAD_TTL_SECONDS = 5 * 60;
const ACCESS_TTL_SECONDS = 30 * 24 * 60 * 60;
const OTP_TTL_SECONDS = 10 * 60;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomHex(bytes = 32): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}
function maskedEmail(value: string): string {
  const [local, domain] = value.split("@");
  if (!local || !domain) return "your purchase email";
  return (local.length < 3 ? local[0] ?? "*" : local.slice(0, 2)) + "***@" + domain;
}
function accessPage(token: string, email: string): Response {
  const safeToken = JSON.stringify(token);
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Secure ResoFit download</title>
  <style>body{font:16px system-ui,sans-serif;max-width:560px;margin:8vh auto;padding:24px;color:#171717}main{border:1px solid #ddd;border-radius:16px;padding:24px}button,input{font:inherit;padding:12px;border-radius:8px;width:100%;box-sizing:border-box;margin:8px 0}button{background:#171717;color:#fff;border:0;cursor:pointer}input{border:1px solid #aaa}small{color:#555}#status{min-height:24px}</style>
  <main><h1>Your private ResoFit download</h1><p>This access link has expired. Verify that you control the purchase email (${escapeHtml(maskedEmail(email))}) and we’ll send a fresh secure link.</p>
  <button id="send">Email me a verification code</button><form id="verify" hidden><label for="code">6-digit verification code</label><input id="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required><button type="submit">Verify and email a fresh link</button></form><p id="status" role="status"></p><small>Download links are short-lived. We re-check payment eligibility before each download.</small></main>
  <script>const token=${safeToken};const status=document.getElementById("status");const verify=document.getElementById("verify");document.getElementById("send").addEventListener("click",async()=>{status.textContent="Requesting code…";const r=await fetch(location.pathname+location.search,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"request_code",token})});const d=await r.json().catch(()=>({}));status.textContent=d.message|| (r.ok?"If eligible, a code has been sent.":"Unable to send a code. Try again later.");if(r.ok)verify.hidden=false;});verify.addEventListener("submit",async(e)=>{e.preventDefault();status.textContent="Verifying…";const r=await fetch(location.pathname+location.search,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"verify_code",token,code:document.getElementById("code").value})});const d=await r.json().catch(()=>({}));status.textContent=d.message||(r.ok?"A fresh link has been emailed.":"Code invalid or expired.");if(r.ok)verify.hidden=true;});</script></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'" } });
}
async function findSession(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  const tokenHash = await sha256Hex(token.toLowerCase());
  const { data } = await db.from("resofit_digital_access_sessions").select("id,delivery_job_id,expires_at,revoked_at").eq("token_hash", tokenHash).maybeSingle();
  return data ?? null;
}
async function eligibleJob(jobId: string) {
  const { data: job } = await db.from("digital_product_delivery_jobs").select("id,payment_id,payment_reference,product_id,product_sku,product_title,buyer_email,status,output_bucket,output_path").eq("id", jobId).maybeSingle();
  if (!job || job.status !== "delivered" || !job.output_path || job.output_bucket !== BUCKET) return null;
  const { data: payment } = await db.from("payments").select("id,status,customer_email,product_sku").eq("id", job.payment_id).maybeSingle();
  if (!payment || payment.status !== "success" || payment.product_sku !== job.product_sku) return null;
  const { data: product } = await db.from("products").select("id,sku,published,fulfillment_mode").eq("id", job.product_id).maybeSingle();
  if (!product || product.sku !== job.product_sku || product.published !== true || String(product.fulfillment_mode).toLowerCase() !== "digital" || String(product.sku).startsWith("MX-")) return null;
  const email = String(job.buyer_email ?? payment.customer_email ?? "").trim().toLowerCase();
  if (!email) return null;
  return { ...job, buyer_email: email };
}
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!key) return false;
  const from = Deno.env.get("RESOFIT_FROM_EMAIL") ?? "no-reply@resofit.fit";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html })
  });
  return response.ok;
}
async function issueAccessSession(jobId: string): Promise<{ token: string; expiresAt: string }> {
  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000).toISOString();
  const { error } = await db.from("resofit_digital_access_sessions").insert({ delivery_job_id: jobId, token_hash: await sha256Hex(token), expires_at: expiresAt });
  if (error) throw error;
  return { token, expiresAt };
}
function accessUrl(token: string): string {
  return url + "/functions/v1/digital-product-delivery-access?token=" + encodeURIComponent(token);
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "https://resofit.fit", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type", "vary": "origin" } });
  const origin = req.headers.get("origin");
  if (origin && origin !== "https://resofit.fit" && origin !== "https://www.resofit.fit") return json({ ok: false, error: "Origin not allowed" }, 403);
  const tokenFromUrl = new URL(req.url).searchParams.get("token") ?? "";
  if (req.method === "GET") {
    const session = await findSession(tokenFromUrl);
    if (!session || session.revoked_at) return new Response("This access link is invalid. Please contact ResoFit support.", { status: 404, headers: { "cache-control": "no-store" } });
    const job = await eligibleJob(session.delivery_job_id);
    if (!job) return new Response("This purchase is not currently eligible for digital delivery.", { status: 403, headers: { "cache-control": "no-store" } });
    if (new Date(session.expires_at).getTime() > Date.now()) {
      const { data: signed, error } = await db.storage.from(BUCKET).createSignedUrl(job.output_path, DOWNLOAD_TTL_SECONDS, { download: "ResoFit-Digital-Guide.pdf" });
      if (error || !signed?.signedUrl) return new Response("Download temporarily unavailable. Please try again later.", { status: 503, headers: { "cache-control": "no-store" } });
      return new Response(null, { status: 302, headers: { location: signed.signedUrl, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
    }
    return accessPage(tokenFromUrl.toLowerCase(), job.buyer_email);
  }
  if (req.method !== "POST") return json({ ok: false, error: "GET or POST required" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const token = String(body?.token ?? tokenFromUrl).toLowerCase();
  const session = await findSession(token);
  if (!session || session.revoked_at) return json({ ok: false, message: "This access link is invalid. Please contact ResoFit support." }, 404);
  const job = await eligibleJob(session.delivery_job_id);
  if (!job) return json({ ok: false, message: "This purchase is not currently eligible for digital delivery." }, 403);
  const now = new Date().toISOString();

  if (action === "request_code") {
    if (!Deno.env.get("RESEND_API_KEY")) return json({ ok: false, message: "Email delivery is temporarily unavailable." }, 503);
    const { data: recent } = await db.from("resofit_digital_access_challenges").select("created_at").eq("delivery_job_id", job.id).gte("created_at", new Date(Date.now() - 60_000).toISOString());
    if ((recent ?? []).length >= 1) return json({ ok: false, message: "A code was requested recently. Check your email or wait one minute." }, 429);
    const { data: hourly } = await db.from("resofit_digital_access_challenges").select("id").eq("delivery_job_id", job.id).gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString());
    if ((hourly ?? []).length >= 5) return json({ ok: false, message: "Too many code requests. Try again in an hour." }, 429);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    const codeHash = await sha256Hex(job.id + ":" + job.buyer_email + ":" + code + ":" + serviceKey);
    const { error } = await db.from("resofit_digital_access_challenges").insert({ delivery_job_id: job.id, buyer_email: job.buyer_email, code_hash: codeHash, expires_at: new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString() });
    if (error) return json({ ok: false, message: "Unable to request a code. Try again later." }, 500);
    const sent = await sendEmail(job.buyer_email, "Your ResoFit download verification code", "<p>Your ResoFit verification code is <strong>" + code + "</strong>.</p><p>It expires in 10 minutes. If you did not request it, you can ignore this email.</p>");
    if (!sent) return json({ ok: false, message: "Email delivery failed. Try again later." }, 503);
    return json({ ok: true, message: "A verification code was sent to " + maskedEmail(job.buyer_email) + "." });
  }

  if (action === "verify_code") {
    const code = String(body?.code ?? "");
    if (!/^\d{6}$/.test(code)) return json({ ok: false, message: "Enter the six-digit code." }, 400);
    const { data: challenge } = await db.from("resofit_digital_access_challenges").select("id,code_hash,attempts,expires_at,consumed_at").eq("delivery_job_id", job.id).eq("buyer_email", job.buyer_email).is("consumed_at", null).gt("expires_at", now).lt("attempts", 5).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!challenge) return json({ ok: false, message: "Code invalid or expired. Request a new code." }, 400);
    const expected = await sha256Hex(job.id + ":" + job.buyer_email + ":" + code + ":" + serviceKey);
    const matches = constantTimeEqual(expected, challenge.code_hash);
    const updatePayload = matches ? { attempts: challenge.attempts + 1, consumed_at: now } : { attempts: challenge.attempts + 1 };
    const { data: updatedChallenge, error: updateError } = await db.from("resofit_digital_access_challenges").update(updatePayload).eq("id", challenge.id).eq("attempts", challenge.attempts).is("consumed_at", null).select("id").maybeSingle();
    if (updateError || !updatedChallenge || !matches) return json({ ok: false, message: "Code invalid or expired. Check the code and try again." }, 400);
    const fresh = await issueAccessSession(job.id);
    const link = accessUrl(fresh.token);
    const sent = await sendEmail(job.buyer_email, "Your renewed ResoFit download link", "<p>Your purchase has been verified.</p><p><a href=\"" + link + "\">Open your private ResoFit download</a>. This access link expires in 30 days; each download URL expires after five minutes.</p><p>Keep this link private.</p>");
    if (!sent) return json({ ok: false, message: "Your code was verified, but email delivery failed. Request another code later." }, 503);
    return json({ ok: true, message: "Verified. A fresh secure access link has been emailed to " + maskedEmail(job.buyer_email) + "." });
  }
  return json({ ok: false, error: "Unknown action" }, 400);
});
