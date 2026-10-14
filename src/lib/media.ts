// Central media registry — single source of truth for media paths and CDN transforms.
// No path literals should be duplicated in components.

import { cloudinaryVisualUrl, getCloudinaryVisualAsset } from "./cloudinaryVisuals";
import { normalizeAssetCandidate, resolveAssetUrl } from "@/lib/assetResolver";

const cloudinaryCommunityPoster = cloudinaryVisualUrl(getCloudinaryVisualAsset("resofit-community-poster")!);
const cloudinaryCommunityVideo = cloudinaryVisualUrl(getCloudinaryVisualAsset("resofit-community-video")!);

const DEFAULT_MEDIA_CANDIDATES = [
  normalizeAssetCandidate(cloudinaryCommunityPoster || "", "cloudinary"),
  normalizeAssetCandidate("https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/cover/resofit-community-poster.webp", "blob"),
  normalizeAssetCandidate("https://pub-6a0f7b69f1d34d3c9a4a49d8de94d2b3.r2.dev/media/community/resofit-community.webp", "r2"),
];

export async function resolveCommunityPoster(): Promise<string> {
  return resolveAssetUrl(DEFAULT_MEDIA_CANDIDATES);
}

/** Community cinematic assets.
 * Cloudinary is the production visual-experience CDN. If the public cloud name
 * is not configured, values remain null so the UI never requests a bad URL.
 */
export const MEDIA: {
  communityPoster: string | null;
  communityVideo: string | null;
  communityCaptions: string | null;
} = {
  communityPoster: cloudinaryCommunityPoster || null,
  communityVideo: cloudinaryCommunityVideo || null,
  communityCaptions: null,
};

/** Legacy local paths retained only as fallback/documentation. */
export const MEDIA_PATHS = {
  communityPoster: "/assets/resofit-community-poster.webp",
  communityVideo: "/assets/resofit-community-intro.mp4",
  communityCaptions: "/assets/resofit-community-intro.vtt",
} as const;

/** Approved responsive widths for Shopify CDN transforms. */
export const SHOPIFY_IMAGE_WIDTHS = [400, 800, 1200, 1600] as const;

const SHOPIFY_CDN_HOSTS = ["cdn.shopify.com", "cdn.shopifycdn.net"];

/** True only for Shopify CDN URLs — never local Vite assets, data URIs, or arbitrary hosts. */
export function isShopifyImage(src?: string | null): boolean {
  if (!src || src.startsWith("data:") || src.startsWith("/")) return false;
  try {
    const host = new URL(src).hostname.toLowerCase();
    return SHOPIFY_CDN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** Append Shopify CDN width + WebP transform params. Returns src untouched if not Shopify. */
export function shopifyImage(src: string, width: number): string {
  if (!isShopifyImage(src)) return src;
  try {
    const url = new URL(src);
    url.searchParams.set("width", String(width));
    url.searchParams.set("format", "webp");
    return url.toString();
  } catch {
    return src;
  }
}

/** Build a responsive srcSet for Shopify images; undefined for anything else. */
export function shopifySrcSet(src?: string | null): string | undefined {
  if (!isShopifyImage(src)) return undefined;
  return SHOPIFY_IMAGE_WIDTHS.map((w) => `${shopifyImage(src!, w)} ${w}w`).join(", ");
}

/** True only for the official ImageKit delivery host; arbitrary media URLs are never rewritten. */
export function isImageKitImage(src?: string | null): boolean {
  if (!src || src.startsWith("data:") || src.startsWith("/")) return false;
  try {
    const host = new URL(src).hostname.toLowerCase();
    return host === "ik.imagekit.io" || host.endsWith(".ik.imagekit.io");
  } catch {
    return false;
  }
}

/** Add bounded responsive ImageKit transforms only when the URL has no existing transform. */
export function imageKitImage(src: string, width: number): string {
  if (!isImageKitImage(src)) return src;
  try {
    const url = new URL(src);
    if (url.searchParams.has("tr")) return src;
    url.searchParams.set("tr", `w-${width},q-80,f-auto`);
    return url.toString();
  } catch {
    return src;
  }
}

/** Responsive srcSet for supported commerce CDNs only; preserves existing transforms and arbitrary URLs. */
export function responsiveImageSrcSet(src?: string | null): string | undefined {
  if (isShopifyImage(src)) return shopifySrcSet(src);
  if (!isImageKitImage(src)) return undefined;
  try {
    if (new URL(src!).searchParams.has("tr")) return undefined;
  } catch {
    return undefined;
  }
  return SHOPIFY_IMAGE_WIDTHS.map((width) => `${imageKitImage(src!, width)} ${width}w`).join(", ");
}

/** HEAD-probe an asset URL. Resolves false on any failure (safe by default). */
export async function mediaExists(url?: string | null): Promise<boolean> {
  if (!url || typeof window === "undefined") return false;
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}
