export type JumiaInventorySurface = {
  code: string;
  name: string;
  url: string;
  verifiedProductCount: number;
  purpose: string;
  accessMode: "public_web_surface";
  authorizedFeedRequired: true;
};

/**
 * Verified public Jumia Nigeria discovery surfaces.
 * These are source references only; we do not scrape or bypass Jumia controls.
 * A machine-readable authorized feed remains required before automated ingestion.
 */
export const JUMIA_VERIFIED_INVENTORY_SURFACES: readonly JumiaInventorySurface[] = [
  {
    code: "partner-sellers",
    name: "Partner Sellers",
    url: "https://www.jumia.com.ng/slp/partner-sellers",
    verifiedProductCount: 1020,
    purpose: "Partner-seller discovery and source validation",
    accessMode: "public_web_surface",
    authorizedFeedRequired: true,
  },
  {
    code: "shopping-feed",
    name: "Shopping Feed",
    url: "https://www.jumia.com.ng/slp/shopping-feed",
    verifiedProductCount: 172,
    purpose: "Shopping-feed discovery surface",
    accessMode: "public_web_surface",
    authorizedFeedRequired: true,
  },
  {
    code: "verified-seller",
    name: "Verified Seller",
    url: "https://www.jumia.com.ng/slp/verified-seller",
    verifiedProductCount: 496,
    purpose: "Verified-seller discovery",
    accessMode: "public_web_surface",
    authorizedFeedRequired: true,
  },
  {
    code: "certified-sellers",
    name: "Certified Sellers",
    url: "https://www.jumia.com.ng/slp/certified-sellers",
    verifiedProductCount: 510,
    purpose: "Certified-seller discovery",
    accessMode: "public_web_surface",
    authorizedFeedRequired: true,
  },
  {
    code: "trusted-store-seller",
    name: "Trusted Store Seller",
    url: "https://www.jumia.com.ng/slp/trusted-store-seller",
    verifiedProductCount: 684,
    purpose: "Trusted-store discovery",
    accessMode: "public_web_surface",
    authorizedFeedRequired: true,
  },
  {
    code: "seller-network",
    name: "Seller Network",
    url: "https://www.jumia.com.ng/slp/seller-network",
    verifiedProductCount: 5235,
    purpose: "Broader seller-network discovery",
    accessMode: "public_web_surface",
    authorizedFeedRequired: true,
  },
  {
    code: "seller-support",
    name: "Seller Support",
    url: "https://www.jumia.com.ng/slp/seller-support",
    verifiedProductCount: 8541,
    purpose: "Broader seller/support discovery surface",
    accessMode: "public_web_surface",
    authorizedFeedRequired: true,
  },
];

export const JUMIA_VERIFIED_DISCOVERY_PRODUCT_COUNT =
  JUMIA_VERIFIED_INVENTORY_SURFACES.reduce((sum, surface) => sum + surface.verifiedProductCount, 0);
