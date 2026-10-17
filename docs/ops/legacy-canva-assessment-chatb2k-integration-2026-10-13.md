# Legacy Canva Assessment & Personalized Fulfillment Integration

**Audit date:** 2026-10-13  
**Repository:** `EliteFitness101/shopb2k`  
**Status:** Proposed additive patch; no production deployment asserted.

## Intent and historical context

The legacy Canva designs are the original product/UX vision created while `resonancefitness.com.ng` was the intended domain. Preserve them as source-of-truth design references, not as proof of executable web apps. The active canonical experience remains `https://www.resofit.fit`; do not revive the expired domain in links, SEO metadata, manifests, or production configuration.

## Recovered design references

| Design | Canva ID | Intended role | Current evidence |
|---|---|---|---|
| Resonance Fitness Assessment Guide | `DAGwJ2DK6w4` | Assessment information architecture and onboarding UX | Fixed one-page design; no fillable data fields; not an executable assessment |
| Resonance Fitness Workout Plan Generator | `DAGy4jwyw3E` | Workout generator UX reference | Fixed one-page design; no fillable data fields; runtime not verified |
| Resonance Fitness Workout Plan Generator (Website) | `DAHG9VAk3fY` | Website/generator layout reference | Fixed one-page design; no fillable data fields; runtime not verified |
| Resonance Fit Pro Naija Workout Generator | `DAGy5MLESzA` | Nigerian-focused workout plan UX | Fixed one-page design; no fillable data fields; runtime not verified |
| Personalized Meal Plans | `DAGgQLXq6gw` | Meal-plan service, nutrition and support content | Six-page design; includes legacy Selar/contact links that must not be treated as canonical checkout |
| Nigerian Meal Plans for Various Goals | `DAGw2-ZZWLY` | Nigerian meal variants and goals | Design reference only; generated output and runtime not verified |
| Resonance Meal & Workout Planner | `DAGwXUGIKVI` | Combined meal/workout plan UX | Design reference only; generated output and runtime not verified |
| Fitness Workout Log Planner | `DAG6MKlGgNs` | Progress/logging UX candidate for trainer PWA | Design reference only; runtime not verified |
| Copy of ResoFlex Admin Dashboard & Inventory Sync UI | `DAHFYVqlfYE` | Dashboard visual reference candidate | Not yet confirmed as the specific NOWNOWGYM or Reso-Dash production UI |
| Presentation - ResoFlex Ecosystem Overview | `DAHXrMlx5Pc` | Ecosystem context / architecture visual | Reference presentation, not an executable architecture source |
| ResoFlex video | `DAG0r-osc5M` | Media reference | Canva design only; do not assume a downloadable MP4 or production video asset |

Original user-shared assessment/generator links should be preferred over transient links returned by Canva APIs. These designs should be registered as internal references with `qa_status=hold` and rights/commercial status unverified until the actual media is exported/ingested and reviewed.

## Existing runtime contracts found

- Main route: `src/routes/me.tsx` at `https://www.resofit.fit/me`.
- The current UI had three single-choice steps: goal, activity, diet. It called `chatb2k-recommend` with a transient session UUID and sent the user to an exact SKU/handle recommendation when available.
- The additive patch adds a fourth plan-focus step (meal+workout, meal plan, workout plan, digital guide/reset, interactive trainer, equipment) and forwards a bounded attribution allowlist (`rsid`, `session_id`, UTM fields, `ttclid`, `funnel_origin`) through the recommendation request and destination URL. It does not add PII to URLs.
- `resofit-product-experience` v6 reads `resofit_product_experience_config` by canonical SKU and returns the configured product experience and published accessories.
- `chatb2k-recommend` v10 scores against published, in-stock canonical products and now writes the bounded plan-focus and attribution fields (`rsid`, UTM fields, `ttclid`, `funnel_origin`) into `chat_commerce_events` metadata. This records what the browser sends; it does not prove a completed purchase or generated deliverable.
- `resofit-personal-plan` v6 requires an authenticated user and an active entitlement, reads `resofit_product_experience_config`, generates a plan, and upserts it into `resofit_personalized_plans`. This is the correct authenticated/post-entitlement generation path; do not call it from the public assessment or bypass entitlement checks.
- Product experience rows already reference Canva source IDs for `RESO-DIG-MW-001`, `res-dig-nut`, and several B2K products. This mapping should be preserved and reconciled against the canonical SKU registry.
- Prior live QA evidence still records `RESO-DIG-LIFE-001` as `awaiting_ingest` with zero attached/approved assets and historical media-generation failures due to missing `BLOB_READ_WRITE_TOKEN`. A deployed generator is not proof of completed asset ingestion or fulfillment.

