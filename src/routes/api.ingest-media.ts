import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const R2_WRITE_TOKEN = process.env.R2_WRITE_TOKEN;
const MEDIA_DOMAIN = "https://media.resofit.fit";
const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "application/pdf",
]);

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function requestedKey(request: Request): string | null {
  const key = new URL(request.url).searchParams.get("key")?.trim() ?? "";
  const segments = key.split("/");
  if (
    !["public", "chatb2k"].includes(segments[0]) ||
    key.length > 500 ||
    key.includes("..") ||
    key.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(key) ||
    segments.length < 2 ||
    segments.some((segment) =>
      !segment ||
      segment === "." ||
      segment === ".." ||
      !/^[a-zA-Z0-9][a-zA-Z0-9 ._-]*$/.test(segment)
    )
  ) return null;
  return key;
}

function encodeObjectKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

async function authorizedAdmin(request: Request): Promise<boolean | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(header.slice(7));
    if (error || !data.user) return false;
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    return roleError ? null : Boolean(isAdmin);
  } catch (error) {
    console.error("ResoFit ingestion auth failed", error);
    return null;
  }
}

async function ingest(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set([
    "https://resofit.fit",
    "https://www.resofit.fit",
    "https://dashboard.resofit.fit",
  ]);
  if (origin && !allowedOrigins.has(origin)) return json({ ok: false, error: "Origin not allowed." }, 403);

  const auth = await authorizedAdmin(request);
  if (auth === null) return json({ ok: false, error: "Media authentication is not configured." }, 503);
  if (!auth) return json({ ok: false, error: "Admin authorization required." }, 403);
  if (!R2_WRITE_TOKEN) return json({ ok: false, error: "Media storage credentials are not configured." }, 503);

  const key = requestedKey(request);
  if (!key) return json({ ok: false, error: "A valid public/ or chatb2k/ media key is required." }, 400);

  const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) return json({ ok: false, error: "Unsupported media type." }, 415);
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BYTES) return json({ ok: false, error: "File exceeds the 50 MiB limit." }, 413);

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return json({ ok: false, error: "Empty upload." }, 400);
  if (body.byteLength > MAX_BYTES) return json({ ok: false, error: "File exceeds the 50 MiB limit." }, 413);

  try {
    const upstream = await fetch(`${MEDIA_DOMAIN}/${encodeObjectKey(key)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${R2_WRITE_TOKEN}`,
        "Content-Type": contentType,
      },
      body,
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return json(
        { ok: false, error: "Primary R2 write failed.", upstreamStatus: upstream.status },
        upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502,
      );
    }
    return json({
      ok: true,
      primary: "Cloudflare R2 resofit-cdn",
      key,
      size: body.byteLength,
      publicUrl: `${MEDIA_DOMAIN}/${encodeObjectKey(key)}`,
      result: payload,
    });
  } catch (error) {
    console.error("ResoFit primary R2 ingestion failed", error);
    return json({ ok: false, error: "Primary R2 storage is temporarily unavailable." }, 502);
  }
}

export const Route = createFileRoute("/api/ingest-media")({
  server: {
    handlers: {
      POST: async ({ request }) => ingest(request),
      OPTIONS: async ({ request }) => {
        const origin = request.headers.get("origin") ?? "";
        const allowedOrigins = new Set([
          "https://resofit.fit",
          "https://www.resofit.fit",
          "https://dashboard.resofit.fit",
        ]);
        if (!allowedOrigins.has(origin)) return new Response(null, { status: 403 });
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
            "Access-Control-Max-Age": "600",
            Vary: "Origin",
          },
        });
      },
    },
  },
});
