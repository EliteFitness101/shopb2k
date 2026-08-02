// Shared platform identity — RSID interfaces only.
// Existing Supabase authentication is untouched; this layer just prepares the
// canonical cross-application user identifier.

import { getUserId, getProfile } from "@/lib/identity";

const RSID_KEY = "resofit:rsid";

export interface PlatformIdentity {
  /** Canonical ResoFit identifier shared across all platform applications. */
  rsid: string | null;
  /** Local anonymous/local user id used before RSID issuance. */
  localUserId: string | null;
  /** Supabase auth user id, when signed in. */
  authUserId: string | null;
  channel: string | null;
  handle: string | null;
}

export function getRsid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(RSID_KEY);
  } catch {
    return null;
  }
}

/** Persist an RSID issued by the Joy Funnel / onboarding application. */
export function setRsid(rsid: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RSID_KEY, rsid);
  } catch {
    /* quota */
  }
}

export function getPlatformIdentity(authUserId: string | null = null): PlatformIdentity {
  const profile = getProfile();
  return {
    rsid: getRsid(),
    localUserId: getUserId(),
    authUserId,
    channel: profile?.channel ?? null,
    handle: profile?.handle ?? null,
  };
}

/** Capture an `rsid` query param handed off from another platform app. */
export function captureRsidFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const rsid = new URL(window.location.href).searchParams.get("rsid");
    if (rsid) setRsid(rsid);
  } catch {
    /* noop */
  }
}
