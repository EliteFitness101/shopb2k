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
    headers: { "Cache-Control": "no-store" },
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
  ) {
    return null;
  }
  return key;
}

function encodeObjectKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}
async function authorizedUser(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return { configured: true as const, userId: null };

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(header.slice(7));
    if (error || !data.user) return { configured: true as const, userId: null };

    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (roleError || !isAdmin) return { configured: true as const, userId: null };
    return { configured: true as const, userId: data.user.id };
  } catch (error) {
    console.error("ResoFit media auth configuration failure", error);
    return { configured: false as const, userId: null };
  }
}

async function proxy(request: Request, method: "PUT" | "DELETE") {
  const auth = await authorizedUser(request);
  if (!auth.configured) return json({ ok: false, error: "Media authentication is not configured." }, 503);
  if (!auth.userId) return json({ ok: false, error: "Admin authorization required." }, 403);
  if (!R2_WRITE_TOKEN) return json({ ok: false, error: "Media storage credentials are not configured." }, 503);

  const key = requestedKey(request);
  if (!key) return json({ ok: false, error: "A valid public/ or chatb2k/ media key is required." }, 400);

  const headers = new Headers({ Authorization: `Bearer ${R2_WRITE_TOKEN}` });
  let body: ArrayBuffer | undefined;
  if (method === "PUT") {
    const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (!ALLOWED_TYPES.has(contentType)) {
      return json({ ok: false, error: "Unsupported media type." }, 415);
    }
    if (declaredLength > MAX_BYTES) return json({ ok: false, error: "File exceeds the 50 MiB limit." }, 413);
    body = await request.arrayBuffer();
    if (body.byteLength === 0) return json({ ok: false, error: "Empty upload." }, 400);
    if (body.byteLength > MAX_BYTES) return json({ ok: false, error: "File exceeds the 50 MiB limit." }, 413);
    headers.set("Content-Type", contentType);
  }

  try {
    const upstream = await fetch(`${MEDIA_DOMAIN}/${encodeObjectKey(key)}`, {
      method,
      headers,
      body,
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return json(
        { ok: false, error: "Media storage request failed.", upstreamStatus: upstream.status },
        upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502,
      );
    }
    return json({
      ok: true,
      key,
      ...(method === "PUT" ? { publicUrl: `${MEDIA_DOMAIN}/${encodeObjectKey(key)}` } : {}),
      result: payload,
    });
  } catch (error) {
    console.error("ResoFit media proxy failed", error);
    return json({ ok: false, error: "Media storage is temporarily unavailable." }, 502);
  }
}

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      PUT: async ({ request }) => proxy(request, "PUT"),
      DELETE: async ({ request }) => proxy(request, "DELETE"),
    },
  },
});
