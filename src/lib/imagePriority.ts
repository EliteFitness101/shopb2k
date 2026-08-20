// Smart Image Priority Engine v2 (frontend-only)
// Conversion-aware loading: scores products from session signals and
// chooses eager / lazy / idle-preload without any backend changes.

export type PriorityTier = "high" | "medium" | "low";

interface ProductStats {
  views: number;
  clicks: number;
  atc: number;
  checkout: number;
  pdpDepth: number;
  updatedAt: number;
}

interface PriorityState {
  products: Record<string, ProductStats>;
}

const STORAGE_KEY = "resofit:imgPriority:v1";
const EMPTY_STATS: ProductStats = {
  views: 0,
  clicks: 0,
  atc: 0,
  checkout: 0,
  pdpDepth: 0,
  updatedAt: 0,
};

const W = { ctr: 2, atc: 4, cvr: 6, depth: 1 };

function read(): PriorityState {
  if (typeof window === "undefined") return { products: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { products: {} };
    return JSON.parse(raw) as PriorityState;
  } catch {
    return { products: {} };
  }
}

function write(state: PriorityState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

function statsFor(id: string, state: PriorityState): ProductStats {
  return state.products[id] ?? { ...EMPTY_STATS };
}

/** 0..N raw score. Higher = more important to load fast. */
export function scoreProduct(id: string, basePlacement = 0): number {
  const s = statsFor(id, read());
  const ctr = s.views ? s.clicks / s.views : 0;
  const atc = s.clicks ? s.atc / s.clicks : 0;
  const cvr = s.views ? s.checkout / s.views : 0;
  return W.ctr * ctr + W.atc * atc + W.cvr * cvr + W.depth * s.pdpDepth + basePlacement;
}

/** Resolve a tier. `placement` is the index in the rendered list (0-based). */
export function resolveTier(
  id: string | undefined,
  placement: number,
  opts?: { isHero?: boolean },
): PriorityTier {
  // Static safety layer: hero + top-2 are always HIGH.
  if (opts?.isHero) return "high";
  if (placement <= 1) return "high";

  if (!id) {
    if (placement <= 5) return "medium";
    return "low";
  }

  const score = scoreProduct(id, Math.max(0, 1 - placement * 0.1));
  if (score >= 1.2) return "high";
  if (score >= 0.3 || placement <= 5) return "medium";
  return "low";
}

export type EngagementEvent = "view" | "click" | "add_to_cart" | "checkout_start" | "pdp_depth";

export function recordEngagement(id: string | undefined, event: EngagementEvent) {
  if (!id || typeof window === "undefined") return;
  const state = read();
  const s = { ...statsFor(id, state) };
  if (event === "view") s.views += 1;
  if (event === "click") s.clicks += 1;
  if (event === "add_to_cart") s.atc += 1;
  if (event === "checkout_start") s.checkout += 1;
  if (event === "pdp_depth") s.pdpDepth = Math.min(s.pdpDepth + 1, 10);
  s.updatedAt = Date.now();
  state.products[id] = s;
  write(state);
}

/** Idle-preload a list of image URLs. Safe to call repeatedly. */
const preloaded = new Set<string>();
export function preloadOnIdle(urls: Array<string | undefined | null>) {
  if (typeof window === "undefined") return;
  const fresh = urls.filter((u): u is string => !!u && !preloaded.has(u));
  if (fresh.length === 0) return;

  const run = () => {
    for (const url of fresh) {
      preloaded.add(url);
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }
  };

  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (ric) ric(run, { timeout: 2000 });
  else setTimeout(run, 250);
}
