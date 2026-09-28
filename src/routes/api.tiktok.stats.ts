import { createFileRoute } from "@tanstack/react-router";
import { ensureFreshTikTokToken, getResoFitUser, getTikTokConnection, tiktokJson } from "@/lib/tiktokServer";

export const Route = createFileRoute("/api/tiktok/stats")({
  server: { handlers: {
    POST: async ({ request }) => {
      try {
        const user = await getResoFitUser(request);
        if (!user) return Response.json({ ok: false, error: "ResoFit authentication required." }, { status: 401 });
        const connection = await getTikTokConnection(user.id);
        if (!connection) return Response.json({ ok: false, error: "TikTok account is not connected." }, { status: 404 });
        const fresh = await ensureFreshTikTokToken(connection);
        const body = await tiktokJson("/v2/user/info/?fields=follower_count,following_count,likes_count,video_count", fresh.access_token);
        return Response.json({ ok: true, stats: body?.data?.user ?? null }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const typed = error as Error & { status?: number; body?: unknown };
        console.error("TikTok stats", error);
        return Response.json({ ok: false, error: typed.message || "Unable to load TikTok statistics.", provider: typed.body ?? null }, { status: typed.status && typed.status >= 400 && typed.status < 600 ? typed.status : 502 });
      }
    },
  }},
});