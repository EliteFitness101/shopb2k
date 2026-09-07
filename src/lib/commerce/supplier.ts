export type SupplierIntegration = "api" | "feed" | "manual" | "partner";
export type SupplierStatus = "pending" | "active" | "paused" | "disabled";
export type ProductRights = "unknown" | "authorized" | "licensed" | "owned" | "rejected";
export type ResaleStatus = "pending" | "authorized" | "rejected";

export interface SupplierFeedItem {
  externalProductId: string;
  sku?: string | null;
  title: string;
  description?: string | null;
  productUrl?: string | null;
  currency?: string;
  supplierPrice: number;
  stockQty: number;
  imageUrl?: string | null;
  imageRightsStatus?: ProductRights;
  resaleStatus?: ResaleStatus;
  updatedAt?: string | null;
}

export interface SupplierFeedEnvelope {
  supplierCode: string;
  generatedAt?: string;
  products: SupplierFeedItem[];
}

const SUPPORTED_CURRENCIES = new Set(["NGN"]);

export function validateSupplierFeed(payload: unknown): SupplierFeedEnvelope {
  if (!payload || typeof payload !== "object") throw new Error("Invalid supplier feed payload");
  const value = payload as Record<string, unknown>;
  if (typeof value.supplierCode !== "string" || !value.supplierCode.trim()) {
    throw new Error("Supplier feed requires supplierCode");
  }
  if (!Array.isArray(value.products)) throw new Error("Supplier feed requires products[]");

  const products = value.products.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error(`Invalid product at index ${index}`);
    const item = raw as Record<string, unknown>;
    const externalProductId = String(item.externalProductId ?? "").trim();
    const title = String(item.title ?? "").trim();
    const supplierPrice = Number(item.supplierPrice);
    const stockQty = Number(item.stockQty);
    const currency = String(item.currency ?? "NGN").toUpperCase();
    if (!externalProductId || !title) throw new Error(`Product ${index} requires externalProductId and title`);
    if (!Number.isInteger(supplierPrice) || supplierPrice < 0) throw new Error(`Product ${externalProductId} has invalid supplierPrice`);
    if (!Number.isInteger(stockQty) || stockQty < 0) throw new Error(`Product ${externalProductId} has invalid stockQty`);
    if (!SUPPORTED_CURRENCIES.has(currency)) throw new Error(`Unsupported currency for ${externalProductId}: ${currency}`);

    return {
      externalProductId,
      sku: typeof item.sku === "string" ? item.sku : null,
      title,
      description: typeof item.description === "string" ? item.description : null,
      productUrl: typeof item.productUrl === "string" ? item.productUrl : null,
      currency,
      supplierPrice,
      stockQty,
      imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
      imageRightsStatus: (item.imageRightsStatus as ProductRights | undefined) ?? "unknown",
      resaleStatus: (item.resaleStatus as ResaleStatus | undefined) ?? "pending",
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
    } satisfies SupplierFeedItem;
  });

  return {
    supplierCode: value.supplierCode.trim(),
    generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : undefined,
    products,
  };
}

export function canPublishSupplierProduct(item: SupplierFeedItem): boolean {
  return item.resaleStatus === "authorized" &&
    ["authorized", "licensed", "owned"].includes(item.imageRightsStatus ?? "unknown") &&
    item.stockQty > 0 &&
    item.supplierPrice > 0;
}
