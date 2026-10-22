import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
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
  if (
    !key.startsWith("public/") ||
    key.length > 500 ||
    key.includes("..") ||
    key.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(key) ||
    !/^public\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(key)
  ) {
    return null;
  }
  return key;
}

async function authorizedUser(request: Request) {
  if (!SERVICE_ROLE) return { configured: false as const, userId: null };
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return { configured: true as const, userId: null };

  const client = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(header.slice(7));
  if (error || !data.user) return { configured: true as const, userId: null };

  const metadata = data.user.app_metadata ?? {};
  const roles = Array.isArray(metadata.roles) ? metadata.roles : [];
  const role = typeof metadata.role === "string" ? metadata.role : "";
  const allowlistedIds = (process.env.MEDIA_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const isAdmin =
    ["admin", "owner"].includes(role.toLowerCase()) ||
    roles.some((item: unknown) => typeof item === "string" && ["admin", "owner"].includes(item.toLowerCase())) ||
    allowlistedIds.includes(data.user.id);

  return { configured: true as const, userId: isAdmin ? data.user.id : null };
}

async function proxy(request: Request, method: "PUT" | "DELETE") {
  if (!SERVICE_ROLE) return json({ ok: false, error: "Media authentication is not configured." }, 503);
  if (!R2_WRITE_TOKEN) return json({ ok: false, error: "Media storage credentials are not configured." }, 503);

  const auth = await authorizedUser(request);
  if (!auth.configured) return json({ ok: false, error: "Media authentication is not configured." }, 503);
  if (!auth.userId) return json({ ok: false, error: "Admin authorization required." }, 403);

  const key = requestedKey(request);
  if (!key) return json({ ok: false, error: "A valid public/ media key is required." }, 400);

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
    const upstream = await fetch(`${MEDIA_DOMAIN}/${key}`, {
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
      ...(method === "PUT" ? { publicUrl: `${MEDIA_DOMAIN}/${key}` } : {}),
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
