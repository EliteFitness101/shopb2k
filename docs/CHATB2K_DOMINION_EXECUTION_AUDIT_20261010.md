# ChatB2K Dominion — Execution Audit

**Audit date:** 2026-10-10  
**Scope:** Read-only production inspection after the integration plan was committed.  
**Supabase project:** `resonance-fitness` / `vbqjvmnhdtdhmeeudqnn`  
**Evidence standard:** Live control-plane responses and deployed function source; no secret values retrieved or printed.

## Verified positive evidence

- Supabase Edge Function inventory returns active deployments for `chatb2k-orchestrator` v24, `chatb2k-agent-router` v12, `resofit-ecosystem-autopilot` v26, `bigo-live-pipeline` v33, and `buffer-publisher` v84.
- The orchestrator source reads the server-side `GEMINI_API_KEY`, honors the configured `GEMINI_MODEL` with a fallback, reserves requests through `chatb2k_reserve_gemini_request`, records usage, and releases reservations. This confirms an existing Gemini inference path; it does not prove every downstream action succeeds.
- The agent router checks the global ChatB2K kill switch and restricts its direct invocation to the Supabase service-role API key. The orchestrator invokes it server-to-server.
- Vercel canonical-domain lookup resolves `www.resofit.fit` to deployment `dpl_2Q86YnanEVGdTzYxTK7qN2vzRiGV`: state `READY`, target `production`, aliases include `resofit.fit` and `www.resofit.fit`, source commit `8e70cab95bd2137e16563b87eabe960d708284f8` on `main`, and `aliasError=null`. This verifies a production deployment/alias association; it does not substitute for customer journey smoke tests.
- A separate deployment created from the documentation branch is also READY, but has only a branch-preview alias and target `null`; it is not treated as production.
- The GitHub connector installation exposes selected repositories, including `shopb2k` and `chatb2k-f9d8a04d`. The returned installation data does not identify it as the specifically named `chatb2k-dominion-engine` app.
- **Dropbox credential and folder-write smoke test passed.** GitHub Actions run `38088031977` on isolated branch `ops/dropbox-bigo-archive-smoke-20261010` completed with conclusion `success` at `2026-10-10T21:32:51Z`. The job successfully exchanged the stored refresh token, uploaded a temporary test file to `/ResoFit/BIGO/logs/`, read back metadata, and deleted the test file; no credential values were printed. Evidence: https://github.com/EliteFitness101/chatb2k-f9d8a04d/actions/runs/38088031977. This proves small-file Dropbox connectivity and write/read/delete permission only—not media chunking or the complete BIGO→ChatB2K→Buffer path.
- Existing `scripts/bigo-capture-host.sh` already has an optional Dropbox copy for raw video, processed video, cover, and JSON metadata, but it uploads through Dropbox's single-request endpoint and skips any file over 150 MiB. It uploads to Vercel Blob first, and the resulting highlight continues to use `blob_url` as its downstream media reference. Thus Dropbox is an archive copy, not yet the replacement source of truth or a proven Blob disconnect.

## Current blockers / risks requiring controlled remediation

1. **Supabase security advisor warnings remain.** Live advisor response observed at `2026-10-10T21:30:37.446Z`:
   - `extension_in_public`: 1 warning (`pg_net` installed in `public`).
   - `authenticated_security_definer_function_executable`: 12 findings. A read-only SQL check confirms all 12 can be executed by the `authenticated` role and none of those 12 can be executed by `anon`. Several definitions contain explicit role/ownership checks, e.g. `build_experience_page`, `get_admin_farm_clients`, and `elite_host_dashboard`; nevertheless, every function and its intended caller must be reviewed before changing grants.
   - `auth_leaked_password_protection`: 1 warning (compromised-password protection not enabled).
   These are not fixed by this document. Do not blindly revoke execute privileges or relocate an extension without dependency/call-site checks.
2. **No confirmed Dominion gateway was found by repository code search.** This is not proof no route exists; the search returned no indexed matches. Inspect the canonical route tree and deployed source before adding a new gateway.
3. **Orchestrator public discovery endpoint has wildcard CORS.** The revenue/orchestration mode performs an internal viewer check; the ordinary discovery path is separately handled. Review allowed origins and caller expectations before changing CORS, because a global tightening can break existing public customer flows.
4. **Production deployment is verified; customer journey readiness is not.** The canonical domain resolves to a READY production deployment, but no end-to-end checkout, payment, fulfillment, ChatB2K action-executor, or Dropbox archive canary was proven by this audit.
5. **GitHub App identity and least-privilege permissions are not verified.** Do not mint a broad personal admin token as a workaround.
6. **BIGO → Dropbox migration is only partially verified.** The small-file Dropbox smoke passed, and the capture script has a best-effort archive copy; files over 150 MiB are skipped, content bytes/checksum are not verified on read-back, and downstream ingestion still depends on `blob_url`. Keep the Blob path operational until chunked upload, content checksum/read-back, registry update, and downstream media fetch are proven.

## Change boundary

This audit is documentation-only. No production function, schema, RLS policy, secret, Vercel setting, workflow, or public post was changed. The plan and this audit must not be treated as a 100% readiness certificate.

## Next execution order

1. Inspect the 12 security-definer findings and dependent application call sites; patch only confirmed unintended grants in a migration/branch.
2. Run non-destructive canonical-domain and customer journey smoke tests; verify each stage from inference through authorized execution and business outcome.
3. Identify the actual GitHub App by its app identity and permissions; use least-privilege installation tokens.
4. Extend Dropbox upload to resumable/chunked large-file handling and checksum verification; run a private media canary, then prove the existing asset-registry and publisher can fetch the archived media without public posting.
5. Reconcile agent registry IDs and health evidence; separately test inference, authorized execution, and business outcomes.
