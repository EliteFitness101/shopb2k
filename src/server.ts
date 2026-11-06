import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type MediaObject = {
  body: ReadableStream;
  httpEtag: string;
  httpMetadata?: { contentType?: string; cacheControl?: string; contentDisposition?: string };
  size: number;
  writeHttpMetadata: (headers: Headers) => void;
};
type MediaObjectHead = {
  httpEtag: string;
  size: number;
  writeHttpMetadata: (headers: Headers) => void;
};
type R2BucketBinding = {
  get: (key: string, options?: { range?: { offset: number; length: number } }) => Promise<MediaObject | null>;
  head: (key: string) => Promise<MediaObjectHead | null>;
  put: (key: string, value: ArrayBuffer | ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => Promise<unknown>;
  delete: (key: string) => Promise<void>;
};
type WorkerEnv = {
  MEDIA_BUCKET?: R2BucketBinding;
  LEGACY_MEDIA_BUCKET?: R2BucketBinding;
  R2_WRITE_TOKEN?: string;
};
const MAX_MEDIA_OBJECT_BYTES = 95 * 1024 * 1024;
const MEDIA_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/webm", "video/mpeg", "video/3gpp",
  "audio/mpeg", "audio/mp4", "audio/wav",
  "image/jpeg", "image/png", "image/webp", "image/avif",
  "application/pdf", "application/json", "text/plain",
]);
type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") return false;
  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) return false;

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

function json(data: Record<string, unknown>, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function mediaKey(pathname: string): string | null {
  let key: string;
  try { key = decodeURIComponent(pathname.replace(/^\/+/, "")); } catch { return null; }
  if (key.length === 0 || key.length > 500 || key.includes("\\") || key.includes("..") ||
    /[\u0000-\u001f\u007f]/.test(key)) return null;
  const segments = key.split("/");
  const allowed = new Set(["public","chatb2k","elite","bigo_highlights","buffer","imagekit","shop","content","resofit","bigo","products","campaigns","test","archive","private"]);
  if (!allowed.has(segments[0]) || segments.length < 2 ||
    segments.some(segment => !segment || segment === "." || segment === ".." ||
      !/^[a-zA-Z0-9][a-zA-Z0-9 ._@+=,-]*$/.test(segment))) return null;
  return key;
}
function isPrivateMediaKey(key: string): boolean {
  return ["archive/","private/","elite/raw/","bigo/raw/","bigo_highlights/raw/","resofit/raw/"].some(prefix => key.startsWith(prefix));
}
function mediaCacheControl(key: string): string {
  return isPrivateMediaKey(key) ? "private, no-store" : "public, max-age=3600, stale-while-revalidate=86400";
}
function parseMediaRange(value: string | null, size: number): { offset: number; length: number; end: number } | null | "invalid" {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return "invalid";
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) return "invalid";
  end = Math.min(end, size - 1);
  return { offset: start, length: end - start + 1, end };
}

function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

async function handleUpload(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const key = mediaKey("/" + (url.searchParams.get("key") ?? ""));
  if (!key) return json({ ok: false, error: "Invalid media key." }, 400);
  const expected = env.R2_WRITE_TOKEN || "";
  const supplied = request.headers.get("authorization") || "";
  if (!expected || !constantTimeEqual(supplied, "Bearer " + expected)) return json({ ok: false, error: "Unauthorized." }, 401);
  const bucket = env.MEDIA_BUCKET;
  if (!bucket) return json({ ok: false, error: "MEDIA_BUCKET binding is unavailable." }, 503);
  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!MEDIA_TYPES.has(contentType)) return json({ ok: false, error: "Unsupported media type." }, 415);
  const size = Number(request.headers.get("content-length") || "0");
  if (!Number.isFinite(size) || size <= 0) return json({ ok: false, error: "Content-Length is required for streamed uploads." }, 411);
  if (size > MAX_MEDIA_OBJECT_BYTES) return json({ ok: false, error: "Object exceeds the 95 MiB limit.", max_bytes: MAX_MEDIA_OBJECT_BYTES }, 413);
  if (!request.body) return json({ ok: false, error: "Empty upload." }, 400);
  try {
    await bucket.put(key, request.body, { httpMetadata: { contentType, cacheControl: mediaCacheControl(key) } });
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    return json({ ok: true, key, size, media_url: isPrivateMediaKey(key) ? null : "https://media.resofit.fit/" + encodedKey });
  } catch (error) {
    console.error("ResoFit R2 upload failed", error);
    return json({ ok: false, error: "Media upload failed." }, 502);
  }
}

