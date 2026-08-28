import { Buffer } from "node:buffer";

const IMAGEKIT_API = "https://api.imagekit.io/v1/files";

export type ImageKitAsset = {
  fileId: string;
  filePath: string;
  name: string;
  url: string;
  fileType?: string;
  width?: number;
  height?: number;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
};

function authHeader(privateKey: string) {
  return `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
}

/** Server-only, read-only ImageKit inventory. Never expose the private key. */
export async function listImageKitAssets(options: { path?: string; searchQuery?: string } = {}) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not configured");

  const assets: ImageKitAsset[] = [];
  let skip = 0;
  const limit = 1000;

  do {
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (options.path) params.set("path", options.path);
    if (options.searchQuery) params.set("searchQuery", options.searchQuery);

    const response = await fetch(`${IMAGEKIT_API}?${params}`, {
      headers: { Authorization: authHeader(privateKey), Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`ImageKit inventory request failed: ${response.status}`);

    const page = (await response.json()) as ImageKitAsset[];
    assets.push(...page);
    if (page.length < limit) break;
    skip += page.length;
  } while (true);

  return assets;
}