## Required end-to-end contract

1. Public assessment captures goal, activity, diet and desired deliverable; preserve session/RSID/UTM context.
2. ChatB2K recommends only an exact published catalog SKU/offer; no guessed SKU or price.
3. The canonical product page and Paystack flow remain authoritative for checkout, payment and order state.
4. A verified payment/webhook activates the appropriate entitlement.
5. The signed-in trainer PWA calls `resofit-personal-plan` only after the backend confirms the user's entitlement.
6. Generated plan/guide output must be saved, attached to the exact SKU/order/user, QA-checked, retrievable by the buyer, and delivered through the existing fulfillment engine. Any expiring download link must be generated server-side with bounded expiry and access checks.
7. Canva designs remain visual/reference metadata until media files are actually exported, ingested, rights-checked, QA-approved and attached to the canonical product/experience. Never publish placeholder testimonials or unverified visual claims.

## Ownership / placement

- `shopb2k` and `www.resofit.fit/me`: public assessment and recommendation entry point.
- ChatB2K: orchestration and recommendation; not catalog, price, payment or entitlement truth.
- `resocatalog`/canonical product registry: SKU, publication and price truth.
- `dashboard.resofit.fit` / `reso-dash`: authenticated plan generation, saved plan and progress UX after entitlement verification.
- NOWNOWGYM visuals: keep as a separate media/design target until the exact Canva design IDs are confirmed; do not silently map unrelated ResoFlex artwork to that app.

## Verification still required

- Build/typecheck and preview/runtime test of this patch.
- Verify recommendation function accepts/retains attribution and focus fields, not merely that the client sends them.
- Trace one assessment through exact recommendation, canonical SKU/price, Paystack confirmation, entitlement, plan generation, asset ingestion, saved plan and buyer retrieval.
- Confirm actual NOWNOWGYM Canva design IDs and asset rights/QA before production use.


## Changes made during this audit (2026-10-13)

### Production metadata / backend (deployed, execution evidence limited)

- Registered **23 legacy Canva design references** in `public.content_asset_registry` under campaign `legacy-architecture-recovery-2026-10-13`. All are deliberately `qa_status=hold`, `rights_status=unknown`, `commercial_status=internal_reference`; the registry metadata says runtime/autofill/export are unverified and publishing is disallowed until QA.
- Registered **6 gym-app visual candidates** under `gym-app-visual-candidates-2026-10-13`. All remain on hold with `association_status=candidate_unconfirmed`; search results do not prove these are the exact NOWNOWGYM designs.
- Added `RESO-DIG-LIFE-001` product-experience configuration with a seven-day plan shape and UX reference IDs. It explicitly records `fulfillment_status=awaiting_ingest`; it does not invent a generated asset or mark the SKU fulfilled.
- Added separate `promise.ux_references` metadata to `RESO-DIG-MW-001`, `res-dig-nut`, and `RESO-PT-TRIAL-7D`, preserving existing `source_assets` and canonical SKUs.
- Deployed `resofit-product-experience` v6 with an explicit CORS allowlist for `https://resofit.fit` and `https://www.resofit.fit`.
- Deployed `chatb2k-recommend` v10 to record bounded plan-focus and attribution fields in recommendation-event metadata.
- Both functions are reported ACTIVE and their deployed source contains the intended changes. A live browser/API call against the production origins has **not** been independently completed in this audit, so runtime CORS and persisted attribution remain evidence level B until exercised.

