import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../supabase/functions/digital-product-delivery-worker/index.ts", import.meta.url), "utf8");
const access = readFileSync(new URL("../supabase/functions/digital-product-delivery-access/index.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261017090000_resofit_secure_digital_delivery_access.sql", import.meta.url), "utf8");

assert.match(worker, /p\.drawText\(mark/);
assert.match(worker, /PURCHASE \"? \+ purchaseUuid/);
assert.match(worker, /resofit_digital_access_sessions/);
assert.match(worker, /digital-product-delivery-access\?token=/);
assert.match(worker, /access_link_expires_at/);
assert.doesNotMatch(worker, /createSignedUrl\(path,\s*SIGNED_TTL_SECONDS/);
assert.match(access, /createSignedUrl\(job\.output_path, DOWNLOAD_TTL_SECONDS/);
assert.match(access, /DOWNLOAD_TTL_SECONDS = 5 \* 60/);
assert.match(access, /action === "request_code"/);
assert.match(access, /action === "verify_code"/);
assert.match(access, /payment\.status !== "success"/);
assert.match(access, /resofit_digital_access_challenges/);
assert.match(migration, /enable row level security/i);
assert.match(migration, /token_hash text not null unique/i);
console.log("Secure digital delivery source smoke checks passed.");
