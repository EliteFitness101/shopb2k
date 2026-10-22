const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "application/pdf",
]);

type MediaResult = {
  ok: true;
  key: string;
  publicUrl?: string;
  result?: unknown;
  [key: string]: unknown;
};

function safeKey(key: string): string {
  const normalized = key.trim();
  if (
    !normalized.startsWith("public/") ||
    normalized.length > 500 ||
    normalized.includes("..") ||
    normalized.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(normalized) ||
    !/^public\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(normalized)
  ) {
    throw new Error("Media key must be a safe path under public/.");
  }
  return normalized;
}

async function parseResponse(response: Response, key: string, includePublicUrl = false): Promise<MediaResult> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Media request failed (${response.status}).`);
  }
  return {
    ...payload,
    ok: true,
    key: typeof payload?.key === "string" ? payload.key : key,
    ...(includePublicUrl && typeof payload?.publicUrl !== "string"
      ? { publicUrl: `https://media.resofit.fit/${key}` }
      : {}),
  } as MediaResult;
}

/**
 * Upload approved media through the same-origin server endpoint.
 * The server validates the Supabase session/admin role and keeps the R2
 * write credential server-side; no storage credential enters the browser.
 */
export async function uploadMedia(
  key: string,
  file: File | Blob,
  accessToken: string,
): Promise<MediaResult> {
  const objectKey = safeKey(key);
  if (!accessToken) throw new Error("Sign in with an authorized ResoFit admin account.");
  if (file.size === 0) throw new Error("Cannot upload an empty file.");
  if (file.size > MAX_BYTES) throw new Error("File exceeds the 50 MiB limit.");
  const contentType = (file.type || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) throw new Error("Unsupported media type.");

  const response = await fetch(`/api/media?key=${encodeURIComponent(objectKey)}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: file,
  });
  return parseResponse(response, objectKey, true);
}

/** Delete approved media through the authenticated same-origin server endpoint. */
export async function deleteMedia(key: string, accessToken: string): Promise<MediaResult> {
  const objectKey = safeKey(key);
  if (!accessToken) throw new Error("Sign in with an authorized ResoFit admin account.");

  const response = await fetch(`/api/media?key=${encodeURIComponent(objectKey)}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse(response, objectKey);
}

/** Build a public URL for displaying approved assets. */
export function publicMediaUrl(key: string): string {
  return `https://media.resofit.fit/${safeKey(key)}`;
}
