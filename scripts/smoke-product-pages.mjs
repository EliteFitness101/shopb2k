#!/usr/bin/env node

import fs from "node:fs/promises";

const manifest = JSON.parse(
  await fs.readFile(new URL("./product-pages.json", import.meta.url), "utf8"),
);

const baseUrl = (process.env.BASE_URL || manifest.baseUrl).replace(/\/$/, "");
const results = [];

async function check(product) {
  const url = `${baseUrl}${manifest.routePrefix}${encodeURIComponent(product.handle)}`;
  const result = { ...product, url, status: null, ok: false, titleFound: false, skuFound: false, notFound: false, error: null };

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "ResoFit-66-Product-Smoke/1.0" },
    });

    result.status = response.status;
    const html = await response.text();
    result.ok = response.status === 200;
    result.notFound = /404|page not found|product not found/i.test(html);
    result.titleFound = !result.notFound && html.length > 1000;
    result.skuFound = html.toLowerCase().includes(product.sku.toLowerCase());

    if (result.notFound) result.ok = false;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

for (const product of manifest.products) {
  const result = await check(product);
  results.push(result);
  console.log(
    `${result.ok ? "PASS" : "FAIL"} ${result.status ?? "ERR"} ${product.sku} ${result.url}`,
  );
}

const failures = results.filter((r) => !r.ok);
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  total: results.length,
  passed: results.length - failures.length,
  failed: failures.length,
  productionReady: failures.length === 0,
  results,
};

await fs.writeFile(
  "product-pages-smoke-report.json",
  JSON.stringify(report, null, 2),
);

console.log(`\n${report.passed}/${report.total} product pages returned HTTP 200.`);
console.log(`Report: product-pages-smoke-report.json`);

if (failures.length) {
  process.exit(1);
}
