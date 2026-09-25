// Attribution capture — shared across the ResoFit ecosystem.
// Browser persistence is mirrored into a first-party parent-domain cookie so
// attribution survives navigation between resofit.fit subdomains without
// exposing authentication/session tokens.

const STORAGE_KEY = "resofit:attribution:v2";
const COOKIE_KEY = "resofit_attribution_v2";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;
const TRACKED_PARAMS = [
  "rsid",
  "ttclid",
  "funnel_origin",
  "utm_source",
  "utm_campaign",
  "utm_medium",
  "utm_term",
  "utm_content",
] as const;

export type AttributionParams = Partial<Record<(typeof TRACKED_PARAMS)[number], string>>;

function readCookie(): AttributionParams {
  if (typeof document === "undefined") return {};
  try {
    const prefix = `${COOKIE_KEY}=`;
    const value = document.cookie.split("; ").find((item) => item.startsWith(prefix))?.slice(prefix.length);
    return value ? (JSON.parse(decodeURIComponent(value)) as AttributionParams) : {};
  } catch {
    return {};
  }
}

export function getAttribution(): AttributionParams {
  if (typeof window === "undefined") return {};
  try {
    const cookie = readCookie();
    if (Object.keys(cookie).length) return cookie;
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("resofit:attribution:v1");
    return raw ? (JSON.parse(raw) as AttributionParams) : {};
  } catch {
    return {};
  }
}

function save(attr: AttributionParams) {
  if (typeof window === "undefined") return;
  try {
    const encoded = encodeURIComponent(JSON.stringify(attr));
    document.cookie = `${COOKIE_KEY}=${encoded}; Max-Age=${COOKIE_MAX_AGE}; Path=/; Domain=.resofit.fit; Secure; SameSite=Lax`;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attr));
  } catch {
    /* storage unavailable */
  }
}

/** Read the current URL and persist paid/marketing attribution across the ecosystem. */
export function captureAttributionFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const existing = getAttribution();
  const next: AttributionParams = { ...existing };
  let changed = false;

  for (const key of TRACKED_PARAMS) {
    const value = url.searchParams.get(key);
    if (value && value !== existing[key]) {
      next[key] = value;
      changed = true;
    }
  }

  if (changed) save(next);
}

/** Append persisted attribution params to a URL without clobbering existing values. */
export function withAttribution(targetUrl: string): string {
  try {
    const url = new URL(targetUrl);
    const attr = getAttribution();
    for (const [key, value] of Object.entries(attr)) {
      if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return targetUrl;
  }
}
