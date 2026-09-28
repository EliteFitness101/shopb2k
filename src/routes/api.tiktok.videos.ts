import { createFileRoute } from "@tanstack/react-router";
import { ensureFreshTikTokToken, getResoFitUser, getTikTokConnection, tiktokJson } from "@/lib/tiktokServer";

export const Route = createFileRoute("/api/tiktok/videos")({
  server: { handlers: {
    POST: async ({ request }) => {
      try {
        const user = await getResoFitUser(request);
        if (!user) return Response.json({ ok: false, error: "ResoFit authentication required." }, { status: 401 });
        const connection = await getTikTokConnection(user.id);
        if (!connection) return Response.json({ ok: false, error: "TikTok account is not connected." }, { status: 404 });
        const input = await request.json().catch(() => ({}));
        const maxCount = Math.min(20, Math.max(1, Number(input.maxCount ?? 20)));
        const cursorNumber = Number(input.cursor);
        const fresh = await ensureFreshTikTokToken(connection);
        const query = new URLSearchParams({ fields: "id,title,video_description,duration,cover_image_url,share_url,embed_link" });
        const body = await tiktokJson("/v2/video/list/?" + query.toString(), fresh.access_token, {
          method: "POST",
          body: JSON.stringify({ max_count: maxCount, ...(Number.isFinite(cursorNumber) ? { cursor: cursorNumber } : {}) }),
        });
        return Response.json({ ok: true, videos: body?.data?.videos ?? [], cursor: body?.data?.cursor ?? null, hasMore: body?.data?.has_more ?? false }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const typed = error as Error & { status?: number; body?: unknown };
        console.error("TikTok videos", error);
        return Response.json({ ok: false, error: typed.message || "Unable to load TikTok videos.", provider: typed.body ?? null }, { status: typed.status && typed.status >= 400 && typed.status < 600 ? typed.status : 502 });
      }
    },
  }},
});