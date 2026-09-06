# ResoFit Shopify Webhook Setup — Analysis Snapshot

Production source files:
- `scripts/setup-webhooks.ts`
- `.github/workflows/setup-webhooks.yml`

This document is a review snapshot of the exact webhook script and workflow committed on `main`.

## 1. scripts/setup-webhooks.ts

```ts
const STORE = process.env.SHOPIFY_STORE_DOMAIN!;
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN!;
const API = process.env.SHOPIFY_API_VERSION ?? "2026-07";

if (!STORE || !TOKEN) {
  throw new Error("SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN are required");
}

const WEBHOOKS = [
  { topic: "ORDERS_CREATE", url: "https://resofit.fit/api/webhooks/shopify/orders" },
  { topic: "ORDERS_PAID", url: "https://resofit.fit/api/webhooks/shopify/orders" },
  { topic: "ORDERS_UPDATED", url: "https://resofit.fit/api/webhooks/shopify/orders" },
  { topic: "CHECKOUTS_CREATE", url: "https://resofit.fit/api/webhooks/shopify/checkouts" },
  { topic: "INVENTORY_LEVELS_UPDATE", url: "https://resofit.fit/api/webhooks/shopify/inventory" },
];

type Webhook = { id: string; topic: string; url: string };

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${API}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as any;
  if (!res.ok || json.errors) {
    throw new Error(`Shopify GraphQL ${res.status}: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data;
}

async function getExisting(): Promise<Webhook[]> {
  const data = await gql(`
    query {
      webhookSubscriptions(first: 100) {
        nodes { id topic uri }
      }
    }
  `);

  return data.webhookSubscriptions.nodes.map((n: any) => ({
    id: n.id,
    topic: n.topic,
    url: n.uri ?? "",
  }));
}

async function deleteWebhook(id: string) {
  const data = await gql(`
    mutation Delete($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        deletedWebhookSubscriptionId
        userErrors { field message }
      }
    }
  `, { id });

  const errors = data.webhookSubscriptionDelete.userErrors;
  if (errors.length) throw new Error(`Delete ${id}: ${JSON.stringify(errors)}`);
  console.log(`  🗑 Deleted ${id}`);
}

async function createWebhook(topic: string, url: string) {
  const data = await gql(`
    mutation Create($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription { id topic uri }
        userErrors { field message }
      }
    }
  `, { topic, webhookSubscription: { format: "JSON", uri: url } });

  const result = data.webhookSubscriptionCreate;
  if (result.userErrors.length) throw new Error(`${topic}: ${JSON.stringify(result.userErrors)}`);
  console.log(`  ✅ ${topic} [${result.webhookSubscription.id}] → ${url}`);
}

async function updateWebhook(id: string, url: string) {
  const data = await gql(`
    mutation Update($id: ID!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionUpdate(id: $id, webhookSubscription: $webhookSubscription) {
        webhookSubscription { id topic uri }
        userErrors { field message }
      }
    }
  `, { id, webhookSubscription: { uri: url } });

  const result = data.webhookSubscriptionUpdate;
  if (result.userErrors.length) throw new Error(`Update ${id}: ${JSON.stringify(result.userErrors)}`);
  console.log(`  🔄 Updated [${result.webhookSubscription.id}] → ${url}`);
}

async function run() {
  console.log(`\n🔍 Checking existing webhooks on ${STORE}...\n`);
  const existing = await getExisting();
  console.log(`Found ${existing.length} existing webhook(s).`);

  const targets = new Map(WEBHOOKS.map((w) => [w.topic, w]));
  const existingByTopic = new Map(existing.map((w) => [w.topic, w]));

  // Only manage the five target topics. Leave unrelated Shopify webhooks untouched.
  for (const [topic, target] of targets) {
    const found = existingByTopic.get(topic);
    if (!found) {
      await createWebhook(topic, target.url);
    } else if (found.url !== target.url) {
      console.log(`  ⚠️ ${topic} has wrong URL: ${found.url} — updating`);
      await updateWebhook(found.id, target.url);
    } else {
      console.log(`  ✔️ ${topic} already correct [${found.id}]`);
    }
  }

  // Remove duplicate subscriptions for the five managed topics, keeping the first correct one.
  const afterUpsert = await getExisting();
  for (const target of WEBHOOKS) {
    const matches = afterUpsert.filter((w) => w.topic === target.topic && w.url === target.url);
    for (const duplicate of matches.slice(1)) {
      await deleteWebhook(duplicate.id);
    }
  }

  const final = await getExisting();
  console.log(`\n📋 Final target webhook state:\n`);

  let failed = false;
  for (const target of WEBHOOKS) {
    const matches = final.filter((w) => w.topic === target.topic && w.url === target.url);
    if (matches.length === 1) {
      console.log(`  ✅ ${target.topic} → ${target.url} [${matches[0].id}]`);
    } else {
      console.error(`  ❌ ${target.topic}: expected exactly 1 correct subscription, found ${matches.length}`);
      failed = true;
    }
  }

  if (failed) {
    throw new Error("Webhook verification failed");
  }

  console.log(`\n✅ All 5 target webhooks verified on ${STORE}\n`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

## 2. .github/workflows/setup-webhooks.yml

```yaml
name: ResoFit Webhook Setup

on:
  workflow_dispatch:
    inputs:
      api_version:
        description: "Shopify Admin API Version"
        required: true
        default: "2026-07"
        type: string
  push:
    branches:
      - main
    paths:
      - "scripts/setup-webhooks.ts"
      - ".github/workflows/setup-webhooks.yml"

jobs:
  configure-webhooks:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install tsx
        run: npm install --no-save tsx

      - name: Execute Webhook Upsert Script
        env:
          SHOPIFY_STORE_DOMAIN: ${{ secrets.SHOPIFY_STORE_DOMAIN }}
          SHOPIFY_ADMIN_API_TOKEN: ${{ secrets.SHOPIFY_ADMIN_API_TOKEN }}
          SHOPIFY_API_VERSION: ${{ inputs.api_version || '2026-07' }}
        run: npx tsx scripts/setup-webhooks.ts
```

## Target subscriptions

1. ORDERS_CREATE → https://resofit.fit/api/webhooks/shopify/orders
2. ORDERS_PAID → https://resofit.fit/api/webhooks/shopify/orders
3. ORDERS_UPDATED → https://resofit.fit/api/webhooks/shopify/orders
4. CHECKOUTS_CREATE → https://resofit.fit/api/webhooks/shopify/checkouts
5. INVENTORY_LEVELS_UPDATE → https://resofit.fit/api/webhooks/shopify/inventory

## Required GitHub Actions secrets

- SHOPIFY_STORE_DOMAIN
- SHOPIFY_ADMIN_API_TOKEN

Optional workflow input:
- SHOPIFY_API_VERSION defaults to 2026-07

No Shopify token or secret value is stored in this document.
