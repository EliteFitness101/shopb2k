import { createFileRoute } from "@tanstack/react-router";
import { ensureFreshTikTokToken, getResoFitUser, getTikTokConnection, tiktokJson } from "@/lib/tiktokServer";

function clean(value: unknown, max = 2200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

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

export const Route = createFileRoute("/api/tiktok/direct-post")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await getResoFitUser(request);
          if (!user) return Response.json({ ok: false, error: "ResoFit authentication required." }, { status: 401 });

          const connection = await getTikTokConnection(user.id);
          if (!connection) return Response.json({ ok: false, error: "TikTok account is not connected." }, { status: 404 });

          const body = await request.json().catch(() => ({}));
          if (body.userConsent !== true) {
            return Response.json({ ok: false, error: "Explicit user consent is required before Direct Post." }, { status: 400 });
          }

          const title = clean(body.title);
          const mediaUrl = clean(body.mediaUrl, 2000);
          const privacyLevel = clean(body.privacyLevel, 80);
          if (!title) return Response.json({ ok: false, error: "title is required." }, { status: 400 });
          if (!verifiedMediaUrl(mediaUrl)) {
            return Response.json({
              ok: false,
              error: "mediaUrl must be an HTTPS URL hosted on the verified resofit.fit domain.",
            }, { status: 400 });
          }

          const fresh = await ensureFreshTikTokToken(connection);
          const creator = await tiktokJson(
            "/v2/post/publish/creator_info/query/",
            fresh.access_token,
            { method: "POST", body: "{}" },
          );
          const allowed = creator?.data?.privacy_level_options ?? [];
          const selectedPrivacy =
            privacyLevel && allowed.includes(privacyLevel)
              ? privacyLevel
              : allowed.includes("SELF_ONLY")
                ? "SELF_ONLY"
                : allowed[0];

          if (!selectedPrivacy) {
            return Response.json({ ok: false, error: "TikTok returned no usable privacy level." }, { status: 502 });
          }

          const payload = {
            post_info: {
              title,
              privacy_level: selectedPrivacy,
              disable_duet: body.disableDuet === true,
              disable_comment: body.disableComment === true,
              disable_stitch: body.disableStitch === true,
              ...(typeof body.videoCoverTimestampMs === "number"
                ? { video_cover_timestamp_ms: Math.max(0, Math.floor(body.videoCoverTimestampMs)) }
                : {}),
              brand_content_toggle: body.brandContentToggle === true,
              brand_organic_toggle: body.brandOrganicToggle === true,
              is_aigc: body.isAigc === true,
            },
            source_info: {
              source: "PULL_FROM_URL",
              video_url: mediaUrl,
            },
          };

          const result = await tiktokJson(
            "/v2/post/publish/video/init/",
            fresh.access_token,
            { method: "POST", body: JSON.stringify(payload) },
          );

          return Response.json({
            ok: true,
            publishId: result?.data?.publish_id ?? null,
            privacyLevel: selectedPrivacy,
            creator: creator?.data ?? null,
          }, {
            headers: { "Cache-Control": "no-store" },
          });
        } catch (error) {
          console.error("TikTok Direct Post", error);
          const typed = error as Error & { status?: number; body?: unknown };
          return Response.json({
            ok: false,
            error: typed.message || "TikTok Direct Post failed.",
            provider: typed.body ?? null,
          }, { status: typed.status && typed.status >= 400 && typed.status < 600 ? typed.status : 502 });
        }
      },
    },
  },
});
