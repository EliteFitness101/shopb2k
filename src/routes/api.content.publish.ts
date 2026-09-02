import { createFileRoute } from "@tanstack/react-router";

const BUFFER_API = "https://api.buffer.com";

const BUFFER_CHANNELS = {
  tiktok: "6a7cfe5ab2d9d57743686cc5",
  youtube: "6a7d4ae7b2d9d577436a9c08",
  google_business: "6a7d4d1fb2d9d577436aa192",
} as const;

type Channel = keyof typeof BUFFER_CHANNELS;

type PublishBody = {
  action?: "publish" | "dry_run";
  campaignId?: string;
  canonicalUrl?: string;
  title?: string;
  tiktok?: { text?: string; mediaUrls?: string[] };
  youtube?: { text?: string; mediaUrls?: string[] };
  googleBusiness?: { text?: string; mediaUrls?: string[] };
  channels?: Channel[];
};

function clean(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function gqlString(value: unknown) {
  return JSON.stringify(String(value ?? ""));
}

async function createBufferPost(channel: Channel, text: string, mediaUrls: string[]) {
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error("BUFFER_API_KEY is not configured server-side");

  const assets = mediaUrls.length
    ? `assets: [${mediaUrls.map((url) => `{ video: { url: ${gqlString(url)} } }`).join(", ")}]`
    : "";

  const query = `mutation CreateChatB2KPost {
    createPost(input: {
      text: ${gqlString(text)}
      channelId: ${gqlString(BUFFER_CHANNELS[channel])}
      schedulingType: automatic
      mode: addToQueue
      ${assets}
      source: "resofit-chatb2k-trigger"
      aiAssisted: true
      metadata: { }
    }) {
      ... on PostActionSuccess { post { id dueAt status channelId assets { id mimeType } } }
      ... on MutationError { message }
    }
  }`;

  const response = await fetch(BUFFER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.errors?.length) {
    throw new Error(JSON.stringify(body.errors || body));
  }

  const result = body?.data?.createPost;
  if (result?.message) throw new Error(result.message);
  if (!result?.post?.id) throw new Error(`Buffer did not return a post ID: ${JSON.stringify(body)}`);
  return result.post;
}

function authorized(request: Request) {
  const expected = process.env.CHATGPT_PUBLISH_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

export const Route = createFileRoute("/api/content/publish")({
  server: {
    handlers: {
      GET: async () => Response.json({
        ok: true,
        service: "ChatB2K production publish trigger",
        bufferConfigured: Boolean(process.env.BUFFER_API_KEY),
        triggerConfigured: Boolean(process.env.CHATGPT_PUBLISH_SECRET),
        channels: Object.keys(BUFFER_CHANNELS),
        metricoolConfigured: Boolean(process.env.METRICOOL_API_KEY),
      }),
      POST: async ({ request }) => {
        if (!authorized(request)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as PublishBody;
        if (body.action !== "publish" && body.action !== "dry_run") {
          return Response.json({ ok: false, error: "action must be publish or dry_run" }, { status: 400 });
        }

        const campaignId = clean(body.campaignId, 120);
        const title = clean(body.title, 180);
        const canonicalUrl = clean(body.canonicalUrl, 1000);
        if (!campaignId || !title) {
          return Response.json({ ok: false, error: "campaignId and title are required" }, { status: 400 });
        }
        if (canonicalUrl && !isUrl(canonicalUrl)) {
          return Response.json({ ok: false, error: "canonicalUrl must be an HTTPS URL" }, { status: 400 });
        }

        const requested = body.channels?.length ? body.channels : (["tiktok", "youtube", "google_business"] as Channel[]);
        const channels = [...new Set(requested)];
        const invalid = channels.filter((channel) => !(channel in BUFFER_CHANNELS));
        if (invalid.length) {
          return Response.json({ ok: false, error: `Unsupported channels: ${invalid.join(", ")}` }, { status: 400 });
        }

        const payloads: Record<Channel, { text: string; mediaUrls: string[] }> = {
          tiktok: { text: clean(body.tiktok?.text || title, 4000), mediaUrls: body.tiktok?.mediaUrls ?? [] },
          youtube: { text: clean(body.youtube?.text || title, 5000), mediaUrls: body.youtube?.mediaUrls ?? [] },
          google_business: { text: clean(body.googleBusiness?.text || title, 1500), mediaUrls: body.googleBusiness?.mediaUrls ?? [] },
        };

        for (const channel of channels) {
          const urls = payloads[channel].mediaUrls;
          if (urls.some((url) => !isUrl(url))) {
            return Response.json({ ok: false, error: `All ${channel} mediaUrls must be HTTPS URLs` }, { status: 400 });
          }
          if (!payloads[channel].text) {
            return Response.json({ ok: false, error: `${channel} text is required` }, { status: 400 });
          }
        }

        if (body.action === "dry_run") {
          return Response.json({
            ok: true,
            status: "dry_run",
            campaignId,
            title,
            canonicalUrl: canonicalUrl || null,
            channels,
            bufferChannelIds: Object.fromEntries(channels.map((channel) => [channel, BUFFER_CHANNELS[channel]])),
          });
        }

        const results: Array<Record<string, unknown>> = [];
        for (const channel of channels) {
          try {
            const post = await createBufferPost(channel, payloads[channel].text, payloads[channel].mediaUrls);
            results.push({ channel, ok: true, postId: post.id, status: post.status, dueAt: post.dueAt });
          } catch (error) {
            results.push({ channel, ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        }

        const failed = results.filter((result) => !result.ok);
        return Response.json({
          ok: failed.length === 0,
          status: failed.length === 0 ? "queued" : results.some((result) => result.ok) ? "partial" : "failed",
          campaignId,
          title,
          canonicalUrl: canonicalUrl || null,
          results,
        }, { status: failed.length === 0 ? 200 : 502 });
      },
    },
  },
});
