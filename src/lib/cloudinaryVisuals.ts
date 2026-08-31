// Canonical Cloudinary Visual Experience registry for the ResoFit main ecosystem.
// This mirrors the 28-asset visual registry in reso-flex.
// Cloudinary is the visual-experience CDN; ImageKit remains the product DAM.

export type VisualAssetKind = "video" | "poster";
export type VisualExperienceGroup = "brand" | "category" | "product-family" | "service";

export type CloudinaryVisualAsset = {
  key: string;
  group: VisualExperienceGroup;
  kind: VisualAssetKind;
  publicId: string;
  format: "mp4" | "webp";
};

const visual = (
  key: string,
  group: VisualExperienceGroup,
  kind: VisualAssetKind,
  publicId: string,
  format: "mp4" | "webp",
): CloudinaryVisualAsset => ({ key, group, kind, publicId, format });

export const CLOUDINARY_VISUAL_EXPERIENCE: readonly CloudinaryVisualAsset[] = [
  visual("resofit-hero-video", "brand", "video", "resofit-cdn/brand/videos/resofit-hero", "mp4"),
  visual("resofit-hero-poster", "brand", "poster", "resofit-cdn/brand/posters/resofit-hero-poster", "webp"),
  visual("resofit-community-video", "brand", "video", "resofit-cdn/brand/videos/resofit-community", "mp4"),
  visual("resofit-community-poster", "brand", "poster", "resofit-cdn/brand/posters/resofit-community-poster", "webp"),
  visual("strength-video", "category", "video", "resofit-cdn/categories/strength/bg-strength", "mp4"),
  visual("strength-poster", "category", "poster", "resofit-cdn/categories/strength/bg-strength-poster", "webp"),
  visual("functional-video", "category", "video", "resofit-cdn/categories/functional/bg-functional", "mp4"),
  visual("functional-poster", "category", "poster", "resofit-cdn/categories/functional/bg-functional-poster", "webp"),
  visual("boxing-video", "category", "video", "resofit-cdn/categories/boxing/bg-boxing", "mp4"),
  visual("boxing-poster", "category", "poster", "resofit-cdn/categories/boxing/bg-boxing-poster", "webp"),
  visual("running-video", "category", "video", "resofit-cdn/categories/running/bg-running", "mp4"),
  visual("running-poster", "category", "poster", "resofit-cdn/categories/running/bg-running-poster", "webp"),
  visual("apparel-video", "category", "video", "resofit-cdn/categories/apparel/bg-apparel", "mp4"),
  visual("apparel-poster", "category", "poster", "resofit-cdn/categories/apparel/bg-apparel-poster", "webp"),
  visual("womens-training-video", "category", "video", "resofit-cdn/categories/womens-training/bg-womens-training", "mp4"),
  visual("womens-training-poster", "category", "poster", "resofit-cdn/categories/womens-training/bg-womens-training-poster", "webp"),
  visual("wellness-video", "category", "video", "resofit-cdn/categories/wellness/bg-wellness", "mp4"),
  visual("wellness-poster", "category", "poster", "resofit-cdn/categories/wellness/bg-wellness-poster", "webp"),
  visual("coaching-video", "category", "video", "resofit-cdn/categories/coaching/bg-coaching", "mp4"),
  visual("coaching-poster", "category", "poster", "resofit-cdn/categories/coaching/bg-coaching-poster", "webp"),
  visual("resoflex-equipment-video", "product-family", "video", "resofit-cdn/products/resoflex-equipment/resoflex-equipment", "mp4"),
  visual("resoflex-equipment-poster", "product-family", "poster", "resofit-cdn/products/resoflex-equipment/resoflex-equipment-poster", "webp"),
  visual("resoflex-apparel-video", "product-family", "video", "resofit-cdn/products/resoflex-apparel/resoflex-apparel", "mp4"),
  visual("resoflex-apparel-poster", "product-family", "poster", "resofit-cdn/products/resoflex-apparel/resoflex-apparel-poster", "webp"),
  visual("chatb2k-video", "service", "video", "resofit-cdn/services/chatb2k/chatb2k-personalized-coaching", "mp4"),
  visual("chatb2k-poster", "service", "poster", "resofit-cdn/services/chatb2k/chatb2k-poster", "webp"),
  visual("wellness-service-video", "service", "video", "resofit-cdn/services/wellness/resofit-personalized-wellness", "mp4"),
  visual("wellness-service-poster", "service", "poster", "resofit-cdn/services/wellness/resofit-personalized-wellness-poster", "webp"),
] as const;

export const CLOUDINARY_VISUAL_EXPERIENCE_COUNT = 28;
export const CLOUDINARY_VISUAL_VIDEO_COUNT = 14;
export const CLOUDINARY_VISUAL_POSTER_COUNT = 14;

if (CLOUDINARY_VISUAL_EXPERIENCE.length !== CLOUDINARY_VISUAL_EXPERIENCE_COUNT) {
  throw new Error("Cloudinary visual-experience registry must contain exactly 28 assets.");
}

export const getCloudinaryVisualAsset = (key: string) =>
  CLOUDINARY_VISUAL_EXPERIENCE.find((asset) => asset.key === key);

export const cloudinaryVisualUrl = (asset: CloudinaryVisualAsset): string => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return "";
  return `https://res.cloudinary.com/${cloudName}/${asset.kind === "video" ? "video" : "image"}/upload/f_auto,q_auto/${asset.publicId}.${asset.format}`;
};
