// Lightweight event tracker → Make.com webhook.
// Fire-and-forget; never block UI; never throw.

import { getAttribution } from "./attribution";

const WEBHOOK_URL = "https://hook.eu1.make.com/p0c26asklninfrxhp2sw6nkdjjb19a89";
const ANON_KEY = "resofit:anon_id";
const VARIANT_KEY = "resofit:landing_variant";

export type TrackEvent =
  | "product_view"
  | "product_click"
  | "add_to_cart"
  | "checkout_start"
  | "purchase_success"
  | "product_score_update"
  | "asset_regenerated"
  | "price_test_triggered"
  | "hero_promoted"
  | "demoted"
  | "cinematic_view"
  | "cinematic_play"
  | "cinematic_complete"
  | "cinematic_cta_click"
  | "identity_started"
  | "identity_created"
  | "chatb2k_handoff"
  | "play_home_view"
  | "game_selected"
  | "quick_match"
  | "match_started"
  | "match_finished"
  | "achievement_unlocked"
  | "reward_claimed"
  | "leaderboard_view"
  | "tournament_joined"
  | "friend_invited"
  | "wellness_bonus"
  | "chatb2k_play_assist";

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

function getLandingVariant(): string {
  if (typeof window === "undefined") return "default";
  try {
    let v = localStorage.getItem(VARIANT_KEY);
    if (!v) {
      v = Math.random() < 0.5 ? "A" : "B";
      localStorage.setItem(VARIANT_KEY, v);
    }
    return v;
  } catch {
    return "default";
  }
}

function getDevice(): string {
  if (typeof window === "undefined") return "ssr";
  const ua = navigator.userAgent || "";
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}

export function track(event: TrackEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const attr = getAttribution();
  const body = JSON.stringify({
    event,
    anon_id: getAnonId(),
    rsid: attr.rsid ?? null,
    utm_source: attr.utm_source ?? null,
    utm_medium: attr.utm_medium ?? null,
    utm_campaign: attr.utm_campaign ?? null,
    utm_content: attr.utm_content ?? null,
    utm_term: attr.utm_term ?? null,
    landing_variant: getLandingVariant(),
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
    device: getDevice(),
    referrer: document.referrer || null,
    attribution: attr,
    ...payload,
  });
  try {
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
