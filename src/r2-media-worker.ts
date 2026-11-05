type R2ObjectBody = {
  body: ReadableStream<Uint8Array>;
  httpEtag: string;
  size: number;
  writeHttpMetadata: (headers: Headers) => void;
};
type R2ObjectHead = {
  httpEtag: string;
  size: number;
  writeHttpMetadata: (headers: Headers) => void;
};
type R2Bucket = {
  get: (key: string, options?: { range?: { offset: number; length: number } }) => Promise<R2ObjectBody | null>;
  head: (key: string) => Promise<R2ObjectHead | null>;
  put: (key: string, value: ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => Promise<{ etag?: string; size?: number }>;
  delete: (key: string) => Promise<void>;
};
type Env = {
  MEDIA_BUCKET?: R2Bucket;
  LEGACY_MEDIA_BUCKET?: R2Bucket;
  R2_WRITE_TOKEN?: string;
};

const MAX_OBJECT_BYTES = 95 * 1024 * 1024;
const MEDIA_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/webm", "video/mpeg",
  "audio/mpeg", "audio/mp4", "audio/wav",
  "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
  "application/pdf", "application/json", "text/plain",
]);
const ORIGINS = new Set([
  "https://elite.resofit.fit", "https://resofit.fit", "https://www.resofit.fit",
  "https://shop.resofit.fit", "https://store.resofit.fit",
  "https://chatb2k.resofit.fit", "https://media.resofit.fit",
  "https://content.resofit.fit", "https://upload.resofit.fit",
]);
const PUBLIC_PREFIXES = new Set(["public", "chatb2k", "elite", "bigo_highlights", "buffer", "imagekit", "shop", "content", "resofit", "bigo", "products", "campaigns", "test"]);
const PRIVATE_PREFIXES = new Set(["archive", "private"]);

function json(data: Record<string, unknown>, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
  });
}

function parseKey(raw: string): string | null {
  let key: string;
  try { key = decodeURIComponent(raw.replace(/^\/+/, "")); } catch { return null; }
  // eslint-disable-next-line no-control-regex
  if (!key || key.length > 500 || key.includes("\\") || key.includes("..") || /[\u0000-\u001f\u007f]/.test(key)) return null;
  const parts = key.split("/");
  if (!PUBLIC_PREFIXES.has(parts[0]) && !PRIVATE_PREFIXES.has(parts[0])) return null;
  if (parts.length < 2 || parts.some(part => !part || part === "." || part === ".." || !/^[a-zA-Z0-9][a-zA-Z0-9 ._-]*$/.test(part))) return null;
  return key;
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

function authorized(request: Request, env: Env): boolean {
  const expected = env.R2_WRITE_TOKEN || "";
  const supplied = request.headers.get("authorization") || "";
  return !!expected && constantTimeEqual(supplied, "Bearer " + expected);
}

function isPrivateKey(key: string): boolean {
  return PRIVATE_PREFIXES.has(key.split("/")[0]) || key.startsWith("elite/raw/") || key.startsWith("bigo/raw/") || key.startsWith("bigo_highlights/raw/") || key.startsWith("resofit/raw/");
}

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("Origin");
  if (origin && ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "false");
    headers.set("Access-Control-Expose-Headers", "Accept-Ranges, Content-Length, Content-Range, ETag, Last-Modified");
    headers.append("Vary", "Origin");
  }
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function options(request: Request): Response {
  const origin = request.headers.get("Origin");
  if (origin && !ORIGINS.has(origin)) return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, DELETE, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Range, If-None-Match, If-Modified-Since",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
  });
  if (origin) { headers.set("Access-Control-Allow-Origin", origin); headers.set("Vary", "Origin"); }
  return new Response(null, { status: 204, headers });
}

function cacheControlFor(key: string): string {
  if (isPrivateKey(key)) return "private, no-store";
  return "public, max-age=3600, stale-while-revalidate=86400";
}

