const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  },
});

const MAX_RESULTS = 100;
const MAX_ASSETS = 100;
const CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 5000;

function getCloudinaryConfig() {
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

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Canonical Supabase URL and server-side service role key are required");
  }
  return { url, serviceRoleKey };
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

async function loadCanonicalAssets(supabase) {
  const query = new URLSearchParams({
    select: "asset_key,canonical_path,cloudinary_public_id,cloudinary_resource_type,status,delivery_url",
    order: "asset_key.asc",
    limit: String(MAX_ASSETS),
  });
  const response = await fetch(`${supabase.url}/rest/v1/resofit_cloudinary_visual_assets?${query}`, {
    headers: {
      apikey: supabase.serviceRoleKey,
      authorization: `Bearer ${supabase.serviceRoleKey}`,
      accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(rows)) {
    const error = new Error(`Canonical Cloudinary registry read failed (HTTP ${response.status})`);
    error.status = response.status;
    throw error;
  }
  return rows.filter((row) => row?.asset_key && row?.cloudinary_public_id && row?.cloudinary_resource_type);
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

async function verifyRegistryAsset(config, row) {
  try {
    const escapedId = String(row.cloudinary_public_id).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const data = await cloudinarySearch(config, `public_id:"${escapedId}"`);
    const resource = (Array.isArray(data.resources) ? data.resources : []).find(
      (item) => item.public_id === row.cloudinary_public_id,
    ) ?? null;
    const asset = resource ? normaliseResource(resource) : null;
    const expectedResourceType = row.cloudinary_resource_type;
    const expectedFormatMatch = String(row.delivery_url || "").match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
    const expectedFormat = expectedFormatMatch?.[1]?.toLowerCase() ?? null;
    const found = Boolean(asset);
    const live = Boolean(asset?.secureUrl);
    const resourceTypeMatches = Boolean(asset && asset.resourceType === expectedResourceType);
    const formatMatches = !expectedFormat || asset?.format?.toLowerCase() === expectedFormat;
    return {
      key: row.asset_key,
      canonicalPath: row.canonical_path ?? null,
      publicId: row.cloudinary_public_id,
      expectedResourceType,
      expectedFormat,
      found,
      live,
      resourceTypeMatches,
      formatMatches,
      actualFormat: asset?.format ?? null,
      secureUrl: asset?.secureUrl ?? null,
      asset,
      registryStatus: row.status ?? null,
      error: !found ? "Canonical public ID not found in Cloudinary" :
        !live ? "Cloudinary resource has no secure delivery URL" :
        !resourceTypeMatches ? "Cloudinary resource type differs from the canonical registry" :
        !formatMatches ? "Cloudinary delivery format differs from the canonical registry" : null,
    };
  } catch (error) {
    return {
      key: row.asset_key,
      canonicalPath: row.canonical_path ?? null,
      publicId: row.cloudinary_public_id,
      expectedResourceType: row.cloudinary_resource_type,
      expectedFormat: null,
      found: false,
      live: false,
      resourceTypeMatches: false,
      formatMatches: false,
      actualFormat: null,
      secureUrl: null,
      asset: null,
      registryStatus: row.status ?? null,
      error: error instanceof Error ? error.message : "Cloudinary verification failed",
    };
  }
}

async function mapConcurrent(items, concurrency, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return output;
}

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Method Not Allowed" }, 405);

  let cloudinary;
  let supabase;
  try {
    cloudinary = getCloudinaryConfig();
    supabase = getSupabaseConfig();
  } catch (error) {
    return json({
      status: "CONFIG_ERROR",
      message: error instanceof Error ? error.message : "Server configuration is incomplete",
    }, 500);
  }

  try {
    const url = new URL(request.url || "/api/cloudinary/verify", "https://resofit.fit");
    const requestedIds = [...new Set((url.searchParams.get("public_ids") || "")
      .split(",").map((id) => id.trim()).filter(Boolean))].slice(0, 25);
    const registry = await loadCanonicalAssets(supabase);
    const selected = requestedIds.length
      ? registry.filter((row) => requestedIds.includes(row.cloudinary_public_id))
      : registry;

    if (requestedIds.length) {
      const registeredIds = new Set(selected.map((row) => row.cloudinary_public_id));
      const unknownIds = requestedIds.filter((id) => !registeredIds.has(id));
      if (unknownIds.length) {
        return json({
          status: "INVALID_REQUEST",
          message: "Only public IDs present in the canonical Supabase asset registry can be verified.",
          unknownIds,
          canonical: registry.length,
        }, 400);
      }
    }

    if (!selected.length) {
      return json({
        status: "FAIL",
        canonical: registry.length,
        checked: 0,
        live: 0,
        missing: registry.length,
        formatErrors: 0,
        complete: `0/${registry.length}`,
        canonicalComplete: false,
        message: "The canonical Cloudinary registry returned no verifiable assets.",
        generatedAt: new Date().toISOString(),
        assets: [],
      }, 502);
    }

    const assets = await mapConcurrent(selected, CONCURRENCY, (row) => verifyRegistryAsset(cloudinary, row));
    const live = assets.filter((asset) => asset.live && asset.resourceTypeMatches).length;
    const formatErrors = assets.filter((asset) => !asset.formatMatches).length;
    const missing = assets.length - live;
    const canonicalComplete = assets.length === registry.length && live === registry.length && formatErrors === 0;
    const pass = live === assets.length && formatErrors === 0;
    return json({
      status: pass ? "PASS" : "FAIL",
      mode: requestedIds.length ? "requested-canonical" : "canonical-registry",
      cloudName: cloudinary.cloudName,
      canonical: registry.length,
      checked: assets.length,
      live,
      missing,
      formatErrors,
      complete: `${live}/${assets.length}`,
      canonicalComplete,
      generatedAt: new Date().toISOString(),
      assets,
    }, pass ? 200 : 502);
  } catch (error) {
    const status = error?.name === "TimeoutError" || error?.name === "AbortError" ? 504 :
      (error?.status === 401 || error?.status === 403 ? 502 : 500);
    return json({
      status: "ERROR",
      error: "Canonical Cloudinary verification failed",
      details: { message: error instanceof Error ? error.message : "Unknown error" },
    }, status);
  }
}
