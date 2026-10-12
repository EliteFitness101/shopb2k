# ResoFit API ownership and endpoint contract

**Audit date:** 2026-10-12  
**Decision:** One public application API surface; no second public API authority is approved.

## Canonical ownership

- **Website and same-origin application endpoints:** `https://www.resofit.fit/api/*` (with apex `https://resofit.fit` retained as a supported site alias during canonical redirects). The `reso-web` Vercel project owns the public website domains `www.resofit.fit` and `resofit.fit`. TanStack server routes in `shopb2k` define endpoint handlers and must be deployed with the website build.
- **Recommendation / assessment backend:** canonical Supabase project `resonance-fitness`, ref `vbqjvmnhdtdhmeeudqnn`; the assessment frontend invokes `chatb2k-recommend` directly. Do not route it through a second Vercel API service unless an explicit architecture decision and consumer migration are approved.
- **ChatB2K orchestration:** Supabase Edge Functions and their registered endpoints remain the integration/control plane. Website server routes own same-origin web actions; commerce still owns payment, fulfillment, pricing and entitlement truth.

## Source-confirmed same-origin route examples

These route files are present in `EliteFitness101/shopb2k`:

- `src/routes/api.cart.ts` → `POST /api/cart`
- `src/routes/api.makaveli.checkout.ts` → `POST /api/makaveli/checkout`
- `src/routes/api.makaveli.verify.ts` → `GET /api/makaveli/verify`
- `src/routes/api.makaveli.booking.ts` → `POST /api/makaveli/booking`
- `src/routes/api.resonance.checkout.ts` → `POST /api/resonance/checkout`
- `src/routes/api.resonance.booking.ts` → `POST /api/resonance/booking`
- `src/routes/api.asset-sync-cron.ts` → `GET /api/asset-sync-cron` (Vercel cron is configured in `vercel.json`)
- `src/routes/api.content.publish-cron.ts` → `GET /api/content/publish-cron`

These examples establish that `/api/*` is not a single duplicate API root; it is a set of same-origin server handlers. Each handler still requires production smoke tests and correct secrets/authorization.

## Legacy projects and hostnames: do not treat as canonical

### Vercel project `resofit-api`

- Vercel project ID: `prj_b6IVjIos1q2RaXhihICrhj5hEOgL`.
- Project reports `live: false`; its listed deployments are ERROR.
- The latest failed production deployment is `dpl_3ib1PBmuzE9EcGeefbGMdt33vFFF`, commit `ba033d7ccc54ea70ec080ddcf0e6404d1ec27dc4`, message `Update requirements.txt`.
- Its Vercel domain list contains only Vercel-hosted aliases, not `api.resofit.fit`. No GitHub repository named `resofit-api` was found in the connected `EliteFitness101` repository search.
- **Disposition:** orphan/duplicate candidate; do not call it an active production API. Keep it undeleted until deployment source, access logs, external consumers, and secrets are checked. If no consumers exist, archive/remove it in a separate approved decommission step.

### Hostname `api.resofit.fit` and repository `resoflex-intelligence-node`

- Connected Vercel project/domain inventory did not show `api.resofit.fit` attached to a Vercel project.
- GitHub search found the hostname in `EliteFitness101/resoflex-intelligence-node`, whose scaffold's `build_node.sh` declares `api.resofit.fit` as an alias and rewrites requests to `/api/*.js`.
- The repo's `api/stats.js` returns static illustrative counters. A requested `api/index.js` was not found on `main`; the repo's `vercel.json` search result was a handler body, not proof that DNS/deployment is live.
- Live external DNS/HTTP confirmation was unavailable during this audit. Therefore the hostname is **unverified and not approved as a canonical API**; this audit does not claim it is definitely unregistered at DNS.

## Canonical rules

1. New website-facing handlers live in `shopb2k/src/routes/api.*.ts` and are deployed through `reso-web`.
2. Assessment/recommendation and automation logic call the canonical Supabase/ChatB2K endpoints directly where currently designed.
3. Do not introduce hard-coded `api.resofit.fit` or `resofit-api.vercel.app` consumers without a reviewed migration.
4. Do not expose secrets in the browser. Same-origin handlers must validate input, authorization, rate limits and server-side credentials.
5. Before deleting any legacy project/repo or changing DNS, check request logs, external links, scheduled jobs, OAuth/webhook callbacks and environment references. Preserve rollback artifacts.
6. After each change, verify deployed route status, latency, response contract and critical consumer flows from an external runner.

## Evidence level

- **Verified from connected control-plane/source data:** `reso-web` owns the two public website domains; `resofit-api` has no custom API hostname in its Vercel domain list, reports `live: false`, and latest deployments are failed; same-origin API route source files exist in `shopb2k`.
- **Not verified:** live DNS and HTTP status for `api.resofit.fit`; whether unknown external consumers call the legacy project; a completed end-to-end production smoke test for every route.
