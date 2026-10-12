# Dynamic Media Router — Patch Status & CEO Sign-off Addendum
Date: 2026-10-12
Repository: EliteFitness101/shopb2k
Branch: fix/chatb2k-content-pipeline-2026-10-12
Status: DRAFT / NOT DEPLOYED

## Decision
**CEO SIGN-OFF: HOLD.** Registry/resolver foundation and the previously identified UI consumers are now staged in source, but CI/build, live-provider mappings, health/failover probes and production migration are not verified.

## Implemented in branch (source only)
- Added migration `supabase/migrations/20261012170000_dynamic_media_provider_registry.sql`.
- Introduced `media_provider_registry` and `media_asset_locations` with provider role, enablement, priority, health, public-delivery controls, verified asset mappings, checksums and content metadata.
- Seeded provider identities without hardcoding any drive as archive-only. Provider `roles` is now an array: Dropbox and Google Drive are modeled as `origin` + `archive`; Cloudflare R2 is modeled as `delivery` + `origin`; Cloudinary and ImageKit are modeled as `delivery` + `transform`. No credentials or asset URLs are fabricated. Dropbox is seeded enabled/healthy from live folder/file evidence; Google Drive is enabled but health remains `unknown` pending a direct OAuth/Drive healthcheck. CDN providers remain disabled/unknown until live health probes pass.
- Added RLS allowing public reads only for enabled, healthy, verified public-delivery records. Drive providers have `public_delivery=false` and cannot be exposed as public media delivery. Drive roles are not restricted to archive-only.
- Updated `src/lib/assetResolver.ts` to read provider priority from the live registry, require healthy/enabled/public delivery providers, validate HTTPS URLs, reject Vercel Blob URLs and `r2.dev` for production, probe URLs with a timeout, and fail over by registry priority.
- Updated `src/lib/media.ts` to remove hardcoded Blob and `r2.dev` candidate URLs and fail closed until verified registry locations exist.

## Known incomplete work
- `src/components/CinematicWellnessExperience.tsx`, `src/routes/wellness.index.tsx`, and `src/routes/wellness.makaveli.tsx` now resolve stable asset keys through the registry helper. Wellness uses a local bundled hero image fallback; no remote Blob fallback remains.
- `src/content/martialVideos.ts` and `src/content/martialXAssets.ts` now hold stable keys rather than Blob URLs. `/content` resolves each video through healthy, verified registry locations on the server before analysis/publishing and returns 503 when no mapping exists; its remaining Blob/R2 references are rejection guards only.
- `src/config/martialXExecProducts.ts` now references stable `imageAssetKey` values; `/martial-x3`, `/martial-x3/rsdn`, and `/martial-x3/executive` resolve them through the registry helper.
- `src/routes/og.tsx` generates a first-party SVG fallback; `src/routes/__root.tsx` points social metadata at that canonical generated OG route instead of Blob.
- `src/lib/shopify.ts` no longer accepts Blob URLs as approved catalog images and no longer falls back to unfiltered catalog assets. If no safe HTTPS image is available, it returns no remote image rather than routing through Blob.
- These source changes are additive and remain unmerged. Because no public asset-location rows exist yet, registry-based media intentionally fails closed until real mappings are verified; product/hero images may be absent in a build until mappings are provisioned. Do not release before that is addressed.
- The migration exists in Git only; it has NOT been applied to production Supabase.
- All seeded providers are disabled and unknown. No public asset locations have been inserted. No provider health probe, CDN transform test, or failover test has passed.
- No production deploy, asset rewrite, storage migration, or media-generation job was triggered.

## Latest provider audit — 2026-10-12

### Dropbox capture archive
- Connected Dropbox identity: `RESONANCE FITNESS` (`resonancefitnessng@gmail.com`). Live folder listing verified `/ResoFit/BIGO/` with 9 raw-capture files, 8 processed MP4s, and populated `metadata/`; `logs/` currently contains 0 files. Newest listed raw/processed/metadata records are dated 2026-10-12 around 01:53 UTC.
- One raw capture, `1102883606-20261010T224651Z-raw.mp4`, has no matching processed MP4 in the current folder listing; investigate whether it is intentionally incomplete or needs reprocessing.

### Google Drive archive
- Production `drive-asset-archiver` Edge Function is ACTIVE at v16 and has a `healthcheck` action that validates the OAuth token proxy and Drive folder tree. Direct invocation was not available in this audit session, so current OAuth health remains unconfirmed.
- Production table `content_asset_drive_archives` exists. Current rows: 4 `archived`, 4 `failed`, 31 `pending` `CAPTURED`, 8 `pending` `QA_PENDING`, and 24 `pending` `QUEUED`. Failed rows report `Source media download failed: 403` or `Blob download failed: 403`; last successful archive update was 2026-10-11 01:22 UTC. This proves the Drive archiver has succeeded before, but it is not fully clear/healthy end-to-end today. Do not mark the backlog complete or retry blindly; fix 403 source URLs and then run the healthcheck + controlled archive test.

