import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_BYTES = 1_000_000;

function b64ToText(value: string) {
  return Buffer.from(value, "base64").toString("utf8");
}

async function verifyPubSubToken(request: Request) {
  const expectedAudience = process.env.GOOGLE_PUBSUB_AUDIENCE?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!expectedAudience || !token) return false;

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  if (!response.ok) return false;
  const claims = (await response.json()) as { aud?: string; iss?: string; email_verified?: string };
  return claims.aud === expectedAudience && (claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com");
}

type PubSubEnvelope = {
  message?: { data?: string; messageId?: string; publishTime?: string; attributes?: Record<string, string> };
  subscription?: string;
};

export const Route = createFileRoute("/api/shopify/pubsub")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await verifyPubSubToken(request))) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return Response.json({ ok: false, error: "Payload too large" }, { status: 413 });

        try {
          const envelope = JSON.parse(raw) as PubSubEnvelope;
          const message = envelope.message;
          if (!message?.data || !message.messageId) return Response.json({ ok: false, error: "Invalid Pub/Sub envelope" }, { status: 400 });

          let decoded: unknown;
          try {
            decoded = JSON.parse(b64ToText(message.data));
          } catch {
            decoded = b64ToText(message.data);
          }

          const topic = message.attributes?.topic || message.attributes?.xShopifyTopic || "unknown";
          const objectId = message.attributes?.resource || message.attributes?.shopifyResourceId || message.messageId;
          const { error } = await supabaseAdmin.from("shopify_sync_logs").insert({
            sync_type: `webhook:${topic}`,
            shopify_object: objectId,
            object_id: objectId,
            status: "received",
            payload: {
              pubsub_message_id: message.messageId,
              publish_time: message.publishTime ?? null,
              subscription: envelope.subscription ?? null,
              attributes: message.attributes ?? {},
              data: decoded,
            },
          });
          if (error) throw error;

          return Response.json({ ok: true, received: true, messageId: message.messageId });
        } catch (error) {
          console.error("shopify-pubsub", error);
          return Response.json({ ok: false, error: "Webhook ingestion failed" }, { status: 500 });
        }
      },
    },
  },
});
