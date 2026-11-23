import { createFileRoute } from "@tanstack/react-router";
import { list } from "@vercel/blob";
import { createHash, createCipheriv, randomBytes, randomInt } from "node:crypto";

const HOST_ID = "2922257558";

async function listBlobPrefix(prefix: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Vercel Blob read-write token is not configured");
  const blobs: Array<{ pathname: string; url: string; size: number; uploadedAt: Date }> = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, limit: 1000, cursor, token });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

function parseJsonp(text: string) {
  const match = text.match(/^jsonp\w+\(([\s\S]+?)\);?\s*$/);
  if (!match) throw new Error("BIGO token response was not valid JSONP");
  return JSON.parse(match[1]);
}
function encryptedBigoPayload(payload: Record<string, unknown>) {
  const salt = randomBytes(8);
  let digest = Buffer.alloc(0), previous = Buffer.alloc(0);
  while (digest.length < 48) {
    previous = createHash("md5").update(Buffer.concat([previous, Buffer.from("undefinedval0x01"), salt])).digest();
    digest = Buffer.concat([digest, previous]);
  }
  const cipher = createCipheriv("aes-256-cbc", digest.subarray(0, 32), digest.subarray(32, 48));
  return Buffer.concat([Buffer.from("Salted__", "ascii"), salt, cipher.update(Buffer.from(JSON.stringify(payload))), cipher.final()]).toString("base64");
}
async function bigoJsonp(url: URL) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
  if (!response.ok) throw new Error("BIGO token service HTTP " + response.status);
  return parseJsonp(await response.text());
}
async function resolveLive() {
  const timeUrl = new URL("https://sec.bigo.sg/v1/webjs/t");
  timeUrl.searchParams.set("callback", "jsonpcallback_" + Date.now() + "_" + randomInt(0, 1000001));
  const timeData = await bigoJsonp(timeUrl);
  if (!timeData.time) throw new Error("BIGO token time unavailable");
  const payload = { dr: randomBytes(16).toString("hex"), business: "bigolive-video", scene: "", at_time: timeData.time, ver: "2.0" };
  const statusUrl = new URL("https://sec.bigo.sg/v1/webjs/status");
  statusUrl.searchParams.set("callback", "jsonpcallback_" + Date.now() + "_" + randomInt(0, 1000001));
  statusUrl.searchParams.set("data", encryptedBigoPayload(payload));
  const tokenData = await bigoJsonp(statusUrl);
  const token = String(tokenData.token || "");
  if (!token) throw new Error("BIGO did not issue a room token");
  const roomUrl = new URL("https://ta.bigo.tv/official_website/studio/getInternalStudioInfo");
  roomUrl.searchParams.set("siteId", HOST_ID);
  roomUrl.searchParams.set("verify", "");
  roomUrl.searchParams.set("token", token);
  const room = await fetch(roomUrl, { method: "POST", headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" }, signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!room.ok) throw new Error("BIGO room lookup HTTP " + room.status);
  const result = await room.json();
  if (result.code !== 0) throw new Error("BIGO room lookup rejected");
  const data = result.data || {};
  return { state: data.hls_src ? "live" : "offline", isLive: Boolean(data.hls_src), displayName: data.nick_name || "MsZap", title: data.roomTopic || data.gameTitle || "" };
}

export const Route = createFileRoute("/api/zaphira")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const mode = new URL(request.url).searchParams.get("mode") || "media";
        try {
          if (mode === "live") {
            const status = await resolveLive();
            return Response.json({ ok: true, hostId: HOST_ID, checkedAt: new Date().toISOString(), ...status }, { headers: { "Cache-Control": "no-store" } });
          }
          if (mode !== "media") return Response.json({ ok: false, error: "Unsupported mode" }, { status: 400 });
          const [clips, covers] = await Promise.all([listBlobPrefix("partner/zaphira/clips/"), listBlobPrefix("partner/zaphira/covers/")]);
          const coverByBase = new Map(covers.map((item) => [item.pathname.split("/").pop()!.replace(/\.(jpg|jpeg|png|webp)$/i, "").toLowerCase(), item]));
          const media = clips.filter((item) => /\.(mp4|webm|mov|m4v)$/i.test(item.pathname)).map((item) => {
            const base = item.pathname.split("/").pop()!.replace(/\.(mp4|webm|mov|m4v)$/i, "").toLowerCase();
            const cover = coverByBase.get(base) || covers.find((candidate) => candidate.pathname.split("/").pop()!.toLowerCase().startsWith(base));
            return { key: item.pathname, url: item.url, poster: cover?.url || null, size: item.size, lastModified: item.uploadedAt.toISOString() };
          });
          return Response.json({ ok: true, count: media.length, clips: media, covers: covers.length, checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          console.error("[zaphira-api]", error);
          return Response.json({ ok: false, error: error instanceof Error ? error.message : "Media service unavailable", checkedAt: new Date().toISOString() }, { status: 503, headers: { "Cache-Control": "no-store" } });
        }
      },
    },
  },
});
