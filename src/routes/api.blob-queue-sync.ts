import { createFileRoute } from "@tanstack/react-router";
import { list } from "@vercel/blob";

const PRODUCT_PREFIX = "imagekit/assets/products/";
const MUSIC_PREFIX = "doc/audio/";
const SOCIAL_PLATFORMS = ["tiktok", "youtube", "google_business"] as const;

type Platform = (typeof SOCIAL_PLATFORMS)[number];

type BlobItem = {
  pathname: string;
  url: string;
  etag: string;
  size: number;
  uploadedAt: Date | string;
};

function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.CHATGPT_PUBLISH_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

async function adminAuthorized(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  return Boolean(isAdmin);
}

function productAsset(pathname: string) {
  const match = pathname.match(/^imagekit\/assets\/products\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  const [, handle, filename] = match;
  const stem = filename.replace(/\.[^.]+$/, "").toLowerCase();
  const assetType =
    stem === "hero" || stem === "detail" || stem === "lifestyle" || /^gallery-\d+$/.test(stem)
      ? stem
      : "other";
  return { handle, filename, assetType };
}

function classify(pathname: string) {
  if (productAsset(pathname)) return "product" as const;
  if (pathname.startsWith(MUSIC_PREFIX)) return "music" as const;
  if (pathname.startsWith("buffer/assets/ResoFlex_Vault/") || pathname.startsWith("elite/")) return "manifest" as const;
  if (pathname === "2.mp4") return "manifest" as const;
  return null;
}

function titleFromPath(pathname: string) {
  const name = pathname.split("/").pop() || pathname;
  return name.replace(/\.[^.]+$/, "").replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
}

async function listAllBlobs() {
  const blobs: BlobItem[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ limit: 1000, cursor });
    blobs.push(...(page.blobs as BlobItem[]));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function sync() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const blobs = await listAllBlobs();
  const relevant = blobs.filter((blob) => classify(blob.pathname));
  const pathnames = relevant.map((blob) => blob.pathname);

  const { data: known, error: knownError } = await supabaseAdmin
    .from("ingested_blobs")
    .select("pathname,etag,status")
    .in("pathname", pathnames.length ? pathnames : ["__none__"]);
  if (knownError) throw knownError;

  const knownByPath = new Map((known ?? []).map((row) => [row.pathname, row]));
  let discovered = 0;
  let queued = 0;
  let skipped = 0;
  let unchanged = 0;
  const errors: Array<{ pathname: string; error: string }> = [];

  for (const blob of relevant) {
    const previous = knownByPath.get(blob.pathname);
    if (previous?.etag && previous.etag === blob.etag && previous.status === "ingested") {
      unchanged += 1;
      continue;
    }

    const kind = classify(blob.pathname);
    try {
      if (kind === "product") {
        const parsed = productAsset(blob.pathname)!;
        const { error } = await supabaseAdmin.from("ingested_blobs").upsert(
          {
            pathname: blob.pathname,
            etag: blob.etag,
            url: blob.url,
            content_type: "image/*",
            size_bytes: blob.size,
            source_prefix: PRODUCT_PREFIX,
            status: "skipped",
            metadata: { reason: "product_dam_asset_not_social_queue", ...parsed },
            last_seen_at: new Date().toISOString(),
            ingested_at: new Date().toISOString(),
          },
          { onConflict: "pathname" },
        );
        if (error) throw error;
        skipped += 1;
        continue;
      }

      if (kind === "music") {
        const title = titleFromPath(blob.pathname);
        const { error: musicError } = await supabaseAdmin.from("music_library").upsert(
          {
            blob_pathname: blob.pathname,
            title,
            asset_type: /jingle/i.test(title) ? "jingle" : /workout|808/i.test(title) ? "workout_music" : "music",
            status: "available",
            metadata: { url: blob.url, etag: blob.etag, size_bytes: blob.size },
          },
          { onConflict: "blob_pathname" },
        );
        if (musicError) throw musicError;
        const { error: ingestError } = await supabaseAdmin.from("ingested_blobs").upsert(
          {
            pathname: blob.pathname,
            etag: blob.etag,
            url: blob.url,
            content_type: "audio/*",
            size_bytes: blob.size,
            source_prefix: MUSIC_PREFIX,
            status: "skipped",
            metadata: { reason: "music_library_only" },
            last_seen_at: new Date().toISOString(),
            ingested_at: new Date().toISOString(),
          },
          { onConflict: "pathname" },
        );
        if (ingestError) throw ingestError;
        skipped += 1;
        continue;
      }

      const { data: manifest, error: manifestError } = await supabaseAdmin
        .from("asset_manifest")
        .select("*")
        .eq("blob_pathname", blob.pathname)
        .limit(1)
        .maybeSingle();
      if (manifestError) throw manifestError;

      if (!manifest) {
        const { error } = await supabaseAdmin.from("asset_manifest").insert({
          blob_pathname: blob.pathname,
          campaign_type: blob.pathname.startsWith("elite/") ? "brand" : blob.pathname.includes("bg-") ? "background" : "brand",
          status: "pending_review",
          notes: "Auto-discovered by Blob sync; assign platform and approve before publishing.",
        });
        if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
        discovered += 1;
      } else if (manifest.status === "approved" && manifest.platform) {
        const platform = String(manifest.platform) as Platform;
        if (!SOCIAL_PLATFORMS.includes(platform)) throw new Error(`Unsupported platform: ${manifest.platform}`);

        const { data: existingQueue, error: duplicateError } = await supabaseAdmin
          .from("content_queue")
          .select("id,status")
          .eq("asset_url", blob.url)
          .eq("platform", platform)
          .not("status", "in", "(cancelled,failed)")
          .limit(1);
        if (duplicateError) throw duplicateError;

        if (!existingQueue?.length) {
          const title = manifest.title || titleFromPath(blob.pathname);
          const caption = manifest.caption || manifest.notes || `Explore ${title} with ResoFit.`;
          const { error: queueError } = await supabaseAdmin.from("content_queue").insert({
            sku: manifest.handle ? `ASSET-${manifest.handle}` : null,
            title,
            asset_url: blob.url,
            public_id: blob.pathname,
            caption,
            platforms: [platform],
            platform,
            destination: manifest.destination || "https://www.resofit.fit",
            keywords: manifest.keywords ?? [],
            safety_checked: manifest.safety_checked,
            status: "approved",
            metadata: {
              source: "vercel_blob_manifest",
              blob_pathname: blob.pathname,
              blob_etag: blob.etag,
              campaign_type: manifest.campaign_type,
              handle: manifest.handle,
              manifest_id: manifest.id,
              enrichment_status: "pending_chatb2k_enrichment",
            },
          });
          if (queueError) throw queueError;
          queued += 1;
        }
      }

      const { error: ingestError } = await supabaseAdmin.from("ingested_blobs").upsert(
        {
          pathname: blob.pathname,
          etag: blob.etag,
          url: blob.url,
          content_type: /\.mp4(?:$|\.)/i.test(blob.pathname) ? "video/mp4" : "application/octet-stream",
          size_bytes: blob.size,
          source_prefix: blob.pathname.startsWith("elite/") ? "elite/" : "buffer/assets/ResoFlex_Vault/",
          status: "ingested",
          metadata: { manifest_status: manifest?.status ?? "pending_review" },
          last_seen_at: new Date().toISOString(),
          ingested_at: new Date().toISOString(),
        },
        { onConflict: "pathname" },
      );
      if (ingestError) throw ingestError;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ pathname: blob.pathname, error: message });
      await supabaseAdmin.from("ingested_blobs").upsert(
        {
          pathname: blob.pathname,
          etag: blob.etag,
          url: blob.url,
          source_prefix: blob.pathname.split("/").slice(0, 2).join("/") + "/",
          status: "failed",
          metadata: { error: message },
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "pathname" },
      );
    }
  }

  return { ok: errors.length === 0, scanned: blobs.length, relevant: relevant.length, discovered, queued, skipped, unchanged, errors };
}

export const Route = createFileRoute("/api/blob-queue-sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!cronAuthorized(request) && !(await adminAuthorized(request))) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        try {
          return Response.json(await sync(), { status: 200 });
        } catch (error) {
          return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
        }
      },
    },
  },
});
