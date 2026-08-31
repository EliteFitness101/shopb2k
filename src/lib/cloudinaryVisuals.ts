// Cloudinary visual-experience helpers for the ResoFit main ecosystem.
// The Cloudinary root is resolved dynamically; semantic keys remain stable for UI components.

export type VisualAssetKind = "video" | "poster";
export type VisualExperienceGroup = "brand" | "category" | "product-family" | "service";

export type CloudinaryVisualAsset = {
  key: string;
  group: VisualExperienceGroup;
  kind: VisualAssetKind;
  publicId: string;
  format: "mp4" | "webp";
};

const CLOUDINARY_ROOT_FOLDER = (import.meta.env.VITE_CLOUDINARY_ROOT_FOLDER || "resofit")
  .trim()
  .replace(/^\/+|\/+$/g, "");

const visual = (
  key: string,
  group: VisualExperienceGroup,
  kind: VisualAssetKind,
  relativePublicId: string,
  format: "mp4" | "webp",
): CloudinaryVisualAsset => ({
  key,
  group,
  kind,
  publicId: `${CLOUDINARY_ROOT_FOLDER}/${relativePublicId.replace(/^\/+/, "")}`,
  format,
});

export const CLOUDINARY_VISUAL_EXPERIENCE: readonly CloudinaryVisualAsset[] = [
  visual("resofit-hero-video", "brand", "video", "brand/videos/resofit-hero", "mp4"),
  visual("resofit-hero-poster", "brand", "poster", "brand/posters/resofit-hero-poster", "webp"),
  visual("resofit-community-video", "brand", "video", "brand/videos/resofit-community", "mp4"),
  visual("resofit-community-poster", "brand", "poster", "brand/posters/resofit-community-poster", "webp"),
  visual("strength-video", "category", "video", "categories/strength/bg-strength", "mp4"),
  visual("strength-poster", "category", "poster", "categories/strength/bg-strength-poster", "webp"),
  visual("functional-video", "category", "video", "categories/functional/bg-functional", "mp4"),
  visual("functional-poster", "category", "poster", "categories/functional/bg-functional-poster", "webp"),
  visual("boxing-video", "category", "video", "categories/boxing/bg-boxing", "mp4"),
  visual("boxing-poster", "category", "poster", "categories/boxing/bg-boxing-poster", "webp"),
  visual("running-video", "category", "video", "categories/running/bg-running", "mp4"),
  visual("running-poster", "category", "poster", "categories/running/bg-running-poster", "webp"),
  visual("apparel-video", "category", "video", "categories/apparel/bg-apparel", "mp4"),
  visual("apparel-poster", "category", "poster", "categories/apparel/bg-apparel-poster", "webp"),
  visual("womens-training-video", "category", "video", "categories/womens-training/bg-womens-training", "mp4"),
  visual("womens-training-poster", "category", "poster", "categories/womens-training/bg-womens-training-poster", "webp"),
  visual("wellness-video", "category", "video", "categories/wellness/bg-wellness", "mp4"),
  visual("wellness-poster", "category", "poster", "categories/wellness/bg-wellness-poster", "webp"),
  visual("coaching-video", "category", "video", "categories/coaching/bg-coaching", "mp4"),
  visual("coaching-poster", "category", "poster", "categories/coaching/bg-coaching-poster", "webp"),
  visual("resoflex-equipment-video", "product-family", "video", "products/resoflex-equipment/resoflex-equipment", "mp4"),
  visual("resoflex-equipment-poster", "product-family", "poster", "products/resoflex-equipment/resoflex-equipment-poster", "webp"),
  visual("resoflex-apparel-video", "product-family", "video", "products/resoflex-apparel/resoflex-apparel", "mp4"),
  visual("resoflex-apparel-poster", "product-family", "poster", "products/resoflex-apparel/resoflex-apparel-poster", "webp"),
  visual("chatb2k-video", "service", "video", "services/chatb2k/chatb2k-personalized-coaching", "mp4"),
  visual("chatb2k-poster", "service", "poster", "services/chatb2k/chatb2k-poster", "webp"),
  visual("wellness-service-video", "service", "video", "services/wellness/resofit-personalized-wellness", "mp4"),
  visual("wellness-service-poster", "service", "poster", "services/wellness/resofit-personalized-wellness-poster", "webp"),
] as const;

export const getCloudinaryVisualAsset = (key: string) =>
  CLOUDINARY_VISUAL_EXPERIENCE.find((asset) => asset.key === key);

export const cloudinaryVisualUrl = (asset: CloudinaryVisualAsset): string => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return "";
  return `https://res.cloudinary.com/${cloudName}/${asset.kind === "video" ? "video" : "image"}/upload/f_auto,q_auto/${asset.publicId}.${asset.format}`;
};
