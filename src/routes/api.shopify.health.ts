import { createFileRoute } from "@tanstack/react-router";
import { shopifyAdmin, shopifyConfig, SHOPIFY_BACKEND_SCOPES } from "@/lib/shopify-admin.server";

const SHOP_QUERY = `query BackendShopHealth { shop { id name myshopifyDomain primaryDomain { url } } }`;

type ShopHealth = {
  shop: { id: string; name: string; myshopifyDomain: string; primaryDomain?: { url: string } | null };
};

export const Route = createFileRoute("/api/shopify/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const config = shopifyConfig();
          const data = await shopifyAdmin<ShopHealth>(SHOP_QUERY);
          return Response.json({
            ok: true,
            integration: "shopify-admin-graphql",
            apiVersion: config.version,
            shop: data.shop,
            requiredScopes: SHOPIFY_BACKEND_SCOPES,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          const status = error instanceof Error && "status" in error ? Number(error.status) : 502;
          return Response.json({ ok: false, error: error instanceof Error ? error.message : "Shopify health check failed" }, { status });
        }
      },
    },
  },
});
