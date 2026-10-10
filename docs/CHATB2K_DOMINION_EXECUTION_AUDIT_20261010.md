# ChatB2K Dominion — Execution Audit

**Audit date:** 2026-10-10  
**Scope:** Read-only production inspection after the integration plan was committed.  
**Supabase project:** `resonance-fitness` / `vbqjvmnhdtdhmeeudqnn`  
**Evidence standard:** Live control-plane responses and deployed function source; no secret values retrieved or printed.

## Verified positive evidence

- Supabase Edge Function inventory returns active deployments for `chatb2k-orchestrator` v24, `chatb2k-agent-router` v12, `resofit-ecosystem-autopilot` v26, `bigo-live-pipeline` v33, and `buffer-publisher` v84.
- The orchestrator source reads the server-side `GEMINI_API_KEY`, honors the configured `GEMINI_MODEL` with a fallback, reserves requests through `chatb2k_reserve_gemini_request`, records usage, and releases reservations. This confirms an existing Gemini inference path; it does not prove every downstream action succeeds.
- The agent router checks the global ChatB2K kill switch and restricts its direct invocation to the Supabase service-role API key. The orchestrator invokes it server-to-server.
- Vercel project `reso-web` has `resofit.fit` and `www.resofit.fit` associated. Its latest deployment was `READY`, but its target was not marked production in the returned snapshot; domain association alone does not prove a production end-to-end pass.
- The GitHub connector installation exposes selected repositories, including `shopb2k` and `chatb2k-f9d8a04d`. The returned installation data does not identify it as the specifically named `chatb2k-dominion-engine` app.
- The existing Dropbox archive verification workflow is present in `chatb2k-f9d8a04d`; it can verify refresh-token exchange, test upload/read-back/cleanup, and avoid printing credentials. No successful run ID was obtained in this audit.

## Current blockers / risks requiring controlled remediation

1. **Supabase security advisor warnings remain.** Live advisor response observed at `2026-10-10T21:30:37.446Z`:
   - `extension_in_public`: 1 warning (`pg_net` installed in `public`).
   - `authenticated_security_definer_function_executable`: 12 findings. One example is `public.build_experience_page(...)`; each finding must be inspected against intended call sites before changing grants.
   - `auth_leaked_password_protection`: 1 warning (compromised-password protection not enabled).
   These are not fixed by this document. Do not blindly revoke execute privileges or relocate an extension without dependency/call-site checks.
2. **No confirmed Dominion gateway was found by repository code search.** This is not proof no route exists; the search returned no indexed matches. Inspect the canonical route tree and deployed source before adding a new gateway.
3. **Orchestrator public discovery endpoint has wildcard CORS.** The revenue/orchestration mode performs an internal viewer check; the ordinary discovery path is separately handled. Review allowed origins and caller expectations before changing CORS, because a global tightening can break existing public customer flows.
4. **Production promotion is not proven by the current Vercel snapshot.** The latest `reso-web` deployment was READY with a non-production target in the returned metadata. Verify the actual production alias and canonical domain response before claiming production readiness.
5. **GitHub App identity and least-privilege permissions are not verified.** Do not mint a broad personal admin token as a workaround.
6. **BIGO → Dropbox remains unverified end-to-end.** Keep Blob-backed ingestion unchanged until Dropbox canary upload, checksum/read-back, asset-registry reference, and downstream fetch are all proven.

## Change boundary

This audit is documentation-only. No production function, schema, RLS policy, secret, Vercel setting, workflow, or public post was changed. The plan and this audit must not be treated as a deployment or as a 100% readiness certificate.

## Next execution order

1. Inspect the 12 security-definer findings and dependent application call sites; patch only confirmed unintended grants in a migration/branch.
2. Verify canonical production deployment/alias and run non-destructive endpoint smoke tests.
3. Identify the actual GitHub App by its app identity and permissions; use least-privilege installation tokens.
4. Run the existing Dropbox verification workflow and capture its run ID, then do a private media canary without publishing.
5. Reconcile agent registry IDs and health evidence; separately test inference, authorized execution, and business outcomes.
