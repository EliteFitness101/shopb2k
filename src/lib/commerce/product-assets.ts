export type ProductAsset = {
  role: string;
  path: string;
  imagekitUrl: string;
  blobUrl: string | null;
};

export type ProductMedia = {
  sku: string;
  slug: string;
  name: string;
  folder: string;
  background?: { image: string | null; video: string | null };
  assets: Record<string, ProductAsset | undefined>;
};

type Bridge = {
  imagekit: { verified: Record<string, ProductMedia>; count: number };
  paystack: { products: Array<{ title: string; priceNgn: number; images: string[]; source: string }>; count: number };
};

const BRIDGE_URL = "https://reso-flex.vercel.app/api/catalog-assets";
let bridgePromise: Promise<Bridge | null> | null = null;

async function loadBridge(): Promise<Bridge | null> {
  if (!bridgePromise) {
    bridgePromise = fetch(BRIDGE_URL, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Media bridge HTTP ${response.status}`);
        return (await response.json()) as Bridge;
      })
      .catch((error) => {
        console.warn("Canonical product media bridge unavailable", error);
        return null;
      });
  }
  return bridgePromise;
}

const normalize = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/™/g, "").replace(/₦/g, "ngn").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function getCanonicalProductMedia(sku?: string | null, handle?: string | null, title?: string | null) {
  const bridge = await loadBridge();
  if (!bridge) return null;
  if (sku && bridge.imagekit?.verified?.[sku]) return bridge.imagekit.verified[sku];
  const normalizedHandle = normalize(handle);
  const normalizedTitle = normalize(title);
  const paystack = bridge.paystack?.products?.find((item) => normalize(item.title) === normalizedHandle || normalize(item.title) === normalizedTitle);
  return paystack ? { sku: sku ?? normalizedHandle, slug: normalizedHandle, name: paystack.title, folder: "", assets: Object.fromEntries(paystack.images.slice(0, 6).map((url, index) => [index === 0 ? "hero" : `gallery_${String(index).padStart(2, "0")}`, { role: index === 0 ? "hero" : `gallery_${String(index).padStart(2, "0")}`, path: url, imagekitUrl: url, blobUrl: null }])), background: undefined } satisfies ProductMedia : null;
}

export async function enrichStorefrontProducts<T extends { sku?: string | null; handle: string; title: string }>(products: T[]) {
  const bridge = await loadBridge();
  if (!bridge) return products;
  return products.map((product) => {
    const imagekit = product.sku ? bridge.imagekit?.verified?.[product.sku] : undefined;
    if (imagekit) return product;
    const normalizedTitle = normalize(product.title);
    const normalizedHandle = normalize(product.handle);
    const paystack = bridge.paystack?.products?.find((item) => normalize(item.title) === normalizedTitle || normalize(item.title) === normalizedHandle);
    return paystack ? { ...product, image_src: paystack.images[0] ?? (product as T & { image_src?: string | null }).image_src, mediaImages: paystack.images.slice(0, 6) } : product;
  });
}
