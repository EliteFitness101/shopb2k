# ChatB2K Dominion Engine — Integration Plan

**Status:** Proposed additive implementation plan; not production deployment evidence  
**Date:** 2026-10-10  
**Canonical public domain:** https://www.resofit.fit  
**Canonical Supabase:** resonance-fitness / vbqjvmnhdtdhmeeudqnn

## Executive decision

Do not deploy the supplied `ecosystem_bridge.ts` as-is. Extend the existing ChatB2K orchestration/provider-routing architecture and retain the existing commerce, catalog, payment, fulfillment, and entitlement authorities. Implement one narrow, authenticated action gateway only if repository/runtime inspection confirms a genuine gap.

Gemini is an inference provider, not an infrastructure administrator. It may propose a typed action; a policy-enforcing executor must authorize, perform, verify, and audit it.

## Canonical ownership boundaries

- `shopb2k`: primary customer experience, conversion surfaces, and route ownership.
- ChatB2K: intent interpretation, recommendation, orchestration, provider routing, and learning events.
- Supabase `resonance-fitness`: canonical business and workflow state; use existing registries and contracts.
- ResoCatalog / `public.products` and product intelligence: canonical product and recommendation data authority.
- Paystack verified webhook + Supabase ledger: payment verification and revenue state.
- Content Engine + Buffer: approved content distribution; not business-state authority.
- Dropbox `/ResoFit/BIGO/`: archive target for raw captures, metadata, processed assets, and logs.
- Vercel/Cloudflare: execution and edge delivery only where existing ownership and runtime evidence justify it.
- ImageKit/Cloudinary: asset delivery/transformation providers, not duplicate asset or product truth.
- Google Drive: optional archive destination only if its connector and credentials are verified; do not assume access.

## GitHub App security design

Create or verify the specifically named `chatb2k-dominion-engine` app in GitHub Developer Settings. The currently visible GitHub connector installation is not sufficient evidence that this named app exists or has the required permissions.

Recommended initial permissions:
- Repository metadata: read-only.
- Contents: read-only initially; write only for repositories and workflows that need automated commits.
- Actions/workflows: read-only initially; grant Actions write only if a narrowly scoped automation needs to dispatch or cancel runs.
- Pull requests: write only if the automation opens PRs.
- Webhooks: subscribe only to required events; validate HMAC signatures, timestamps, and delivery IDs.

Prefer short-lived GitHub App installation tokens over a broad personal admin token. Do not create or distribute `GH_ADMIN_TOKEN` as the default architecture. Keep private keys and webhook secrets in the secret store of the service that uses them; never expose them to Gemini prompts, browser code, logs, or database rows.

## Secret placement matrix

| Credential | Consumer | Guardrail |
|---|---|---|
| `GEMINI_API_KEY` | Existing ChatB2K model-provider integration | Server-side only; budget, timeout, model allowlist, redaction |
| GitHub App private key / App ID / installation ID | Dedicated GitHub action executor | Short-lived installation tokens; repository allowlist; audited actions |
| GitHub webhook secret | Webhook ingress | HMAC verification, replay protection, idempotency |
| Supabase service-role key | Trusted server-side functions only, if strictly necessary | Never client-side; prefer scoped/RLS-protected operations |
| Cloudflare API token | Specific worker/deployment executor | Zone/account/resource-scoped token, not global account access |
| Cloudinary / ImageKit secrets | Asset adapter that requires them | Least privilege; signed uploads; never return private keys |
| Buffer token | Existing publisher adapter | Approved queue only; rate-limit handling; idempotency |
| Dropbox refresh token / app credentials | Dropbox archive adapter | Server-side only; chunked upload sessions for large media |
| Google Drive OAuth credentials | Drive adapter only if connected and tested | Refresh-token rotation, least scopes, explicit health test |

Do not copy all secrets into both Vercel and Cloudflare by default. Place each secret only where the owning adapter executes. Document owner, environment, rotation date, and last successful non-destructive test without logging secret values.

## Gateway contract

If a new gateway is justified after inspection, expose a small typed allowlist, not an arbitrary tool proxy. Example actions:
- `parse_intent`: inference only; no side effects.
- `sync_catalog`: enqueue a validated sync using canonical catalog source; return a job ID and later verified result, never a fabricated “synced” success.
- `request_deployment`: create an approval-gated GitHub Actions dispatch for an allowlisted workflow/ref.
- `log_habit`: authenticated, schema-validated, user-scoped write with RLS and idempotency.

