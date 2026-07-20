// Lightweight identity capture — email / phone / telegram / google-hint.
// No backend rebuild: persists a `user_id` locally, pairs it with existing RSID
// attribution, and pushes to Make.com via the shared tracking pipeline.

import { track } from "./tracking";
import { getAttribution } from "./attribution";

const USER_KEY = "resofit:user_id";
const PROFILE_KEY = "resofit:user_profile:v1";

export type IdentityChannel = "email" | "phone" | "telegram" | "google";

export interface IdentityProfile {
  user_id: string;
  channel: IdentityChannel;
  handle: string; // email address, phone number, telegram handle, or google hint
  created_at: string;
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function getProfile(): IdentityProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as IdentityProfile) : null;
  } catch {
    return null;
  }
}

function ensureUserId(): string {
  const existing = getUserId();
  if (existing) return existing;
  const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    localStorage.setItem(USER_KEY, id);
  } catch {
    /* quota */
  }
  return id;
}

export function createIdentity(channel: IdentityChannel, handle: string): IdentityProfile {
  const profile: IdentityProfile = {
    user_id: ensureUserId(),
    channel,
    handle: handle.trim(),
    created_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* quota */
  }
  track("identity_created", { channel, handle: profile.handle, user_id: profile.user_id });
  return profile;
}

export function handoffToChatB2K(intent: string = "personalized_journey") {
  const profile = getProfile();
  const attr = getAttribution();
  track("chatb2k_handoff", {
    user_id: profile?.user_id ?? getUserId(),
    channel: profile?.channel,
    intent,
    source: attr.utm_source,
    campaign: attr.utm_campaign,
  });
}