function metadataHeaders(object: R2ObjectHead | R2ObjectBody, key: string): Headers {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", headers.get("Cache-Control") || cacheControlFor(key));
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/octet-stream");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function parseRange(value: string | null, size: number): { offset: number; length: number; end: number } | null | "invalid" {
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

async function getFromBuckets(key: string, range?: { offset: number; length: number }, env?: Env) {
  const primary = env?.MEDIA_BUCKET;
  if (!primary) throw new Error("MEDIA_BUCKET binding unavailable");
  const first = range ? await primary.get(key, { range }) : await primary.get(key);
  if (first) return { object: first, bucket: primary };
  if (key.startsWith("public/") || key.startsWith("chatb2k/")) {
    const legacy = env?.LEGACY_MEDIA_BUCKET;
    if (legacy) {
      const fallback = range ? await legacy.get(key, { range }) : await legacy.get(key);
      if (fallback) return { object: fallback, bucket: legacy };
    }
  }
  return null;
}

async function handleRead(request: Request, env: Env, key: string): Promise<Response> {
  if (isPrivateKey(key) && !authorized(request, env)) return json({ ok: false, error: "Unauthorized." }, 401);
  const bucket = env.MEDIA_BUCKET;
  if (!bucket) return json({ ok: false, error: "MEDIA_BUCKET binding unavailable." }, 503);
  const head = await bucket.head(key) || ((key.startsWith("public/") || key.startsWith("chatb2k/")) && env.LEGACY_MEDIA_BUCKET ? await env.LEGACY_MEDIA_BUCKET.head(key) : null);
  if (!head) return new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const range = request.method === "GET" ? parseRange(request.headers.get("Range"), head.size) : null;
  if (range === "invalid") return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + head.size, "Accept-Ranges": "bytes" } });
  if (request.method === "HEAD") return new Response(null, { status: 200, headers: metadataHeaders(head, key) });
  const found = await getFromBuckets(key, range || undefined, env);
  if (!found) return new Response("Not Found", { status: 404 });
  const headers = metadataHeaders(found.object, key);
  if (range) {
    headers.set("Content-Range", "bytes " + range.offset + "-" + range.end + "/" + head.size);
    headers.set("Content-Length", String(range.length));
    return new Response(found.object.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(head.size));
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch && ifNoneMatch === head.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(found.object.body, { status: 200, headers });
}

async function handleWrite(request: Request, env: Env, key: string): Promise<Response> {
  if (!authorized(request, env)) return json({ ok: false, error: "Unauthorized." }, 401);
  const bucket = env.MEDIA_BUCKET;
  if (!bucket) return json({ ok: false, error: "MEDIA_BUCKET binding unavailable." }, 503);
  if (request.method === "DELETE") {
    await bucket.delete(key);
    return json({ ok: true, key, deleted: true });
  }
  if (request.method !== "PUT" && request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "PUT, DELETE, POST" } });
  const contentType = (request.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
  if (!MEDIA_TYPES.has(contentType)) return json({ ok: false, error: "Unsupported media type." }, 415);
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (!Number.isFinite(declaredLength) || declaredLength <= 0) return json({ ok: false, error: "Content-Length is required for streamed uploads." }, 411);
  if (declaredLength > MAX_OBJECT_BYTES) return json({ ok: false, error: "Object exceeds the 95 MiB upload limit.", max_bytes: MAX_OBJECT_BYTES }, 413);
  if (!request.body) return json({ ok: false, error: "Empty upload." }, 400);
  const cacheControl = request.headers.get("cache-control") || cacheControlFor(key);
  try {
    const stored = await bucket.put(key, request.body, { httpMetadata: { contentType, cacheControl } });
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    return json({ ok: true, key, bytes: declaredLength, etag: stored?.etag || null, media_url: "https://media.resofit.fit/" + encodedKey });
  } catch (error) {
    console.error("R2 media write failed", error);
    return json({ ok: false, error: String(error).slice(0, 300) }, 500);
  }
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const key = parseKey(url.searchParams.get("key") || "");
  if (!key) return json({ ok: false, error: "Invalid media key." }, 400);
  return handleWrite(new Request(request.url, { method: "PUT", headers: request.headers, body: request.body }), env, key);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return options(request);
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return withCors(request, json({ ok: true, provider: "cloudflare_r2", bucket_binding_ready: !!env.MEDIA_BUCKET, legacy_bucket_binding_ready: !!env.LEGACY_MEDIA_BUCKET, max_upload_bytes: MAX_OBJECT_BYTES }));
    }
    if (url.hostname === "upload.resofit.fit" || url.pathname === "/upload") {
      return withCors(request, await handleUpload(request, env));
    }
    const key = parseKey(url.pathname);
    if (!key) return withCors(request, new Response("Not Found", { status: 404 }));
    if (request.method === "GET" || request.method === "HEAD") return withCors(request, await handleRead(request, env, key));
    if (request.method === "PUT" || request.method === "DELETE") return withCors(request, await handleWrite(request, env, key));
    return withCors(request, new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD, PUT, DELETE, OPTIONS" } }));
  },
};
