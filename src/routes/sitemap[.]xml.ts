import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { PROGRAMS } from "@/content/programs";
import { ARTICLES } from "@/content/blog";

const BASE_URL = "https://resofit.fit";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface SitemapEntry { path: string; changefreq?: "daily" | "weekly" | "monthly"; priority?: string; }

export const Route = createFileRoute("/sitemap.xml")({
  server: { handlers: { GET: async () => {
    const entries: SitemapEntry[] = [
      { path: "/", changefreq: "weekly", priority: "1.0" },
      { path: "/programs", changefreq: "weekly", priority: "0.8" },
      { path: "/me", changefreq: "monthly", priority: "0.9" },
      { path: "/shop", changefreq: "daily", priority: "0.9" },
      { path: "/wellness", changefreq: "weekly", priority: "0.9" },
      { path: "/network", changefreq: "daily", priority: "0.8" },
      { path: "/blog", changefreq: "weekly", priority: "0.7" },
      { path: "/knowledge", changefreq: "weekly", priority: "0.7" },
      { path: "/success-stories", changefreq: "monthly", priority: "0.6" },
      { path: "/about", changefreq: "monthly", priority: "0.5" },
      { path: "/contact", changefreq: "monthly", priority: "0.5" },
      ...PROGRAMS.map((p) => ({ path: `/programs/${p.slug}`, changefreq: "monthly" as const, priority: "0.7" })),
      ...ARTICLES.map((a) => ({ path: `/blog/${a.slug}`, changefreq: "monthly" as const, priority: "0.6" })),
    ];

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/resofit_network_directory?select=entity_type,slug&status=eq.active&verification_status=eq.verified&order=updated_at.desc&limit=1000`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
        if (response.ok) {
          const entities = await response.json() as Array<{ entity_type: string; slug: string }>;
          for (const entity of entities) entries.push({ path: `/network/${encodeURIComponent(entity.entity_type)}/${encodeURIComponent(entity.slug)}`, changefreq: "weekly", priority: "0.7" });
        }
      } catch { void 0; }
    }

    const urls = entries.map((e) => [`  <url>`, `    <loc>${BASE_URL}${e.path}</loc>`, e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null, e.priority ? `    <priority>${e.priority}</priority>` : null, `  </url>`].filter(Boolean).join("\n"));
    const xml = [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`, ...urls, `</urlset>`].join("\n");
    return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
  } } },
});
