// ResoFit canonical telemetry boundary.
// The browser never depends directly on Make.com/n8n for core analytics.
// Optional adapters receive events only through the ResoFit/Supabase event boundary.

import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "./attribution";
import { pixelEvent } from "./pixels";

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

const CANONICAL_PUBLIC_EVENT: Partial<Record<TrackEvent, string>> = {
  product_view: "funnel.page_viewed",
  checkout_start: "checkout.started",
  identity_started: "assessment.started",
  chatb2k_handoff: "conversation.whatsapp_clicked",
};

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

async function emitCanonicalTelemetry(
  event: TrackEvent,
  payload: Record<string, unknown>,
) {
  const eventName = CANONICAL_PUBLIC_EVENT[event];
  if (!eventName || typeof window === "undefined") return;

  const attr = getAttribution();
  const anonymousId = getAnonId();
  const params = new URLSearchParams(window.location.search);

  try {
    await supabase.functions.invoke("resofit-event-ingest", {
      body: {
        event_name: eventName,
        contract_version: "1.0",
        idempotency_key: `${anonymousId}:${event}:${Date.now()}:${crypto.randomUUID()}`,
        anonymous_id: anonymousId,
        rsid: attr.rsid ?? params.get("rsid"),
        funnel_origin: attr.funnel_origin ?? params.get("funnel_origin"),
        utm: Object.fromEntries(params.entries()),
        source_system: "resofit",
        payload: {
          original_event: event,
          page: window.location.pathname,
          device: getDevice(),
          landing_variant: getLandingVariant(),
          attribution: attr,
          ...payload,
        },
      },
    });
  } catch {
    // Telemetry must never block the customer journey.
  }
}

export function track(event: TrackEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  void emitCanonicalTelemetry(event, payload);

  try {
    pixelEvent(event, {
      value: typeof payload.value === "number" ? payload.value : undefined,
      currency: typeof payload.currency === "string" ? payload.currency : "NGN",
      content_ids: Array.isArray(payload.content_ids)
        ? (payload.content_ids as string[])
        : typeof payload.product_id === "string"
          ? [payload.product_id]
          : undefined,
      content_name:
        typeof payload.product_title === "string" ? payload.product_title : undefined,
      content_type: "product",
      num_items: typeof payload.quantity === "number" ? payload.quantity : undefined,
    });
  } catch {
    /* noop */
  }
}
