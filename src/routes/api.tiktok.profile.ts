import { createFileRoute } from "@tanstack/react-router";
import { ensureFreshTikTokToken, getResoFitUser, getTikTokConnection, tiktokJson } from "@/lib/tiktokServer";

export const Route = createFileRoute("/api/tiktok/profile")({
  server: { handlers: {
    POST: async ({ request }) => {
      try {
        const user = await getResoFitUser(request);
        if (!user) return Response.json({ ok: false, error: "ResoFit authentication required." }, { status: 401 });
        const connection = await getTikTokConnection(user.id);
        if (!connection) return Response.json({ ok: false, error: "TikTok account is not connected." }, { status: 404 });
        const fresh = await ensureFreshTikTokToken(connection);
        const body = await tiktokJson("/v2/user/info/?fields=open_id,avatar_url,avatar_url_100,avatar_large_url,display_name,bio_description,profile_deep_link,is_verified,username", fresh.access_token);
        return Response.json({ ok: true, profile: body?.data?.user ?? null }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const typed = error as Error & { status?: number; body?: unknown };
        console.error("TikTok profile", error);
        return Response.json({ ok: false, error: typed.message || "Unable to load TikTok profile.", provider: typed.body ?? null }, { status: typed.status && typed.status >= 400 && typed.status < 600 ? typed.status : 502 });
      }
    },
  }},
});