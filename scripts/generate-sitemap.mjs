#!/usr/bin/env node

import fs from "node:fs/promises";
const manifest = JSON.parse(await fs.readFile("scripts/product-pages.json", "utf8"));
const BASE_URL = (process.env.SITEMAP_BASE_URL || manifest.baseUrl).replace(/\/$/, "");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const coreRoutes = ["/", "/me", "/shop", "/about", "/contact", "/blog", "/knowledge", "/compliance", "/cookies"];
let products = manifest.products;
if (SUPABASE_KEY) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=handle,published&published=eq.true&order=handle.asc&limit=500`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length) products = rows;
    }
  } catch (error) { console.warn("Canonical Supabase sitemap source unavailable; retaining checked-in manifest", error); }
}
const candidates = [...coreRoutes.map((path) => `${BASE_URL}${path}`), ...products.map(({ handle }) => `${BASE_URL}/product/${handle}`)];
const urls = [...new Set(candidates)].map((url) => `  <url><loc>${url}</loc></url>`).join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
await fs.writeFile("public/sitemap.xml", xml);
console.log(`Sitemap generated: ${products.length} canonical product URLs; ${candidates.length} total URLs.`);
if (process.argv.includes("--strict")) {
  if (!products.length) { console.error("STRICT SEO GATE FAILED: no product routes."); process.exit(1); }
  const duplicateHandles = products.length - new Set(products.map(({ handle }) => handle)).size;
  if (duplicateHandles) { console.error(`STRICT SEO GATE FAILED: duplicate handles=${duplicateHandles}.`); process.exit(1); }
  console.log("STRICT SEO GATE PASSED: canonical product routes are structurally valid.");
}
