// Attribution capture — rsid, UTM params and TikTok click ID.
// Persisted in localStorage so paid attribution survives SPA navigation and checkout.

const STORAGE_KEY = "resofit:attribution:v2";
const TRACKED_PARAMS = [
  "rsid",
  "ttclid",
  "utm_source",
  "utm_campaign",
  "utm_medium",
  "utm_term",
  "utm_content",
] as const;

export type AttributionParams = Partial<Record<(typeof TRACKED_PARAMS)[number], string>>;

export function getAttribution(): AttributionParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("resofit:attribution:v1");
    return raw ? (JSON.parse(raw) as AttributionParams) : {};
  } catch {
    return {};
  }
}

function save(attr: AttributionParams) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attr));
  } catch {
    /* quota */
  }
}

/** Read the current URL and persist paid/marketing attribution. */
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
