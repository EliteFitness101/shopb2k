import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSecretsBridge } from "../api/lib/secrets-bridge.js";

const env = () => ({
  SHOPIFY_WEBHOOK_SECRET: "fake-test-secret",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "fake-test-service-role",
  GITHUB_ALLOWED_REPOSITORIES: "EliteFitness101/shopb2k",
});

describe("ShopB2K secrets bridge", () => {
  it("requires an explicit environment object", () => {
    assert.throws(() => createSecretsBridge(undefined), /Explicit runtime bindings/);
  });
  it("requires the dedicated Shopify webhook secret and does not silently substitute client credentials", () => {
    assert.equal(createSecretsBridge(env()).getShopifyWebhookSecret(), "fake-test-secret");
    assert.throws(() => createSecretsBridge({ ...env(), SHOPIFY_WEBHOOK_SECRET: undefined, SHOPIFY_CLIENT_SECRET: "client-secret" }).getShopifyWebhookSecret(), /SHOPIFY_WEBHOOK_SECRET/);
  });
  it("validates HTTPS Supabase URL", () => {
    assert.equal(createSecretsBridge(env()).getSupabaseUrl(), "https://example.supabase.co");
    assert.throws(() => createSecretsBridge({ ...env(), SUPABASE_URL: "http://example.com" }).getSupabaseUrl(), /HTTPS/);
  });
  it("strictly validates repository allowlist", () => {
    assert.deepEqual(createSecretsBridge(env()).getAllowedRepositories(), ["elitefitness101/shopb2k"]);
    assert.throws(() => createSecretsBridge({ ...env(), GITHUB_ALLOWED_REPOSITORIES: "bad" }).getAllowedRepositories(), /owner\/repo/);
  });
});
