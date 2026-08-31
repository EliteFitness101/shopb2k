const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

function getConfig() {
  const value = process.env.CLOUDINARY_URL;
  if (value) {
    const parsed = new URL(value);
    if (parsed.protocol !== "cloudinary:") throw new Error("Invalid CLOUDINARY_URL");
    const cloudName = parsed.hostname;
    const apiKey = decodeURIComponent(parsed.username);
    const apiSecret = decodeURIComponent(parsed.password);
    if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET must be configured server-side.");
  return { cloudName, apiKey, apiSecret };
}

const cloudinarySearch = async (config, expression, maxResults = 500) => {
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
  const resources = [];
  let nextCursor;
  do {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/resources/search`, {
      method: "POST",
      headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
      body: JSON.stringify({ expression, max_results: Math.min(maxResults, 500), ...(nextCursor ? { next_cursor: nextCursor } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error?.message ?? `Cloudinary HTTP ${response.status}`); error.status = response.status; throw error; }
    if (Array.isArray(data.resources)) resources.push(...data.resources);
    nextCursor = data.next_cursor;
  } while (nextCursor && resources.length < maxResults);
  return resources.slice(0, maxResults);
};

function normaliseResource(resource) { return { publicId: resource.public_id, resourceType: resource.resource_type ?? null, type: resource.type ?? null, format: resource.format ?? null, secureUrl: resource.secure_url ?? null, bytes: resource.bytes ?? null, width: resource.width ?? null, height: resource.height ?? null, version: resource.version ?? null, createdAt: resource.created_at ?? null, assetFolder: resource.asset_folder ?? resource.folder ?? null }; }

async function verifyRequestedAssets(config, publicIds) {
  return Promise.all(publicIds.map(async (publicId) => {
    try { const resources = await cloudinarySearch(config, `public_id:"${publicId.replace(/"/g, "\\\"")}"`, 10); const resource = resources.find((item) => item.public_id === publicId) ?? resources[0]; return { publicId, found: Boolean(resource), live: Boolean(resource?.secure_url), asset: resource ? normaliseResource(resource) : null, error: null }; }
    catch (error) { return { publicId, found: false, live: false, asset: null, error: error instanceof Error ? error.message : "Cloudinary verification failed" }; }
  }));
}

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Method Not Allowed" }, 405);
  let config;
  try { config = getConfig(); } catch (error) { return json({ status: "CONFIG_ERROR", message: error instanceof Error ? error.message : "Cloudinary configuration is incomplete" }, 500); }
  const host = request.headers?.get?.("host") || "localhost";
  const url = new URL(request.url, `https://${host}`);
  const publicIdsParam = url.searchParams.get("public_ids");
  const folder = (url.searchParams.get("folder") || "resofit").trim().replace(/^\/+|\/+$/g, "");
  if (!folder || folder === "resofit-cdn" || (!folder.startsWith("resofit") && !publicIdsParam)) return json({ status: "INVALID_REQUEST", message: "folder must resolve under the production Cloudinary resofit root." }, 400);
  const requestedIds = publicIdsParam ? [...new Set(publicIdsParam.split(",").map((id) => id.trim()).filter(Boolean))] : [];
  try {
    if (requestedIds.length) { const results = await verifyRequestedAssets(config, requestedIds); const live = results.filter((result) => result.live).length; return json({ status: live === results.length ? "PASS" : "FAIL", mode: "requested", cloudName: config.cloudName, checked: results.length, live, missing: results.length - live, complete: `${live}/${results.length}`, generatedAt: new Date().toISOString(), assets: results }, live === results.length ? 200 : 502); }
    const resources = await cloudinarySearch(config, `asset_folder:"${folder.replace(/"/g, "\\\"")}"`, 500);
    const assets = resources.map(normaliseResource);
    const live = assets.filter((asset) => Boolean(asset.secureUrl)).length;
    return json({ status: "PASS", mode: "discovery", cloudName: config.cloudName, folder, discovered: assets.length, live, generatedAt: new Date().toISOString(), assets });
  } catch (error) {
    const status = error?.name === "TimeoutError" || error?.name === "AbortError" ? 504 : (error?.status === 401 || error?.status === 403 ? 502 : 500);
    return json({ status: "ERROR", error: "Cloudinary resource verification failed", details: { message: error instanceof Error ? error.message : "Unknown error" } }, status);
  }
}
