#!/usr/bin/env node

/**
 * ResoFit Revenue Production Readiness smoke contract.
 *
 * Non-destructive: verifies the live first-party revenue surface matches the
 * current Shopify checkout architecture and revenue-intelligence guardrails.
 */

import fs from "node:fs/promises";

const requiredFiles = [
  "src/components/CartDrawer.tsx",
  "scripts/revenue-intelligence.mjs",
];

for (const file of requiredFiles) await fs.access(file);

const cart = await fs.readFile("src/components/CartDrawer.tsx", "utf8");
const revenue = await fs.readFile("scripts/revenue-intelligence.mjs", "utf8");

const checks = [
  ["Shopify checkout is the current cart destination", cart.includes("resocart.myshopify.com/cart/")],
  ["Checkout uses numeric Shopify variant identity", cart.includes("variantNumericId")],
  ["Checkout-start attribution is emitted", cart.includes('track("checkout_start"')],
  ["Checkout preserves canonical SKU attribution", cart.includes("items[0]?.product.sku")],
  ["Revenue intelligence ranks paid orders", revenue.includes("paidOrders")],
  ["Revenue intelligence recognizes checkout-start events", revenue.includes('type === "checkout_start"')],
  ["Revenue intelligence protects against hardcoded economics", revenue.includes("noHardcodedOfferAmount")],
  ["Buffer remains distribution-only", revenue.includes("bufferIsDistributionOnly")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);

if (failed.length) process.exit(1);
console.log("Revenue production readiness contract: PASS (non-destructive)");
console.log("Controlled payment verification remains a separate live-transaction gate.");
