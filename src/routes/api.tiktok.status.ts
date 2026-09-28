import { createFileRoute } from "@tanstack/react-router";
import { ensureFreshTikTokToken, getResoFitUser, getTikTokConnection, tiktokJson } from "@/lib/tiktokServer";

export const Route = createFileRoute("/api/tiktok/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await getResoFitUser(request);
          if (!user) return Response.json({ ok: false, error: "ResoFit authentication required." }, { status: 401 });

          const connection = await getTikTokConnection(user.id);
          if (!connection) return Response.json({ ok: false, error: "TikTok account is not connected." }, { status: 404 });

          const body = await request.json().catch(() => ({}));
          const publishId = typeof body.publishId === "string" ? body.publishId.trim().slice(0, 64) : "";
          if (!publishId) return Response.json({ ok: false, error: "publishId is required." }, { status: 400 });

          const fresh = await ensureFreshTikTokToken(connection);
          const result = await tiktokJson(
            "/v2/post/publish/status/fetch/",
            fresh.access_token,
            { method: "POST", body: JSON.stringify({ publish_id: publishId }) },
          );

          return Response.json({
            ok: true,
            status: result?.data ?? null,
          }, {
            headers: { "Cache-Control": "no-store" },
          });
        } catch (error) {
          console.error("TikTok post status", error);
          return Response.json({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to fetch TikTok post status.",
          }, { status: 502 });
        }
      },
    },
  },
});
