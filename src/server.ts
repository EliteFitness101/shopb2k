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
type R2BucketBinding = {
  get: (key: string) => Promise<MediaObject | null>;
  put: (key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  delete: (key: string) => Promise<void>;
};
type WorkerEnv = {
  MEDIA_BUCKET?: R2BucketBinding;
  R2_WRITE_TOKEN?: string;
};
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
  try {
    // Decode URL-escaped spaces while preserving "/" as the object-key separator.
    // Malformed percent escapes are rejected.
    key = decodeURIComponent(pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }

  if (
    key.length === 0 ||
    key.length > 500 ||
    key.includes("\\") ||
    // eslint-disable-next-line no-control-regex -- Reject control characters in untrusted media keys.
    /[\u0000-\u001f\u007f]/.test(key) ||
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

  // Public delivery is read-only. Writes and deletes require the same secret as
  // Vercel's R2_WRITE_TOKEN; configure it as a Cloudflare Worker secret too.
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
    return new Response(method === "HEAD" ? null : object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("ResoFit R2 media handler failed", error);
    return json({ ok: false, error: "Media storage operation failed." }, 502);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: unknown) {
    const hostname = new URL(request.url).hostname.toLowerCase();
    // Keep media handling isolated to the CDN hostname; all app/API routes retain
    // their existing TanStack Start request dispatcher.
    if (hostname === "media.resofit.fit" || hostname === "content.resofit.fit") return handleMedia(request, env);

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
