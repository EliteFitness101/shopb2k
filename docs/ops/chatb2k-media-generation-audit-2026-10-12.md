# ChatB2K content pipeline remediation and generation evidence — 2026-10-12

## Scope and release rule

Production project: Supabase `resonance-fitness` (`vbqjvmnhdtdhmeeudqnn`).
Operating rule: Audit → Additive Patch → Verify. This branch is not deployed to production. Do not merge or deploy until syntax/build checks and controlled runtime verification pass.

## Source/runtime defects patched in this branch

1. `buffer-publisher`: accept the watchdog's existing `x-content-cron-secret` header, validated against the same cron secret, while retaining the `x-buffer-cron-secret` and service-role bearer paths.
2. `buffer-publisher`: isolate Telegram fanout failures after a successful Buffer post so child-provider errors do not turn a successful parent publish into a 500. Add a stable fanout key to child metadata and check for an existing child before inserting.
3. `content-asset-ingestion`: a public URL / successful fetch proves technical reachability, not ownership, licence, or commercial permission. Ingested Blob media remains `rights_status=unknown`, `commercial_status=pending_review`, `qa_status=pending` until evidence is supplied.
4. `content-intelligence-enricher`: generated text cannot advance an asset to publish-eligible unless rights and commercial statuses are in the publisher's allowlists.
5. `resofit-ecosystem-autopilot`: select only assets whose rights and commercial statuses satisfy the same allowlists.
6. `supabase/config.toml`: record the deployed function JWT settings for the mirrored sources.

The branch mirrors the active runtime sources so the proposed patch is reviewable in the canonical `shopb2k` repo. This does not alter deployed Edge Functions.

## Runtime evidence observed on 2026-10-12

- `chatb2k-orchestrator`: ACTIVE v26. Its code can call Gemini `generateContent` for structured text intelligence, but `chatb2k_gemini_usage` contains zero rows attributed to this function in the queried history. Therefore, current Gemini use by the customer-facing orchestrator is code-capable, not usage-proven.
- `content-intelligence-enricher`: ACTIVE v33; model `gemini-3.1-flash-lite`. Usage ledger showed 95 successful calls / 77,179 tokens and 3 HTTP 503 failures in the last 24 hours at query time; 1,784 successful calls / 1,421,175 tokens and 171 HTTP 503 failures over the queried 30-day window.
- `resofit-ecosystem-autopilot`: ACTIVE v27; usage ledger showed one successful generation call in the last 24 hours and 189 successful calls in the 30-day query.
- The asset registry had 584 records at query time. 52 carried ChatB2K-generated metadata; 5 had non-empty generated variant arrays. This proves some text enrichment, not that every asset is rights-cleared or publishable.
- The queue included actual ChatB2K/Gemini-generated text entries, including 114 Telegram rows marked published. Telegram publish logs showed 125 successful provider records, latest at 2026-10-12 15:00 UTC. Repeated titles/provider IDs in recent rows require duplicate-delivery investigation; do not count these as 125 unique creative assets.
- `flow_generation_events`: 3 events, all failed; the most recent reason was `BLOB_READ_WRITE_TOKEN_missing`. No generated video/image output URL or completed event was evidenced.
- `digital_product_factory_jobs`: one job for SKU `RESO-DIG-LIFE-001`, status `awaiting_ingest`; no attached factory assets were returned by the job status query. Its generation spec explicitly requires manual AI Studio / Flow media creation and ingestion.
- Registry audio rows: 2 from `music_library`, with no HTTPS URL and no ChatB2K metadata. These are source-library records, not proof of generated audio.
- Existing catalog image rows are present, but the generation event ledger did not prove that the image generator created them.

## Required sign-off tests (not yet run)

- Type-check/lint/build the branch and compare mirrored function snapshots to the active runtime hashes.
- Verify watchdog invocation reaches `buffer-publisher` without 401 using the configured cron secret, without printing secrets.
- Verify ECHO V13's new Gemini/media health summary records ledger successes/errors and Flow failures without initiating unbounded generation retries.
- In a controlled test, force Telegram fanout to fail after Buffer success and confirm parent stays successful, child error is logged, and retry does not duplicate the parent post or child job.
- Confirm unknown/pending rights remain ineligible across ingestion, enrichment, autopilot, and publisher.
- Run one explicitly rights-cleared asset through each applicable platform's QA, then verify actual provider post IDs and public URLs.
- Restore a valid media-output storage token/provider, run one Flow video and one image job, verify persisted output bytes/URL, and attach them to the digital-product factory job.
- Inspect the repeated Telegram provider IDs and establish idempotency before scaling fanout.

## Current release decision

HOLD. Source patches are staged for review only. No production deployment, rights-status rewrite, publish retry, or generated-media claim is authorized by this branch.