### Frontend PR / CI

- Draft PR: [#68 — Integrate legacy assessment UX with ChatB2K recommendation context](https://github.com/EliteFitness101/shopb2k/pull/68). It adds the fourth plan-focus step and attribution handoff to `src/routes/me.tsx`; it is **not merged or deployed**.
- The UX lint, full lint diagnostic, revenue smoke, and production gate workflows reported success for the updated commit.
- The production-bundle browser smoke failed before build/browser tests at `npm ci`: `package.json` requests `@lovable.dev/vite-tanstack-config@2.25.3`, while `package-lock.json` resolves `2.7.7`. The changed files do not include either dependency file. Do not claim a successful build/browser verification until the lockfile is regenerated and the workflow passes.

### Still blocking end-to-end fulfillment

- Latest `digital_product_factory_jobs` row for `RESO-DIG-LIFE-001` remains `awaiting_ingest`, `asset_count=0`, `approved_asset_count=0` (updated 2026-10-12 19:07:53 UTC).
- The latest recorded Flow/Veo generation failure remains `BLOB_READ_WRITE_TOKEN_missing` (2026-10-09 06:00:14 UTC).
- Therefore the assessment/recommendation UX and reference metadata have been improved, but personalized guide generation, verified post-payment attachment, expiring buyer delivery and retrieval are **not yet end-to-end verified**.


### Entitlement and PWA handoff audit

- `claim-dashboard-entitlement` v19 now associates a successful, reconciled guest payment with the authenticated user only when the payment email matches and the payment is not already linked to another account. The existing `private.resofit_sync_entitlement_from_payment()` trigger then creates a product-specific entitlement only when the SKU is configured in `resofit_entitlement_product_config`. The function now distinguishes generic dashboard access from `plan_entitled` and returns the product-specific entitlement first.
- The current production data still has **0** `resofit_entitlement_states` rows and **0** saved personalized plans. The only successful payment found is `MX-BASIC-WARRIOR`, which is not a configured ResoFit plan SKU; the recent ResoFit digital SKU record is pending, and an older nutrition payment is expired. No fabricated entitlement was inserted.
- Reso-Dash's existing `src/routes/_shell.onboarding.tsx` is the detailed intake UI; baseline `generatePlan()` is client-side preview. Draft PR [#14](https://github.com/EliteFitness101/reso-dash/pull/14) adds customer sign-in, server-side entitlement claim, saved-plan generation, and saved-plan retrieval. It is unmerged/unverified; no workflow runs were returned for its latest commit.
- NOWNOWGYM's `src/components/site/HeroMedia.tsx` currently has `HERO_CLIPS=[]`, so the app uses static poster imagery. The Canva “High-Energy Luxury Gym Promo Video” and gym landing-page designs are registered as **candidate references only**, not production MP4/image assets. The exact NOWNOWGYM design IDs are not confirmed.
- Remaining separate fulfillment gap: no exported/ingested approved guide/PDF asset, watermarking, server-generated signed expiring buyer link, or post-purchase retrieval test has been demonstrated. The factory job remains `awaiting_ingest` with 0 assets; Flow/Veo generation history still records `BLOB_READ_WRITE_TOKEN_missing`.


### Project-specific reference manifests

- Reso-Dash authenticated plan generation/retrieval draft: [PR #14](https://github.com/EliteFitness101/reso-dash/pull/14). It reuses the existing detailed intake instead of cloning it into a second full intake form.
- NOWNOWGYM Canva media candidate manifest: [PR #2](https://github.com/EliteFitness101/nownowgym/pull/2). It records six gym-related Canva candidates while leaving the current app hero media unchanged.
