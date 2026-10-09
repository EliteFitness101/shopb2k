#!/usr/bin/env node

import fs from "node:fs/promises";

const manifest = JSON.parse(await fs.readFile("scripts/product-pages.json", "utf8"));
const BASE_URL = (process.env.SITEMAP_BASE_URL || manifest.baseUrl).replace(/\/$/, "");
const coreRoutes = [
  "/",
  "/me",
  "/shop",
  "/programs",
  "/wellness",
  "/network",
  "/about",
  "/contact",
  "/blog",
  "/knowledge",
  "/success-stories",
  "/community/play",
  "/coach-buchi",
  "/privacy",
  "/terms",
  "/compliance",
  "/cookies",
];
const programSlugs = [
  "strength-foundations",
  "longevity",
  "mobility-recovery",
  "nutrition-reset",
  "resoluxe",
];
const articleSlugs = [
  "personalized-wellness-africa",
  "healthy-ageing-strength",
  "mobility-daily-habit",
  "nutrition-nigerian-kitchen",
  "recovery-sleep-first",
  "body-confidence-training",
  "born-billionaire-mindset",
];

// CI/build mode is deterministic: sitemap generation uses only the canonical
// route/product manifest and known public content slugs; it never crawls the
// deployed website or emits preview-domain URLs.
const candidates = [
  ...coreRoutes.map((path) => `${BASE_URL}${path}`),
  ...programSlugs.map((slug) => `${BASE_URL}/programs/${slug}`),
  ...articleSlugs.map((slug) => `${BASE_URL}/blog/${slug}`),
  ...manifest.products.map(({ handle }) => `${BASE_URL}${manifest.routePrefix}${handle}`),
];

const urls = [...new Set(candidates)].map((url) => `  <url><loc>${url}</loc></url>`).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

await fs.writeFile("public/sitemap.xml", xml);

console.log(
  `Sitemap generated deterministically: ${new Set(candidates).size} canonical URLs; ${manifest.products.length} product URLs, ${programSlugs.length} program URLs, ${articleSlugs.length} article URLs.`,
);

if (process.argv.includes("--strict")) {
  if (manifest.products.length === 0) {
    console.error("STRICT SEO GATE FAILED: product manifest is empty.");
    process.exit(1);
  }

  const duplicateHandles =
    manifest.products.length - new Set(manifest.products.map(({ handle }) => handle)).size;
  const duplicateSkus =
    manifest.products.length - new Set(manifest.products.map(({ sku }) => sku)).size;

  if (duplicateHandles || duplicateSkus) {
    console.error(
      `STRICT SEO GATE FAILED: duplicate handles=${duplicateHandles}, duplicate SKUs=${duplicateSkus}.`,
    );
    process.exit(1);
  }

  const canonicalUrls = [...new Set(candidates)];
  const invalidHosts = canonicalUrls.filter((url) => !url.startsWith("https://www.resofit.fit/"));
  if (invalidHosts.length) {
    console.error(`STRICT SEO GATE FAILED: ${invalidHosts.length} URL(s) do not use the canonical production host.`);
    process.exit(1);
  }

  console.log("STRICT SEO GATE PASSED: manifest uniqueness and canonical host checks passed.");
}
