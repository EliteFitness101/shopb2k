# Dynamic Media Router — Patch Status & CEO Sign-off Addendum
Date: 2026-10-12
Repository: EliteFitness101/shopb2k
Branch: fix/chatb2k-content-pipeline-2026-10-12
Status: DRAFT / NOT DEPLOYED

## Decision
**CEO SIGN-OFF: HOLD.** Registry/resolver foundation is staged, but full UI integration and live-provider verification are incomplete.

## Implemented in branch (source only)
- Added migration `supabase/migrations/20261012170000_dynamic_media_provider_registry.sql`.
- Introduced `media_provider_registry` and `media_asset_locations` with provider role, enablement, priority, health, public-delivery controls, verified asset mappings, checksums and content metadata.
- Seeded provider identities as disabled/unknown: Cloudflare R2 custom-domain delivery, Cloudinary, ImageKit, Shopify CDN, Dropbox archive, Google Drive archive. No credentials or URLs are fabricated.
- Added RLS allowing public reads only for enabled, healthy, verified public-delivery records. Archive providers are not public delivery providers.
- Updated `src/lib/assetResolver.ts` to read provider priority from the live registry, require healthy/enabled/public delivery providers, validate HTTPS URLs, reject Vercel Blob URLs and `r2.dev` for production, probe URLs with a timeout, and fail over by registry priority.
- Updated `src/lib/media.ts` to remove hardcoded Blob and `r2.dev` candidate URLs and fail closed until verified registry locations exist.

## Known incomplete work
- `src/components/CinematicWellnessExperience.tsx` still contains hardcoded Vercel Blob video URLs. It has not yet been connected to the new registry resolver. Therefore the app is not yet fully Blob-independent.
- The migration exists in Git only; it has NOT been applied to production Supabase.
- All seeded providers are disabled and unknown. No public asset locations have been inserted. No provider health probe, CDN transform test, or failover test has passed.
- No production deploy, asset rewrite, storage migration, or media-generation job was triggered.

## Required next steps
1. Remove the hardcoded cinematic Blob video URLs and resolve stable asset keys through the registry helper.
2. Run lint, type-check/build and repository-wide scan for hardcoded Blob / `r2.dev` delivery references.
3. Review and apply the migration through the approved production release path.
4. Populate provider rows only after configuration is confirmed and live health probes pass; insert asset-location rows only after URL, bytes, MIME type, checksum and rights/QA verification.
5. Verify primary failure → deterministic healthy-provider failover; verify disabled/unhealthy providers are never returned.
6. Verify `media.resofit.fit` only after Cloudflare custom-domain/origin status and real GET/HEAD probes pass.
7. Re-test digital-product factory job `1c6c9196-77fe-48ce-92c7-1429c9bf79ef` after routing is ready; marketing media does not replace the customer-facing guide.

## CEO checklist
| Gate | Status |
|---|---|
| Registry/resolver source foundation | STAGED |
| No hardcoded Blob delivery path | FAIL — cinematic UI consumer remains |
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
