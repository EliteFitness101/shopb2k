type WorkerEnv = {
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  R2_REGION?: string;
  R2_WRITE_TOKEN?: string;
};

const MAX_OBJECT_BYTES = 50 * 1024 * 1024;
const MEDIA_TYPES = new Set([
  "video/mp4", "video/quicktime", "image/jpeg", "image/png", "image/webp",
  "audio/mpeg", "audio/mp4", "audio/wav",
]);
const ORIGINS = new Set([
  "https://xbang.lovable.app", "https://xbang.vercel.app",
  "https://resofit.fit", "https://www.resofit.fit", "https://shop.resofit.fit",
  "https://store.resofit.fit", "https://chatb2k.resofit.fit", "https://media.resofit.fit",
]);

const enc = new TextEncoder();
const json = (data: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });

function cors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("Origin");
  if (origin && ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "false");
    headers.set("Access-Control-Expose-Headers", "Accept-Ranges, Content-Length, Content-Range, ETag");
    headers.append("Vary", "Origin");
  }
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function options(request: Request, methods: string): Response {
  const origin = request.headers.get("Origin");
  if (origin && !ORIGINS.has(origin)) return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  const headers = new Headers({
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Range, If-None-Match, If-Modified-Since",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(null, { status: 204, headers });
}

function parseKey(raw: string): string | null {
  let key: string;
  try { key = decodeURIComponent(raw.replace(/^\/+/, "")); } catch { return null; }
  // Reject ASCII control bytes in untrusted object keys.
  // eslint-disable-next-line no-control-regex
  if (!key || key.length > 500 || key.includes("\\") || key.includes("..") || /[\u0000-\u001f\u007f]/.test(key)) return null;
  const parts = key.split("/");
  if (!["public", "chatb2k"].includes(parts[0]) || parts.length < 2) return null;
  if (parts.some((part) => !part || part === "." || part === ".." || !/^[a-zA-Z0-9][a-zA-Z0-9 ._-]*$/.test(part))) return null;
  return key;
}

function equalSecret(a: string, b: string): boolean {
  const left = enc.encode(a), right = enc.encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

function config(env: WorkerEnv) {
  const { R2_ACCESS_KEY_ID: accessKey, R2_SECRET_ACCESS_KEY: secretKey } = env;
  const bucket = env.R2_BUCKET_NAME?.trim();
  const endpointText = env.R2_ENDPOINT?.trim();
  if (!accessKey?.trim() || !secretKey || !bucket || !endpointText) throw new Error("R2 runtime configuration is incomplete");
  const endpoint = new URL(endpointText);
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".r2.cloudflarestorage.com") || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error("R2_ENDPOINT must be an HTTPS Cloudflare R2 S3 endpoint");
  }
  return { accessKey: accessKey.trim(), secretKey, bucket, endpoint, region: env.R2_REGION?.trim() || "auto" };
}

function hex(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(data: BufferSource): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", data));
}
async function hmac(key: BufferSource, value: string): Promise<Uint8Array> {
  const imported = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", imported, enc.encode(value)));
}
function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

async function r2Fetch(request: Request, env: WorkerEnv, method: "GET" | "HEAD" | "PUT" | "DELETE", key: string, body?: ArrayBuffer, contentType?: string): Promise<Response> {
  const c = config(env);
  const encodedKey = key.split("/").map(awsEncode).join("/");
  const endpointPrefix = c.endpoint.pathname.replace(/\/+$/, "");
  const target = new URL(c.endpoint.origin);
  target.pathname = endpointPrefix + "/" + awsEncode(c.bucket) + "/" + encodedKey;
  const payloadHash = await sha256(body ?? new ArrayBuffer(0));
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amzDate.slice(0, 8);
  const range = request.headers.get("Range");
  const headersToSign: Record<string, string> = {
    host: target.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headersToSign["content-type"] = contentType;
  if (range) headersToSign.range = range;
  const names = Object.keys(headersToSign).sort();
  const canonicalHeaders = names.map(name => name + ":" + headersToSign[name].trim().replace(/\s+/g, " ") + "\n").join("");
  const signedHeaders = names.join(";");
  const canonicalRequest = [method, target.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = day + "/" + c.region + "/s3/aws4_request";
  const stringToSign = "AWS4-HMAC-SHA256\n" + amzDate + "\n" + scope + "\n" + await sha256(enc.encode(canonicalRequest));
  const dateKey = await hmac(enc.encode("AWS4" + c.secretKey), day);
  const regionKey = await hmac(dateKey, c.region);
  const serviceKey = await hmac(regionKey, "s3");
  const signingKey = await hmac(serviceKey, "aws4_request");
  const signature = hex(await hmac(signingKey, stringToSign));
  const headers = new Headers({
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: "AWS4-HMAC-SHA256 Credential=" + c.accessKey + "/" + scope + ", SignedHeaders=" + signedHeaders + ", Signature=" + signature,
  });
  if (contentType) headers.set("Content-Type", contentType);
  if (range) headers.set("Range", range);
  return fetch(target.toString(), { method, headers, body: method === "PUT" ? body : undefined, redirect: "manual" });
}

function auth(request: Request, env: WorkerEnv): boolean {
  const token = env.R2_WRITE_TOKEN;
  return !!token && equalSecret(request.headers.get("Authorization") ?? "", "Bearer " + token);
}

async function upload(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method === "OPTIONS") return options(request, "POST, OPTIONS");
  if (request.method !== "POST") return cors(request, new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST, OPTIONS", "Cache-Control": "no-store" } }));
  if (!auth(request, env)) return cors(request, json({ ok: false, error: "Unauthorized" }, 401));
  const key = parseKey(new URL(request.url).searchParams.get("key") ?? "");
  if (!key) return cors(request, json({ ok: false, error: "Invalid media key" }, 400));
  const type = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (!MEDIA_TYPES.has(type)) return cors(request, json({ ok: false, error: "Unsupported media type" }, 415));
  if (Number(request.headers.get("Content-Length") ?? "0") > MAX_OBJECT_BYTES) return cors(request, json({ ok: false, error: "Object exceeds 50 MiB" }, 413));
  try {
    const body = await request.arrayBuffer();
    if (!body.byteLength) return cors(request, json({ ok: false, error: "Empty upload" }, 400));
    if (body.byteLength > MAX_OBJECT_BYTES) return cors(request, json({ ok: false, error: "Object exceeds 50 MiB" }, 413));
    const result = await r2Fetch(request, env, "PUT", key, body, type);
    if (!result.ok) {
      console.error("R2 upload upstream status", result.status);
      return cors(request, json({ ok: false, error: "R2 upload failed" }, 502));
    }
    return cors(request, json({ ok: true, key, size: body.byteLength, media_url: "https://media.resofit.fit/" + key.split("/").map(encodeURIComponent).join("/") }));
  } catch (error) {
    console.error("R2 upload failed", error);
    return cors(request, json({ ok: false, error: "R2 storage unavailable or misconfigured" }, 502));
  }
}

async function media(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method === "OPTIONS") return options(request, "GET, HEAD, PUT, DELETE, OPTIONS");
  const method = request.method.toUpperCase();
  if (!["GET", "HEAD", "PUT", "DELETE"].includes(method)) return cors(request, new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD, PUT, DELETE, OPTIONS" } }));
  const key = parseKey(new URL(request.url).pathname);
  if (!key) return cors(request, new Response("Not Found", { status: 404 }));
  if ((method === "PUT" || method === "DELETE") && !auth(request, env)) return cors(request, json({ ok: false, error: "Unauthorized" }, 401));
  try {
    let body: ArrayBuffer | undefined;
    let type: string | undefined;
    if (method === "PUT") {
      type = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
      if (!MEDIA_TYPES.has(type)) return cors(request, json({ ok: false, error: "Unsupported media type" }, 415));
      if (Number(request.headers.get("Content-Length") ?? "0") > MAX_OBJECT_BYTES) return cors(request, json({ ok: false, error: "Object exceeds 50 MiB" }, 413));
      body = await request.arrayBuffer();
      if (!body.byteLength || body.byteLength > MAX_OBJECT_BYTES) return cors(request, json({ ok: false, error: "Invalid upload size" }, body.byteLength ? 413 : 400));
    }
    const upstream = await r2Fetch(request, env, method as "GET" | "HEAD" | "PUT" | "DELETE", key, body, type);
    if (upstream.status === 404) return cors(request, new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } }));
    if (!upstream.ok && upstream.status !== 206 && upstream.status !== 304 && upstream.status !== 416) {
      console.error("R2 upstream status", upstream.status);
      return cors(request, json({ ok: false, error: "R2 request failed" }, 502));
    }
    if (method === "PUT" || method === "DELETE") return cors(request, json({ ok: true, key, ...(method === "PUT" ? { size: body?.byteLength } : { deleted: true }) }));
    const headers = new Headers(upstream.headers);
    headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    headers.set("Accept-Ranges", "bytes");
    return cors(request, new Response(method === "HEAD" ? null : upstream.body, { status: upstream.status, statusText: upstream.statusText, headers }));
  } catch (error) {
    console.error("R2 media request failed", error);
    return cors(request, json({ ok: false, error: "R2 storage unavailable or misconfigured" }, 502));
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const hostname = new URL(request.url).hostname.toLowerCase();
    if (hostname === "upload.resofit.fit") return upload(request, env);
    if (hostname === "media.resofit.fit" || hostname === "content.resofit.fit") return media(request, env);
    return new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
  },
};
