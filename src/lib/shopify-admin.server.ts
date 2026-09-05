const DEFAULT_API_VERSION = "2026-07";

export class ShopifyAdminError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "ShopifyAdminError";
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new ShopifyAdminError(`Missing ${name}`, 500);
  return value;
}

export function shopifyConfig() {
  const domain = requiredEnv("SHOPIFY_STORE_DOMAIN").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const token = requiredEnv("SHOPIFY_ADMIN_API_TOKEN");
  const version = (process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION).trim();
  return { domain, token, version };
}

export async function shopifyAdmin<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const { domain, token, version } = shopifyConfig();
  const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  let body: { data?: T; errors?: Array<{ message?: string }>; extensions?: unknown };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    throw new ShopifyAdminError(`Shopify returned non-JSON HTTP ${response.status}`, 502);
  }

  if (!response.ok) {
    const detail = body.errors?.map((error) => error.message).filter(Boolean).join("; ") || `HTTP ${response.status}`;
    throw new ShopifyAdminError(`Shopify Admin API request failed: ${detail}`, 502);
  }

  if (body.errors?.length) {
    throw new ShopifyAdminError(
      `Shopify GraphQL error: ${body.errors.map((error) => error.message || "Unknown error").join("; ")}`,
      502,
    );
  }

  if (body.data === undefined) throw new ShopifyAdminError("Shopify returned no GraphQL data", 502);
  return body.data;
}

export const SHOPIFY_BACKEND_SCOPES = [
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_locations",
  "read_orders",
  "read_all_orders",
  "read_fulfillments",
  "write_fulfillments",
] as const;
