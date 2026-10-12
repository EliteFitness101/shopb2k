# ChatB2K content pipeline and dynamic media-routing audit — 2026-10-12

## Scope and release rule

Production project: Supabase `resonance-fitness` (`vbqjvmnhdtdhmeeudqnn`).
Operating rule: Audit → Additive Patch → Verify. This branch is not deployed to production. This report distinguishes database/source evidence from runtime proof.

## Executive decision

**CEO SIGN-OFF: HOLD — dynamic media routing is not yet proven production-ready.**

The intended architecture is provider-agnostic: resolve an asset through a live registry of configured and healthy storage/CDN providers; select a delivery URL from available candidates; fail over by registry priority/health; preserve asset IDs and rights/QA gates. Vercel Blob is excluded as a target or required dependency. Existing historical Blob URLs and rows are evidence to migrate/retire, not permission to route new media through Blob.

## Dynamic media architecture verification

### Source evidence

- Canonical repository source `src/lib/assetResolver.ts` on `main` defines a hardcoded `PRIMARY_CDN_ORDER = ["r2", "cloudinary", "imagekit", "blob"]`. It probes caller-supplied candidates with HEAD, but does not discover providers from a live registry.
- Canonical repository source `src/lib/media.ts` hardcodes a public Blob URL and a direct `r2.dev` URL in `DEFAULT_MEDIA_CANDIDATES`. That is not the requested dynamic-registry architecture and the `r2.dev` URL is not proof that `media.resofit.fit` is configured.
- Active Supabase `drive-asset-archiver` v16 accepts only Vercel Blob or Dropbox shared URLs; its source defaults a Google Drive root-folder ID. It is an archive worker, not a provider-neutral delivery router. Do not invoke its legacy Blob branch for new work.
- The discovered `resofit_adapter_registry` currently contains commerce, messaging, lead-generation, payment and publishing adapters; no media-storage/CDN adapter was evidenced there.
- No dedicated media-provider registry table or matching entry in `resofit_ecosystem_source_registry` was found by the scoped schema/source checks. This is a scoped negative finding, not proof that no provider configuration exists anywhere else.
- The repo's existing resolver is candidate-based and statically ordered. It is a useful primitive but does not satisfy live provider discovery, enable/disable, health/priority management, or configured-drive/CDN failover by itself.

### Live database snapshot

Project: `vbqjvmnhdtdhmeeudqnn`; query performed 2026-10-12.

| Registry/source | Rows | Evidence / limitation |
|---|---:|---|
| `content_asset_registry` | 584 | Asset metadata registry; not proof all files are generated, reachable, or publishable |
| `resofit_catalog_assets` provider group | 466 | All 466 have canonical URLs; URL mix includes 312 Blob, 106 Cloudinary, 7 ImageKit, and other URLs |
| `bigo_live` | 48 | 47 canonical URLs; 38 are Blob URLs |
| `asset_manifest` | 35 | 14 canonical URLs; all 14 are Blob URLs |
| `vercel_blob_resoflex_vault` | 15 | All 15 canonical URLs are Blob URLs |
| `martial_asset_registry` | 14 | All 14 canonical URLs are Blob URLs |
| `vercel_blob` | 4 | All 4 canonical URLs are Blob URLs |
| `music_library` | 2 | Source-library records; do not treat as generated audio |
| `resofit_cloudinary_visual_assets` | 28 | Status is `verified`; registry status alone is not an end-to-end CDN probe |
| `content_asset_drive_archives` | 71 | 4 archived, 4 failed, 63 pending; records retain legacy URL fields, so archive backlog is not evidence of active routing |

The registry therefore contains legacy Blob dependencies and some configured Cloudinary/ImageKit references. It does not currently prove a dynamic provider registry, a live Cloudflare R2 origin behind `media.resofit.fit`, or successful failover among providers.

## Existing content pipeline / generation evidence

