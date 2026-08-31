export type CloudinaryVerificationAsset = {
  key: string;
  resourceType: "video" | "image";
  publicId: string;
  expectedFormat: "mp4" | "webp";
  found: boolean;
  formatMatches: boolean;
  live: boolean;
  secureUrl: string | null;
  cloudinaryResourceType: string | null;
  actualFormat: string | null;
  error: string | null;
};

export type CloudinaryVerificationResponse = {
  status: "PASS" | "FAIL" | "CONFIG_ERROR" | "INVALID_REQUEST";
  canonical: number;
  checked: number;
  live: number;
  missing: number;
  formatErrors: number;
  complete: string;
  canonicalComplete: boolean;
  cloudName?: string;
  generatedAt?: string;
  assets?: CloudinaryVerificationAsset[];
  message?: string;
};

/**
 * Production-safe Cloudinary verification client.
 *
 * IMPORTANT: Cloudinary API credentials are never read in the browser.
 * The browser calls our server endpoint, which owns the Cloudinary secret.
 */
export async function fetchCloudinaryAssets(
  publicIds?: string[],
): Promise<CloudinaryVerificationResponse> {
  const params = new URLSearchParams();
  const ids = publicIds?.map((id) => id.trim()).filter(Boolean) ?? [];
  if (ids.length) params.set("public_ids", ids.join(","));

  const query = params.toString();
  const response = await fetch(`/api/cloudinary/verify${query ? `?${query}` : ""}`, {
    method: "GET",
    headers: { accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
  });

  const data = (await response.json()) as CloudinaryVerificationResponse;
  if (!response.ok && data.status !== "FAIL") {
    throw new Error(data.message || `Cloudinary verification failed (${response.status})`);
  }

  return data;
}

/** Verify the complete canonical production set. */
export async function verifyAllCloudinaryAssets(): Promise<CloudinaryVerificationResponse> {
  return fetchCloudinaryAssets();
}
