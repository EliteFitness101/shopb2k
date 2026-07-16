export interface KnowledgeCategory {
  slug: string;
  title: string;
  tagline: string;
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  { slug: "nutrition", title: "Nutrition", tagline: "Whole-food fuel for the way you actually eat." },
  { slug: "healthy-living", title: "Healthy Living", tagline: "Sustainable habits for modern life." },
  { slug: "healthy-ageing", title: "Healthy Ageing", tagline: "Build the next 40 years on purpose." },
  { slug: "movement", title: "Movement", tagline: "Move well, move often, move for life." },
  { slug: "strength", title: "Strength", tagline: "The longevity drug you can train for." },
  { slug: "mobility", title: "Mobility", tagline: "Free hips, free shoulders, free life." },
  { slug: "recovery", title: "Recovery", tagline: "Sleep, breath, and the science of rest." },
  { slug: "body-confidence", title: "Body Confidence", tagline: "Built in reps, not mirrors." },
  { slug: "recipes", title: "Recipes", tagline: "Real meals for African kitchens." },
  { slug: "equipment-guides", title: "Equipment Guides", tagline: "Choose gear that outlives trends." },
];
