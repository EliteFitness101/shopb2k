#!/usr/bin/env node

import fs from "node:fs/promises";

const BASE_URL = "https://resofit.fit";
const manifest = JSON.parse(await fs.readFile("scripts/product-pages.json", "utf8"));

const coreRoutes = ["/", "/me", "/shop", "/about", "/contact", "/blog", "/knowledge", "/compliance", "/cookies"];

async function isLive(url) {
  try {
    const response = await fetch(url, { redirect: "follow", headers: { "User-Agent": "ResoFit-Sitemap-Builder/1.0" } });
    return response.ok && new URL(response.url).hostname === "resofit.fit";
  } catch {
    return false;
  }
}

const candidates = [
  ...coreRoutes.map((path) => `${BASE_URL}${path}`),
  ...manifest.products.map(({ handle }) => `${BASE_URL}${manifest.routePrefix}${handle}`),
];

const live = [];
for (const url of candidates) {
  if (await isLive(url)) live.push(url);
}

const urls = [...new Set(live)].map((url) => `<url><loc>${url}</loc></url>`).join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

await fs.writeFile("public/sitemap.xml", xml);

const productUrls = live.filter((url) => url.includes("/product/")).length;
console.log(`Sitemap generated: ${live.length} live URLs; ${productUrls}/${manifest.products.length} product URLs.`);

if (process.argv.includes("--strict") && productUrls !== manifest.products.length) {
  console.error(`STRICT SEO GATE FAILED: ${manifest.products.length - productUrls} product URLs are not HTTP 200 yet.`);
  process.exit(1);
}
