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
- `resofit-product-experience` v5 reads `resofit_product_experience_config` by canonical SKU and returns the configured product experience and published accessories.
- `resofit-personal-plan` v5 requires an authenticated user and an active entitlement, reads `resofit_product_experience_config`, generates a plan, and upserts it into `resofit_personalized_plans`. This is the correct authenticated/post-entitlement generation path; do not call it from the public assessment or bypass entitlement checks.
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
