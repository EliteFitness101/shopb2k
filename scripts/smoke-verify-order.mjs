import assert from "node:assert/strict";
import fs from "node:fs/promises";

const [source, webhook] = await Promise.all([
  fs.readFile(new URL("../supabase/functions/verify-order/index.ts", import.meta.url), "utf8"),
  fs.readFile(new URL("../supabase/functions/paystack-webhook/index.ts", import.meta.url), "utf8"),
]);
assert.match(source, /PAYSTACK_SECRET_KEY\.startsWith\("sk_live_"/, "production verification must require the live Paystack secret");
assert.match(source, /onConflict:"paystack_ref,event",ignoreDuplicates:true/, "payment event upsert must match the event-level unique index without mutating immutable events");
assert.match(source, /if\(paymentEventError\)throw paymentEventError/, "payment event persistence failures must not be silently ignored");
assert.match(source, /event_name:"payment\.succeeded"/, "verified payments must emit canonical purchase telemetry");
assert.match(source, /reconciled:true/, "verified payment must be reconciled before entitlement claim");
assert.match(source, /payment_status:"success"/, "verified subscription/customer row must be activated");
assert.match(source, /onConflict:"payment_reference"/, "revenue ledger writes must be idempotent");
assert.match(source, /onConflict:"paystack_ref,event",ignoreDuplicates:true/, "verification must not mutate immutable payment events");
assert.match(webhook, /payment_event_processing/, "webhook retries must use the dedicated processing ledger");
assert.match(webhook, /onConflict: "paystack_ref,event", ignoreDuplicates: true/, "webhook must insert event rows without updating immutable events");
assert.doesNotMatch(webhook, /from\("payment_events"\)\.update/, "webhook must not update the immutable payment event ledger");
assert.match(webhook, /status: "failed"/, "failed webhook processing must remain retryable");
console.log("PASS order verification, event-level idempotency, canonical purchase event, and reconciliation contracts");