async function handleMedia(request: Request, env: WorkerEnv): Promise<Response> {
  const method = request.method.toUpperCase();
  if (!["GET","HEAD","PUT","DELETE"].includes(method)) {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD, PUT, DELETE", "Cache-Control": "no-store" } });
  }
  const key = mediaKey(new URL(request.url).pathname);
  if (!key) return new Response("Not Found", { status: 404 });
  const bucket = env.MEDIA_BUCKET;
  if (!bucket) return json({ ok: false, error: "MEDIA_BUCKET binding is unavailable." }, 503);

  const expected = env.R2_WRITE_TOKEN || "";
  const supplied = request.headers.get("authorization") || "";
  const needsAuth = method === "PUT" || method === "DELETE" || isPrivateMediaKey(key);
  if (needsAuth && (!expected || !constantTimeEqual(supplied, "Bearer " + expected))) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  try {
    if (method === "PUT") {
      const contentType = (request.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
      if (!MEDIA_TYPES.has(contentType)) return json({ ok: false, error: "Unsupported media type." }, 415);
      const size = Number(request.headers.get("content-length") || "0");
      if (!Number.isFinite(size) || size <= 0) return json({ ok: false, error: "Content-Length is required for streamed uploads." }, 411);
      if (size > MAX_MEDIA_OBJECT_BYTES) return json({ ok: false, error: "Object exceeds the 95 MiB limit.", max_bytes: MAX_MEDIA_OBJECT_BYTES }, 413);
      if (!request.body) return json({ ok: false, error: "Empty upload." }, 400);
      await bucket.put(key, request.body, { httpMetadata: { contentType, cacheControl: mediaCacheControl(key) } });
      return json({ ok: true, key, size, media_url: isPrivateMediaKey(key) ? null : "https://media.resofit.fit/" + key.split("/").map(encodeURIComponent).join("/") });
    }
    if (method === "DELETE") {
      await bucket.delete(key);
      return json({ ok: true, key, deleted: true });
    }

    let head = await bucket.head(key);
    let selectedBucket = bucket;
    if (!head && (key.startsWith("public/") || key.startsWith("chatb2k/")) && env.LEGACY_MEDIA_BUCKET) {
      head = await env.LEGACY_MEDIA_BUCKET.head(key);
      selectedBucket = env.LEGACY_MEDIA_BUCKET;
    }
    if (!head) return new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
    const headers = new Headers();
    head.writeHttpMetadata(headers);
    headers.set("ETag", head.httpEtag);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", headers.get("Cache-Control") || mediaCacheControl(key));
    headers.set("X-Content-Type-Options", "nosniff");
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/octet-stream");
    const ifNoneMatch = request.headers.get("if-none-match");
    if (method === "GET" && !request.headers.get("Range") && ifNoneMatch === head.httpEtag) return new Response(null, { status: 304, headers });
    if (method === "HEAD") {
      headers.set("Content-Length", String(head.size));
      return new Response(null, { status: 200, headers });
    }
    const range = parseMediaRange(request.headers.get("Range"), head.size);
    if (range === "invalid") return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + head.size, "Accept-Ranges": "bytes" } });
    const object = range
      ? await selectedBucket.get(key, { range: { offset: range.offset, length: range.length } })
      : await selectedBucket.get(key);
    if (!object) return new Response("Not Found", { status: 404 });
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", headers.get("Cache-Control") || mediaCacheControl(key));
    if (range) {
      headers.set("Content-Range", "bytes " + range.offset + "-" + range.end + "/" + head.size);
      headers.set("Content-Length", String(range.length));
      return new Response(object.body, { status: 206, headers });
    }
    headers.set("Content-Length", String(head.size));
    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    console.error("ResoFit R2 media handler failed", error);
    return json({ ok: false, error: "Media storage operation failed." }, 502);
  }
}


