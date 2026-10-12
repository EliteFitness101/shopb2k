# ResoFit API ownership and endpoint contract

**Audit date:** 2026-10-12  
**Decision:** One public application API surface; no second public API authority is approved.

## Canonical ownership

- **Website and same-origin application endpoints:** `https://www.resofit.fit/api/*` (with apex `https://resofit.fit` retained as a supported site alias during canonical redirects). The `reso-web` Vercel project owns the public website domains `www.resofit.fit` and `resofit.fit`. TanStack server routes in `shopb2k` define endpoint handlers and must be deployed with the website build.
- **Recommendation / assessment backend:** canonical Supabase project `resonance-fitness`, ref `vbqjvmnhdtdhmeeudqnn`; the assessment frontend invokes `chatb2k-recommend` directly. Do not route it through a second Vercel API service unless an explicit architecture decision and consumer migration are approved.
- **Legacy subdomain owner discovered:** `api.resofit.fit` is attached to Vercel project `resonance-fitness-automation` (`prj_ouN3SxrXoz5wEHejPkgqQTbqsxWt`), whose repository is `EliteFitness101/resonance-fitness-automation-`. Its latest deployment is ERROR and project metadata reports `live: false`; an older READY deployment exists. Treat this as a stale/failed backend surface, not a healthy production dependency.
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
- Its latest deployment history shares the same source repository `EliteFitness101/resonance-fitness-automation-` and matching commit sequence with `resonance-fitness-automation`. This is strong evidence that it is a duplicate Vercel project, rather than a distinct API implementation.
- Project reports `live: false`; its listed deployments are ERROR.
- The latest failed production deployment is `dpl_3ib1PBmuzE9EcGeefbGMdt33vFFF`, commit `ba033d7ccc54ea70ec080ddcf0e6404d1ec27dc4`, message `Update requirements.txt`.
- Its Vercel domain list contains only Vercel-hosted aliases, not `api.resofit.fit`. No GitHub repository named `resofit-api` was found in the connected `EliteFitness101` repository search.
- **Disposition:** orphan/duplicate candidate; do not call it an active production API. Keep it undeleted until deployment source, access logs, external consumers, and secrets are checked. If no consumers exist, archive/remove it in a separate approved decommission step.

### Hostname `api.resofit.fit` and legacy backend projects

- Vercel's apex-domain project inventory confirms `api.resofit.fit` is attached to `resonance-fitness-automation` (`prj_ouN3SxrXoz5wEHejPkgqQTbqsxWt`), not to the separate `resofit-api` project.
- `resonance-fitness-automation` uses repository `EliteFitness101/resonance-fitness-automation-`. The latest production deployment is ERROR; project metadata reports `live: false`. A much older READY deployment exists, so a stale previous deployment/alias cannot be ruled out without live HTTP verification.
- Its current source config rewrites `/api/v1/:path*` to `/api/index.py`. That FastAPI source contains a mock `POST /api/verify-payment` handler that returns `SUCCESS` and grants a vault entitlement without checking a payment provider. **Do not use this handler for real payment verification.** This is a source-level security finding, not proof that the endpoint is currently reachable.
- A separate repo `EliteFitness101/resoflex-intelligence-node` also references `api.resofit.fit` in a scaffold and exposes static illustrative counters in `api/stats.js`; this is another source-level naming drift, not evidence of current DNS ownership.
- Live external DNS/HTTP checks could not be completed from the current execution environment. The domain is verified and attached in Vercel, but current serving behavior remains unverified.

## Canonical rules

1. New website-facing handlers live in `shopb2k/src/routes/api.*.ts` and are deployed through `reso-web`.
2. Assessment/recommendation and automation logic call the canonical Supabase/ChatB2K endpoints directly where currently designed.
3. Do not introduce hard-coded `api.resofit.fit` or `resofit-api.vercel.app` consumers without a reviewed migration.
4. Do not expose secrets in the browser. Same-origin handlers must validate input, authorization, rate limits and server-side credentials.
5. Before deleting any legacy project/repo or changing DNS, check request logs, external links, scheduled jobs, OAuth/webhook callbacks and environment references. Preserve rollback artifacts.
6. After each change, verify deployed route status, latency, response contract and critical consumer flows from an external runner.
7. Before moving or redirecting `api.resofit.fit`, inventory existing clients and decide whether it should become a compatibility redirect to `www.resofit.fit/api/*` or remain a separately versioned backend. Do not leave a mock payment-verification handler reachable on any public hostname.

## Evidence level

- **Verified from connected control-plane/source data:** `reso-web` owns the two public website domains; `resofit-api` has no custom API hostname in its Vercel domain list, reports `live: false`, and latest deployments are failed; `api.resofit.fit` is assigned to the separate `resonance-fitness-automation` project whose latest deployment is failed; same-origin API route source files exist in `shopb2k`; the legacy Python source contains a mock payment verification handler.
- **Not verified:** live DNS and HTTP status for `api.resofit.fit`; whether unknown external consumers call the legacy project; a completed end-to-end production smoke test for every route.