### Cloudinary and ImageKit
- `content_asset_registry` currently has 106 canonical URLs hosted on `res.cloudinary.com` and 7 hosted on `ik.imagekit.io`; these are registered URL records, not by themselves a live uptime test. A sampled Cloudinary URL uses the `paystack` cloud name, so the count must not be interpreted as 106 assets verified in ResoFit's own configured Cloudinary account.
- `reso-web` has production-targeted Cloudinary config entries (`CLOUDINARY_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) and ImageKit config entries (`IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_PUBLIC_KEY`). `imagekit-auth` v23 and `imagekit-webhook` v22 are ACTIVE in production. The repository contains Cloudinary visual URL helpers and `/api/cloudinary/verify` source, but this session did not obtain a successful live HTTP/credential verification response. Classify both providers as configured/registered; live delivery and transformation readiness remains unproven.

### Cloudflare R2 target architecture

- A dedicated source-only Worker is now staged at `cloudflare/media-router/src/index.ts`, with `cloudflare/media-router/wrangler.jsonc` and implementation gates in `docs/ops/cloudflare-r2-media-cdn-implementation-2026-10-12.md`. It implements read-only R2 delivery, HEAD/GET, byte ranges, ETags, caching, CORS, a strict public-prefix allowlist and optional bounded image transforms. It is not deployed or build-verified; `/healthz` reports configuration presence, not live bucket health.
- R2 is the planned primary origin/delivery provider for `media.resofit.fit`, with a custom domain (not `r2.dev`), registry-based origin selection, verified asset manifest and checksums, cache/transform layer, and deterministic failover to verified Cloudinary/ImageKit URLs. Dropbox/Google Drive remain private source/archive providers, never public delivery endpoints.
- No Cloudflare account/bucket/domain verification or R2 runtime credentials were accessible in this audit. The R2 registry seed stays disabled/unknown until bucket, custom domain, CORS, caching, auth boundaries, and live GET/HEAD probes are verified. The separate Worker config intentionally remains source-only until Cloudflare confirms the `resofit-cdn` bucket, zone route, and a distinct custom origin for transforms.

## Required next steps
1. Fix the Google Drive archiver's 403 source URL cases; confirm its healthcheck and perform one controlled capture archive with byte-count/SHA-256 read-back.
2. Reconcile the one raw-only Dropbox capture; preserve Dropbox's existing raw and processed capture flow.
3. Run live Cloudinary and ImageKit verification (credential-backed asset discovery + public GET/HEAD and transformation check) before enabling either provider in the public delivery registry.
4. Run lint, type-check/build and repository-wide scan for hardcoded Blob / `r2.dev` delivery references.
5. Apply the revised multi-role provider registry migration only through the approved production release path; populate verified asset locations only after URL, bytes, MIME type, checksum and rights/QA verification.
6. Configure and verify Cloudflare R2 bucket + custom domain `media.resofit.fit`, cache policy, transformation path and origin access; run primary/failover tests before enabling R2 delivery.
7. Re-test digital-product factory job `1c6c9196-77fe-48ce-92c7-1429c9bf79ef` after routing is ready; marketing media does not replace the customer-facing guide.

## CEO checklist
| Gate | Status |
|---|---|
| Registry/resolver source foundation | STAGED |
| No hardcoded Blob delivery candidates in the previously identified consumers | STAGED — source paths removed; rejection guards remain by design |
| Production migration applied | NOT DONE |
| Providers configured and healthy | NOT VERIFIED |
| Asset mappings verified | NOT DONE |
| Failover and transforms tested | NOT DONE |
| Digital product package complete | HOLD |
| Production sign-off | HOLD |

## Evidence
- Draft PR: https://github.com/EliteFitness101/shopb2k/pull/63
- Migration source: https://github.com/EliteFitness101/shopb2k/blob/fix/chatb2k-content-pipeline-2026-10-12/supabase/migrations/20261012170000_dynamic_media_provider_registry.sql
- Resolver source: https://github.com/EliteFitness101/shopb2k/blob/fix/chatb2k-content-pipeline-2026-10-12/src/lib/assetResolver.ts
- Media helper: https://github.com/EliteFitness101/shopb2k/blob/fix/chatb2k-content-pipeline-2026-10-12/src/lib/media.ts


## Patch execution update — 2026-10-12

Source-only commits were added to this same draft branch for the following paths: `src/routes/og.tsx`, `src/routes/__root.tsx`, `src/routes/wellness.index.tsx`, `src/routes/wellness.makaveli.tsx`, `src/content/martialVideos.ts`, `src/routes/content.tsx`, `src/content/martialXAssets.ts`, `src/config/martialXExecProducts.ts`, `src/routes/martial-x3.tsx`, `src/routes/martial-x3.rsdn.tsx`, `src/routes/martial-x3.executive.tsx`, and `src/lib/shopify.ts`. These are not proof of a successful build. Provider registry tables are still absent in production and no asset mappings have been populated. The next gate is compile/type-check + review of these consumer changes, followed by provisioning and live verification in the approved release path. No production migration or deployment was executed.


Registry schema correction: replaced the single `role` enum with a validated `roles` array, allowing each provider to have multiple capabilities without forcing Drive into archive-only mode. Resolver queries now select providers with delivery/transform roles via array overlap. Production Supabase still has no `media_provider_registry` or `media_asset_locations` tables; the migration is source-only and has not been applied.


R2 implementation record: [Cloudflare R2 Main Media CDN — Implementation Record](cloudflare-r2-media-cdn-implementation-2026-10-12.md). The separate Worker has not been deployed; no Cloudflare resources or production objects were changed.