const ALLOWED_UPLOAD_ORIGINS = new Set([
  "https://resofit.fit",
  "https://www.resofit.fit",
  "https://dashboard.resofit.fit",
  "https://chatb2k.resofit.fit",
]);
const ALLOWED_UPLOAD_TYPES = new Set([
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

function encodeObjectKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function uploadJson(data: Record<string, unknown>, status = 200, origin?: string): Response {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
  });
  if (origin && ALLOWED_UPLOAD_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return Response.json(data, { status, headers });
}

async function handleUpload(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("origin") ?? undefined;
  if (origin && !ALLOWED_UPLOAD_ORIGINS.has(origin)) {
    return uploadJson({ ok: false, error: "Origin not allowed." }, 403);
  }

  if (request.method === "OPTIONS") {
    if (!origin) return new Response(null, { status: 204 });
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
  }
  if (request.method !== "POST") {
    return uploadJson({ ok: false, error: "POST required." }, 405, origin);
  }

  if (!env.MEDIA_BUCKET) {
    return uploadJson({ ok: false, error: "MEDIA_BUCKET binding is unavailable." }, 503, origin);
  }
  if (!env.R2_WRITE_TOKEN) {
    return uploadJson({ ok: false, error: "R2 write authorization is not configured." }, 503, origin);
  }
  const authorization = request.headers.get("authorization") ?? "";
  if (!constantTimeEqual(authorization, `Bearer ${env.R2_WRITE_TOKEN}`)) {
    return uploadJson({ ok: false, error: "Unauthorized." }, 401, origin);
  }

  const rawKey = url.searchParams.get("key") ?? "";
  const key = mediaKey(`/${rawKey}`);
  if (!key) {
    return uploadJson({ ok: false, error: "A valid public/ or chatb2k/ object key is required." }, 400, origin);
  }

  const contentType = (request.headers.get("content-type") ?? "")
    .split(";")[0].trim().toLowerCase();
  if (!ALLOWED_UPLOAD_TYPES.has(contentType)) {
    return uploadJson({ ok: false, error: "Unsupported media type." }, 415, origin);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 50 * 1024 * 1024) {
    return uploadJson({ ok: false, error: "Object exceeds the 50 MiB limit." }, 413, origin);
  }

  try {
    const body = await request.arrayBuffer();
    if (body.byteLength === 0) {
      return uploadJson({ ok: false, error: "Empty upload." }, 400, origin);
    }
    if (body.byteLength > 50 * 1024 * 1024) {
      return uploadJson({ ok: false, error: "Object exceeds the 50 MiB limit." }, 413, origin);
    }
    await env.MEDIA_BUCKET.put(key, body, { httpMetadata: { contentType } });
    const publicUrl = `https://media.resofit.fit/${encodeObjectKey(key)}`;
    return uploadJson({
      ok: true,
      primary: "Cloudflare R2 resofit-cdn",
      key,
      size: body.byteLength,
      publicUrl,
    }, 200, origin);
  } catch (error) {
    console.error("ResoFit primary R2 ingestion failed", error);
    return uploadJson({ ok: false, error: "Primary R2 storage operation failed." }, 502, origin);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: unknown) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    if (url.pathname === "/health" && ["upload.resofit.fit","media.resofit.fit","content.resofit.fit"].includes(hostname)) {
      return json({ ok: true, provider: "cloudflare_r2", bucket_binding_ready: !!env.MEDIA_BUCKET, legacy_bucket_binding_ready: !!env.LEGACY_MEDIA_BUCKET, max_upload_bytes: MAX_MEDIA_OBJECT_BYTES });
    }
    // Upload remains routed through the application/API handler; CDN hosts serve
    // reads, ranges, and authenticated media writes via the same R2 binding.
    if (hostname === "upload.resofit.fit") return handleUpload(request, env);
    if (hostname === "media.resofit.fit" || hostname === "content.resofit.fit") return handleMedia(request, env);
    if (hostname === "upload.resofit.fit") {
      const url = new URL(request.url);
      if (url.pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
        const response = json({
          status: "live",
          service: "ResoFit Primary R2 Media Upload",
          endpoint: "/api/ingest-media",
          bucketBinding: env.MEDIA_BUCKET ? "bound" : "missing",
          writeAuthorization: env.R2_WRITE_TOKEN ? "configured" : "missing",
        });
        return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
      }
      if (url.pathname === "/api/ingest-media") return handleUpload(request, env);
      return json({ ok: false, error: "Not Found" }, 404);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
