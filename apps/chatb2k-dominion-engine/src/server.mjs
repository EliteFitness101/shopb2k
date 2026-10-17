import http from "node:http";
import crypto from "node:crypto";
import { constantTimeEqual, verifyWebhook } from "./security.mjs";

const PORT = Number(process.env.PORT || 8080);
const API_VERSION = "2022-11-28";
const MAX_BODY_BYTES = 256 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 90;
const rateBuckets = new Map();
const idempotency = new Map();

function json(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function parseAllowlist(value) {
  return new Set(String(value || "").split(",").map(x => x.trim()).filter(Boolean));
}

function safeAudit(event, fields = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}

function rateLimit(req, res) {
  const key = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const prior = rateBuckets.get(key);
  if (!prior || now - prior.start >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { start: now, count: 1 });
    return false;
  }
  prior.count += 1;
  if (prior.count > RATE_MAX) {
    json(res, 429, { error: "rate_limited" }, { "retry-after": String(Math.ceil((RATE_WINDOW_MS - (now - prior.start)) / 1000)) });
    return true;
  }
  return false;
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const err = new Error("body_too_large");
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function requireApiAuth(req, res) {
  const configured = process.env.DOMINION_API_TOKEN;
  if (!configured || configured.length < 32) {
    json(res, 503, { error: "gateway_not_configured", detail: "DOMINION_API_TOKEN must be configured with at least 32 characters." });
    return false;
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!constantTimeEqual(token, configured)) {
    json(res, 401, { error: "unauthorized" }, { "www-authenticate": "Bearer" });
    return false;
  }
  return true;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function createAppJwt() {
  const appId = process.env.GITHUB_APP_ID;
  const pem = process.env.GITHUB_APP_PRIVATE_KEY_PEM;
  if (!appId || !pem) throw new Error("GitHub App credentials are not configured");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    base64url(JSON.stringify({ iat: now - 30, exp: now + 8 * 60, iss: appId }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return unsigned + "." + signer.sign(pem).toString("base64url");
}

let cachedInstallationToken = null;
async function getInstallationToken() {
  if (cachedInstallationToken && cachedInstallationToken.expiresAt > Date.now() + 60_000) return cachedInstallationToken.token;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  if (!installationId) throw new Error("GitHub App installation ID is not configured");
  const response = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${createAppJwt()}`,
      "x-github-api-version": API_VERSION,
      "content-type": "application/json",
      "user-agent": "ChatB2K-Dominion-Engine",
    },
    body: "{}",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`GitHub installation-token exchange failed (HTTP ${response.status})`);
  const data = await response.json();
  if (!data.token || !data.expires_at) throw new Error("GitHub returned an incomplete installation token");
  cachedInstallationToken = { token: data.token, expiresAt: Date.parse(data.expires_at) };
  return data.token;
}

async function githubRequest(path, options = {}) {
  const token = await getInstallationToken();
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": API_VERSION,
      "user-agent": "ChatB2K-Dominion-Engine",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(12_000),
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    const err = new Error(`GitHub API request failed (HTTP ${response.status})`);
    err.status = response.status === 404 ? 404 : response.status === 403 ? 403 : 502;
    throw err;
  }
  return data;
}

function repositoryAllowed(owner, repo) {
  return parseAllowlist(process.env.GITHUB_ALLOWED_REPOSITORIES).has(`${owner}/${repo}`);
}

const server = http.createServer(async (req, res) => {
  const requestId = String(req.headers["x-correlation-id"] || crypto.randomUUID()).slice(0, 128);
  res.setHeader("x-correlation-id", requestId);
  if (req.method === "GET" && req.url === "/healthz") {
    return json(res, 200, { status: "ok", service: "chatb2k-dominion-engine", time: new Date().toISOString() });
  }
  if (req.method === "GET" && req.url === "/readyz") {
    const missing = ["DOMINION_API_TOKEN", "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY_PEM", "GITHUB_APP_INSTALLATION_ID"]
      .filter(key => !process.env[key]);
    return json(res, missing.length ? 503 : 200, {
      status: missing.length ? "not_ready" : "configured",
      missing,
      webhookConfigured: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
      dispatchEnabled: process.env.GITHUB_ACTIONS_DISPATCH_ENABLED === "true",
    });
  }
  if (rateLimit(req, res)) return;

  if (req.method === "POST" && req.url === "/webhooks/github") {
    let raw;
    try { raw = await readBody(req); } catch (err) { return json(res, err.status || 400, { error: err.message }); }
    if (!verifyWebhook(raw, req.headers["x-hub-signature-256"])) {
      safeAudit("webhook_rejected", { requestId, reason: "signature_invalid" });
      return json(res, 401, { error: "invalid_webhook_signature" });
    }
    const deliveryId = String(req.headers["x-github-delivery"] || "");
    const eventName = String(req.headers["x-github-event"] || "");
    if (!deliveryId || !eventName) return json(res, 400, { error: "missing_webhook_headers" });
    const digest = crypto.createHash("sha256").update(deliveryId).digest("hex");
    if (idempotency.has(digest)) return json(res, 202, { status: "duplicate_ignored", deliveryId });
    idempotency.set(digest, Date.now());
    let payload = {};
    try { payload = JSON.parse(raw.toString("utf8")); } catch { return json(res, 400, { error: "invalid_json" }); }
    safeAudit("webhook_accepted", { requestId, deliveryId, eventName, action: typeof payload.action === "string" ? payload.action : undefined });
    return json(res, 202, { status: "accepted", deliveryId, eventName, execution: "not_triggered" });
  }

  if (!requireApiAuth(req, res)) return;
  try {
    if (req.method === "GET" && req.url === "/v1/github/repos") {
      const data = await githubRequest("/installation/repositories?per_page=100");
      const allowed = parseAllowlist(process.env.GITHUB_ALLOWED_REPOSITORIES);
      const repositories = (data.repositories || [])
        .filter(repo => allowed.has(repo.full_name))
        .map(repo => ({ full_name: repo.full_name, private: repo.private, default_branch: repo.default_branch, html_url: repo.html_url }));
      safeAudit("repositories_listed", { requestId, count: repositories.length });
      return json(res, 200, { status: "verified", count: repositories.length, repositories });
    }

    const workflowMatch = req.method === "GET" && req.url?.match(/^\/v1\/github\/repos\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/workflows$/);
    if (workflowMatch) {
      const [, owner, repo] = workflowMatch;
      if (!repositoryAllowed(owner, repo)) return json(res, 403, { error: "repository_not_allowlisted" });
      const data = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows?per_page=100`);
      return json(res, 200, {
        status: "verified",
        repository: `${owner}/${repo}`,
        workflows: (data.workflows || []).map(w => ({ id: w.id, name: w.name, path: w.path, state: w.state })),
      });
    }

    if (req.method === "POST" && req.url === "/v1/github/workflows/dispatch") {
      if (process.env.GITHUB_ACTIONS_DISPATCH_ENABLED !== "true") return json(res, 403, { error: "workflow_dispatch_disabled" });
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw.toString("utf8")); } catch { return json(res, 400, { error: "invalid_json" }); }
      const { repository, workflow, ref, inputs = {} } = body || {};
      if (typeof repository !== "string" || typeof workflow !== "string" || typeof ref !== "string") {
        return json(res, 400, { error: "repository_workflow_and_ref_required" });
      }
      const parts = repository.split("/");
      if (parts.length !== 2 || !repositoryAllowed(parts[0], parts[1])) return json(res, 403, { error: "repository_not_allowlisted" });
      const [owner, repo] = parts;
      if (!parseAllowlist(process.env.GITHUB_ALLOWED_WORKFLOWS).has(workflow)) return json(res, 403, { error: "workflow_not_allowlisted" });
      if (!/^[A-Za-z0-9._/-]{1,128}$/.test(ref) || ref.includes("..")) return json(res, 400, { error: "invalid_ref" });
      if (!inputs || typeof inputs !== "object" || Array.isArray(inputs) || JSON.stringify(inputs).length > 16_000) return json(res, 400, { error: "invalid_inputs" });
      const idemKey = String(req.headers["idempotency-key"] || "");
      if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idemKey)) return json(res, 400, { error: "idempotency_key_required" });
      const idemDigest = crypto.createHash("sha256").update(`${repository}|${workflow}|${ref}|${idemKey}`).digest("hex");
      if (idempotency.has(idemDigest)) return json(res, 202, { status: "duplicate_ignored", requestId });
      idempotency.set(idemDigest, Date.now());
      await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
        method: "POST",
        body: JSON.stringify({ ref, inputs }),
      });
      safeAudit("workflow_dispatch_submitted", { requestId, repository, workflow, ref, idempotencyKeyHash: idemDigest });
      return json(res, 202, { status: "accepted", execution: "submitted_to_github", requestId, repository, workflow, ref });
    }
    return json(res, 404, { error: "not_found" });
  } catch (err) {
    safeAudit("request_failed", { requestId, error: String(err?.message || "unknown").slice(0, 180) });
    return json(res, err.status || 502, { error: "upstream_or_gateway_failure", requestId });
  }
});

server.listen(PORT, "0.0.0.0", () => safeAudit("server_started", { port: PORT, node: process.version }));
