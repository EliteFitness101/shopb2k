export type MartialVideoRole =
  | "landscape_hero"
  | "landscape_carousel"
  | "featured_training"
  | "technique_feature"
  | "social_vertical";

export type MartialVideo = {
  id: string;
  url: string;
  assetKey: string;
  role: MartialVideoRole;
  label: string;
};

export const MARTIAL_VIDEOS: MartialVideo[] = [
  {
    id: "athlete-martial-arts",
    url: "",
    assetKey: "athlete-martial-arts",
    role: "landscape_hero",
    label: "Athlete performing martial arts",
  },
  {
    id: "martial-training-hero",
    url: "",
    assetKey: "martial-training-hero",
    role: "landscape_carousel",
    label: "Martial arts training hero",
  },
  {
    id: "coach-buchi-signature-combo-alt",
    url: "",
    assetKey: "coach-buchi-signature-combo-alt",
    role: "social_vertical",
    label: "Coach Buchi signature combo — alternate",
  },
  {
    id: "coach-buchi-signature-combo",
    url: "",
    assetKey: "coach-buchi-signature-combo",
    role: "featured_training",
    label: "Coach Buchi signature combo",
  },
  {
    id: "jab-cross-hook-spinning-back-kick",
    url: "",
    assetKey: "jab-cross-hook-spinning-back-kick",
    role: "technique_feature",
    label: "Jab-cross-lead-hook-spinning-back-kick",
  },
  {
    id: "martial-x-hero",
    url: "",
    assetKey: "martial-x-hero",
    role: "landscape_carousel",
    label: "Martial-X hero",
  },
];
