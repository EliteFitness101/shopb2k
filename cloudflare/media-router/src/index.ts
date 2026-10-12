export interface Env {
  MEDIA_BUCKET: R2Bucket;
  /** HTTPS custom origin hostname for image resizing, e.g. a separate R2 custom domain under resofit.fit. Never set this to media.resofit.fit or an r2.dev URL. */
  MEDIA_TRANSFORM_ORIGIN?: string;
  /** Comma-separated public object prefixes. Private archive prefixes are always denied. */
  MEDIA_PUBLIC_PREFIXES?: string;
  /** Comma-separated allowed browser origins; defaults to public CDN access (*). */
  MEDIA_CORS_ORIGINS?: string;
  MEDIA_CACHE_MAX_AGE?: string;
}

const DEFAULT_PUBLIC_PREFIXES = [
  "public/",
  "assets/",
  "products/",
  "campaigns/",
  "generated/",
  "buffer/assets/",
];
const ALWAYS_PRIVATE_PREFIXES = [
  "raw-captures/",
  "processed/",
  "metadata/",
  "logs/",
  "private/",
  "buffer/assets/bigo_highlights/",
];
const MAX_TRANSFORM_DIMENSION = 2400;
const DEFAULT_CACHE_MAX_AGE = 3600;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function corsHeaders(request: Request, env: Env): Headers {
  const requestOrigin = request.headers.get("origin");
  const allowed = (env.MEDIA_CORS_ORIGINS ?? "*").split(",").map((value) => value.trim()).filter(Boolean);
  const origin = allowed.includes("*") ? "*" : requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : "null";
  const headers = new Headers({
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "Range, If-None-Match, If-Modified-Since, Content-Type",
    "access-control-expose-headers": "Accept-Ranges, Content-Length, Content-Range, ETag",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "vary": "Origin",
  });
  return headers;
}

function cleanKey(pathname: string): string | null {
  let raw: string;
  try { raw = decodeURIComponent(pathname.replace(/^\/+/, "")); } catch { return null; }
  if (!raw || raw.length > 1024 || raw.includes("\\") || raw.includes("\0")) return null;
  const segments = raw.split("/");
  if (segments.some((part) => !part || part === "." || part === ".." || part.startsWith("."))) return null;
  return raw;
}

function isPublicKey(key: string, env: Env): boolean {
  const normalized = key.toLowerCase();
  if (ALWAYS_PRIVATE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
  if (normalized.split("/").some((segment) => ["raw-captures", "processed", "metadata", "logs", "private"].includes(segment))) return false;
  const prefixes = (env.MEDIA_PUBLIC_PREFIXES ?? DEFAULT_PUBLIC_PREFIXES.join(","))
    .split(",").map((value) => value.trim()).filter(Boolean);
  return prefixes.some((prefix) => key.startsWith(prefix));
}

function intParam(url: URL, name: string, min: number, max: number): number | null | undefined {
  const value = url.searchParams.get(name);
  if (value === null) return undefined;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function transformOptions(url: URL): { options: Record<string, unknown> | null; error?: string } {
  const width = intParam(url, "w", 1, MAX_TRANSFORM_DIMENSION);
  const height = intParam(url, "h", 1, MAX_TRANSFORM_DIMENSION);
  const quality = intParam(url, "q", 1, 100);
  if (width === null || height === null || quality === null) return { options: null, error: "Invalid transform dimension or quality" };
  const fit = url.searchParams.get("fit") ?? "scale-down";
  if (!["scale-down", "contain", "cover", "crop", "pad"].includes(fit)) return { options: null, error: "Invalid fit mode" };
  const format = url.searchParams.get("format") ?? "auto";
  if (!["auto", "avif", "webp", "jpeg", "png"].includes(format)) return { options: null, error: "Invalid output format" };
  const requested = width !== undefined || height !== undefined || quality !== undefined || url.searchParams.has("format") || url.searchParams.has("fit");
  if (!requested) return { options: null };
  return {
    options: {
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      quality: quality ?? 82,
      fit,
      format,
    },
  };
}

function safeTransformOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
      || host === "media.resofit.fit" || host.endsWith(".r2.dev")
      || !(host === "resofit.fit" || host.endsWith(".resofit.fit"))) return null;
    return url;
  } catch { return null; }
}

function publicCacheControl(env: Env): string {
  const configured = Number(env.MEDIA_CACHE_MAX_AGE);
  const maxAge = Number.isFinite(configured) && configured >= 0 && configured <= 86400
    ? Math.floor(configured) : DEFAULT_CACHE_MAX_AGE;
  return `public, max-age=${maxAge}, s-maxage=86400, stale-while-revalidate=604800`;
}

