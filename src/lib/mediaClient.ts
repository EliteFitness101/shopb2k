const MEDIA_API = "/api/media";
const MAX_BYTES = 50 * 1024 * 1024;

type MediaResult = {
  ok: true;
  key: string;
  publicUrl?: string;
  result?: unknown;
};

function safeKey(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  if (
    !normalized.startsWith("public/") ||
    normalized.includes("..") ||
    normalized.includes("\\") ||
    !/^public\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(normalized)
  ) {
    throw new Error("Media key must be a safe path under public/.");
  }
  return normalized;
}

async function parseResponse(response: Response): Promise<MediaResult> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error || `Media request failed (${response.status}).`);
  }
  return payload as MediaResult;
}

/**
 * Upload an approved public media asset through the authenticated same-origin API.
 * Pass the current Supabase access token; never pass the R2 write token to the browser.
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

  const response = await fetch(`${MEDIA_API}?key=${encodeURIComponent(objectKey)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  return parseResponse(response);
}

/** Delete an approved public media asset through the authenticated same-origin API. */
export async function deleteMedia(key: string, accessToken: string): Promise<MediaResult> {
  const objectKey = safeKey(key);
  if (!accessToken) throw new Error("Sign in with an authorized ResoFit admin account.");

  const response = await fetch(`${MEDIA_API}?key=${encodeURIComponent(objectKey)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse(response);
}

/** Build a public URL for displaying approved assets. */
export function publicMediaUrl(key: string): string {
  return `https://media.resofit.fit/${safeKey(key)}`;
}
