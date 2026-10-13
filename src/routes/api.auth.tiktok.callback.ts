import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const SITE_URL = (process.env.PUBLIC_SITE_URL ?? "https://resofit.fit").replace(/\/$/, "");
const REDIRECT_URI =
  process.env.TIKTOK_REDIRECT_URI ??
  `${SITE_URL}/api/auth/tiktok/callback`;

function redirect(path: string) {
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/content";
  return Response.redirect(new URL(safe, SITE_URL), 302);
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function clearStateCookie(headers: Headers) {
  headers.append(
    "Set-Cookie",
    "resofit_tiktok_oauth_state=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax",
  );
}

export const Route = createFileRoute("/api/auth/tiktok/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code") ?? "";
        const state = url.searchParams.get("state") ?? "";
        const error = url.searchParams.get("error") ?? "";
        const errorDescription = url.searchParams.get("error_description") ?? "";

        if (!SERVICE_ROLE || !CLIENT_KEY || !CLIENT_SECRET) {
          return new Response("TikTok OAuth is not configured server-side.", { status: 503 });
        }

        const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false },
        });

        const stateCookie = cookieValue(request, "resofit_tiktok_oauth_state");
        if (!state || !stateCookie || state !== stateCookie) {
          return new Response("Invalid TikTok OAuth state.", { status: 400 });
        }

        const now = new Date().toISOString();
        const { data: stateRow, error: stateError } = await admin
          .from("tiktok_oauth_states")
          .update({ consumed_at: now })
          .eq("state", state)
          .is("consumed_at", null)
          .gt("expires_at", now)
          .select("user_id,return_to")
          .maybeSingle();

        const responseHeaders = new Headers({ "Cache-Control": "no-store" });
        clearStateCookie(responseHeaders);

        if (stateError || !stateRow) {
          return new Response("TikTok OAuth state expired or already used.", {
            status: 400,
            headers: responseHeaders,
          });
        }

        if (error) {
          const target = new URL(stateRow.return_to, SITE_URL);
          target.searchParams.set("tiktok", "error");
          target.searchParams.set("message", errorDescription || error);
          responseHeaders.set("Location", target.toString());
          return new Response(null, { status: 302, headers: responseHeaders });
        }

        if (!code) {
          return new Response("TikTok did not return an authorization code.", {
            status: 400,
            headers: responseHeaders,
          });
        }

        try {
          const form = new URLSearchParams({
            client_key: CLIENT_KEY,
            client_secret: CLIENT_SECRET,
            code,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
          });

          const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Cache-Control": "no-cache",
            },
            body: form,
          });
          const tokenBody = await tokenResponse.json().catch(() => ({}));

          if (!tokenResponse.ok || !tokenBody?.access_token || !tokenBody?.open_id) {
            console.error("TikTok token exchange failed", {
              status: tokenResponse.status,
              error: tokenBody?.error,
              log_id: tokenBody?.log_id,
            });
            throw new Error("TikTok token exchange failed.");
          }

          const userResponse = await fetch(
            "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
            {
              headers: { Authorization: `Bearer ${tokenBody.access_token}` },
            },
          );
          const userBody = await userResponse.json().catch(() => ({}));
          const profile = userResponse.ok ? userBody?.data?.user : null;

          const scopes = String(tokenBody.scope ?? "")
            .split(",")
            .map((value: string) => value.trim())
            .filter(Boolean);

          const { error: upsertError } = await admin.from("tiktok_connections").upsert(
            {
              user_id: stateRow.user_id,
              open_id: String(tokenBody.open_id),
              display_name: profile?.display_name ?? null,
              avatar_url: profile?.avatar_url ?? null,
              access_token: String(tokenBody.access_token),
              refresh_token: String(tokenBody.refresh_token ?? ""),
              access_token_expires_at: new Date(
                Date.now() + Number(tokenBody.expires_in ?? 86400) * 1000,
              ).toISOString(),
              refresh_token_expires_at: new Date(
                Date.now() + Number(tokenBody.refresh_expires_in ?? 31536000) * 1000,
              ).toISOString(),
              scopes,
              token_type: String(tokenBody.token_type ?? "Bearer"),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "open_id" },
          );

          if (upsertError) throw upsertError;

          const target = new URL(stateRow.return_to, SITE_URL);
          target.searchParams.set("tiktok", "connected");
          responseHeaders.set("Location", target.toString());
          return new Response(null, { status: 302, headers: responseHeaders });
        } catch (caught) {
          console.error("TikTok OAuth callback", caught);
          const target = new URL(stateRow.return_to, SITE_URL);
          target.searchParams.set("tiktok", "error");
          target.searchParams.set("message", "TikTok authorization could not be completed.");
          responseHeaders.set("Location", target.toString());
          return new Response(null, { status: 302, headers: responseHeaders });
        }
      },
    },
  },
});
