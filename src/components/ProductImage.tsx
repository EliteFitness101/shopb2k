// Unified product image layer for the ResoFit catalog.
// - Lazy by default, eager + high priority for above-the-fold heroes
// - WebP-friendly: trusts Shopify CDN (which serves WebP via Accept negotiation)
// - SVG data-URI fallback prevents broken UI states without new dependencies
// - Aspect-ratio container prevents layout shift
// - SEO alt: "{Title} – premium {category} for home gym strength training"

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { recordEngagement, resolveTier, type PriorityTier } from "@/lib/imagePriority";
import { shopifySrcSet } from "@/lib/media";
import { track } from "@/lib/tracking";

const FALLBACK_SVG = (title: string, category?: string | null) => {
  const esc = (value: string) => value.slice(0, 34).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const safeTitle = esc(title);
  const safeCategory = esc((category ?? "RESOFIT").slice(0, 22).toUpperCase());
  return "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'>
  <defs><radialGradient id='g' cx='50%' cy='42%' r='75%'><stop offset='0%' stop-color='#211a12'/><stop offset='62%' stop-color='#0b0908'/><stop offset='100%' stop-color='#000'/></radialGradient></defs>
  <rect width='800' height='800' fill='url(#g)'/>
  <circle cx='400' cy='350' r='170' fill='none' stroke='#c9a24a' stroke-width='2' opacity='.45'/>
  <circle cx='400' cy='350' r='145' fill='none' stroke='#c9a24a' stroke-width='1' opacity='.18'/>
  <text x='400' y='335' text-anchor='middle' font-family='Georgia,serif' font-size='34' letter-spacing='8' fill='#c9a24a'>RESOFIT</text>
  <text x='400' y='385' text-anchor='middle' font-family='system-ui,sans-serif' font-size='15' letter-spacing='4' fill='#b7a778'>${safeCategory}</text>
  <text x='400' y='470' text-anchor='middle' font-family='system-ui,sans-serif' font-size='22' fill='#eee'>${safeTitle}</text>
  <text x='400' y='735' text-anchor='middle' font-family='system-ui,sans-serif' font-size='11' letter-spacing='5' fill='#7e7359'>PREMIUM WELLNESS COLLECTION</text>
</svg>`);
};
