// Cloudinary visual-experience helpers for the ResoFit main ecosystem.
// Canonical publishing source: resofit/buffer/videos/.
// Originals remain untouched; optimization happens at CDN delivery time.

export type VisualAssetKind = "video" | "poster";
export type VisualExperienceGroup = "brand" | "category" | "product-family" | "service";

export type CloudinaryVisualAsset = {
  key: string;
  group: VisualExperienceGroup;
  kind: VisualAssetKind;
  publicId: string;
  format: "mp4" | "webp";
};

const CLOUDINARY_CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "ihlmr2hd").trim();
const CLOUDINARY_ROOT_FOLDER = "resofit/buffer/videos";

const visual = (
  key: string,
  group: VisualExperienceGroup,
  kind: VisualAssetKind,
  publicId: string,
  format: "mp4" | "webp",
): CloudinaryVisualAsset => ({ key, group, kind, publicId, format });

export const CLOUDINARY_VISUAL_EXPERIENCE: readonly CloudinaryVisualAsset[] = [
  visual("resofit-hero-video", "brand", "video", `${CLOUDINARY_ROOT_FOLDER}/resofit-hero`, "mp4"),
  visual("resofit-hero-poster", "brand", "poster", `${CLOUDINARY_ROOT_FOLDER}/resofit-hero`, "webp"),
  visual("resofit-community-video", "brand", "video", `${CLOUDINARY_ROOT_FOLDER}/resofit-community`, "mp4"),
  visual("resofit-community-poster", "brand", "poster", `${CLOUDINARY_ROOT_FOLDER}/resofit-community`, "webp"),
  visual("strength-video", "category", "video", `${CLOUDINARY_ROOT_FOLDER}/bg-strength`, "mp4"),
  visual("strength-poster", "category", "poster", `${CLOUDINARY_ROOT_FOLDER}/bg-strength`, "webp"),
  visual("functional-video", "category", "video", `${CLOUDINARY_ROOT_FOLDER}/bg-functional`, "mp4"),
  visual("functional-poster", "category", "poster", `${CLOUDINARY_ROOT_FOLDER}/bg-functional`, "webp"),
  visual("boxing-video", "category", "video", `${CLOUDINARY_ROOT_FOLDER}/bg-boxing`, "mp4"),
  visual("boxing-poster", "category", "poster", `${CLOUDINARY_ROOT_FOLDER}/bg-boxing`, "webp"),
  visual("running-video", "category", "video", `${CLOUDINARY_ROOT_FOLDER}/bg-running`, "mp4"),
  visual("running-poster", "category", "poster", `${CLOUDINARY_ROOT_FOLDER}/bg-running`, "webp"),
  visual("apparel-video", "category", "video", `${CLOUDINARY_ROOT_FOLDER}/bg-apparel`, "mp4"),
  visual("apparel-poster", "category", "poster", `${CLOUDINARY_ROOT_FOLDER}/bg-apparel`, "webp"),
  visual("womens-training-video", "category", "video", `${CLOUDINARY_ROOT_FOLDER}/bg-womens-training`, "mp4"),
  visual("womens-training-poster", "category", "poster", `${CLOUDINARY_ROOT_FOLDER}/bg-womens-training`, "webp"),
  visual("wellness-video", "category", "video", `${CLOUDINARY_ROOT_FOLDER}/bg-wellness`, "mp4"),
  visual("wellness-poster", "category", "poster", `${CLOUDINARY_ROOT_FOLDER}/bg-wellness`, "webp"),
  visual("coaching-video", "category", "video", `${CLOUDINARY_ROOT_FOLDER}/bg-coaching`, "mp4"),
  visual("coaching-poster", "category", "poster", `${CLOUDINARY_ROOT_FOLDER}/bg-coaching`, "webp"),
  visual("resoflex-equipment-video", "product-family", "video", `${CLOUDINARY_ROOT_FOLDER}/resoflex-equipment`, "mp4"),
  visual("resoflex-equipment-poster", "product-family", "poster", `${CLOUDINARY_ROOT_FOLDER}/resoflex-equipment`, "webp"),
  visual("resoflex-apparel-video", "product-family", "video", `${CLOUDINARY_ROOT_FOLDER}/resoflex-apparel`, "mp4"),
  visual("resoflex-apparel-poster", "product-family", "poster", `${CLOUDINARY_ROOT_FOLDER}/resoflex-apparel`, "webp"),
  visual("chatb2k-video", "service", "video", `${CLOUDINARY_ROOT_FOLDER}/chatb2k-personalized-coaching`, "mp4"),
  visual("chatb2k-poster", "service", "poster", `${CLOUDINARY_ROOT_FOLDER}/chatb2k-personalized-coaching`, "webp"),
  visual("wellness-service-video", "service", "video", `${CLOUDINARY_ROOT_FOLDER}/resofit-personalized-wellness`, "mp4"),
  visual("wellness-service-poster", "service", "poster", `${CLOUDINARY_ROOT_FOLDER}/resofit-personalized-wellness`, "webp"),
] as const;

export const getCloudinaryVisualAsset = (key: string) =>
  CLOUDINARY_VISUAL_EXPERIENCE.find((asset) => asset.key === key);

/**
 * Build a deterministic Cloudinary delivery URL.
 *
 * Videos intentionally end in .mp4 and do not use f_auto. This keeps the
 * public asset URL stable and fetchable by social schedulers such as Buffer,
 * while q_auto still lets Cloudinary optimize delivery quality.
 */
export const cloudinaryVisualUrl = (asset: CloudinaryVisualAsset): string => {
  if (!CLOUDINARY_CLOUD_NAME) return "";

  if (asset.kind === "video") {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/q_auto/${asset.publicId}.mp4`;
  }

  // Generate a WebP poster from the same canonical source video.
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/so_auto,q_auto/${asset.publicId}.webp`;
};