- `chatb2k-orchestrator`: ACTIVE v26. It can call Gemini `generateContent` for structured text intelligence, but the queried `chatb2k_gemini_usage` ledger had zero rows attributed to this function. This is code capability, not usage proof; failure telemetry remains incomplete in the active runtime.
- `content-intelligence-enricher`: ACTIVE v33; prior usage ledger evidence showed successful text enrichment and HTTP 503 failures. Text generation does not prove image/video/audio/PDF output.
- `resofit-ecosystem-autopilot`: ACTIVE v27.
- `flow-generation-gate`: ACTIVE v10; 3 recorded events were failed, with the latest observed reason `BLOB_READ_WRITE_TOKEN_missing`. That is a legacy Flow path failure and is not a reason to restore Blob as the architecture.
- Digital product factory job `1c6c9196-77fe-48ce-92c7-1429c9bf79ef`, SKU `RESO-DIG-LIFE-001`, remains `awaiting_ingest`, with 7 required media slots and zero attached/approved assets in the last inspected state. Its saved spec describes manual AI Studio/Flow media creation and ingestion. Marketing media is not a substitute for the actual customer-facing guide.
- No verified completed PDF/DOCX/ebook/meal-workout guide/audio output was evidenced for this factory in the prior scoped audit.

## Required architecture patch before sign-off

1. Define one provider registry as the operational source of truth, separate from product/asset metadata. Each entry needs provider ID/type, enabled flag, role (origin/archive/delivery/transform), canonical base URL or connector reference, priority, supported media types, public-delivery capability, health status/last probe, and safe configuration reference. Never store raw secrets in the registry.
2. Make the media resolver read that registry at runtime (with a short bounded cache), filter to enabled/healthy candidates, normalize each provider's URL, and attempt deterministic failover. Unknown/unconfigured providers are skipped. Do not embed provider URLs or a Blob fallback in UI code.
3. Separate **archive connectors** (e.g. Dropbox/Google Drive) from **public delivery CDNs** (e.g. configured Cloudflare R2/custom domain, Cloudinary, ImageKit, Shopify CDN). A private drive URL must not be returned to public clients unless it is intentionally shared and verified for the use case.
4. Set `media.resofit.fit` as the desired canonical delivery hostname only after its DNS/Worker/origin and response behavior are verified. Do not substitute an unverified `r2.dev` address as production evidence.
5. Preserve stable asset IDs, cache headers, media transformations, content type/byte verification, access controls, rights/commercial status, per-platform QA and publisher allowlists. Public reachability is not rights clearance.
6. Convert existing Blob-only paths into migration candidates in an inventory; do not mass-rewrite rows, delete legacy objects, or retry posts as part of this patch. Migration must be additive and checksum-verified.
7. Update `drive-asset-archiver` to consume the same configured provider registry and connector abstractions, or explicitly keep it archive-only and remove Blob as an accepted new-source dependency. Do not run it against the current backlog until the provider contract and source allowlist are patched.
8. Add sign-off probes: provider registry read; each enabled CDN's HEAD/GET and content-type check; transform test; failover test with primary unavailable; private-drive access test; asset-ID resolution; one real media publication test with provider ID; and rights/QA gate regression test.

## Other staged remediation in draft PR

Draft PR: https://github.com/EliteFitness101/shopb2k/pull/63

It contains review-only patches for watchdog/publisher auth-header alignment, Buffer/Telegram fanout idempotency, rights/commercial allowlists, and Gemini/media telemetry. It is not merged or production-deployed. Do not infer production status from the branch.

## CEO sign-off checklist

| Gate | Current status | Evidence needed to clear |
|---|---|---|
| Provider registry is live and authoritative | NOT VERIFIED | Schema/API plus active provider rows |
| No hardcoded Blob dependency in delivery path | FAIL | Remove Blob from priority/fallback and static candidate URLs; scan consumers |
| Cloudflare R2 + `media.resofit.fit` | NOT VERIFIED | DNS/Worker/origin configuration and live delivery probe |
| Cloudinary/ImageKit delivery | PARTIAL | Registry records exist; run live URL/transform probes |
| Drive archive connectors | PARTIAL | Google Drive archiver exists; Dropbox/Drive must be modeled as archive, not automatic public CDN |
| Asset inventory and migration | INCOMPLETE | URL reachability, checksum, target mapping, rights, rollback evidence |
| Digital-product media package | HOLD | All seven media slots plus actual guide, QA and fulfillment/entitlement test |
| Publishing/rights controls | HOLD pending staged patch verification | CI + controlled non-production/rights-cleared tests |

## Release decision

**HOLD.** No production deployment, provider-registry migration, asset rewrite, storage move, or media-generation job was triggered during this audit. Ignore Blob as a target dependency. Next action is to implement and test the provider registry/resolver additively, verify configured providers from real runtime evidence, then rerun the CEO checklist.
