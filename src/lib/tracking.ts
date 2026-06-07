// Lightweight event tracker → Make.com webhook.
// Fire-and-forget; never block UI; never throw.

import { getAttribution } from "./attribution";

const WEBHOOK_URL = "https://hook.eu1.make.com/p0c26asklninfrxhp2sw6nkdjjb19a89";
const ANON_KEY = "resofit:anon_id";

export type TrackEvent =
  | "product_view"
  | "product_click"
  | "checkout_start"
  | "purchase_success";

function getAnonId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon_nostorage";
  }
}

export function track(event: TrackEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    event,
    anon_id: getAnonId(),
    attribution: getAttribution(),
    path: window.location.pathname,
    ts: new Date().toISOString(),
    ...payload,
  });
  try {
    // keepalive lets the request survive navigation (e.g. checkout open in new tab)
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      mode: "no-cors",
    }).catch(() => {});
  } catch {
    /* noop */
  }
}
