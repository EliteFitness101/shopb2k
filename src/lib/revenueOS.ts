// Ultra-light conversion engine v2
// Tracks events + simple CTA A/B test in localStorage. No backend.

export type RevenueEvent =
  | "landing_view"
  | "cta_click"
  | "assessment_click"
  | "whatsapp_click"
  | "checkout_start"
  | "payment_success";

const STORAGE_KEY = "revenueOS:v2";

export const CTA_VARIANTS = {
  A: "Start ₦1,000 Reset",
  B: "Transform My Body",
  C: "Chat With CoachB2K",
} as const;

export type CtaVariant = keyof typeof CTA_VARIANTS;

interface VariantStats {
  impressions: number;
  clicks: number;
  conversions: number;
}

interface RevenueState {
  variant: CtaVariant;
  stats: Record<CtaVariant, VariantStats>;
  events: Partial<Record<RevenueEvent, number>>;
}

const EMPTY: RevenueState = {
  variant: "A",
  stats: {
    A: { impressions: 0, clicks: 0, conversions: 0 },
    B: { impressions: 0, clicks: 0, conversions: 0 },
    C: { impressions: 0, clicks: 0, conversions: 0 },
  },
  events: {},
};

function read(): RevenueState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as RevenueState;
    return { ...EMPTY, ...parsed, stats: { ...EMPTY.stats, ...parsed.stats } };
  } catch {
    return { ...EMPTY };
  }
}

function write(state: RevenueState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

function conversionRate(s: VariantStats): number {
  if (!s.impressions) return 0;
  return s.conversions / s.impressions;
}

/** Pick variant: promote winning variant once any variant has ≥1 conversion;
 *  otherwise round-robin by lowest impressions. */
function pickVariant(state: RevenueState): CtaVariant {
  const variants: CtaVariant[] = ["A", "B", "C"];
  const hasConversions = variants.some((v) => state.stats[v].conversions > 0);
  if (hasConversions) {
    return variants.reduce((best, v) =>
      conversionRate(state.stats[v]) > conversionRate(state.stats[best]) ? v : best,
    );
  }
  return variants.reduce((least, v) =>
    state.stats[v].impressions < state.stats[least].impressions ? v : least,
  );
}

export function getActiveVariant(): { variant: CtaVariant; label: string } {
  const state = read();
  const variant = pickVariant(state);
  if (state.variant !== variant) {
    state.variant = variant;
    write(state);
  }
  return { variant, label: CTA_VARIANTS[variant] };
}

export function trackEvent(event: RevenueEvent) {
  const state = read();
  state.events[event] = (state.events[event] ?? 0) + 1;

  const v = state.variant;
  if (event === "landing_view") state.stats[v].impressions += 1;
  if (event === "cta_click") state.stats[v].clicks += 1;
  if (event === "payment_success") state.stats[v].conversions += 1;

  write(state);
}

export function getStats(): RevenueState {
  return read();
}
