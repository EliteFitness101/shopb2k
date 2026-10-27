import { describe, expect, test } from "bun:test";
import worker from "./r2-media-worker";

const env = {
  R2_ACCESS_KEY_ID: "test-access-key",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
  R2_BUCKET_NAME: "xbang-media-canonical",
  R2_ENDPOINT: "https://e8325f28fa48ca43bdfa667c062f272f.r2.cloudflarestorage.com",
  R2_REGION: "auto",
  R2_WRITE_TOKEN: "test-write-token",
};

describe("cross-account R2 media worker", () => {
  test("uploads, serves ranged downloads, and supports HEAD without exposing credentials", async () => {
    const originalFetch = globalThis.fetch;
    const upstreamCalls: Array<{ url: URL; init: RequestInit }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === "string" || input instanceof URL ? input.toString() : input.url);
      upstreamCalls.push({ url, init: init ?? {} });
      if (init?.method === "PUT") return new Response(null, { status: 200, headers: { ETag: '"upload-etag"' } });
      if (init?.method === "HEAD") return new Response(null, { status: 200, headers: { "Content-Length": "6", "Content-Type": "video/mp4", ETag: '"download-etag"' } });
      if (init?.headers && new Headers(init.headers).has("Range")) {
        return new Response("012", { status: 206, headers: { "Content-Length": "3", "Content-Range": "bytes 0-2/6", "Content-Type": "video/mp4", ETag: '"download-etag"' } });
      }
      return new Response("012345", { status: 200, headers: { "Content-Length": "6", "Content-Type": "video/mp4", ETag: '"download-etag"' } });
    }) as typeof fetch;

    try {
      const uploadResponse = await worker.fetch(
        new Request("https://upload.resofit.fit/?key=chatb2k/test.mp4", {
          method: "POST",
          headers: { Authorization: "Bearer test-write-token", "Content-Type": "video/mp4", Origin: "https://shop.resofit.fit" },
          body: new Uint8Array([0, 1, 2, 3, 4, 5]),
        }),
        env,
      );
      expect(uploadResponse.status).toBe(200);
      expect(await uploadResponse.json()).toMatchObject({ ok: true, key: "chatb2k/test.mp4", size: 6, media_url: "https://media.resofit.fit/chatb2k/test.mp4" });
      expect(upstreamCalls[0].init.method).toBe("PUT");
      expect(upstreamCalls[0].url.hostname).toBe(new URL(env.R2_ENDPOINT).hostname);
      expect(upstreamCalls[0].url.pathname).toBe("/xbang-media-canonical/chatb2k/test.mp4");
      expect(new Headers(upstreamCalls[0].init.headers).get("Authorization")).toContain("AWS4-HMAC-SHA256");

      const rangeResponse = await worker.fetch(
        new Request("https://media.resofit.fit/chatb2k/test.mp4", { headers: { Range: "bytes=0-2" } }),
        env,
      );
      expect(rangeResponse.status).toBe(206);
      expect(rangeResponse.headers.get("Content-Range")).toBe("bytes 0-2/6");
      expect(await rangeResponse.text()).toBe("012");

      const headResponse = await worker.fetch(new Request("https://media.resofit.fit/chatb2k/test.mp4", { method: "HEAD" }), env);
      expect(headResponse.status).toBe(200);
      expect(headResponse.headers.get("Content-Length")).toBe("6");
      expect(await headResponse.text()).toBe("");

      const authFailure = await worker.fetch(
        new Request("https://upload.resofit.fit/?key=chatb2k/test.mp4", { method: "POST", headers: { "Content-Type": "video/mp4" }, body: "nope" }),
        env,
      );
      expect(authFailure.status).toBe(401);
      expect(JSON.stringify(await authFailure.json())).not.toContain(env.R2_SECRET_ACCESS_KEY);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
