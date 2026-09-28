import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
export const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
export const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

export function db(): SupabaseClient {
  if (!SERVICE_ROLE) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

export function bearer(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

export async function getResoFitUser(request: Request) {
  const token = bearer(request);
  if (!token) return null;
  const admin = db();
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}

export async function getTikTokConnection(userId: string) {
  const admin = db();
  const { data, error } = await admin
    .from("tiktok_connections")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function ensureFreshTikTokToken(connection: any) {
  if (!CLIENT_KEY || !CLIENT_SECRET) throw new Error("TikTok client credentials are not configured");
  const expiresAt = Date.parse(String(connection.access_token_expires_at));
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 5 * 60 * 1000) {
    return connection;
  }

  if (!connection.refresh_token) throw new Error("TikTok refresh token is unavailable");

  const form = new URLSearchParams({
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: connection.refresh_token,
  });

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.access_token) {
    throw new Error("TikTok access token refresh failed");
  }

  const updated = {
    ...connection,
    access_token: String(body.access_token),
    refresh_token: String(body.refresh_token ?? connection.refresh_token),
    access_token_expires_at: new Date(
      Date.now() + Number(body.expires_in ?? 86400) * 1000,
    ).toISOString(),
    refresh_token_expires_at: new Date(
      Date.now() + Number(body.refresh_expires_in ?? 31536000) * 1000,
    ).toISOString(),
    scopes: String(body.scope ?? connection.scopes?.join(",") ?? "")
      .split(",")
      .map((value: string) => value.trim())
      .filter(Boolean),
    token_type: String(body.token_type ?? connection.token_type ?? "Bearer"),
    updated_at: new Date().toISOString(),
  };

  const admin = db();
  const { error } = await admin
    .from("tiktok_connections")
    .update(updated)
    .eq("id", connection.id);
  if (error) throw error;

  return updated;
}

export async function tiktokJson(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(`https://open.tiktokapis.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.error?.code && body.error.code !== "ok") {
    const error = new Error(
      body?.error?.message || body?.message || `TikTok API HTTP ${response.status}`,
    );
    (error as Error & { status?: number; body?: unknown }).status = response.status;
    (error as Error & { status?: number; body?: unknown }).body = body;
    throw error;
  }
  return body;
}
