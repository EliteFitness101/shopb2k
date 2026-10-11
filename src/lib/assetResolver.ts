export type AssetProvider = "r2" | "cloudinary" | "imagekit" | "blob";

export type AssetCandidate = {
  provider: AssetProvider;
  url: string;
  priority?: number;
};

export const PRIMARY_CDN_ORDER: AssetProvider[] = ["r2", "cloudinary", "imagekit", "blob"];

const FALLBACK_PLACEHOLDER = "/assets/placeholder.svg";

export async function resolveAssetUrl(candidates: AssetCandidate[], timeoutMs = 1500): Promise<string> {
  if (!Array.isArray(candidates) || candidates.length === 0) return FALLBACK_PLACEHOLDER;

  const ordered = [...candidates]
    .filter((candidate) => candidate?.url)
    .sort((a, b) => {
      const aPriority = a.priority ?? PRIMARY_CDN_ORDER.indexOf(a.provider) + 1 ?? 99;
      const bPriority = b.priority ?? PRIMARY_CDN_ORDER.indexOf(b.provider) + 1 ?? 99;
      return aPriority - bPriority;
    });

  for (const candidate of ordered) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(candidate.url, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (response.ok) return candidate.url;
    } catch {
      // try next candidate in order
    }
  }

  return FALLBACK_PLACEHOLDER;
}

export function normalizeAssetCandidate(url: string, provider: AssetProvider): AssetCandidate {
  return {
    provider,
    url,
    priority: PRIMARY_CDN_ORDER.indexOf(provider) + 1,
  };
}
