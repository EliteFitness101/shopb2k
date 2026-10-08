// ResoFit canonical telemetry boundary.
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "./attribution";
import { pixelEvent } from "./pixels";

const ANON_KEY = "resofit:anon_id";
const VARIANT_KEY = "resofit:landing_variant";

export type TrackEvent =
  | "product_view" | "product_click" | "add_to_cart" | "checkout_start" | "purchase_success"
  | "product_score_update" | "asset_regenerated" | "price_test_triggered" | "hero_promoted" | "demoted"
  | "cinematic_view" | "cinematic_play" | "cinematic_complete" | "cinematic_cta_click"
  | "identity_started" | "identity_created" | "assessment_completed" | "cta_click" | "chatb2k_handoff" | "wishlist_add" | "wishlist_remove" | "compare" | "price_filter" | "play_home_view" | "game_selected"
  | "quick_match" | "match_started" | "match_finished" | "achievement_unlocked" | "reward_claimed"
  | "leaderboard_view" | "tournament_joined" | "friend_invited" | "wellness_bonus" | "chatb2k_play_assist"
  | "wellness_view" | "wellness_search" | "wellness_cta_click" | "wellness_hub_access_request"
  | "wellness_location_detected" | "search";

const CANONICAL_PUBLIC_EVENT: Partial<Record<TrackEvent, string>> = {
  product_view: "funnel.page_viewed",
  product_click: "commerce.product_clicked",
  add_to_cart: "commerce.cart_added",
  search: "commerce.search",
  checkout_start: "checkout.started",
  identity_started: "assessment.started",
  assessment_completed: "assessment.completed",
  cta_click: "funnel.cta_clicked",
  chatb2k_handoff: "conversation.whatsapp_clicked",
  wishlist_add: "commerce.wishlist_added",
  wishlist_remove: "commerce.wishlist_removed",
  compare: "commerce.compare",
  price_filter: "commerce.price_filtered",
};
function getAnonId() { if (typeof window === "undefined") return "ssr"; try { let id = localStorage.getItem(ANON_KEY); if (!id) { id = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`; localStorage.setItem(ANON_KEY, id); } return id; } catch { return "anon_nostorage"; } }
function getLandingVariant() { if (typeof window === "undefined") return "default"; try { let v = localStorage.getItem(VARIANT_KEY); if (!v) { v = Math.random() < 0.5 ? "A" : "B"; localStorage.setItem(VARIANT_KEY, v); } return v; } catch { return "default"; } }
function getDevice() { if (typeof window === "undefined") return "ssr"; const ua = navigator.userAgent || ""; if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return "mobile"; if (/Tablet|iPad/i.test(ua)) return "tablet"; return "desktop"; }
async function emitCanonicalTelemetry(event: TrackEvent, payload: Record<string, unknown>) {
  const eventName = CANONICAL_PUBLIC_EVENT[event];
  if (!eventName || typeof window === "undefined") return;
  const attr = getAttribution();
  const anonymousId = getAnonId();
  const params = new URLSearchParams(window.location.search);
  const body = {
    event_name: eventName,
    contract_version: "1.0",
    idempotency_key: `${anonymousId}:${event}:${Date.now()}:${crypto.randomUUID()}`,
    anonymous_id: anonymousId,
    rsid: attr.rsid ?? params.get("rsid"),
    funnel_origin: attr.funnel_origin ?? params.get("funnel_origin"),
    utm: Object.fromEntries(params.entries()),
    source_system: "resofit",
    session_id: typeof payload.session_id === "string" ? payload.session_id : undefined,
    payload: { original_event: event, page: window.location.pathname, device: getDevice(), landing_variant: getLandingVariant(), attribution: attr, ...payload }
  };
  try {
    await supabase.functions.invoke("resofit-event-ingest", { body });
  } catch { void 0; }
}
export function track(event: TrackEvent, payload: Record<string, unknown> = {}) { if (typeof window === "undefined") return; const eventId = typeof payload.event_id === "string" && payload.event_id ? payload.event_id : `${event}_${Date.now()}_${crypto.randomUUID()}`; const eventPayload = { ...payload, event_id: eventId }; void emitCanonicalTelemetry(event, eventPayload); try { pixelEvent(event, { value: typeof payload.value === "number" ? payload.value : undefined, currency: typeof payload.currency === "string" ? payload.currency : "NGN", content_ids: Array.isArray(payload.content_ids) ? payload.content_ids as string[] : typeof payload.product_id === "string" ? [payload.product_id] : undefined, content_name: typeof payload.product_title === "string" ? payload.product_title : undefined, content_type: "product", num_items: typeof payload.quantity === "number" ? payload.quantity : undefined, query: typeof payload.query === "string" ? payload.query : undefined, event_id: eventId }); } catch { void 0; } }
