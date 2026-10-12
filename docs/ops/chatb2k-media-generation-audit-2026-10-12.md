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


## Deep follow-up — direct orchestrator and digital deliverables (2026-10-12)

### Direct Gemini usage by chatb2k-orchestrator

- Active production source retrieved: v26, SHA-256 `640e753ca233bd727aa5c5f68cee4d4502bf101afe037d9d93899efcfbac52ca`.
- Source contains `geminiEnrich()`, reads `GEMINI_API_KEY`, defaults model to `gemini-3.1-flash-lite`, reserves through `chatb2k_reserve_gemini_request`, and calls the Gemini `generateContent` endpoint. The main revenue-intelligence response invokes the helper.
- Despite that source capability, the direct usage ledger has **0 rows** for `chatb2k-orchestrator`. The helper only inserted a ledger row on success; missing key, admission denial, provider HTTP errors, JSON parse failures, and network errors were not recorded as usage rows. The empty ledger therefore cannot distinguish “not invoked” from “invoked but failed before successful ledger insert.”
- At query time, the global Gemini usage ledger held 70 records for the current UTC day and 1,160 for the current month; no active admission reservations existed. The configured caps were 100 requests/day and 2,000/month. These counts do not show that either cap was exhausted at query time.
- The Gemini budget row has `enabled=true`, daily limit 100, monthly limit 2,000, and both cost-limit fields set to `0.00`. The inspected reservation RPC gates on request counts and active reservations; it does not read the cost-limit fields.
- A source-only telemetry patch was added to this branch at `supabase/functions/chatb2k-orchestrator/index.ts`. It records provider HTTP failures and JSON parse failures in the usage ledger, logs missing-key/admission-denial reasons without charging a quota row, records latency, and reports usage-ledger write failures. It is not deployed.
- Exact verification after deployment: issue one controlled, non-publishing orchestrator request; inspect its response `gemini_enrichment.ok/reason`, correlated function log, and matching `chatb2k_gemini_usage` row. Do not expose API keys or full prompts in logs.

### Media and document generation inventory

- Existing registry counts are primarily source assets: catalog images (466 PNG/JPEG), BIGO video (48), asset-manifest video rows (35), Vercel Blob vault video (15), Martial-X images (14), legacy Blob video (4), and music-library metadata rows (2). None of these counts alone proves AI generation.
- `music_library` contains “808 High Energy” and “Ascension Digital Space”, but the rows only provide storage path metadata (`doc/audio/*.mp3`); no verified object or generator lineage was returned by this audit. Do not claim these were generated by Gemini.
- Academy currently has 4 published, unarchived courses and 9 published lessons. The nine lesson bodies inspected are only 123–213 characters each. This proves lesson records exist, not that comprehensive downloadable academy materials/PDFs were generated.
- The queried public schema did not reveal dedicated tables for meal plans, workout plans, PDFs, ebooks, or document-generation jobs; this is a scoped schema search, not proof that no files exist in external stores.
- Storage object enumeration returned no rows through the current SQL access path, so it cannot establish whether media files exist in external Blob, Dropbox, ImageKit, or other providers.

### Exact blocker and fix for RESO-DIG-LIFE-001

- Factory job: `1c6c9196-77fe-48ce-92c7-1429c9bf79ef`, SKU `RESO-DIG-LIFE-001`, status `awaiting_ingest`, provider `google_flow`, version 1, 7 required slots, `asset_count=0`, `approved_asset_count=0`, no attached factory asset rows.
- Its persisted `generation_spec.free_tier.mode` is `ai_studio_manual`; `media_generation` explicitly says `manual_ai_studio_flow_required`. It is a blueprint awaiting human-created media and ingestion, not a queued automatic generation job. The Flow gate is enabled but its three recorded events all failed before output; one explicitly reports `BLOB_READ_WRITE_TOKEN_missing`.
- The factory Gemini key getter returned configured=true. The direct factory generator's source has a different supported route: authenticated `digital-product-media-generator` action `start` then `poll`. It generates images via the Interactions API, submits Veo video operations, downloads completed video bytes, stores outputs in the Supabase Storage bucket `digital-product-media`, registers each file in `content_asset_registry`, and attaches it to `digital_product_factory_assets`.
- The direct generator checks admin authorization (CEO user or admin/moderator, or time-bounded HMAC internal-worker headers), requires `job_id`, and has no observed run against this job. Do not call it anonymously or expose the factory key.
- **Preferred fix:** choose one path explicitly. (A) Keep the free-tier/manual Flow path: restore/configure the expected Blob write token in the Flow function, generate the required assets in AI Studio/Flow, ingest each actual file and verify its public URL, rights/QA, and factory attachment; or (B) use the already-active direct factory generator with an authorized admin/internal worker and the existing job ID: `action=start`, then poll with `action=poll` until required slots complete. The direct factory route uses Supabase Storage, so the Flow function's Blob token failure is not automatically its blocker.
- Before starting path B, verify the available Gemini/Veo model entitlement and storage write permission with a single controlled job/slot; the deployed `start` action attempts all unstarted slots in one call (5 video + 2 image slots) and may incur provider usage. Do not mark the package complete until every required slot is attached and reviewed.
- After media attachment, build and attach the actual digital guide/plan deliverable (content is not in the seven media slots), then validate PDF/document bytes, product SKU, entitlement/fulfillment path, and user-facing canonical product page. The existing media package is marketing media; it does not itself generate the 7-day meal/workout plan content.

### Follow-up release gates

1. Deploy the orchestrator telemetry patch only after type-check/build review.
2. Make one controlled orchestrator request and establish direct Gemini result + ledger row.
3. Choose Flow/manual versus direct factory generator for `RESO-DIG-LIFE-001`; do not run both paths concurrently.
4. Verify one image and one video file in storage, corresponding registry rows, factory attachments, and signed-off QA before running all seven slots.
5. Separately create/verify the customer-facing meal/workout guide (PDF/document), academy lesson depth, and any audio/music deliverable; never infer those from marketing-media slots.
