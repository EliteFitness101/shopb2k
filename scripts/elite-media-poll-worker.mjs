const base = (process.env.SUPABASE_URL || "https://vbqjvmnhdtdhmeeudqnn.supabase.co").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const geminiAutomationKey = process.env.GEMINI_AUTOMATION_API_KEY || "";
if (!base || !serviceKey) {
  console.log("Supabase service-role credential configured:", Boolean(serviceKey));
  console.log("Elite Omni poll skipped safely; configure SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY in this repository to enable queue execution.");
  process.exit(0);
}
if (!geminiAutomationKey) {
  console.log("Gemini automation provider key configured: false; poller will use the primary Vault key only.");
} else {
  console.log("Gemini automation provider key configured: true; value remains masked.");
}

async function request(path, init = {}) {
  const response = await fetch(base + path, {
    ...init,
    headers: { apikey: serviceKey, authorization: "Bearer " + serviceKey, ...(init.headers || {}) },
    signal: AbortSignal.timeout(90000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error("Supabase HTTP " + response.status + ": " + body.slice(0, 400));
  return body ? JSON.parse(body) : null;
}
const automationHeader = geminiAutomationKey ? { "x-gemini-automation-key": geminiAutomationKey } : {};
const queued = await request("/rest/v1/elite_media_generation_jobs?status=eq.queued&job_type=eq.video_render&select=id,user_id,input,output&order=created_at.asc&limit=30");
const now = Date.now();
const startable = (queued || []).filter(job => {
  const retryAt = Date.parse(job.output?.next_retry_at || "");
  const due = !job.output?.next_retry_at || Number.isNaN(retryAt) || retryAt <= now;
  return job.user_id && job.input?.start_automatically === true && due && Number(job.output?.provider_attempts || 0) < 3;
}).slice(0, 3);
console.log("Gemini Omni start queue:", startable.length);
for (const job of startable) {
  const response = await fetch(base + "/functions/v1/elite-media-render-worker", {
    method: "POST",
    headers: { apikey: serviceKey, authorization: "Bearer " + serviceKey, "content-type": "application/json", ...automationHeader },
    body: JSON.stringify({ action: "start", job_id: job.id, user_id: job.user_id }),
    signal: AbortSignal.timeout(120000),
  });
  const body = await response.text();
  let result = null;
  try { result = JSON.parse(body); } catch {}
  if (!response.ok) {
    console.error(JSON.stringify({ job_id: job.id, action: "start", status: response.status, error: result?.error || body.slice(0, 250) }));
    continue;
  }
  console.log(JSON.stringify({ job_id: job.id, action: "start", status: result?.status || "accepted", provider_key_slot: result?.provider_key_slot || "primary", secondary_key_available: result?.secondary_provider_key_available ?? Boolean(geminiAutomationKey), source_upload_verified: result?.source_upload_verified || false }));
}
const rendering = await request("/rest/v1/elite_media_generation_jobs?status=eq.rendering&job_type=eq.video_render&select=id,user_id,output&order=updated_at.asc&limit=30");
const pollable = (rendering || []).filter(job => job.user_id && job.output?.provider_interaction_id && job.output?.ffmpeg_render_pending !== true).slice(0, 8);
console.log("Gemini Omni poll queue:", pollable.length);
for (const job of pollable) {
  if (job.output?.provider_key_slot === "automation_secondary" && !geminiAutomationKey) {
    console.log(JSON.stringify({ job_id: job.id, action: "poll", skipped: "secondary provider key is not available in this runner" }));
    continue;
  }
  const response = await fetch(base + "/functions/v1/elite-media-render-worker", {
    method: "POST",
    headers: { apikey: serviceKey, authorization: "Bearer " + serviceKey, "content-type": "application/json", ...automationHeader },
    body: JSON.stringify({ action: "poll", job_id: job.id, user_id: job.user_id }),
    signal: AbortSignal.timeout(120000),
  });
  const body = await response.text();
  let result = null;
  try { result = JSON.parse(body); } catch {}
  if (!response.ok) {
    console.error(JSON.stringify({ job_id: job.id, action: "poll", status: response.status, error: result?.error || body.slice(0, 250) }));
    continue;
  }
  console.log(JSON.stringify({ job_id: job.id, action: "poll", status: result?.status || result?.worker?.status || "polled", ffmpeg_queued: result?.ffmpeg_queued || false }));
}
