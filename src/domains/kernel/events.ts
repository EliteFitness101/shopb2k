// ============================================================================
// ResoFlex™ Enterprise OS — Domain Event Bus
// ----------------------------------------------------------------------------
// Event-driven, zero-coupling: domains publish; other domains subscribe.
// Fire-and-forget, never throws, safe during SSR. Optionally mirrors an event
// into the existing Make.com/pixel tracking pipeline (opt-in per publish).
// ============================================================================

import { track, type TrackEvent } from "@/lib/tracking";

export type DomainEventName =
  | "user.registered"
  | "lead.created"
  | "payment.verified"
  | "dashboard.unlocked"
  | "referral.activated"
  | "membership.upgraded"
  | "order.created"
  | "subscription.renewed"
  | "notification.sent"
  | "chat.completed"
  | "recommendation.generated";

export interface DomainEvent<P = Record<string, unknown>> {
  name: DomainEventName;
  payload: P;
  at: string;
  /** Correlates an event chain across domains. */
  traceId: string;
}

type Handler = (event: DomainEvent) => void | Promise<void>;

const handlers = new Map<DomainEventName, Set<Handler>>();
const recent: DomainEvent[] = [];
const RECENT_LIMIT = 100;

/** Subscribe to a domain event. Returns an unsubscribe function. */
export function subscribe(name: DomainEventName, handler: Handler): () => void {
  const set = handlers.get(name) ?? new Set<Handler>();
  set.add(handler);
  handlers.set(name, set);
  return () => set.delete(handler);
}

export interface PublishOptions {
  /** Mirror into the legacy tracking pipeline under this event name. */
  trackAs?: TrackEvent;
}

/** Publish a domain event. Handler failures are isolated and swallowed. */
export function publish<P extends Record<string, unknown>>(
  name: DomainEventName,
  payload: P = {} as P,
  options: PublishOptions = {},
): DomainEvent<P> {
  const event: DomainEvent<P> = {
    name,
    payload,
    at: new Date().toISOString(),
    traceId: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  };

  recent.push(event as DomainEvent);
  if (recent.length > RECENT_LIMIT) recent.shift();

  for (const handler of handlers.get(name) ?? []) {
    try {
      void handler(event as DomainEvent);
    } catch {
      /* one subscriber must never break another */
    }
  }

  if (options.trackAs) {
    try {
      track(options.trackAs, { ...payload, domain_event: name, trace_id: event.traceId });
    } catch {
      /* tracking is best-effort */
    }
  }

  return event;
}

/** In-memory tail of published events — used by the operations dashboard. */
export function recentEvents(): ReadonlyArray<DomainEvent> {
  return recent.slice().reverse();
}
