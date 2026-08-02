import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { PROGRAMS } from "@/content/programs";
import { ARTICLES } from "@/content/blog";
import { PLATFORM_ORIGIN } from "@/platform/platform.manifest";
import { SITEMAP_REGISTRY, type SitemapEntry } from "@/platform/seo";

const BASE_URL = PLATFORM_ORIGIN;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          ...SITEMAP_REGISTRY,
          ...PROGRAMS.map((p) => ({ path: `/programs/${p.slug}`, changefreq: "monthly" as const, priority: "0.7" })),
          ...ARTICLES.map((a) => ({ path: `/blog/${a.slug}`, changefreq: "monthly" as const, priority: "0.6" })),
        ];


        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
