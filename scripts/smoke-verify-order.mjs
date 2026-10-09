import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(new URL("../supabase/functions/verify-order/index.ts", import.meta.url), "utf8");
assert.match(source, /PAYSTACK_SECRET_KEY\.startsWith\("sk_live_"/, "production verification must require the live Paystack secret");
assert.match(source, /onConflict:"paystack_ref,event",ignoreDuplicates:true/, "payment event upsert must match the event-level unique index without mutating immutable events");
assert.match(source, /if\(paymentEventError\)throw paymentEventError/, "payment event persistence failures must not be silently ignored");
assert.match(source, /event_name:"payment\.succeeded"/, "verified payments must emit canonical purchase telemetry");
assert.match(source, /reconciled:true/, "verified payment must be reconciled before entitlement claim");
assert.match(source, /payment_status:"success"/, "verified subscription/customer row must be activated");
assert.match(source, /onConflict:"payment_reference"/, "revenue ledger writes must be idempotent");
console.log("PASS order verification, event-level idempotency, canonical purchase event, and reconciliation contracts");
