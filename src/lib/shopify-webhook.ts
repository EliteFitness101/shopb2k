import crypto from "node:crypto";

export function verifyShopifyWebhook(
  rawBody: string,
  providedHmac: string | null,
  secret: string,
): boolean {
  if (!providedHmac || !secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(providedHmac, "utf8");

  return (
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export function getShopifyWebhookSecret(): string | null {
  return process.env.SHOPIFY_WEBHOOK_SECRET ?? process.env.SHOPIFY_CLIENT_SECRET ?? null;
}
