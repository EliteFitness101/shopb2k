import { describe, expect, test } from "bun:test";
import worker from "./r2-media-worker";

function createBucket() {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string; etag: string }>();
  const metadata = (item: { bytes: Uint8Array; contentType: string; etag: string }) => ({
    httpEtag: item.etag,
    size: item.bytes.length,
    writeHttpMetadata(headers: Headers) {
      headers.set("Content-Type", item.contentType);
    },
  });
  return {
    objects,
    async put(key: string, value: ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string } }) {
      const chunks: Uint8Array[] = [];
      const reader = value.getReader();
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(chunks.reduce((n, part) => n + part.length, 0));
      let offset = 0;
      for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
      const item = { bytes, contentType: options?.httpMetadata?.contentType || "application/octet-stream", etag: '"test-etag"' };
      objects.set(key, item);
      return { etag: item.etag, size: bytes.length };
    },
    async head(key: string) {
      const item = objects.get(key);
      return item ? metadata(item) : null;
    },
    async get(key: string, options?: { range?: { offset: number; length: number } }) {
      const item = objects.get(key);
      if (!item) return null;
      const bytes = options?.range
        ? item.bytes.slice(options.range.offset, options.range.offset + options.range.length)
        : item.bytes;
      return {
        ...metadata(item),
        body: new ReadableStream<Uint8Array>({
          start(controller) { controller.enqueue(bytes); controller.close(); },
        }),
      };
    },
    async delete(key: string) { objects.delete(key); },
  };
}

describe("Cloudflare R2 media worker", () => {
  test("uploads, serves ranged downloads, and supports HEAD without exposing credentials", async () => {
    const bucket = createBucket();
    const env = { MEDIA_BUCKET: bucket, R2_WRITE_TOKEN: "test-write-token" };
    const uploadResponse = await worker.fetch(
      new Request("https://upload.resofit.fit/?key=chatb2k/test.mp4", {
        method: "POST",
        headers: { Authorization: "Bearer test-write-token", "Content-Type": "video/mp4", Origin: "https://shop.resofit.fit" },
        body: new Uint8Array([48, 49, 50, 51, 52, 53]),
      }),
      env,
    );
    expect(uploadResponse.status).toBe(200);
    expect(await uploadResponse.json()).toMatchObject({
      ok: true, key: "chatb2k/test.mp4", bytes: 6,
      media_url: "https://media.resofit.fit/chatb2k/test.mp4",
    });
    expect(bucket.objects.has("chatb2k/test.mp4")).toBe(true);

    const rangeResponse = await worker.fetch(
      new Request("https://media.resofit.fit/chatb2k/test.mp4", { headers: { Range: "bytes=0-2" } }),
      env,
    );
    expect(rangeResponse.status).toBe(206);
    expect(rangeResponse.headers.get("Content-Range")).toBe("bytes 0-2/6");
    expect(await rangeResponse.text()).toBe("012");

    const headResponse = await worker.fetch(
      new Request("https://media.resofit.fit/chatb2k/test.mp4", { method: "HEAD" }),
      env,
    );
    expect(headResponse.status).toBe(200);
    expect(headResponse.headers.get("Content-Length")).toBe("6");
    expect(await headResponse.text()).toBe("");

    const authFailure = await worker.fetch(
      new Request("https://upload.resofit.fit/?key=chatb2k/test.mp4", {
        method: "POST", headers: { "Content-Type": "video/mp4" }, body: "nope",
      }),
      env,
    );
    expect(authFailure.status).toBe(401);
    expect(JSON.stringify(await authFailure.json())).not.toContain("test-write-token");
  });
});
