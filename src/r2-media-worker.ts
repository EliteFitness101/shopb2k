type MediaObject = {
  body: ReadableStream;
  httpEtag: string;
  writeHttpMetadata: (headers: Headers) => void;
};

type R2BucketBinding = {
  get: (key: string) => Promise<MediaObject | null>;
  put: (key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  delete: (key: string) => Promise<void>;
};

type WorkerEnv = {
  MEDIA_BUCKET?: R2BucketBinding;
  R2_WRITE_TOKEN?: string;
};

function json(data: Record<string, unknown>, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function mediaKey(pathname: string): string | null {
  let key: string;
  try {
    key = decodeURIComponent(pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
  if (
    key.length === 0 ||
    key.length > 500 ||
    key.includes("\\") ||
    [...key].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    }) ||
    key.includes("..")
  ) return null;

  const segments = key.split("/");
  if (
    !["public", "chatb2k"].includes(segments[0]) ||
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
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST", "Cache-Control": "no-store" },
    });
  }

  const url = new URL(request.url);
  const key = mediaKey(`/${url.searchParams.get("key") ?? ""}`);
  if (!key) return json({ ok: false, error: "Invalid media key." }, 400);

  const expected = env.R2_WRITE_TOKEN;
  const supplied = request.headers.get("authorization") ?? "";
  if (!expected || !constantTimeEqual(supplied, `Bearer ${expected}`)) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  const bucket = env.MEDIA_BUCKET;
  if (!bucket) return json({ ok: false, error: "MEDIA_BUCKET binding is unavailable." }, 503);

  const contentType = (request.headers.get("content-type") ?? "")
    .split(";")[0].trim().toLowerCase();
  const allowedTypes = new Set([
    "video/mp4", "video/quicktime", "image/jpeg", "image/png", "image/webp",
    "audio/mpeg", "audio/mp4", "audio/wav",
  ]);
  if (!allowedTypes.has(contentType)) {
    return json({ ok: false, error: "Unsupported media type." }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 50 * 1024 * 1024) {
    return json({ ok: false, error: "Object exceeds the 50 MiB limit." }, 413);
  }

  try {
    const body = await request.arrayBuffer();
    if (body.byteLength === 0) return json({ ok: false, error: "Empty upload." }, 400);
    if (body.byteLength > 50 * 1024 * 1024) {
      return json({ ok: false, error: "Object exceeds the 50 MiB limit." }, 413);
    }
    await bucket.put(key, body, { httpMetadata: { contentType } });
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    return json({
      ok: true,
      key,
      size: body.byteLength,
      media_url: `https://media.resofit.fit/${encodedKey}`,
    });
  } catch (error) {
    console.error("ResoFit R2 upload failed", error);
    return json({ ok: false, error: "Media upload failed." }, 502);
  }
}

async function handleMedia(request: Request, env: WorkerEnv): Promise<Response> {
  const method = request.method.toUpperCase();
  if (!["GET", "HEAD", "PUT", "DELETE"].includes(method)) {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD, PUT, DELETE", "Cache-Control": "no-store" },
    });
  }

  const key = mediaKey(new URL(request.url).pathname);
  if (!key) return new Response("Not Found", { status: 404 });
  const bucket = env.MEDIA_BUCKET;
  if (!bucket) return json({ ok: false, error: "MEDIA_BUCKET binding is unavailable." }, 503);

  if (method === "PUT" || method === "DELETE") {
    const expected = env.R2_WRITE_TOKEN;
    const supplied = request.headers.get("authorization") ?? "";
    if (!expected || !constantTimeEqual(supplied, `Bearer ${expected}`)) {
      return json({ ok: false, error: "Unauthorized." }, 401);
    }
  }

  try {
    if (method === "PUT") {
      const contentType = (request.headers.get("content-type") ?? "application/octet-stream")
        .split(";")[0].trim().toLowerCase();
      const declaredLength = Number(request.headers.get("content-length") ?? "0");
      if (declaredLength > 50 * 1024 * 1024) {
        return json({ ok: false, error: "Object exceeds the 50 MiB limit." }, 413);
      }
      const body = await request.arrayBuffer();
      if (body.byteLength === 0) return json({ ok: false, error: "Empty upload." }, 400);
      if (body.byteLength > 50 * 1024 * 1024) {
        return json({ ok: false, error: "Object exceeds the 50 MiB limit." }, 413);
      }
      await bucket.put(key, body, { httpMetadata: { contentType } });
      return json({ ok: true, key, size: body.byteLength });
    }
    if (method === "DELETE") {
      await bucket.delete(key);
      return json({ ok: true, key, deleted: true });
    }

    const object = await bucket.get(key);
    if (!object) return new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
    const headers = new Headers({
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
      ETag: object.httpEtag,
    });
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    return new Response(method === "HEAD" ? null : object.body, { status: 200, headers });
  } catch (error) {
    console.error("ResoFit R2 media handler failed", error);
    return json({ ok: false, error: "Media storage operation failed." }, 502);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const hostname = new URL(request.url).hostname.toLowerCase();
    // workers.dev is the authenticated upload fallback when the custom domain is challenged at the zone edge.
    // Never expose public reads on workers.dev; only the existing token-protected POST upload handler is allowed.
    if (hostname === "upload.resofit.fit") return handleUpload(request, env);
    if (hostname.endsWith(".workers.dev")) return handleUpload(request, env);
    if (hostname === "media.resofit.fit" || hostname === "content.resofit.fit") {
      return handleMedia(request, env);
    }
    return new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
  },
};
