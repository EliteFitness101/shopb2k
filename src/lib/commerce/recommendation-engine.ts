export type RecommendationCategory =
  | "fitness"
  | "sports"
  | "health"
  | "beauty"
  | "lifestyle"
  | "recovery";

export interface RecommendationCandidate {
  externalProductId: string;
  sku?: string | null;
  title: string;
  category: RecommendationCategory;
  subcategory?: string | null;
  priceNgn: number;
  stockQty: number;
  rating?: number | null;
  reviewCount?: number;
  codEligible: boolean;
  imageUrl?: string | null;
  imageRightsStatus?: "unknown" | "authorized" | "licensed" | "owned" | "rejected";
  resaleStatus?: "pending" | "authorized" | "rejected";
  metadata?: Record<string, unknown>;
}

const CATEGORY_TARGETS: Record<RecommendationCategory, number> = {
  fitness: 300,
  sports: 150,
  health: 150,
  beauty: 150,
  lifestyle: 150,
  recovery: 100,
};

const KEYWORDS: Record<RecommendationCategory, string[]> = {
  fitness: ["fitness", "gym", "dumbbell", "barbell", "workout", "exercise", "rope", "mat", "resistance", "training"],
  sports: ["sport", "football", "basketball", "cycling", "running", "athletic", "sportswear", "glove", "bag"],
  health: ["health", "wellness", "scale", "monitor", "support", "posture", "hydration", "medical", "care"],
  beauty: ["beauty", "skin", "skincare", "hair", "makeup", "cosmetic", "grooming", "personal care"],
  lifestyle: ["travel", "accessory", "bag", "bottle", "sunglasses", "wallet", "organizer", "home", "office"],
  recovery: ["massage", "recovery", "foam roller", "stretch", "mobility", "compression", "lumbar", "posture", "therapy"],
};

export function inferCategory(title: string, subcategory = ""): RecommendationCategory {
  const text = `${title} ${subcategory}`.toLowerCase();
  let best: RecommendationCategory = "lifestyle";
  let bestHits = 0;
  for (const [category, words] of Object.entries(KEYWORDS) as [RecommendationCategory, string[]][]) {
    const hits = words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
    if (hits > bestHits) {
      best = category;
      bestHits = hits;
    }
  }
  return best;
}

export function scoreRecommendation(candidate: RecommendationCandidate): number {
  if (candidate.priceNgn <= 0 || candidate.stockQty <= 0) return 0;

  const rating = Math.max(0, Math.min(5, candidate.rating ?? 0));
  const reviews = Math.max(0, candidate.reviewCount ?? 0);
  const reviewSignal = Math.min(15, Math.log10(reviews + 1) * 7);
  const ratingSignal = rating * 8;
  const codSignal = candidate.codEligible ? 20 : 0;
  const mediaSignal = candidate.imageUrl ? 8 : 0;
  const rightsSignal = ["authorized", "licensed", "owned"].includes(candidate.imageRightsStatus ?? "unknown") ? 8 : 0;
  const resaleSignal = candidate.resaleStatus === "authorized" ? 10 : 0;
  const stockSignal = Math.min(8, Math.log10(candidate.stockQty + 1) * 4);

  return Number((codSignal + ratingSignal + reviewSignal + mediaSignal + rightsSignal + resaleSignal + stockSignal).toFixed(2));
}

export function isRecommendationQualified(candidate: RecommendationCandidate): boolean {
  return candidate.stockQty > 0 &&
    candidate.priceNgn > 0 &&
    candidate.codEligible &&
    Boolean(candidate.imageUrl) &&
    ["authorized", "licensed", "owned"].includes(candidate.imageRightsStatus ?? "unknown") &&
    candidate.resaleStatus === "authorized";
}

export function selectTop1000(candidates: RecommendationCandidate[]): RecommendationCandidate[] {
  const deduped = new Map<string, RecommendationCandidate>();
  for (const candidate of candidates) {
    const key = (candidate.sku || candidate.externalProductId).trim().toLowerCase();
    if (!key) continue;
    const existing = deduped.get(key);
    if (!existing || scoreRecommendation(candidate) > scoreRecommendation(existing)) deduped.set(key, candidate);
  }

  const qualified = [...deduped.values()]
    .filter(isRecommendationQualified)
    .map((candidate) => ({ ...candidate, recommendationScore: scoreRecommendation(candidate) }));

  const selected: RecommendationCandidate[] = [];
  const remaining = new Map(qualified.map((item) => [item.externalProductId, item]));

  for (const [category, target] of Object.entries(CATEGORY_TARGETS) as [RecommendationCategory, number][]) {
    const categoryItems = [...remaining.values()]
      .filter((item) => item.category === category)
      .sort((a, b) => scoreRecommendation(b) - scoreRecommendation(a));
    for (const item of categoryItems.slice(0, target)) {
      selected.push(item);
      remaining.delete(item.externalProductId);
    }
  }

  return selected.concat(
    [...remaining.values()].sort((a, b) => scoreRecommendation(b) - scoreRecommendation(a))
  ).slice(0, 1000);
}

export { CATEGORY_TARGETS };
