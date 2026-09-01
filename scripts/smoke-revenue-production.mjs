#!/usr/bin/env node

/**
 * ResoFit Revenue Production Readiness smoke contract.
 *
 * This is intentionally non-destructive: it verifies the application has the
 * expected first-party revenue surfaces/configuration without creating a live
 * charge. A real payment must remain a controlled manual transaction.
 */

import fs from "node:fs/promises";

const requiredFiles = [
  "src/components/CartDrawer.tsx",
  "scripts/revenue-intelligence.mjs",
];

for (const file of requiredFiles) {
  await fs.access(file);
}

const cart = await fs.readFile("src/components/CartDrawer.tsx", "utf8");
const revenue = await fs.readFile("scripts/revenue-intelligence.mjs", "utf8");

const checks = [
  ["Paystack initialization route", cart.includes("/functions/v1/paystack-init")],
  ["Canonical SKU required before checkout", cart.includes("primary.product.sku")],
  ["Checkout-start attribution", cart.includes('track("checkout_start"')],
  ["Revenue intelligence ranks paid orders", revenue.includes("paidOrders")],
  ["Revenue intelligence protects against hardcoded economics", revenue.includes("noHardcodedOfferAmount")],
  ["Buffer remains distribution-only", revenue.includes("bufferIsDistributionOnly")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);

if (failed.length) process.exit(1);
console.log("Revenue production readiness contract: PASS (non-destructive)");
console.log("Manual controlled-payment verification remains required before declaring RPR-01 fully PASS.");
