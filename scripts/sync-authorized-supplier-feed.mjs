import { createClient } from "@supabase/supabase-js";

import { canPublishSupplierProduct, validateSupplierFeed } from "../src/lib/commerce/supplier.ts";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const feedUrl = process.env.AUTHORIZED_SUPPLIER_FEED_URL;

if (!supabaseUrl || !serviceRoleKey || !feedUrl) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and AUTHORIZED_SUPPLIER_FEED_URL are required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const response = await fetch(feedUrl, {
  headers: { accept: "application/json" },
  signal: AbortSignal.timeout(20_000),
});
if (!response.ok) throw new Error(`Supplier feed HTTP ${response.status}`);

const feed = validateSupplierFeed(await response.json());

const { data: supplier, error: supplierError } = await supabase
  .from("suppliers")
  .select("id, status, resale_authorized, media_authorized")
  .eq("code", feed.supplierCode)
  .maybeSingle();
if (supplierError) throw supplierError;
if (!supplier) throw new Error(`Unknown supplier: ${feed.supplierCode}`);
if (supplier.status !== "active") throw new Error(`Supplier ${feed.supplierCode} is not active`);

const { data: run, error: runError } = await supabase
  .from("sync_runs")
  .insert({ supplier_id: supplier.id, status: "running" })
  .select("id")
  .single();
if (runError) throw runError;

let accepted = 0;
let rejected = 0;
let errors = 0;

try {
  for (const item of feed.products) {
    const publishable = supplier.resale_authorized && supplier.media_authorized && canPublishSupplierProduct(item);
    if (!publishable) rejected++;

    const { data: product, error } = await supabase
      .from("supplier_products")
      .upsert({
        supplier_id: supplier.id,
        external_product_id: item.externalProductId,
        sku: item.sku,
        title: item.title,
        description: item.description,
        product_url: item.productUrl,
        currency: item.currency ?? "NGN",
        supplier_price: item.supplierPrice,
        stock_qty: item.stockQty,
        image_url: item.imageUrl,
        image_rights_status: item.imageRightsStatus ?? "unknown",
        resale_status: publishable ? "authorized" : (item.resaleStatus ?? "pending"),
        last_source_update: item.updatedAt ?? feed.generatedAt ?? null,
        last_verified_at: publishable ? new Date().toISOString() : null,
        raw_payload: item,
        updated_at: new Date().toISOString(),
      }, { onConflict: "supplier_id,external_product_id" })
      .select("id, supplier_price, stock_qty")
      .single();

    if (error) {
      errors++;
      console.error(`supplier product ${item.externalProductId}:`, error.message);
      continue;
    }

    await supabase.from("supplier_price_snapshots").insert({
      supplier_product_id: product.id,
      supplier_price: product.supplier_price,
      stock_qty: product.stock_qty,
    });
    if (publishable) accepted++;
  }

  await supabase.from("sync_runs").update({
    status: errors ? "failed" : "succeeded",
    discovered_count: feed.products.length,
    accepted_count: accepted,
    rejected_count: rejected,
    error_count: errors,
    finished_at: new Date().toISOString(),
  }).eq("id", run.id);

  console.log(JSON.stringify({ supplier: feed.supplierCode, discovered: feed.products.length, accepted, rejected, errors }));
} catch (error) {
  await supabase.from("sync_runs").update({
    status: "failed",
    discovered_count: feed.products.length,
    accepted_count: accepted,
    rejected_count: rejected,
    error_count: errors + 1,
    finished_at: new Date().toISOString(),
    error_message: error instanceof Error ? error.message : String(error),
  }).eq("id", run.id);
  throw error;
}
