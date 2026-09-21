import { createFileRoute } from "@tanstack/react-router";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";
const HOST = "ab2ttlkn9no0tuoa.public.blob.vercel-storage.com";
const PREFIX = "buffer/assets/ResoFlex_Vault/";

function validPublicUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === HOST && u.pathname.startsWith("/buffer/assets/");
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/content/assets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!BLOB_TOKEN) {
          return Response.json({ ok: false, error: "BLOB_READ_WRITE_TOKEN is not configured" }, { status: 503 });
        }

        try {
          const url = new URL(request.url);
          const prefix = url.searchParams.get("prefix") || PREFIX;
          if (!prefix.startsWith(PREFIX)) {
            return Response.json({ ok: false, error: "Invalid prefix" }, { status: 400 });
          }

          const assets: Array<Record<string, unknown>> = [];
          let cursor: string | undefined;

          do {
            const q = new URL("https://blob.vercel-storage.com/");
            q.searchParams.set("prefix", prefix);
            q.searchParams.set("limit", "1000");
            if (cursor) q.searchParams.set("cursor", cursor);

            const response = await fetch(q, {
              headers: { Authorization: `Bearer ${BLOB_TOKEN}` },
              cache: "no-store",
            });
            if (!response.ok) {
              throw new Error(`Vercel Blob API returned ${response.status}`);
            }

            const page = await response.json();
            for (const blob of page.blobs ?? []) {
              if (!validPublicUrl(blob.url)) continue;

              const pathname = new URL(blob.url).pathname.replace(/^\//, "");
              const filename = pathname.split("/").pop() || pathname;
              const extension = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : "";
              const assetType = ["mp4", "mov", "webm", "m4v"].includes(extension || "")
                ? "video"
                : ["jpg", "jpeg", "png", "webp", "avif", "gif"].includes(extension || "")
                  ? "image"
                  : "unknown";

              assets.push({
                url: blob.url,
                pathname,
                filename,
                asset_type: assetType,
                size: blob.size,
                uploaded_at: blob.uploadedAt,
                download_url: blob.downloadUrl ?? blob.url,
                folder: prefix,
              });
            }

            cursor = page.hasMore && page.cursor ? page.cursor : undefined;
          } while (cursor);

          return Response.json(
            {
              ok: true,
              source: "vercel_blob",
              prefix,
              count: assets.length,
              policy: "buffer_only",
              assets,
              discovered_at: new Date().toISOString(),
            },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          console.error("content asset discovery", error);
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : String(error) },
            { status: 500 },
          );
        }
      },
    },
  },
});
