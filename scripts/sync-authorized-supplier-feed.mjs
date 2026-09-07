import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const feedUrl = process.env.AUTHORIZED_SUPPLIER_FEED_URL;

if (!supabaseUrl || !serviceRoleKey || !feedUrl) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and AUTHORIZED_SUPPLIER_FEED_URL are required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function validateFeed(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.products)) throw new Error("Invalid supplier feed payload");
  if (typeof payload.supplierCode !== "string" || !payload.supplierCode.trim()) throw new Error("Supplier feed requires supplierCode");
  const products = payload.products.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error(`Invalid product at index ${index}`);
    const externalProductId = String(raw.externalProductId ?? "").trim();
    const title = String(raw.title ?? "").trim();
    const supplierPrice = Number(raw.supplierPrice);
    const stockQty = Number(raw.stockQty);
    if (!externalProductId || !title) throw new Error(`Product ${index} requires externalProductId and title`);
    if (!Number.isInteger(supplierPrice) || supplierPrice < 0) throw new Error(`Product ${externalProductId} has invalid supplierPrice`);
    if (!Number.isInteger(stockQty) || stockQty < 0) throw new Error(`Product ${externalProductId} has invalid stockQty`);
    return { ...raw, externalProductId, title, supplierPrice, stockQty, currency: String(raw.currency ?? "NGN").toUpperCase() };
  });
  return { supplierCode: payload.supplierCode.trim(), generatedAt: payload.generatedAt, products };
}

function canPublish(item, supplier) {
  const rights = ["authorized", "licensed", "owned"].includes(item.imageRightsStatus ?? "unknown");
  return supplier.resale_authorized && supplier.media_authorized && item.resaleStatus === "authorized" && rights && item.stockQty > 0 && item.supplierPrice > 0;
}

const response = await fetch(feedUrl, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
if (!response.ok) throw new Error(`Supplier feed HTTP ${response.status}`);
const feed = validateFeed(await response.json());

const { data: supplier, error: supplierError } = await supabase
  .from("suppliers")
  .select("id, status, resale_authorized, media_authorized")
  .eq("code", feed.supplierCode)
  .maybeSingle();
if (supplierError) throw supplierError;
if (!supplier) throw new Error(`Unknown supplier: ${feed.supplierCode}`);
if (supplier.status !== "active") throw new Error(`Supplier ${feed.supplierCode} is not active`);

const { data: run, error: runError } = await supabase.from("sync_runs").insert({ supplier_id: supplier.id, status: "running" }).select("id").single();
if (runError) throw runError;

let accepted = 0;
let rejected = 0;
let errors = 0;

try {
  for (const item of feed.products) {
    const publishable = canPublish(item, supplier);
    if (!publishable) rejected++;

    const { data: product, error } = await supabase.from("supplier_products").upsert({
      supplier_id: supplier.id,
      external_product_id: item.externalProductId,
      sku: typeof item.sku === "string" ? item.sku : null,
      title: item.title,
      description: typeof item.description === "string" ? item.description : null,
      product_url: typeof item.productUrl === "string" ? item.productUrl : null,
      currency: item.currency,
      supplier_price: item.supplierPrice,
      stock_qty: item.stockQty,
      image_url: typeof item.imageUrl === "string" ? item.imageUrl : null,
      image_rights_status: item.imageRightsStatus ?? "unknown",
      resale_status: publishable ? "authorized" : (item.resaleStatus ?? "pending"),
      last_source_update: item.updatedAt ?? feed.generatedAt ?? null,
      last_verified_at: publishable ? new Date().toISOString() : null,
      raw_payload: item,
      updated_at: new Date().toISOString(),
    }, { onConflict: "supplier_id,external_product_id" }).select("id, supplier_price, stock_qty").single();

    if (error) {
      errors++;
      console.error(`supplier product ${item.externalProductId}:`, error.message);
      continue;
    }
    const snapshot = await supabase.from("supplier_price_snapshots").insert({ supplier_product_id: product.id, supplier_price: product.supplier_price, stock_qty: product.stock_qty });
    if (snapshot.error) errors++;
    if (publishable) accepted++;
  }

  await supabase.from("sync_runs").update({ status: errors ? "failed" : "succeeded", discovered_count: feed.products.length, accepted_count: accepted, rejected_count: rejected, error_count: errors, finished_at: new Date().toISOString() }).eq("id", run.id);
  console.log(JSON.stringify({ supplier: feed.supplierCode, discovered: feed.products.length, accepted, rejected, errors }));
} catch (error) {
  await supabase.from("sync_runs").update({ status: "failed", discovered_count: feed.products.length, accepted_count: accepted, rejected_count: rejected, error_count: errors + 1, finished_at: new Date().toISOString(), error_message: error instanceof Error ? error.message : String(error) }).eq("id", run.id);
  throw error;
}
