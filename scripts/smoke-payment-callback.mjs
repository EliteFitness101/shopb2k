import assert from "node:assert/strict";
import fs from "node:fs/promises";

const route = await fs.readFile(new URL("../src/routes/payment.callback.tsx", import.meta.url), "utf8");
assert.match(route, /createFileRoute\("\/payment\/callback"\)/, "guest callback route must be registered");
assert.match(route, /functions\.invoke\("verify-order"/, "callback must reconcile against Paystack server verification");
assert.match(route, /result\.state === "success"/, "callback must distinguish verified success");
assert.match(route, /result\.state === "pending"/, "callback must distinguish pending verification");
assert.match(route, /result\.state === "failed"/, "callback must distinguish failed payment");
assert.match(route, /router\.invalidate\(\)/, "customer must be able to retry verification without paying again");
assert.match(route, /https:\/\/dashboard\.resofit\.fit\/login/, "verified guest must have a path to claim account access");
assert.doesNotMatch(route, /console\.log\(.*reference/i, "payment reference must not be logged");
console.log("PASS guest payment callback route, server verification, retry UX, and account handoff");
