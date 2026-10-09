import assert from "node:assert/strict";
import fs from "node:fs/promises";

const [ingest, tracking, revenueOS] = await Promise.all([
  fs.readFile(new URL("../supabase/functions/resofit-event-ingest/index.ts", import.meta.url), "utf8"),
  fs.readFile(new URL("../src/lib/tracking.ts", import.meta.url), "utf8"),
  fs.readFile(new URL("../src/lib/revenueOS.ts", import.meta.url), "utf8"),
]);

const allowlistBlock = ingest.match(/const PUBLIC_EVENTS = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? "";
const allowed = new Set([...allowlistBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]));
const expectedPublicEvents = [
  "funnel.page_viewed", "funnel.cta_clicked", "assessment.started", "assessment.completed",
  "conversation.whatsapp_clicked", "checkout.started", "commerce.search", "commerce.product_viewed",
  "commerce.product_clicked", "commerce.compare", "commerce.price_filtered",
  "commerce.wishlist_added", "commerce.wishlist_removed", "commerce.cart_added",
];
for (const eventName of expectedPublicEvents) {
  assert.ok(allowed.has(eventName), `Missing public tracking event: ${eventName}`);
}
assert.ok(allowed.has("application.submitted"), "Existing application submission flow must remain supported");
assert.ok(!allowed.has("payment.succeeded"), "Client-supplied payment success must remain server-only");
assert.match(ingest, /\.from\("resofit_event_contracts"\)/, "Event contract validation must remain enabled");
assert.match(ingest, /\.from\("resofit_events"\)/, "Canonical event persistence must remain enabled");
assert.match(ingest, /\.from\("commerce_events"\)/, "Commerce event persistence must remain enabled");
assert.match(ingest, /\.from\("chatb2k_learning_events"\)/, "Learning loop must remain connected");
assert.match(ingest, /function learningPlatform\(eventName: string\)/, "Learning rows must be classified by event family");
assert.match(tracking, /supabase\.functions\.invoke\("resofit-event-ingest"/, "Storefront tracking must use canonical ingestion");
assert.match(revenueOS, /payment\.succeeded/, "Payment event mapping remains explicit and server-only");
console.log(`PASS ${expectedPublicEvents.length} public event contracts, server-only payment guard, persistence, and learning loop`);
