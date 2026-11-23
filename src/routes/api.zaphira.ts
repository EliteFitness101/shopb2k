import { createFileRoute } from "@tanstack/react-router";
import { createHash, createHmac, createCipheriv, randomBytes, randomInt } from "node:crypto";

const HOST_ID = "2922257558";
const REGION = "auto";
const SERVICE = "s3";
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value).digest();
const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

function xmlValues(xml: string, tag: string) {
  return [...xml.matchAll(new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">", "g"))].map((m) =>
    m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'"),
  );
}

async function listR2(prefix: string) {
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET_NAME;
  const access = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !access || !secret) throw new Error("R2 inventory credentials are not configured");
  const base = new URL(endpoint);
  const host = base.host;
  const path = (base.pathname.replace(/\/$/, "") + "/" + encode(bucket)).replace(/\/+/g, "/");
  const query = [["list-type", "2"], ["max-keys", "1000"], ["prefix", prefix]]
    .map(([k, v]) => [encode(k), encode(v)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + "=" + v).join("&");
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\\.\\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256("");
  const canonicalHeaders = "host:" + host + "\\n" + "x-amz-content-sha256:" + payloadHash + "\\n" + "x-amz-date:" + amzDate + "\\n";
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["GET", path, query, canonicalHeaders, signedHeaders, payloadHash].join("\\n");
  const scope = date + "/" + REGION + "/" + SERVICE + "/aws4_request";
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\\n");
  const kDate = hmac("AWS4" + secret, date);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const authorization = "AWS4-HMAC-SHA256 Credential=" + access + "/" + scope + ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;
  const response = await fetch(base.origin + path + "?" + query, {
    headers: { Authorization: authorization, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("R2 inventory returned HTTP " + response.status);
  const xml = await response.text();
  if (/<Error>/.test(xml)) throw new Error("R2 inventory returned an S3 error");
  const keys = xmlValues(xml, "Key");
  const modified = xmlValues(xml, "LastModified");
  const sizes = xmlValues(xml, "Size");
  return keys.map((key, i) => ({ key, lastModified: modified[i] || null, size: Number(sizes[i] || 0) }));
}

function parseJsonp(text: string) {
  const match = text.match(/^jsonp\\w+\\(([\\s\\S]+?)\\);?\\s*$/);
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
          const [clips, covers] = await Promise.all([listR2("partner/zaphira/clips/"), listR2("partner/zaphira/covers/")]);
          const coverByBase = new Map(covers.map((item) => [item.key.split("/").pop()!.replace(/\\.(jpg|jpeg|png|webp)$/i, "").toLowerCase(), item]));
          const media = clips.filter((item) => /\\.(mp4|webm|mov|m4v)$/i.test(item.key)).map((item) => {
            const base = item.key.split("/").pop()!.replace(/\\.(mp4|webm|mov|m4v)$/i, "").toLowerCase();
            const cover = coverByBase.get(base) || covers.find((candidate) => candidate.key.split("/").pop()!.toLowerCase().startsWith(base));
            const publicBase = (process.env.R2_PUBLIC_BASE_URL || "https://media.resofit.fit").replace(/\\/$/, "");
            const publicUrl = (key: string) => publicBase + "/" + key.split("/").map(encodeURIComponent).join("/");
            return { key: item.key, url: publicUrl(item.key), poster: cover ? publicUrl(cover.key) : null, size: item.size, lastModified: item.lastModified };
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
