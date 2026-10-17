import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const handoff = read("../src/routes/api.assessment-handoff.ts");
const product = read("../src/routes/product.$handle.tsx");
const cart = read("../src/stores/cartStore.ts");
const assessment = read("../src/routes/me.tsx");
const revenue = read("../src/lib/revenueOS.ts");

assert.match(handoff, /createFileRoute\("\/api\/assessment-handoff"\)/);
assert.match(handoff, /HANDOFF_TTL_MS = 30 \* 60 \* 1000/);
assert.match(handoff, /!cartToken \|\| \/\\s\//);
assert.match(handoff, /https:\/\/resofit\.fit\/me\?correlation_id=/);
assert.match(handoff, /source: clean\(body\.source, 40\)/);
assert.match(handoff, /\.eq\("cart_token", cartToken\)/);
assert.match(handoff, /cart\.session_id !== sessionId/);
assert.match(handoff, /metadata\.variantId === variantId/);
assert.match(handoff, /idempotency_key: idempotencyKey/);
assert.match(handoff, /\.eq\("correlation_id", correlationId\)/);
assert.match(handoff, /!isLive\(data\.payload\)/);
assert.match(handoff, /redirectFor\(correlationId\)/);

assert.match(cart, /await get\(\)\.syncCart\(\)/);
assert.match(cart, /canonical sync failed",error\);throw error/);
assert.match(cart, /syncCart\(\)\.catch\(\(error\)/);
assert.match(cart, /variantId:i\.variantId/);
assert.ok(product.indexOf("await addItem(") < product.indexOf('fetch("/api/assessment-handoff"'));
assert.match(product, /get\("assessment"\) === "1"/);
assert.doesNotMatch(product, /paystack-init/);

assert.match(assessment, /\/api\/assessment-handoff\?correlation_id=/);
assert.match(assessment, /history\.replaceState/);
assert.match(assessment, /setVerifiedCorrelationId\(candidate\)/);
assert.match(revenue, /assessment_complete: "assessment\.completed"/);
assert.match(revenue, /correlation_id: context\?\.correlationId/);
assert.match(revenue, /assessment_id: context\.assessmentId/);

console.log("Assessment handoff source smoke checks passed.");
