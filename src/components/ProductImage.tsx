// Unified product image layer for the ResoFit catalog.
// - Lazy by default, eager + high priority for above-the-fold heroes
// - WebP-friendly: trusts Shopify CDN (which serves WebP via Accept negotiation)
// - SVG data-URI fallback prevents broken UI states without new dependencies
// - Aspect-ratio container prevents layout shift
// - SEO alt: "{Title} – premium {category} for home gym strength training"

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { recordEngagement, resolveTier, type PriorityTier } from "@/lib/imagePriority";
import { track } from "@/lib/tracking";

const FALLBACK_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'>
  <defs>
    <radialGradient id='g' cx='50%' cy='45%' r='70%'>
      <stop offset='0%' stop-color='#1a1410'/>
      <stop offset='60%' stop-color='#0b0908'/>
      <stop offset='100%' stop-color='#000'/>
    </radialGradient>
  </defs>
  <rect width='600' height='600' fill='url(#g)'/>
  <circle cx='300' cy='300' r='120' fill='none' stroke='#c9a24a' stroke-width='1.5' opacity='0.45'/>
  <text x='300' y='305' text-anchor='middle' font-family='Georgia, serif'
        font-size='28' letter-spacing='6' fill='#c9a24a' opacity='0.85'>RESOFIT</text>
  <text x='300' y='340' text-anchor='middle' font-family='system-ui'
        font-size='11' letter-spacing='4' fill='#8a7a55' opacity='0.7'>HARDWARE</text>
</svg>`);

export const PRODUCT_FALLBACK_SRC = FALLBACK_SVG;

export interface ProductImageProps {
  src?: string | null;
  alt?: string | null;
  title: string;
  category?: string | null;
  /** Force HIGH tier (hero / above-the-fold safety layer). */
  priority?: boolean;
  className?: string;
  /** Container shape. Default square keeps catalog consistent. */
  aspect?: "square" | "portrait" | "landscape";
  sizes?: string;
  /** "cover" (default) for cards, "contain" for studio detail shots. */
  fit?: "cover" | "contain";
  /** Smart-priority inputs (frontend-only). */
  productId?: string;
  /** 0-based index in the list this image appears in. */
  placement?: number;
  /** Override the computed tier (rare). */
  tier?: PriorityTier;
}

function buildAlt(title: string, category?: string | null, provided?: string | null) {
  if (provided && provided.trim().length > 0) return provided;
  const cat = (category ?? "fitness hardware").toLowerCase();
  return `${title} – premium ${cat} for home gym strength training`;
}

const aspectClass = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
} as const;

export function ProductImage({
  src,
  alt,
  title,
  category,
  priority = false,
  className,
  aspect = "square",
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  fit = "cover",
  productId,
  placement = 99,
  tier: tierOverride,
}: ProductImageProps) {
  const [errored, setErrored] = useState(false);
  const resolvedSrc = !src || errored ? FALLBACK_SVG : src;
  const resolvedAlt = buildAlt(title, category, alt);

  // Smart-priority tier: explicit override > priority flag > computed from signals.
  const tier: PriorityTier =
    tierOverride ?? (priority ? "high" : resolveTier(productId, placement));

  // Record a view signal once per mount for learning loop.
  useEffect(() => {
    if (productId) {
      recordEngagement(productId, "view");
      track("product_view", { productId, placement, tier });
    }
  }, [productId, placement, tier]);

  const isHigh = tier === "high";
  const isMedium = tier === "medium";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-card",
        aspectClass[aspect],
        className,
      )}
    >
      <img
        src={resolvedSrc}
        alt={resolvedAlt}
        loading={isHigh ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={isHigh ? "high" : isMedium ? "auto" : "low"}
        sizes={sizes}
        data-priority-tier={tier}
        onError={() => setErrored(true)}
        onClick={() => {
          if (!productId) return;
          recordEngagement(productId, "click");
          track("product_click", { productId, placement, tier });
        }}
        className={cn(
          "h-full w-full transition-transform duration-700",
          fit === "cover" ? "object-cover" : "object-contain",
        )}
      />
    </div>
  );
}
