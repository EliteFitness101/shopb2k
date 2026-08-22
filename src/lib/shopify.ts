// ResoFit storefront data client. Shopify is no longer the source of truth.

export const RESOFIT_SUPABASE_URL = "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
export const RESOFIT_STOREFRONT_URL = `${RESOFIT_SUPABASE_URL}/functions/v1/storefront-products`;
export const RESOFIT_CATALOG_URL = `${RESOFIT_SUPABASE_URL}/functions/v1/catalog-public`;

export interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

export interface ShopifyImage {
  url: string;
  altText: string | null;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  price: MoneyV2;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface ShopifyProductNode {
  id: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  handle: string;
  sku?: string | null;
  productType?: string;
  vendor?: string;
  tags?: string[];
  priceRange: { minVariantPrice: MoneyV2 };
  images: { edges: Array<{ node: ShopifyImage }> };
  variants: { edges: Array<{ node: ShopifyVariant }> };
  options: Array<{ name: string; values: string[] }>;
}

export interface ShopifyProduct {
  node: ShopifyProductNode;
}

type StorefrontProduct = {
  id: string;
  handle: string;
  title: string;
  body_html: string | null;
  vendor: string | null;
  product_type: string;
  tags: string[] | null;
  published: boolean;
  variant_price: number;
  variant_inventory_qty: number;
  image_src: string | null;
  sku: string | null;
};

function mapProduct(p: StorefrontProduct): ShopifyProductNode {
  const price = { amount: String(p.variant_price ?? 0), currencyCode: "NGN" };
  const variant: ShopifyVariant = {
    id: p.id,
    title: "Default Title",
    price,
    availableForSale: (p.variant_inventory_qty ?? 0) > 0,
    selectedOptions: [],
  };
  return {
    id: p.id,
    title: p.title,
    description:
      p.body_html
        ?.replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim() ?? "",
    descriptionHtml: p.body_html ?? undefined,
    handle: p.handle,
    sku: p.sku,
    productType: p.product_type,
    vendor: p.vendor ?? "ResoFlex",
    tags: p.tags ?? [],
    priceRange: { minVariantPrice: price },
    images: { edges: p.image_src ? [{ node: { url: p.image_src, altText: p.title } }] : [] },
    variants: { edges: [{ node: variant }] },
    options: [],
  };
}

async function fetchStorefrontProducts(handle: string | null): Promise<StorefrontProduct[]> {
  const url = new URL(RESOFIT_STOREFRONT_URL);
  if (handle) url.searchParams.set("handle", handle);
  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) throw new Error(`ResoFit storefront HTTP ${response.status}`);
  const payload = (await response.json()) as { products?: StorefrontProduct[]; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.products ?? [];
}

async function fetchCanonicalCatalog(handle: string | null): Promise<StorefrontProduct[]> {
  const url = new URL(handle ? `${RESOFIT_CATALOG_URL}/product` : RESOFIT_CATALOG_URL);
  if (handle) url.searchParams.set("handle", handle);
  else url.searchParams.set("limit", "100");
  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) throw new Error(`ResoFit canonical catalog HTTP ${response.status}`);
  const payload = (await response.json()) as { data?: StorefrontProduct | StorefrontProduct[]; error?: string };
  if (payload.error) throw new Error(payload.error);
  if (handle) return payload.data ? [payload.data as StorefrontProduct] : [];
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function storefrontApiRequest<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ data?: T; errors?: Array<{ message: string }> } | undefined> {
  const handle = typeof variables.handle === "string" ? variables.handle : null;
  let products: StorefrontProduct[] = [];

  try {
    products = await fetchStorefrontProducts(handle);
  } catch (primaryError) {
    console.warn("Primary ResoFit storefront unavailable; using canonical catalog fallback", primaryError);
  }

  if (products.length === 0) {
    products = await fetchCanonicalCatalog(handle);
  }

  const nodes = products.map(mapProduct);
  const isHandleQuery = /product\s*\(handle/i.test(query);
  const mappedProducts = isHandleQuery ? (nodes[0] ?? null) : { edges: nodes.map((node) => ({ node })) };

  if (isHandleQuery) {
    return { data: { product: mappedProducts } as T };
  }
  if (/products\s*\(/i.test(query)) {
    return { data: { products: mappedProducts } as T };
  }
  if (/query\s+cart/i.test(query)) {
    return { data: { cart: null } as T };
  }
  throw new Error("Unsupported storefront operation");
}

export const PRODUCTS_QUERY = /* GraphQL */ `
  query GetProducts($first: Int!, $query: String) { products(first: $first, query: $query) { edges { node { id title description handle productType vendor tags priceRange { minVariantPrice { amount currencyCode } } images(first: 5) { edges { node { url altText } } } variants(first: 10) { edges { node { id title availableForSale price { amount currencyCode } selectedOptions { name value } } } } options { name values } } } }
`;

export const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      descriptionHtml
      handle
      productType
      vendor
      tags
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 12) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            availableForSale
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
      options {
        name
        values
      }
    }
  }
`;

export const CART_QUERY = `query cart($id: ID!) { cart(id: $id) { id totalQuantity } }`;
export const CART_CREATE_MUTATION = "";
export const CART_LINES_ADD_MUTATION = "";
export const CART_LINES_UPDATE_MUTATION = "";
export const CART_LINES_REMOVE_MUTATION = "";

export function formatCheckoutUrl(checkoutUrl: string): string {
  return checkoutUrl;
}

export function isCartNotFoundError(
  userErrors: Array<{ field: string[] | null; message: string }>,
): boolean {
  return userErrors.some(
    (e) =>
      e.message.toLowerCase().includes("cart not found") ||
      e.message.toLowerCase().includes("does not exist"),
  );
}

export function formatMoney(money: MoneyV2): string {
  const amount = parseFloat(money.amount);
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: money.currencyCode,
      maximumFractionDigits: money.currencyCode === "NGN" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${money.currencyCode} ${amount.toFixed(2)}`;
  }
}

const NGN_PER_USD = 1600;
export function approxUSD(money: MoneyV2): string {
  const amount = parseFloat(money.amount);
  const usd = money.currencyCode === "NGN" ? amount / NGN_PER_USD : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd >= 100 ? 0 : 2,
  }).format(usd);
}
