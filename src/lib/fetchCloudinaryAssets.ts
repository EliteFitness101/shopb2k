export type CloudinaryVerificationAsset = {
  key: string;
  canonicalPath: string | null;
  publicId: string;
  expectedResourceType: string;
  expectedFormat: string | null;
  found: boolean;
  live: boolean;
  resourceTypeMatches: boolean;
  formatMatches: boolean;
  actualFormat: string | null;
  secureUrl: string | null;
  registryStatus: string | null;
  error: string | null;
};

export type CloudinaryVerificationResponse = {
  status: "PASS" | "FAIL" | "CONFIG_ERROR" | "INVALID_REQUEST" | "ERROR";
  mode?: "requested-canonical" | "canonical-registry";
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
  error?: string;
  details?: { message?: string };
};

/**
 * Production-safe Cloudinary verification client.
 *
 * The browser calls the same-origin server endpoint. Cloudinary and Supabase
 * service-role credentials must remain server-side and are never read here.
 */
export async function fetchCloudinaryAssets(
  publicIds?: string[],
): Promise<CloudinaryVerificationResponse> {
  const params = new URLSearchParams();
  const ids = [...new Set(publicIds?.map((id) => id.trim()).filter(Boolean) ?? [])];
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
    throw new Error(data.message || data.details?.message || data.error || `Cloudinary verification failed (${response.status})`);
  }

  return data;
}

/** Verify the complete canonical Supabase registry, not a separate hard-coded list. */
export async function verifyAllCloudinaryAssets(): Promise<CloudinaryVerificationResponse> {
  return fetchCloudinaryAssets();
}
