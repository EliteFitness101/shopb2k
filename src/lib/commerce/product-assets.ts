export type ProductAsset = { role: string; path: string; imagekitUrl: string; blobUrl: string | null; };
export type ProductMedia = { sku: string; slug: string; name: string; folder: string; background?: { image: string | null; video: string | null }; assets: Record<string, ProductAsset | undefined>; };
type Bridge = { imagekit: { verified: Record<string, ProductMedia>; count: number }; paystack: { products: Array<{ title: string; priceNgn: number; images: string[]; source: string }>; count: number }; };
const BRIDGE_URL = "https://reso-flex.vercel.app/api/catalog-assets";
let bridgePromise: Promise<Bridge | null> | null = null;
async function loadBridge(): Promise<Bridge | null> { if (!bridgePromise) bridgePromise = fetch(BRIDGE_URL, { headers: { Accept: "application/json" } }).then(async (r) => { if (!r.ok) throw new Error(`Media bridge HTTP ${r.status}`); return (await r.json()) as Bridge; }).catch((e) => { console.warn("Canonical product media bridge unavailable", e); return null; }); return bridgePromise; }
const normalize = (value: string | null | undefined) => (value ?? "").toLowerCase().replace(/™/g, "").replace(/₦/g, "ngn").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function findImageKit(bridge: Bridge, sku?: string | null, handle?: string | null, title?: string | null) {
  if (sku && bridge.imagekit?.verified?.[sku]) return bridge.imagekit.verified[sku];
  const h = normalize(handle), t = normalize(title);
  return Object.values(bridge.imagekit?.verified ?? {}).find((m) => normalize(m.slug) === h || normalize(m.name) === t || normalize(m.name) === h) ?? null;
}
export async function getCanonicalProductMedia(sku?: string | null, handle?: string | null, title?: string | null) {
  const bridge = await loadBridge(); if (!bridge) return null;
  const imagekit = findImageKit(bridge, sku, handle, title); if (imagekit) return imagekit;
  const normalizedHandle = normalize(handle), normalizedTitle = normalize(title);
  const paystack = bridge.paystack?.products?.find((item) => normalize(item.title) === normalizedHandle || normalize(item.title) === normalizedTitle);
  return paystack ? { sku: sku ?? normalizedHandle, slug: normalizedHandle, name: paystack.title, folder: "", assets: Object.fromEntries(paystack.images.slice(0, 6).map((url, index) => [index === 0 ? "hero" : `gallery_${String(index).padStart(2, "0")}`, { role: index === 0 ? "hero" : `gallery_${String(index).padStart(2, "0")}`, path: url, imagekitUrl: url, blobUrl: null }])), background: undefined } satisfies ProductMedia : null;
}
