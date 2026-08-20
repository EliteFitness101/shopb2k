#!/usr/bin/env node

import fs from "node:fs/promises";

const manifest = JSON.parse(await fs.readFile("scripts/product-pages.json", "utf8"));
const BASE_URL = (process.env.SITEMAP_BASE_URL || manifest.baseUrl).replace(/\/$/, "");
const coreRoutes = ["/", "/me", "/shop", "/about", "/contact", "/blog", "/knowledge", "/compliance", "/cookies"];

// CI/build mode is deterministic: sitemap generation uses only the canonical
// route/product manifest and never depends on an already-deployed website.
const candidates = [
  ...coreRoutes.map((path) => `${BASE_URL}${path}`),
  ...manifest.products.map(({ handle }) => `${BASE_URL}${manifest.routePrefix}${handle}`),
];

const urls = [...new Set(candidates)]
  .map((url) => `  <url><loc>${url}</loc></url>`)
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

await fs.writeFile("public/sitemap.xml", xml);

console.log(`Sitemap generated deterministically: ${candidates.length} manifest URLs; ${manifest.products.length} product URLs.`);

if (process.argv.includes("--strict")) {
  if (manifest.products.length === 0) {
    console.error("STRICT SEO GATE FAILED: product manifest is empty.");
    process.exit(1);
  }

  const duplicateHandles = manifest.products.length - new Set(manifest.products.map(({ handle }) => handle)).size;
  const duplicateSkus = manifest.products.length - new Set(manifest.products.map(({ sku }) => sku)).size;

  if (duplicateHandles || duplicateSkus) {
    console.error(`STRICT SEO GATE FAILED: duplicate handles=${duplicateHandles}, duplicate SKUs=${duplicateSkus}.`);
    process.exit(1);
  }

  console.log("STRICT SEO GATE PASSED: manifest routes are structurally valid.");
}
