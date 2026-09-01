export type MartialVideoRole =
  | "landscape_hero"
  | "landscape_carousel"
  | "featured_training"
  | "technique_feature"
  | "social_vertical";

export type MartialVideo = {
  id: string;
  url: string;
  role: MartialVideoRole;
  label: string;
};

export const MARTIAL_VIDEOS: MartialVideo[] = [
  {
    id: "athlete-martial-arts",
    url: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/martial/video/Athlete_performing_martial_arts_%E2%80%A6_202608091902.mp4",
    role: "landscape_hero",
    label: "Athlete performing martial arts",
  },
  {
    id: "martial-training-hero",
    url: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/martial/video/Martial_arts_training_hero_video_202608100819.mp4",
    role: "landscape_carousel",
    label: "Martial arts training hero",
  },
  {
    id: "coach-buchi-signature-combo-alt",
    url: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/martial/video/martial-x_coach-buchi_signature_combo_01_gemini-omni_8s%202.mp4",
    role: "social_vertical",
    label: "Coach Buchi signature combo — alternate",
  },
  {
    id: "coach-buchi-signature-combo",
    url: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/martial/video/martial-x_coach-buchi_signature_combo_01_gemini-omni_8s.mp4",
    role: "featured_training",
    label: "Coach Buchi signature combo",
  },
  {
    id: "jab-cross-hook-spinning-back-kick",
    url: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/martial/video/martial-x_jab-cross-lead-hook-spinning-back-kick_veo31_master_8s.mp4",
    role: "technique_feature",
    label: "Jab-cross-lead-hook-spinning-back-kick",
  },
  {
    id: "martial-x-hero",
    url: "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/martial/video/public%3Avideos%3Amartial-x-hero-8s.mp4",
    role: "landscape_carousel",
    label: "Martial-X hero",
  },
];
