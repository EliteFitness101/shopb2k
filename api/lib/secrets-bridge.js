/**
 * Server-only, runtime-scoped secrets bridge for Node/Vercel functions.
 * Pass the runtime environment explicitly; this module has no global cache.
 */
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function required(env, key) {
  const value = env?.[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`[CONFIGURATION ERROR] Missing required configuration: ${key}`);
  }
  return value;
}
function allowedRepositories(env) {
  const entries = required(env, "GITHUB_ALLOWED_REPOSITORIES").split(",").map((x) => x.trim());
  if (entries.some((x) => !x || !REPO_RE.test(x))) {
    throw new Error("[CONFIGURATION ERROR] GITHUB_ALLOWED_REPOSITORIES must contain owner/repo entries");
  }
  const normalized = entries.map((x) => x.toLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("[CONFIGURATION ERROR] GITHUB_ALLOWED_REPOSITORIES contains duplicates");
  }
  return Object.freeze(normalized);
}
function httpsUrl(env, key) {
  const value = env?.[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`[CONFIGURATION ERROR] Missing required configuration: ${key}`);
  }
  let url;
  try { url = new URL(value.trim()); } catch {
    throw new Error(`[CONFIGURATION ERROR] ${key} must be a valid URL`);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error(`[CONFIGURATION ERROR] ${key} must be HTTPS without credentials or fragment`);
  }
  return url.toString().replace(/\/$/, "");
}
export function createSecretsBridge(env) {
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    throw new Error("[CONFIGURATION ERROR] Explicit runtime bindings object required");
  }
  return Object.freeze({
    getShopifyWebhookSecret() {
      // Do not silently substitute an API/client secret for a webhook secret.
      return required(env, "SHOPIFY_WEBHOOK_SECRET");
    },
    getSupabaseUrl() {
      return httpsUrl(env, "SUPABASE_URL");
    },
    getSupabaseServiceRoleKey() {
      return required(env, "SUPABASE_SERVICE_ROLE_KEY");
    },
    getAllowedRepositories() {
      return allowedRepositories(env);
    },
    getR2BucketName() {
      return required(env, "R2_BUCKET_NAME");
    },
    getMediaHmacSecret() {
      const value = required(env, "MEDIA_HMAC_SECRET");
      if (new TextEncoder().encode(value).byteLength < 32) {
        throw new Error("[CONFIGURATION ERROR] MEDIA_HMAC_SECRET must be at least 32 UTF-8 bytes");
      }
      return value;
    },
  });
}
