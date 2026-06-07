// Attribution capture — rsid, utm_source, utm_campaign (and related utm_*)
// Persisted in localStorage; appended to outbound checkout / partner URLs.

const STORAGE_KEY = "resofit:attribution:v1";
const TRACKED_PARAMS = [
  "rsid",
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
    const raw = localStorage.getItem(STORAGE_KEY);
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

/** Read current URL once on mount; merge any tracked params into storage. */
export function captureAttributionFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const existing = getAttribution();
  const next: AttributionParams = { ...existing };
  let changed = false;
  for (const k of TRACKED_PARAMS) {
    const v = url.searchParams.get(k);
    if (v && v !== existing[k]) {
      next[k] = v;
      changed = true;
    }
  }
  if (changed) save(next);
}

/** Append persisted attribution params to a URL without clobbering existing ones. */
export function withAttribution(targetUrl: string): string {
  try {
    const url = new URL(targetUrl);
    const attr = getAttribution();
    for (const [k, v] of Object.entries(attr)) {
      if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
    }
    return url.toString();
  } catch {
    return targetUrl;
  }
}
