#!/usr/bin/env node

/**
 * ResoFit Buffer Distribution Adapter
 *
 * Buffer is a replaceable publishing surface, never a system of record.
 * The verified ResoFit channels are intentionally pinned here as IDs supplied
 * by the CEO. Credentials are runtime-only and are never committed.
 *
 * Default behavior is dry-run. Add --publish only after validation/approval.
 * Buffer's public API is GraphQL at https://api.buffer.com.
 */

const BUFFER_API = "https://api.buffer.com";
const ORG_ID = "6a7cfd9705e59fe6e2a3bf71";
const CHANNELS = Object.freeze({
  tiktok: "6a7cfe5ab2d9d57743686cc5",
  youtube: "6a7d4ae7b2d9d577436a9c08",
  googleBusiness: "6a7d4d1fb2d9d577436aa192",
});

const queueFile =
  process.env.RESOFIT_CONTENT_QUEUE || "content-intelligence/daily-opportunity-queue.json";
const publish = process.argv.includes("--publish");
const channelArg = process.argv.find((arg) => arg.startsWith("--channel="));
const channelName = channelArg?.split("=")[1] || "all";

const fs = await import("node:fs/promises");
let queue;
try {
  queue = JSON.parse(await fs.readFile(queueFile, "utf8"));
} catch {
  console.error(`Missing content queue: ${queueFile}`);
  process.exit(1);
}

function escapeGraphQL(value) {
  return JSON.stringify(String(value ?? ""));
}

function channelIds() {
  if (channelName === "all") return Object.entries(CHANNELS);
  if (!(channelName in CHANNELS)) throw new Error(`Unknown channel: ${channelName}`);
  return [[channelName, CHANNELS[channelName]]];
}

function contentFor(channel, item) {
  if (channel === "tiktok") {
    return `${item.channels.tiktok.hook}\n\n${item.channels.tiktok.cta}`;
  }
  if (channel === "youtube") {
    return `${item.channels.youtube.title}\n\n${item.channels.youtube.cta}`;
  }
  return `${item.channels.googleBusiness.headline}\n\n${item.channels.googleBusiness.cta}`;
}

function idempotencyKey(channel, item) {
  return `resofit:${item.id}:${channel}:${item.handle}`;
}

async function bufferRequest(query) {
  const key = process.env.BUFFER_API_KEY;
  if (!key)
    throw new Error("BUFFER_API_KEY is required for --publish and must be provided at runtime.");
  const response = await fetch(BUFFER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query }),
  });
  const body = await response.json();
  if (!response.ok || body.errors?.length) {
    throw new Error(JSON.stringify(body.errors || body));
  }
  return body;
}

for (const [channel, channelId] of channelIds()) {
  for (const item of queue.queue.slice(0, 4)) {
    const key = idempotencyKey(channel, item);
    const text = contentFor(channel, item);
    const query = `mutation CreateResoFitPost {
      createPost(input: {
        text: ${escapeGraphQL(text)}
        channelId: ${escapeGraphQL(channelId)}
        schedulingType: automatic
        mode: addToQueue
        source: "resofit-content-intelligence"
        aiAssisted: true
        metadata: { }
      }) {
        ... on PostActionSuccess { post { id text dueAt status channelId } }
        ... on MutationError { message }
      }
    }`;

    console.log(
      JSON.stringify({
        mode: publish ? "publish" : "dry-run",
        organizationId: ORG_ID,
        channel,
        channelId,
        contentId: item.id,
        idempotencyKey: key,
        canonicalUrl: item.canonicalUrl,
        text,
      }),
    );

    if (publish) await bufferRequest(query);
  }
}

console.log(
  publish
    ? "Buffer queue submission complete."
    : "Dry-run complete. Re-run with --publish after approval.",
);
