// Product Intelligence Engine v2 — frontend-only
// Computes Product Performance Score (PPS) from engagement signals
// captured by `imagePriority`, resolves lifecycle states, ranks
// products for hero promotion, and emits intelligence events
// (`product_score_update`, `hero_promoted`, `demoted`) to the
// existing Make.com tracking webhook.
//
// Pure frontend: no backend, no asset generation, no price mutation.
// Designed to layer on top of the existing imagePriority + tracking
// modules without altering routing, catalog, or checkout.

import { track } from "./tracking";

const PPS_STATE_KEY = "resofit:pps:v1";
const ENG_KEY = "resofit:imgPriority:v1"; // shared with imagePriority

export type LifecycleState = "HERO" | "ACTIVE" | "OPTIMIZE" | "DOWNGRADE";

export interface ProductPerformance {
  productId: string;
  pps: number; // 0..100
  state: LifecycleState;
  ctr: number;
  atcRate: number;
  checkoutRate: number;
  conversionRate: number;
  updatedAt: number;
}

interface PPSState {
  scores: Record<string, ProductPerformance>;
  hero: string[]; // last known hero set (for promote/demote diff)
  lastAuditAt: number;
}

interface EngStats {
  views: number;
  clicks: number;
  atc: number;
  checkout: number;
  pdpDepth: number;
  updatedAt: number;
}

interface EngState {
  products: Record<string, EngStats>;
  // optional: track purchases per product, if we later add it
  purchases?: Record<string, number>;
}

const EMPTY_PPS: PPSState = { scores: {}, hero: [], lastAuditAt: 0 };

function readPPS(): PPSState {
  if (typeof window === "undefined") return { ...EMPTY_PPS };
  try {
    const raw = localStorage.getItem(PPS_STATE_KEY);
    return raw ? { ...EMPTY_PPS, ...(JSON.parse(raw) as PPSState) } : { ...EMPTY_PPS };
  } catch {
    return { ...EMPTY_PPS };
  }
}

function writePPS(state: PPSState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PPS_STATE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

function readEng(): EngState {
  if (typeof window === "undefined") return { products: {} };
  try {
    const raw = localStorage.getItem(ENG_KEY);
    return raw ? (JSON.parse(raw) as EngState) : { products: {} };
  } catch {
    return { products: {} };
  }
}

/** Normalize a 0..1 rate against a soft target so 1 small win doesn't peg the score. */
function norm(rate: number, target: number): number {
  if (rate <= 0) return 0;
  return Math.min(1, rate / target);
}

/** Compute PPS for a single product from engagement stats.
 *  PPS = (CTR*.25 + ATC*.25 + Checkout*.25 + CVR*.25) * 100,
 *  each component normalized against an industry-soft target. */
export function computePPS(stats: EngStats, purchases = 0): ProductPerformance["pps"] {
  const ctr = stats.views ? stats.clicks / stats.views : 0;
  const atcRate = stats.clicks ? stats.atc / stats.clicks : 0;
  const checkoutRate = stats.atc ? stats.checkout / stats.atc : 0;
  const cvr = stats.views ? purchases / stats.views : 0;

  // Targets calibrated for a luxe fitness funnel.
  const score =
    (norm(ctr, 0.25) +
      norm(atcRate, 0.15) +
      norm(checkoutRate, 0.5) +
      norm(cvr, 0.03)) *
    25; // each component max 25
  return Math.round(score * 10) / 10;
}

export function lifecycleFor(pps: number): LifecycleState {
  if (pps >= 90) return "HERO";
  if (pps >= 70) return "ACTIVE";
  if (pps >= 40) return "OPTIMIZE";
  return "DOWNGRADE";
}

/** Build perf record for one product. */
export function perfFor(productId: string): ProductPerformance {
  const eng = readEng();
  const s = eng.products[productId] ?? {
    views: 0,
    clicks: 0,
    atc: 0,
    checkout: 0,
    pdpDepth: 0,
    updatedAt: 0,
  };
  const purchases = eng.purchases?.[productId] ?? 0;
  const pps = computePPS(s, purchases);
  return {
    productId,
    pps,
    state: lifecycleFor(pps),
    ctr: s.views ? s.clicks / s.views : 0,
    atcRate: s.clicks ? s.atc / s.clicks : 0,
    checkoutRate: s.atc ? s.checkout / s.atc : 0,
    conversionRate: s.views ? purchases / s.views : 0,
    updatedAt: s.updatedAt || Date.now(),
  };
}

/** Run the audit across a known product universe. Diffs hero set,
 *  emits events for promotions, demotions, and material score changes. */
export function auditCatalog(productIds: string[]): ProductPerformance[] {
  const state = readPPS();
  const results = productIds.map(perfFor);
  const byId: Record<string, ProductPerformance> = {};
  for (const r of results) byId[r.productId] = r;

  // Detect material score changes (>=5 PPS delta) → product_score_update.
  for (const r of results) {
    const prev = state.scores[r.productId];
    if (!prev || Math.abs(prev.pps - r.pps) >= 5 || prev.state !== r.state) {
      track("product_score_update", {
        productId: r.productId,
        pps: r.pps,
        state: r.state,
        prevPps: prev?.pps ?? null,
        prevState: prev?.state ?? null,
      });
    }
  }

  // Hero set = lifecycle HERO, ranked by PPS desc, capped at 6.
  const heroNow = results
    .filter((r) => r.state === "HERO")
    .sort((a, b) => b.pps - a.pps)
    .slice(0, 6)
    .map((r) => r.productId);

  const heroPrev = new Set(state.hero);
  const heroNext = new Set(heroNow);

  for (const id of heroNow) {
    if (!heroPrev.has(id)) {
      track("hero_promoted", { productId: id, pps: byId[id]?.pps });
    }
  }
  for (const id of state.hero) {
    if (!heroNext.has(id)) {
      track("demoted", { productId: id, pps: byId[id]?.pps ?? 0 });
    }
  }

  writePPS({
    scores: byId,
    hero: heroNow,
    lastAuditAt: Date.now(),
  });
  return results;
}

/** Return the current hero-ranked product IDs (no recompute). */
export function getHeroOrder(): string[] {
  return readPPS().hero;
}

/** Sort a product list so hero-promoted SKUs lead, then ACTIVE, then the rest. */
export function rankByPerformance<T extends { id: string }>(items: T[]): T[] {
  const state = readPPS();
  const score = (id: string) => state.scores[id]?.pps ?? 0;
  return [...items].sort((a, b) => score(b.id) - score(a.id));
}

/** Read cached perf without recomputing — for badge/UI use. */
export function getCachedPerf(productId: string): ProductPerformance | undefined {
  return readPPS().scores[productId];
}
