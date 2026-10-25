# Private multi-media digital delivery — 2026-10-17

## Scope
Review-only mirror of active `digital-product-delivery-worker` v8. The PDF delivery path remains primary and unchanged; this patch adds an optional ZIP bundle containing the PDF and approved media assets.

## Bundle policy
- Only factory assets attached to a job for the purchased product SKU are considered.
- Media is included only when `qa_status=approved`, `rights_status=verified`, `commercial_status=authorized`, and MIME type is explicitly allowlisted.
- Source downloads are restricted to HTTPS URLs on the project's Supabase public Storage host or Vercel Blob's public host. Redirects are rejected.
- Limits: 10 assets, 20 MiB per asset, 60 MiB total bundle. The ZIP is written into the existing private `resofit-paid-deliverables` bucket and gets a 7-day signed URL.
- The normal private PDF link remains available even if optional bundle creation fails. The failure is recorded in delivery-job provenance and response metadata; the worker does not claim a bundle was delivered.
- Payment success, SKU match, published canonical product, and digital fulfillment checks run before any media is packaged.

## Current production limitation
The current factory job for `RESO-DIG-LIFE-001` has `asset_count=0` and `approved_asset_count=0`; therefore this code will continue to deliver the existing PDF only until real media is generated, ingested, rights-cleared, and approved. This code does not manufacture or fabricate asset rows.

## Required verification before promotion
1. Deno type-check and unit-test the MIME, URL-host, size, and approval filters.
2. Test zero eligible media, approved image, video, audio and document, blocked rights/QA states, hostile URL/redirect, mismatched MIME, oversized asset, storage failure, and signed-link failure.
3. In staging, buy a test product through the existing Paystack flow, verify the canonical successful payment row, and confirm PDF and optional bundle download only for that entitlement.
4. Verify private storage ACLs and 7-day signed link expiry. Never expose raw source URLs as customer download links.
5. Confirm the delivery worker's cron remains authenticated and existing Paystack webhook/order/entitlement logic is untouched.

## Release status
Review-only. No production deployment, schema change, payment, generation, or customer email was executed.
