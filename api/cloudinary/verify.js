const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  },
});

const MAX_RESULTS = 100;
const MAX_PAGES = 2;
const REQUEST_TIMEOUT_MS = 5000;

function getConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };

  const value = process.env.CLOUDINARY_URL;
  if (!value) throw new Error("Cloudinary server configuration is incomplete");
  const parsed = new URL(value);
  if (parsed.protocol !== "cloudinary:") throw new Error("Invalid CLOUDINARY_URL");
  const fallbackCloudName = parsed.hostname;
  const fallbackApiKey = decodeURIComponent(parsed.username);
  const fallbackApiSecret = decodeURIComponent(parsed.password);
  if (!fallbackCloudName || !fallbackApiKey || !fallbackApiSecret) {
    throw new Error("Invalid CLOUDINARY_URL credentials");
  }
  return { cloudName: fallbackCloudName, apiKey: fallbackApiKey, apiSecret: fallbackApiSecret };
}

function headerValue(request, name) {
  const headers = request?.headers;
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

async function sha1(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function cloudinarySearch(config, expression, nextCursor) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { expression, max_results: MAX_RESULTS, timestamp };
  const signature = await sha1(`${Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&")}${config.apiSecret}`);
  const body = new URLSearchParams({
    expression,
    max_results: String(MAX_RESULTS),
    timestamp: String(timestamp),
    api_key: config.apiKey,
    signature,
    ...(nextCursor ? { next_cursor: nextCursor } : {}),
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/resources/search`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message ?? `Cloudinary HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function normaliseResource(resource) {
  return {
    assetId: resource.asset_id ?? null,
    publicId: resource.public_id ?? null,
    resourceType: resource.resource_type ?? null,
    type: resource.type ?? null,
    format: resource.format ?? null,
    secureUrl: resource.secure_url ?? null,
    bytes: resource.bytes ?? null,
    width: resource.width ?? null,
    height: resource.height ?? null,
    version: resource.version ?? null,
    createdAt: resource.created_at ?? null,
    assetFolder: resource.asset_folder ?? resource.folder ?? null,
  };
}

async function collect(config, expression) {
  const resources = [];
  const seenCursors = new Set();
  let nextCursor;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await cloudinarySearch(config, expression, nextCursor);
    if (Array.isArray(data.resources)) resources.push(...data.resources);
    if (!data.next_cursor || seenCursors.has(data.next_cursor)) break;
    seenCursors.add(data.next_cursor);
    nextCursor = data.next_cursor;
  }
  return resources.slice(0, MAX_RESULTS * MAX_PAGES);
}

async function verifyRequested(config, publicIds) {
  const results = [];
  for (const publicId of publicIds) {
    try {
      const resources = await collect(config, `public_id:\"${publicId.replace(/\"/g, "\\\"")}\"`);
      const resource = resources.find((item) => item.public_id === publicId) ?? resources[0];
      results.push({ publicId, found: Boolean(resource), live: Boolean(resource?.secure_url), asset: resource ? normaliseResource(resource) : null, error: null });
    } catch (error) {
      results.push({ publicId, found: false, live: false, asset: null, error: error instanceof Error ? error.message : "Cloudinary verification failed" });
    }
  }
  return results;
}

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Method Not Allowed" }, 405);

  let config;
  try {
    config = getConfig();
  } catch (error) {
    return json({ status: "CONFIG_ERROR", message: error instanceof Error ? error.message : "Cloudinary configuration is incomplete" }, 500);
  }

  const forwardedHost = headerValue(request, "x-forwarded-host") || headerValue(request, "host");
  const forwardedProto = headerValue(request, "x-forwarded-proto") || "https";
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : "https://resofit.fit";
  const url = new URL(request.url || "/api/cloudinary/verify", base);
  const publicIdsParam = url.searchParams.get("public_ids");
  const folder = (url.searchParams.get("folder") || "resofit").trim().replace(/^\/+|\/+$/g, "");

  if (!folder || folder === "resofit-cdn" || (!folder.startsWith("resofit") && !publicIdsParam)) {
    return json({ status: "INVALID_REQUEST", message: "folder must resolve under the production Cloudinary resofit root." }, 400);
  }

  const requestedIds = publicIdsParam ? [...new Set(publicIdsParam.split(",").map((id) => id.trim()).filter(Boolean))].slice(0, 25) : [];

  try {
    if (requestedIds.length) {
      const results = await verifyRequested(config, requestedIds);
      const live = results.filter((result) => result.live).length;
      return json({ status: live === results.length ? "PASS" : "FAIL", mode: "requested", cloudName: config.cloudName, checked: results.length, live, missing: results.length - live, complete: `${live}/${results.length}`, generatedAt: new Date().toISOString(), assets: results }, live === results.length ? 200 : 502);
    }

    const assets = (await collect(config, `asset_folder:\"${folder.replace(/\"/g, "\\\"")}\"`)).map(normaliseResource);
    const live = assets.filter((asset) => Boolean(asset.secureUrl)).length;
    return json({ status: "PASS", mode: "discovery", cloudName: config.cloudName, folder, discovered: assets.length, live, capped: assets.length === MAX_RESULTS * MAX_PAGES, generatedAt: new Date().toISOString(), assets });
  } catch (error) {
    const status = error?.name === "TimeoutError" || error?.name === "AbortError" ? 504 : (error?.status === 401 || error?.status === 403 ? 502 : 500);
    return json({ status: "ERROR", error: "Cloudinary resource verification failed", details: { message: error instanceof Error ? error.message : "Unknown error" } }, status);
  }
}
