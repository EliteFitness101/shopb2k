import { createFileRoute } from "@tanstack/react-router";
import { ensureFreshTikTokToken, getResoFitUser, getTikTokConnection, tiktokJson } from "@/lib/tiktokServer";

function verifiedMediaUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "resofit.fit" || host.endsWith(".resofit.fit");
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/tiktok/upload-draft")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await getResoFitUser(request);
          if (!user) return Response.json({ ok: false, error: "ResoFit authentication required." }, { status: 401 });

          const connection = await getTikTokConnection(user.id);
          if (!connection) return Response.json({ ok: false, error: "TikTok account is not connected." }, { status: 404 });

          const body = await request.json().catch(() => ({}));
          const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim().slice(0, 2000) : "";
          if (!verifiedMediaUrl(mediaUrl)) {
            return Response.json({
              ok: false,
              error: "mediaUrl must be an HTTPS URL hosted on the verified resofit.fit domain.",
            }, { status: 400 });
          }

          const fresh = await ensureFreshTikTokToken(connection);
          const result = await tiktokJson(
            "/v2/post/publish/inbox/video/init/",
            fresh.access_token,
            {
              method: "POST",
              body: JSON.stringify({
                source_info: {
                  source: "PULL_FROM_URL",
                  video_url: mediaUrl,
                },
              }),
            },
          );

          return Response.json({
            ok: true,
            publishId: result?.data?.publish_id ?? null,
          }, {
            headers: { "Cache-Control": "no-store" },
          });
        } catch (error) {
          console.error("TikTok Upload Draft", error);
          const typed = error as Error & { status?: number; body?: unknown };
          return Response.json({
            ok: false,
            error: typed.message || "TikTok draft upload failed.",
            provider: typed.body ?? null,
          }, { status: typed.status && typed.status >= 400 && typed.status < 600 ? typed.status : 502 });
        }
      },
    },
  },
});
