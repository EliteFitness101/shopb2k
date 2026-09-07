import { createClient } from "@supabase/supabase-js";
import { inferCategory, isRecommendationQualified, scoreRecommendation, selectTop1000 } from "../src/lib/commerce/recommendation-engine.ts";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FEED_URL = process.env.JUMIA_AUTHORIZED_FEED_URL;
const TARGET = 1000;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!FEED_URL) throw new Error("JUMIA_AUTHORIZED_FEED_URL is required; this job does not scrape jumia.com.ng");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function loadFeed() {
  const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(30000), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Jumia authorized feed failed: HTTP ${response.status}`);
  return response.json();
}

function normalize(raw) {
  const title = String(raw.title ?? "").trim();
  const subcategory = typeof raw.subcategory === "string" ? raw.subcategory.trim() : "";
  return {
    externalProductId: String(raw.externalProductId ?? raw.id ?? "").trim(),
    sku: typeof raw.sku === "string" ? raw.sku.trim() : null,
    title,
    category: raw.category || inferCategory(title, subcategory),
    subcategory,
    priceNgn: Number(raw.priceNgn ?? raw.price ?? 0),
    stockQty: Number(raw.stockQty ?? raw.stock ?? 0),
    rating: raw.rating == null ? null : Number(raw.rating),
    reviewCount: Number(raw.reviewCount ?? raw.reviews ?? 0),
    codEligible: raw.codEligible === true,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : null,
    imageRightsStatus: raw.imageRightsStatus ?? "unknown",
    resaleStatus: raw.resaleStatus ?? "pending",
    metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : null,
  };
}

const payload = await loadFeed();
const rawProducts = Array.isArray(payload?.products) ? payload.products : [];
const candidates = rawProducts.map(normalize).filter((item) => item.externalProductId && item.title);
const qualified = candidates.filter(isRecommendationQualified);
const selected = selectTop1000(candidates).slice(0, TARGET);

const { data: catalog, error: catalogError } = await supabase
  .from("recommendation_catalogs")
  .upsert({ code: "jumia-ng-cod-1000", name: "Jumia Nigeria COD — ResoFit Recommendation Pool", target_size: TARGET, status: "active" }, { onConflict: "code" })
  .select("id")
  .single();
if (catalogError) throw catalogError;

const { data: run, error: runError } = await supabase
  .from("recommendation_catalog_runs")
  .insert({ catalog_id: catalog.id, source_code: "JUMIA_NG_COD", input_count: candidates.length, qualified_count: qualified.length, selected_count: selected.length, rejected_count: candidates.length - qualified.length })
  .select("id")
  .single();
if (runError) throw runError;

const rows = selected.map((item) => ({
  catalog_id: catalog.id,
  external_product_id: item.externalProductId,
  sku: item.sku,
  title: item.title,
  category: item.category,
  subcategory: item.subcategory,
  price_ngn: item.priceNgn,
  stock_qty: item.stockQty,
  rating: item.rating,
  review_count: item.reviewCount,
  cod_eligible: item.codEligible,
  image_url: item.imageUrl,
  image_rights_status: item.imageRightsStatus,
  resale_status: item.resaleStatus,
  relevance_score: 0,
  recommendation_score: scoreRecommendation(item),
  publishable: false,
  status: "qualified",
  source_url: item.sourceUrl,
  metadata: item.metadata,
}));

if (rows.length) {
  const { error } = await supabase.from("recommendation_candidates").upsert(rows, { onConflict: "catalog_id,external_product_id" });
  if (error) throw error;
}

await supabase.from("recommendation_catalog_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", run.id);

console.log(JSON.stringify({ source: "JUMIA_NG_COD", input: candidates.length, qualified: qualified.length, selected: selected.length, target: TARGET }, null, 2));
