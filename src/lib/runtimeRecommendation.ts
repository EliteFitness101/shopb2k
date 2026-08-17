export type RuntimeRecommendationContext = {
  answers: Record<string, string>;
  anonId?: string;
  source?: string;
  pagePath?: string;
  country?: string;
  currency?: string;
};

export type RuntimeOffer = {
  id?: string;
  sku?: string;
  handle?: string;
  title?: string;
  price?: string | number;
  currency?: string;
  destination?: string;
  reason?: string;
  available?: boolean;
  fulfillmentType?: string;
};

export type RuntimeRecommendation = {
  recommendationId?: string;
  intent?: string;
  summary?: string;
  nextAction?: string;
  offer?: RuntimeOffer;
  relatedOffers?: RuntimeOffer[];
  upsell?: RuntimeOffer[];
  crossSell?: RuntimeOffer[];
  confidence?: number;
};

const DEFAULT_ENDPOINT = "/api/public/recommendations";

function endpoint(): string {
  const configured = import.meta.env.VITE_RESOFIT_RECOMMENDATION_API;
  return typeof configured === "string" && configured.trim() ? configured.trim() : DEFAULT_ENDPOINT;
}

export async function getRuntimeRecommendation(
  context: RuntimeRecommendationContext,
): Promise<RuntimeRecommendation | null> {
  try {
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...context,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as RuntimeRecommendation;
    if (!payload || typeof payload !== "object") return null;
    return payload;
  } catch {
    return null;
  }
}

export function canonicalDestination(offer?: RuntimeOffer): string | null {
  if (!offer) return null;
  if (offer.destination) return offer.destination;
  if (offer.handle) return `/product/${encodeURIComponent(offer.handle)}`;
  return null;
}
