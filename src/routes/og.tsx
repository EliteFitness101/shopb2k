import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const FALLBACK_COVER = "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/cover/resofit-cover2";
const escapeXml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

export const Route = createFileRoute("/og")({
  server: { handlers: { GET: async ({ request }) => {
    const url = new URL(request.url);
    const hasDynamicContent = ["title", "subtitle", "section"].some((key) => url.searchParams.has(key));
    if (!hasDynamicContent) return Response.redirect(FALLBACK_COVER, 302);
    const title = escapeXml(url.searchParams.get("title") || "Africa's Personalized Wellness Platform");
    const subtitle = escapeXml(url.searchParams.get("subtitle") || "ResoFit™ • Wellness • Strength • Longevity");
    const section = escapeXml(url.searchParams.get("section") || "RESOFIT™");
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#080808"/><stop offset="58%" stop-color="#17120a"/><stop offset="100%" stop-color="#050505"/></linearGradient><linearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#c7a44a"/><stop offset="50%" stop-color="#f3d57a"/><stop offset="100%" stop-color="#b78a2f"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><circle cx="1030" cy="-20" r="280" fill="#c7a44a" opacity=".10"/><circle cx="1100" cy="590" r="360" fill="#c7a44a" opacity=".07"/><rect x="64" y="64" width="1072" height="502" rx="18" fill="none" stroke="#c7a44a" stroke-opacity=".28"/><text x="96" y="130" fill="url(#gold)" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" letter-spacing="6">${section}</text><text x="96" y="265" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="62" font-weight="700">${title}</text><text x="96" y="335" fill="#d9d3c7" font-family="Arial,Helvetica,sans-serif" font-size="28">${subtitle}</text><line x1="96" y1="390" x2="430" y2="390" stroke="url(#gold)" stroke-width="4"/><text x="96" y="465" fill="#b8b1a5" font-family="Arial,Helvetica,sans-serif" font-size="21">Personalized wellness intelligence powered by ChatB2K™</text><text x="96" y="520" fill="#8f897f" font-family="Arial,Helvetica,sans-serif" font-size="18">resofit.fit</text></svg>`;
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
  } } },
});
