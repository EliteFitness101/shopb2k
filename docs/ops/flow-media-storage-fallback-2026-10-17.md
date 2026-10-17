# Flow media storage fallback — 2026-10-17

## Scope
Review-only mirror of active `flow-generation-gate` v14. This patch does not deploy the Edge Function or change secrets, data, schema, or production storage settings.

## Fix proposed
- Vercel Blob remains the preferred storage path when its write token is configured.
- If the token is absent or the Blob upload fails, the generated MP4 is uploaded to the existing `digital-product-media` Supabase Storage bucket using the function's existing service-role client.
- If the bucket does not exist, the code attempts to create it as public, matching the existing digital-product media generator's current storage behavior.
- The selected provider/path is recorded in asset intelligence and flow-generation event metadata.
- Generation remains blocked when the Gemini key is missing. A successful provider response is not treated as complete unless storage upload and registry persistence succeed.

## Required verification before production promotion
1. Type-check/lint the mirrored function.
2. In a non-production project, test Blob token present and valid, token absent with Storage writes allowed, and Storage write failure.
3. Verify each success has a retrievable MP4, non-empty canonical URL, registry row, completed flow event, fingerprint, and storage-provider metadata.
4. Verify upload failures produce a failed event and no completed asset.
5. Confirm the target bucket's public/private policy with the data owner. This uses public media URLs consistent with the marketing-media pipeline; it must not be reused for paid/private customer deliverables.
6. Confirm kill-switch state and generation budget before running a controlled test.

## Release status
Review-only. No generation call, secret change, bucket mutation, or production deployment performed.
