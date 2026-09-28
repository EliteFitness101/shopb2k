import { createFileRoute } from "@tanstack/react-router";
import { ensureFreshTikTokToken, getResoFitUser, getTikTokConnection, tiktokJson } from "@/lib/tiktokServer";

export const Route = createFileRoute("/api/tiktok/creator-info")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await getResoFitUser(request);
          if (!user) return Response.json({ ok: false, error: "ResoFit authentication required." }, { status: 401 });

          const connection = await getTikTokConnection(user.id);
          if (!connection) return Response.json({ ok: false, error: "TikTok account is not connected." }, { status: 404 });

          const fresh = await ensureFreshTikTokToken(connection);
          const body = await tiktokJson(
            "/v2/post/publish/creator_info/query/",
            fresh.access_token,
            { method: "POST", body: "{}" },
          );

          return Response.json({
            ok: true,
            creator: body.data ?? null,
          }, {
            headers: { "Cache-Control": "no-store" },
          });
        } catch (error) {
          console.error("TikTok creator info", error);
          return Response.json({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to query TikTok creator info.",
          }, { status: 502 });
        }
      },
    },
  },
});
