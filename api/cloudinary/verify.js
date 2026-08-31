const CANONICAL_ASSETS = [
  ["resofit-hero-video", "video", "resofit-cdn/brand/videos/resofit-hero", "mp4"],
  ["resofit-hero-poster", "image", "resofit-cdn/brand/posters/resofit-hero-poster", "webp"],
  ["resofit-community-video", "video", "resofit-cdn/brand/videos/resofit-community", "mp4"],
  ["resofit-community-poster", "image", "resofit-cdn/brand/posters/resofit-community-poster", "webp"],
  ["strength-video", "video", "resofit-cdn/categories/strength/bg-strength", "mp4"],
  ["strength-poster", "image", "resofit-cdn/categories/strength/bg-strength-poster", "webp"],
  ["functional-video", "video", "resofit-cdn/categories/functional/bg-functional", "mp4"],
  ["functional-poster", "image", "resofit-cdn/categories/functional/bg-functional-poster", "webp"],
  ["boxing-video", "video", "resofit-cdn/categories/boxing/bg-boxing", "mp4"],
  ["boxing-poster", "image", "resofit-cdn/categories/boxing/bg-boxing-poster", "webp"],
  ["running-video", "video", "resofit-cdn/categories/running/bg-running", "mp4"],
  ["running-poster", "image", "resofit-cdn/categories/running/bg-running-poster", "webp"],
  ["apparel-video", "video", "resofit-cdn/categories/apparel/bg-apparel", "mp4"],
  ["apparel-poster", "image", "resofit-cdn/categories/apparel/bg-apparel-poster", "webp"],
  ["womens-training-video", "video", "resofit-cdn/categories/womens-training/bg-womens-training", "mp4"],
  ["womens-training-poster", "image", "resofit-cdn/categories/womens-training/bg-womens-training-poster", "webp"],
  ["wellness-video", "video", "resofit-cdn/categories/wellness/bg-wellness", "mp4"],
  ["wellness-poster", "image", "resofit-cdn/categories/wellness/bg-wellness-poster", "webp"],
  ["coaching-video", "video", "resofit-cdn/categories/coaching/bg-coaching", "mp4"],
  ["coaching-poster", "image", "resofit-cdn/categories/coaching/bg-coaching-poster", "webp"],
  ["resoflex-equipment-video", "video", "resofit-cdn/products/resoflex-equipment/resoflex-equipment", "mp4"],
  ["resoflex-equipment-poster", "image", "resofit-cdn/products/resoflex-equipment/resoflex-equipment-poster", "webp"],
  ["resoflex-apparel-video", "video", "resofit-cdn/products/resoflex-apparel/resoflex-apparel", "mp4"],
  ["resoflex-apparel-poster", "image", "resofit-cdn/products/resoflex-apparel/resoflex-apparel-poster", "webp"],
  ["chatb2k-video", "video", "resofit-cdn/services/chatb2k/chatb2k-personalized-coaching", "mp4"],
  ["chatb2k-poster", "image", "resofit-cdn/services/chatb2k/chatb2k-poster", "webp"],
  ["wellness-service-video", "video", "resofit-cdn/services/wellness/resofit-personalized-wellness", "mp4"],
  ["wellness-service-poster", "image", "resofit-cdn/services/wellness/resofit-personalized-wellness-poster", "webp"],
];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function requestedAssets(request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("public_ids");
  if (!raw) return CANONICAL_ASSETS;

  const requested = new Set(raw.split(",").map((id) => id.trim()).filter(Boolean));
  return CANONICAL_ASSETS.filter((asset) => requested.has(asset[2]));
}

async function verifyAsset(cloudName, apiKey, apiSecret, asset) {
  const [key, resourceType, publicId, format] = asset;
  const expression = `public_id:"${publicId}" AND resource_type:${resourceType}`;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/search`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${auth}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ expression, max_results: 1 }),
      },
    );

    const data = await response.json().catch(() => ({}));
    const resource = Array.isArray(data.resources) ? data.resources[0] : undefined;
    const found = Boolean(resource);
    const formatMatches = found ? resource.format === format : false;

    return {
      key,
      resourceType,
      publicId,
      expectedFormat: format,
      found,
      formatMatches,
      live: found && formatMatches,
      secureUrl: resource?.secure_url ?? null,
      cloudinaryResourceType: resource?.resource_type ?? null,
      actualFormat: resource?.format ?? null,
      error: response.ok ? null : data.error?.message ?? `Cloudinary HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      key,
      resourceType,
      publicId,
      expectedFormat: format,
      found: false,
      formatMatches: false,
      live: false,
      secureUrl: null,
      cloudinaryResourceType: null,
      actualFormat: null,
      error: error instanceof Error ? error.message : "Cloudinary verification failed",
    };
  }
}

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Method Not Allowed" }, 405);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return json({
      status: "CONFIG_ERROR",
      message: "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be configured server-side.",
    }, 500);
  }

  const assets = requestedAssets(request);
  if (!assets.length) return json({ status: "INVALID_REQUEST", message: "No canonical public_ids matched the request.", canonical: 28 }, 400);

  const results = await Promise.all(assets.map((asset) => verifyAsset(cloudName, apiKey, apiSecret, asset)));
  const live = results.filter((result) => result.live).length;
  const missing = results.filter((result) => !result.found).length;
  const formatErrors = results.filter((result) => result.found && !result.formatMatches).length;
  const healthy = live === assets.length;

  return json({
    status: healthy ? "PASS" : "FAIL",
    canonical: 28,
    checked: results.length,
    live,
    missing,
    formatErrors,
    complete: `${live}/${results.length}`,
    canonicalComplete: assets.length === 28 && live === 28,
    cloudName,
    generatedAt: new Date().toISOString(),
    assets: results,
  }, healthy ? 200 : 502);
}
