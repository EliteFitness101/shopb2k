import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const SITE_URL = (process.env.PUBLIC_SITE_URL ?? "https://resofit.fit").replace(/\/$/, "");
const REDIRECT_URI =
  process.env.TIKTOK_REDIRECT_URI ??
  `${SITE_URL}/api/auth/tiktok/callback`;

const SCOPES = ["user.info.basic", "video.publish", "video.upload"];

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function getBearer(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function safeReturnTo(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/content";
}

export const Route = createFileRoute("/api/auth/tiktok/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!CLIENT_KEY || !SERVICE_ROLE) {
            return json({ ok: false, error: "TikTok OAuth is not configured server-side." }, 503);
          }

          const accessToken = getBearer(request);
          if (!accessToken) return json({ ok: false, error: "Authorization bearer token required." }, 401);

          const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
            auth: { persistSession: false },
          });
          const { data, error } = await admin.auth.getUser(accessToken);
          if (error || !data.user) return json({ ok: false, error: "Invalid ResoFit session." }, 401);

          const url = new URL(request.url);
          const returnTo = safeReturnTo(url.searchParams.get("return_to") ?? "/content");
          const state = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");

          const { error: stateError } = await admin.from("tiktok_oauth_states").insert({
            state,
            user_id: data.user.id,
            return_to: returnTo,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          });
          if (stateError) throw stateError;

          const authorize = new URL("https://www.tiktok.com/v2/auth/authorize/");
          authorize.searchParams.set("client_key", CLIENT_KEY);
          authorize.searchParams.set("response_type", "code");
          authorize.searchParams.set("scope", SCOPES.join(","));
          authorize.searchParams.set("redirect_uri", REDIRECT_URI);
          authorize.searchParams.set("state", state);

          const headers = new Headers({ Location: authorize.toString() });
          headers.append(
            "Set-Cookie",
            `resofit_tiktok_oauth_state=${encodeURIComponent(state)}; Max-Age=600; Path=/; Secure; HttpOnly; SameSite=Lax`,
          );
          return new Response(null, { status: 302, headers });
        } catch (error) {
          console.error("TikTok OAuth start", error);
          return json({ ok: false, error: "Unable to start TikTok authorization." }, 500);
        }
      },
    },
  },
});
