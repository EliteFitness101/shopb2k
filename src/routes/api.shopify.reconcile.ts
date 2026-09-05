import { createFileRoute } from "@tanstack/react-router";
import { shopifyAdmin } from "@/lib/shopify-admin.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CATEGORY_TO_COLLECTION: Record<string, string> = {
  apparel: "performance-apparel-shapewear",
  digital: "digital-programs-coaching",
  supplements: "supplements-recovery",
  equipment: "industrial-fitness-equipment",
};

const SKU_CATEGORY: Record<string, string> = {
  "001":"apparel","019":"apparel","025":"apparel","026":"apparel","027":"apparel","032":"apparel","033":"apparel","034":"apparel","038":"apparel","041":"apparel","042":"apparel","043":"apparel","045":"apparel",
  "002":"digital","003":"digital","004":"digital","005":"digital","006":"digital","007":"digital","012":"digital","013":"digital","017":"digital","035":"digital","037":"digital",
  "014":"supplements","018":"supplements","020":"supplements","036":"supplements",
  "008":"equipment","009":"equipment","010":"equipment","011":"equipment","015":"equipment","016":"equipment","021":"equipment","022":"equipment","023":"equipment","024":"equipment","028":"equipment","029":"equipment","030":"equipment","031":"equipment","039":"equipment","040":"equipment","044":"equipment",
};

const SKUS = Object.keys(SKU_CATEGORY).map((n) => `RF-SKU-${n}`);

const QUERY = `query Canonical45($query: String!) {
  productVariants(first: 250, query: $query) {
    nodes { sku product { id title status tags } inventoryQuantity }
  }
}`;

type ShopifyData = { productVariants: { nodes: Array<{ sku: string | null; inventoryQuantity: number; product: { id: string; title: string; status: string; tags: string[] } }> } };

function authorized(request: Request) {
  const expected = process.env.SHOPIFY_WEBHOOK_ADMIN_SECRET || process.env.CRON_SECRET;
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

export const Route = createFileRoute("/api/shopify/reconcile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        try {
          const query = SKUS.map((sku) => `sku:${sku}`).join(" OR ");
          const shopify = await shopifyAdmin<ShopifyData>(QUERY, { query });
          const bySku = new Map(shopify.productVariants.nodes.filter((v) => v.sku).map((v) => [v.sku!, v]));
          const { data: maps, error: mapError } = await supabaseAdmin
            .from("resofit_product_collection_map")
            .select("sku,collection_handle,source")
            .in("sku", SKUS);
          if (mapError) throw mapError;

          const mapBySku = new Map((maps ?? []).map((row) => [row.sku, row]));
          const results = SKUS.map((sku) => {
            const number = sku.slice(-3);
            const category = SKU_CATEGORY[number];
            const variant = bySku.get(sku);
            const expectedCollection = CATEGORY_TO_COLLECTION[category];
            const mapping = mapBySku.get(sku);
            return {
              sku,
              category,
              expectedCollection,
              shopifyFound: Boolean(variant),
              inventoryQuantity: variant?.inventoryQuantity ?? null,
              hasCanonicalTag: Boolean(variant?.product.tags.includes(category)),
              backendMapping: mapping?.collection_handle ?? null,
              backendMappingMatches: mapping?.collection_handle === expectedCollection,
            };
          });

          const missingShopify = results.filter((r) => !r.shopifyFound).length;
          const missingTags = results.filter((r) => !r.hasCanonicalTag).length;
          const missingMappings = results.filter((r) => !r.backendMappingMatches).length;
          return Response.json({
            ok: missingShopify === 0 && missingTags === 0 && missingMappings === 0,
            mode: "read-only-reconciliation",
            total: results.length,
            missingShopify,
            missingTags,
            missingMappings,
            results,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("shopify-reconcile", error);
          return Response.json({ ok: false, error: "Reconciliation failed" }, { status: 500 });
        }
      },
    },
  },
});
