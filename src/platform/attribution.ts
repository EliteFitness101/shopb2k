// Platform attribution — extends the existing lib/attribution pipeline with
// RSID, application, product, and membership context. No analytics regression:
// the underlying storage and tracking remain unchanged.

import { getAttribution, withAttribution } from "@/lib/attribution";
import { getRsid } from "./identity";

export interface PlatformAttribution {
  rsid: string | null;
  source: string | null;
  campaign: string | null;
  medium: string | null;
  content: string | null;
  term: string | null;
  referrer: string | null;
  landing: string | null;
  application: string;
  product: string | null;
  membership: string | null;
}

const LANDING_KEY = "resofit:landing_path";
const CONTEXT_KEY = "resofit:platform_context:v1";

interface PlatformContext {
  product?: string;
  membership?: string;
}

function readContext(): PlatformContext {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as PlatformContext) : {};
  } catch {
    return {};
  }
}

/** Record the product/membership a visitor is engaging with. */
export function setPlatformContext(ctx: PlatformContext): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify({ ...readContext(), ...ctx }));
  } catch {
    /* quota */
  }
}

/** Persist the first page of the session for landing attribution. */
export function captureLanding(): void {
  if (typeof window === "undefined") return;
  try {
    if (!localStorage.getItem(LANDING_KEY)) {
      localStorage.setItem(LANDING_KEY, window.location.pathname + window.location.search);
    }
  } catch {
    /* quota */
  }
}

export function getPlatformAttribution(): PlatformAttribution {
  const attr = getAttribution();
  const ctx = readContext();
  let landing: string | null = null;
  let referrer: string | null = null;
  if (typeof window !== "undefined") {
    try {
      landing = localStorage.getItem(LANDING_KEY);
    } catch {
      /* noop */
    }
    referrer = document.referrer || null;
  }
  return {
    rsid: attr.rsid ?? getRsid(),
    source: attr.utm_source ?? null,
    campaign: attr.utm_campaign ?? null,
    medium: attr.utm_medium ?? null,
    content: attr.utm_content ?? null,
    term: attr.utm_term ?? null,
    referrer,
    landing,
    application: "main",
    product: ctx.product ?? null,
    membership: ctx.membership ?? null,
  };
}

/** Append platform attribution to a cross-application URL. */
export function withPlatformAttribution(
  targetUrl: string,
  extra: Record<string, string | undefined> = {},
): string {
  try {
    const url = new URL(withAttribution(targetUrl));
    const p = getPlatformAttribution();
    const params: Record<string, string | null> = {
      rsid: p.rsid,
      application: p.application,
      product: p.product,
      membership: p.membership,
      landing: p.landing,
      ...extra,
    };
    for (const [k, v] of Object.entries(params)) {
      if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
    }
    return url.toString();
  } catch {
    return targetUrl;
  }
}
