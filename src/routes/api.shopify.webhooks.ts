import { createFileRoute } from "@tanstack/react-router";
import { shopifyAdmin } from "@/lib/shopify-admin.server";

const TOPICS = [
  ["ORDERS_CREATE", "shopify-orders"],
  ["ORDERS_PAID", "shopify-orders"],
  ["ORDERS_UPDATED", "shopify-orders"],
  ["CHECKOUTS_CREATE", "shopify-checkouts"],
  ["INVENTORY_LEVELS_UPDATE", "shopify-inventory"],
] as const;

const MUTATION = `
  mutation RegisterPubSub($topic: WebhookSubscriptionTopic!, $project: String!, $pubSubTopic: String!) {
    pubSubWebhookSubscriptionCreate(topic: $topic, webhookSubscription: {
      pubSubProject: $project
      pubSubTopic: $pubSubTopic
    }) {
      webhookSubscription { id topic }
      userErrors { field message }
    }
  }
`;

function authorized(request: Request) {
  const expected = process.env.SHOPIFY_WEBHOOK_ADMIN_SECRET || process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

type RegisterResult = {
  pubSubWebhookSubscriptionCreate: {
    webhookSubscription: { id: string; topic: string } | null;
    userErrors: Array<{ field?: string[]; message: string }>;
  };
};

export const Route = createFileRoute("/api/shopify/webhooks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        const project = process.env.GCP_PROJECT_ID?.trim();
        if (!project) return Response.json({ ok: false, error: "Missing GCP_PROJECT_ID" }, { status: 500 });

        const results = [];
        for (const [topic, pubSubTopic] of TOPICS) {
          const data = await shopifyAdmin<RegisterResult>(MUTATION, { topic, project, pubSubTopic });
          results.push({ topic, pubSubTopic, ...data.pubSubWebhookSubscriptionCreate });
        }
        const failed = results.filter((result) => result.userErrors.length);
        return Response.json({ ok: failed.length === 0, results, timestamp: new Date().toISOString() }, { status: failed.length ? 502 : 200 });
      },
    },
  },
});