Every request must have authentication, authorization, input schema validation, rate limits, correlation ID, idempotency key, timeout, bounded retries, redacted audit logs, and a structured response separating `accepted`, `executed`, `verified`, and `failed`. Validate origin/CSRF policy where cookie authentication is used. Never trust a browser-supplied role or user ID.

The sample bridge is incomplete because catalog sync is a stub, only one action is implemented, it lacks authentication and authorization, returns upstream inference data without a normalized contract, does not validate Gemini HTTP status, and treats error text too freely. It also uses an old model identifier; use the currently configured and tested provider route rather than hardcoding a model.

## BIGO Dropbox migration — explicit dependency chain

Current audit evidence: Dropbox folders exist but no archived BIGO files were found; BIGO highlight records were 29 pending, 13 failed, and 1 posted; the capture path still relies on Vercel Blob URLs for downstream ingestion. Therefore:
1. Keep current ingestion operational until a replacement is verified.
2. Implement Dropbox chunked uploads, including files larger than 150 MB, checksums, resumability, and retry-safe upload sessions.
3. Write metadata sidecars with host ID, capture timestamp, source URL/reference, file size, checksum, pipeline version, and correlation ID. Never store access tokens in sidecars.
4. Persist archive provider, path, checksum, and stable media reference in the existing asset registry using additive schema/contract changes.
5. Update ingestion and publisher adapters to accept a verified media-reference abstraction; validate Buffer's actual fetchability and permissions. Do not assume a Dropbox share link is a direct public media URL.
6. Run a private/non-publishing canary; verify bytes/checksum, metadata, registry state, and downstream fetch. Only then switch routing and stop new BIGO Blob uploads.
7. Keep rollback available until a full capture → archive → ingest → approved queue → publish test and a separate public-post approval are complete.

## Agent and intelligence control model

The “72 agents = 12 generals × 6” model is a target topology, not proof that 72 agents are operational. Current audit found 97 enabled registry records, 25 marked healthy, and 72 without `last_tested_at`. Do not infer those 72 are failed or healthy. Reconcile agent IDs, capabilities, policy scopes, model routes, heartbeat/test evidence, and router candidates before changing routing.

Measure four distinct layers:
1. **Intelligence:** intent accuracy, recommendation quality, provider success/latency/cost.
2. **Execution:** authorized task accepted, action started, completed, and independently verified.
3. **Business outcome:** qualified lead, checkout, verified payment, fulfillment, retention, net revenue.
4. **Governance:** denied unauthorized actions, audit completeness, secret redaction, retries, duplicate prevention, rollback readiness.

A generated plan or Gemini response is never counted as an executed action or business outcome.

## Acceptance gates

- [ ] Named GitHub App identity and installation verified; repository selection and permissions documented.
- [ ] Secret inventory verified by names and consumer locations only; no secret values printed.
- [ ] Gateway threat model and action allowlist reviewed.
- [ ] Unit tests for schemas, authentication, authorization, idempotency, retries, and error normalization.
- [ ] Non-destructive GitHub workflow dispatch/test verified with run ID and logs.
- [ ] Supabase RLS and service-role usage reviewed; no broad client privileges introduced.
- [ ] Dropbox upload/read-back/checksum verified for small and >150 MB files.
- [ ] BIGO asset trace verified from capture to archive and registry, without public posting.
- [ ] Buffer test validates media fetchability without publishing publicly; approved canary only after explicit operational review.
- [ ] Gemini action proposal cannot bypass the executor's policy checks.
- [ ] Payment, fulfillment, and attribution are tested against existing canonical flows, without duplicate engines.
- [ ] Rollback and alerting documented; production claims tied to runtime evidence and timestamp.

## Current execution limits and next actions

This document is an additive plan only. It does not assert that the named GitHub App has been created, that any secrets exist, that a gateway has been deployed, or that a Dropbox migration has completed. Next: verify the GitHub App identity and permissions, inspect existing gateway/provider routes, implement the smallest required additive change on a branch, run non-destructive tests, and only then request production promotion.