function objectHeaders(object: R2Object, env: Env, cors: Headers): Headers {
  const headers = new Headers(cors);
  headers.set("cache-control", publicCacheControl(env));
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("content-length", String(object.size));
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("last-modified", object.uploaded.toUTCString());
  headers.set("x-resofit-media-source", "cloudflare-r2");
  return headers;
}

function parseRange(value: string, size: number): { offset: number; length: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2]) || size <= 0) return null;
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return null;
  end = Math.min(end, size - 1);
  return { offset: start, length: end - start + 1, end };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method not allowed" }, 405);

    if (url.pathname === "/healthz") {
      return json({
        status: "configuration_present",
        bucket_binding_present: Boolean(env.MEDIA_BUCKET),
        transform_origin_configured: Boolean(safeTransformOrigin(env.MEDIA_TRANSFORM_ORIGIN)),
        transform_note: "Live object read and custom-domain health probes are required before production sign-off",
      });
    }

    const key = cleanKey(url.pathname);
    if (!key) return json({ error: "Invalid media key" }, 400);
    if (!isPublicKey(key, env)) return json({ error: "Media key is not in the public delivery allowlist" }, 404);
    if (!env.MEDIA_BUCKET) return json({ error: "R2 bucket binding is unavailable" }, 503);

    const transforms = transformOptions(url);
    if (transforms.error) return json({ error: transforms.error }, 400);
    const hasTransform = Boolean(transforms.options);
    const origin = hasTransform ? safeTransformOrigin(env.MEDIA_TRANSFORM_ORIGIN) : null;
    if (hasTransform && !origin) return json({ error: "Image transform origin is not configured with a verified HTTPS custom domain" }, 503);

    if (hasTransform && origin) {
      const originUrl = new URL(key.split("/").map(encodeURIComponent).join("/"), origin.toString().replace(/\/$/, "") + "/");
      for (const [name, value] of url.searchParams) {
        if (["w", "h", "q", "fit", "format"].includes(name)) originUrl.searchParams.set(name, value);
      }
      try {
        const init = {
          method: request.method,
          headers: { "accept": request.headers.get("accept") ?? "image/avif,image/webp,image/*,*/*;q=0.8" },
          cf: { image: transforms.options },
        } as RequestInit & { cf: { image: Record<string, unknown> } };
        const upstream = await fetch(originUrl, init);
        if (!upstream.ok) return json({ error: "Media transform origin returned an error", status: upstream.status }, 502);
        const headers = new Headers(upstream.headers);
        cors.forEach((value, name) => headers.set(name, value));
        headers.set("cache-control", publicCacheControl(env));
        headers.set("x-content-type-options", "nosniff");
        headers.set("x-resofit-media-source", "cloudflare-r2-transform");
        return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
      } catch {
        return json({ error: "Media transform failed" }, 502);
      }
    }

    const rangeHeader = request.headers.get("range");
    let head: R2Object | null;
    try { head = await env.MEDIA_BUCKET.head(key); } catch { return json({ error: "R2 metadata lookup failed" }, 502); }
    if (!head) return json({ error: "Media not found" }, 404);

    if (request.headers.get("if-none-match") === head.httpEtag) {
      const headers = objectHeaders(head, env, cors);
      return new Response(null, { status: 304, headers });
    }

    if (rangeHeader) {
      const range = parseRange(rangeHeader, head.size);
      if (!range) {
        const headers = objectHeaders(head, env, cors);
        headers.set("content-range", `bytes */${head.size}`);
        return new Response(null, { status: 416, headers });
      }
      try {
        const object = await env.MEDIA_BUCKET.get(key, { range: { offset: range.offset, length: range.length } });
        if (!object) return json({ error: "Media not found" }, 404);
        const headers = objectHeaders(object, env, cors);
        headers.set("content-length", String(range.length));
        headers.set("content-range", `bytes ${range.offset}-${range.end}/${head.size}`);
        return new Response(request.method === "HEAD" ? null : object.body, { status: 206, headers });
      } catch { return json({ error: "R2 range read failed" }, 502); }
    }

    const cache = caches.default;
    if (request.method === "GET") {
      const cached = await cache.match(request);
      if (cached) {
        cors.forEach((value, name) => cached.headers.set(name, value));
        return cached;
      }
    }

    try {
      const object = await env.MEDIA_BUCKET.get(key);
      if (!object) return json({ error: "Media not found" }, 404);
      const headers = objectHeaders(object, env, cors);
      const response = new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
      if (request.method === "GET" && response.status === 200) ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    } catch { return json({ error: "R2 object read failed" }, 502); }
  },
};
