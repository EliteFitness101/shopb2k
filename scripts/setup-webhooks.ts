const STORE = process.env.SHOPIFY_STORE_DOMAIN!;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!;
const API = process.env.SHOPIFY_API_VERSION ?? "2026-07";
const EXPECTED_STORE = "resocart.myshopify.com";

if (!STORE || !CLIENT_ID || !CLIENT_SECRET) {
  throw new Error("SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET are required");
}

const normalizeStore = (value: string) => value.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

if (normalizeStore(STORE) !== EXPECTED_STORE) {
  throw new Error(`SHOPIFY_STORE_DOMAIN mismatch: expected ${EXPECTED_STORE}, received ${STORE}`);
}

const WEBHOOKS = [
  { topic: "ORDERS_CREATE", url: "https://resofit.fit/api/webhooks/shopify/orders" },
  { topic: "ORDERS_PAID", url: "https://resofit.fit/api/webhooks/shopify/orders" },
  { topic: "ORDERS_UPDATED", url: "https://resofit.fit/api/webhooks/shopify/orders" },
  { topic: "CHECKOUTS_CREATE", url: "https://resofit.fit/api/webhooks/shopify/checkouts" },
  { topic: "INVENTORY_LEVELS_UPDATE", url: "https://resofit.fit/api/webhooks/shopify/inventory" },
];

type Webhook = { id: string; topic: string; url: string };

async function getAccessToken(): Promise<string> {
  const res = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const json = (await res.json()) as any;
  if (!res.ok || !json.access_token) {
    throw new Error(`Shopify OAuth ${res.status}: ${JSON.stringify(json)}`);
  }

  console.log(`🔐 Shopify client-credentials token acquired (expires in ${json.expires_in}s)`);
  return json.access_token;
}

async function gql(token: string, query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${API}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as any;
  if (!res.ok || json.errors) {
    throw new Error(`Shopify GraphQL ${res.status}: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data;
}

async function verifyIdentity(token: string) {
  const data = await gql(token, `
    query {
      shop { name myshopifyDomain }
      app { id title handle }
    }
  `);

  const actualStore = normalizeStore(data.shop.myshopifyDomain);
  console.log(`🏪 Shopify API store identity: ${data.shop.name} (${actualStore})`);
  console.log(`📦 Shopify API app identity: ${data.app.title} (${data.app.handle}) [${data.app.id}]`);

  if (actualStore !== EXPECTED_STORE) {
    throw new Error(`Shopify token/store mismatch: expected ${EXPECTED_STORE}, API resolved ${actualStore}`);
  }
}

async function getExisting(token: string): Promise<Webhook[]> {
  const data = await gql(token, `
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

async function deleteWebhook(token: string, id: string) {
  const data = await gql(token, `
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

async function createWebhook(token: string, topic: string, url: string) {
  const data = await gql(token, `
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

async function updateWebhook(token: string, id: string, url: string) {
  const data = await gql(token, `
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
  const token = await getAccessToken();
  await verifyIdentity(token);

  console.log(`\n🔍 Checking existing webhooks on ${STORE}...\n`);
  const existing = await getExisting(token);
  console.log(`Found ${existing.length} existing webhook(s).`);

  const targets = new Map(WEBHOOKS.map((w) => [w.topic, w]));
  const existingByTopic = new Map(existing.map((w) => [w.topic, w]));

  for (const [topic, target] of targets) {
    const found = existingByTopic.get(topic);
    if (!found) {
      await createWebhook(token, topic, target.url);
    } else if (found.url !== target.url) {
      console.log(`  ⚠️ ${topic} has wrong URL: ${found.url} — updating`);
      await updateWebhook(token, found.id, target.url);
    } else {
      console.log(`  ✔️ ${topic} already correct [${found.id}]`);
    }
  }

  const afterUpsert = await getExisting(token);
  for (const target of WEBHOOKS) {
    const matches = afterUpsert.filter((w) => w.topic === target.topic && w.url === target.url);
    for (const duplicate of matches.slice(1)) {
      await deleteWebhook(token, duplicate.id);
    }
  }

  const final = await getExisting(token);
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
