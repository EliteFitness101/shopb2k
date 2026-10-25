# ResoFit / ChatB2K Ecosystem Operating Contract

**Purpose:** Shared synchronization rules for new chats, agents, developers, and DevOps operators. This document is a coordination contract; it does not itself prove that production services are active.

## Canonical source-of-truth map

- Storefront repository: `EliteFitness101/shopb2k`
- ChatB2K application: `EliteFitness101/chatb2k-f9d8a04d` (also audit the separately existing `EliteFitness101/chatb2k`; do not assume the duplicate is safe to archive)
- CEO dashboard: `EliteFitness101/reso-dash`
- Elite NG: `EliteFitness101/elite101`
- Canonical public site: `https://www.resofit.fit`
- API direction: `https://resofit.fit/api/`
- Media delivery: `https://media.resofit.fit`
- Media upload: `https://upload.resofit.fit`
- R2 bucket expected for primary media: `resofit-cdn`, binding `MEDIA_BUCKET`
- Existing R2 write authorization variable: `R2_WRITE_TOKEN` (never expose its value)

## Shared records

Use the existing production records where available, including ecosystem source registry, event contracts, engine registry, dashboard entitlements, agent registry, publisher organization/channel records, and event attribution. Before creating a record, search for an existing key or equivalent contract. Keep IDs stable and retain a change history.

Each execution/audit record should include:
- `audit_id`, `timestamp_utc`, `owner`, `repository`, `branch`, `commit_sha`
- `deployment_id`, `environment`, `domain`, `route`, `service`
- `source_registry_id`, `event_contract_id`, `rsid`, `session_id`, `utm_source`, `utm_medium`, `utm_campaign`
- `action`, `status`, `evidence_level`, `evidence_uri`, `error_code`, `next_action`, `recovery_plan`

Use the status taxonomy in `AGENTS.md`. Do not insert simulated success telemetry as production evidence.

## Media ingest contract

- Upload endpoint: `POST https://upload.resofit.fit/api/ingest-media?key=<object-key>`
- Request body: raw binary media, not JSON containing an arbitrary remote URL.
- Authentication: Supabase bearer token for an administrator; server-side `R2_WRITE_TOKEN` is used only to authorize the upstream R2 write.
- Object key namespace: `public/<path>` or `chatb2k/<path>`.
- Allowed media types and size limits are enforced by the route.
- Success response must include `ok: true`, key, size, and the canonical public media URL.
- Delivery is verified separately with a GET to the returned public URL. A successful POST alone is not enough.
- A failed R2 write must return failure; do not report success or enqueue a publish job as though the asset were available.
- This route accepts uploaded bytes and intentionally does not fetch arbitrary `mediaUrl` values. Capture agents should stream/download their selected source and POST the bytes, avoiding an unrestricted server-side URL fetch/SSRF path.

## Publisher router contract

Model every publisher as an independent target tuple: `provider + organization_id + channel_id + capability + credential reference + health + rate-limit state`. Verify provider-reported IDs; never infer or reuse one organization's channel ID in another organization.

Required operations: list/verify, get capabilities, enqueue, schedule, publish, sync status, archive, retry, and audit. Select only eligible targets that support the media/content type and action. Use per-target idempotency keys, bounded retries with backoff, and independent circuit breakers. A rate limit or failure on one organization/channel must not cancel jobs for other targets. Record each target result independently, with a final fan-out summary.

Before publishing, verify that the asset is readable, the target channel is connected, the destination URL carries the correct UTM/RSID attribution, and platform-specific metadata is complete. Do not infer successful publication from queue acceptance.

## Visitor assistant and attribution

The visitor experience should ask for intent or a search/context query, then route to verified internal pages, product metadata, or provider endpoints. Preserve existing UTM parameters and RSID across internal links, checkout, external commerce, and follow-up events. Never claim a payment or external marketplace integration is connected unless its current record and a live transaction/test prove it.

Use accessible pill CTAs and responsive luxury cards; honor reduced-motion preferences. Background video may autoplay only muted; unmuting must be user-initiated because browsers restrict audible autoplay. Default audio to off and volume to 33% only after explicit interaction.

## Current evidence ledger — 2026-10-25

- GitHub confirms `EliteFitness101/shopb2k` exists, default branch `main`.
- The repository contains a Cloudflare R2 binding `MEDIA_BUCKET` mapped to `resofit-cdn` and route patterns for `media.resofit.fit` and `content.resofit.fit` in its current `wrangler.jsonc`.
- The source `src/server.ts` handles media reads/writes only when hostname is `media.resofit.fit` or `content.resofit.fit`; upload hostname dispatch must remain routed to the application/API handler.
- GitHub Actions run `40155343154` failed during Cloudflare deploy with `No access to the specified service`.
- GitHub Actions run `40155343151` found 45/65 product URLs returned HTTP 200; 20 returned 404.
- GitHub Actions run `40155343123` failed at `npm ci --include=dev` before build.
- Buffer connector returned a rate-limit response; connected organization/channel state was not verified in this run.
- These are active blockers, not fixed items. Re-run each check after patch/deploy and update this ledger with new evidence.

## Required verification after merge

1. Confirm Cloudflare API token scope and access to Worker service `shopb2k`; do not rotate or replace credentials without checking the existing secret and account context.
2. Deploy and confirm `upload.resofit.fit` route resolves to the production Worker and API handler.
3. Verify authenticated upload rejects anonymous/invalid users, writes a controlled media object, and returns a readable CDN URL.
4. Reconcile the 20 failed product handles against the canonical product source, then rerun the complete 65-page smoke test.
5. Fix the npm lock/install issue only after comparing `package.json`, `package-lock.json`, and the lockfile used by the active deployment.
6. Audit every BIGO capture workflow without restricting host inventory; verify recent source capture, upload response, R2 object existence, CDN GET, and archive fallback independently.
7. Verify each publisher organization/channel and failure isolation; verify Buffer connection after its rate limit resets.
8. Update the ecosystem registry/event contracts and audit record with real IDs and results; do not mark production active based only on this document.
