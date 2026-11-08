import assert from "node:assert/strict";
import fs from "node:fs/promises";

const migration = await fs.readFile(new URL("../supabase/migrations/20261009065806_guard_supplier_fulfillment_to_physical_hybrid.sql", import.meta.url), "utf8");
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.enqueue_supplier_fulfillment_from_payment\(\)/i);
assert.match(migration, /SET search_path TO 'pg_catalog', 'public', 'pg_temp'/i);
assert.match(migration, /v_fulfillment_mode NOT IN \('physical', 'hybrid'\)/i);
assert.ok(migration.indexOf("v_fulfillment_mode NOT IN") < migration.indexOf("INSERT INTO public.resofit_supplier_fulfillment_orders"), "mode guard must execute before supplier order creation");
assert.match(migration, /IF NOT FOUND OR v_fulfillment_mode NOT IN/, "unknown SKUs must fail closed");
console.log("PASS supplier fulfilment only accepts catalog SKUs in physical/hybrid modes");
