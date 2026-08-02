// Shared product registry — master catalog interface.
// Future source of truth: catalog.resofit.fit (ResoCatalog PIM).
// Live commerce data continues to stream from Shopify; this registry owns
// canonical pricing, identifiers, and cross-application product links.

import { PlatformRoutes } from "./routes";

export type Currency = "NGN" | "USD";

export interface PlatformProduct {
  /** Canonical platform SKU. */
  sku: string;
  /** Shopify handle when the product is sold through the storefront. */
  handle?: string;
  title: string;
  category: "equipment" | "program" | "service" | "bundle";
  price: Partial<Record<Currency, number>>;
  /** Where this product is fulfilled/purchased. */
  href: string;
  external?: boolean;
  active: boolean;
}

export const CATALOG_SOURCE = PlatformRoutes.catalog;

export const PRODUCT_REGISTRY: PlatformProduct[] = [
  {
    sku: "RF-PROG-RESET-1K",
    title: "₦1,000 Reset",
    category: "program",
    price: { NGN: 1000 },
    href: PlatformRoutes.personalize,
    active: true,
  },
  {
    sku: "RF-PROG-STARTER",
    title: "Starter Program",
    category: "program",
    price: { NGN: 15000, USD: 12 },
    href: PlatformRoutes.programs,
    active: true,
  },
  {
    sku: "RF-SVC-COACHING-CALL",
    title: "Coaching Call",
    category: "service",
    price: { NGN: 25000, USD: 20 },
    href: PlatformRoutes.contact,
    active: true,
  },
  {
    sku: "RF-SVC-MEAL-PACK",
    title: "Meal Pack",
    category: "service",
    price: { NGN: 20000, USD: 16 },
    href: PlatformRoutes.programs,
    active: true,
  },
  {
    sku: "RF-SVC-ACCOUNTABILITY",
    title: "Accountability",
    category: "service",
    price: { NGN: 30000, USD: 24 },
    href: PlatformRoutes.dashboard,
    external: true,
    active: true,
  },
  {
    sku: "RF-EQUIP-CATALOG",
    title: "Premium Equipment (Shopify catalog)",
    category: "equipment",
    price: {},
    href: PlatformRoutes.shopPage,
    active: true,
  },
];

export function getProduct(sku: string): PlatformProduct | undefined {
  return PRODUCT_REGISTRY.find((p) => p.sku === sku);
}

export function getProductByHandle(handle: string): PlatformProduct | undefined {
  return PRODUCT_REGISTRY.find((p) => p.handle === handle);
}

export function activeProducts(): PlatformProduct[] {
  return PRODUCT_REGISTRY.filter((p) => p.active);
}

const NGN = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatPrice(amount: number, currency: Currency = "NGN"): string {
  return currency === "USD" ? USD.format(amount) : NGN.format(amount);
}
