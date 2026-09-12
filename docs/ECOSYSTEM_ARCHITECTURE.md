# ResoFit™ Ecosystem Architecture — Canonical Production Rules

**Status:** Canonical architecture reference
**Updated:** 2026-09-12
**Repository:** `EliteFitness101/shopb2k`
**Production web:** `https://resofit.fit`
**Canonical Supabase:** `resonance-fitness` / `vbqjvmnhdtdhmeeudqnn`

## 1. Authority hierarchy

1. **Supabase production** is the canonical business/data source of truth.
2. **`public.products` + `public.product_intelligence`** are the canonical product/recommendation data authority.
3. **ResoFit main (`shopb2k`)** owns the primary customer experience, routes, content presentation and first-party conversion surfaces.
4. **ChatB2K** is the personalization/recommendation/orchestration layer; it does not become business truth.
5. **ResoCatalog** is a commerce/catalog access layer, not a competing database of record.
6. **ResoFlex** is an execution/commerce surface, not a competing business-state authority.
7. **Shopify** is a commerce channel/supply source. During domain migration, its active primary domain must be resolved from live configuration rather than hard-coded.
8. **`store.resofit.fit`** is the ResoFit-owned fallback/native commerce surface when Shopify is unavailable or unsuitable.
9. **Paystack** owns payment initiation; verified webhooks plus Supabase own payment verification, accounting and event state.
10. **Content Engine / Buffer** distribute approved content; they do not own canonical content or business state.
11. External APIs and partner sources are verified supply/discovery inputs only; they never override canonical recommendation/business truth.

## 2. Canonical customer flow

`Traffic → resofit.fit → assessment/conversation → Supabase identity/profile/intent → ChatB2K recommendation → exact offer/SKU/variant → premium contextual offer page → commerce resolver → Paystack/Shopify/native checkout → verified webhook → Supabase payment/revenue/event ledger → fulfillment/entitlement → metadata-driven onboarding/upsell/retention.`

No generic browsing, repeated assessment or second identity form is required after a successful personalized recommendation.

## 3. Domain ownership map — live Vercel evidence

| Surface | Live Vercel project | Verified custom domain(s) | Role |
|---|---|---|---|
| Main experience | `reso-web` | `resofit.fit`, `www.resofit.fit` | Canonical public experience |
| Shopify/ResoFlex commerce surface | `reso-flex` | `shop.resofit.fit` | Specialized commerce/Shopify-facing surface; domain migration status must follow Shopify Admin |
| Native store fallback | `shop-resoflex` | `store.resofit.fit` | ResoFit-owned fallback commerce surface |
| Catalog | `resocatalog` | `catalog.resofit.fit` | Catalog/commerce gateway |
| Admin | `reso-dash` | `dashboard.resofit.fit` | Member/admin dashboard |
| Martial/RedZone | `redzone-recruit` | `martial.resofit.fit` | Martial-X / recruitment surface |
| Reset | `joy-funnel-ai-u5vw` | `reset.resofit.fit` | Reset funnel/checkout surface |
| Standalone ChatB2K | `chatb2k` | `chatb2k.resofit.fit` | Separate development/legacy expansion surface; not current primary customer routing |

Vercel also contains many historical/experimental projects without verified custom production domains. Project existence alone does not make a surface part of the active production ecosystem.

## 4. Route ownership

### Main `resofit.fit`

Public experience and content:
- `/`
- `/about`
- `/contact`
- `/programs`
- `/programs/:slug`
- `/blog`
- `/blog/:slug`
- `/knowledge`
- `/stories`
- `/success-stories`
- `/content`
- `/shop`
- `/product/:handle`
- `/recommendation/:handle`
- `/me`
- `/personalize`
- `/community/play`
- `/community/play/:game`
- `/network`
- `/network/:entityType/:slug`
- `/jumia`
- `/martial-x3`
- `/martial-x3/executive`
- `/martial-x3/rsdn`

Identity/compliance:
- `/auth`
- `/admin`
- `/compliance`
- `/cookies`
- `/privacy`
- `/terms`
- `/og`
- `/sitemap.xml`

Wellness:
- `/wellness`
- `/wellness/:state`
- `/wellness/hubs/:slug`
- `/wellness/states/cities/hubs/geo-locator`
- `/wellness/makaveli`
- `/wellness/makaveli/services`
- `/wellness/makaveli/services/:slug`
- `/wellness/makaveli/book`
- `/wellness/makaveli/checkout`
- `/wellness/resonance/services`
- `/wellness/resonance/services/:slug`
- `/wellness/resonance/book`

Internal/server endpoints on the same origin:
- `/api/content/publish`
- `/api/content/publish-cron`
- `/api/makaveli/booking`
- `/api/makaveli/checkout`
- `/api/makaveli/paystack-webhook`
- `/api/makaveli/verify`
- `/api/resonance/booking`
- `/api/resonance/checkout`
- `/api/webhooks/shopify/orders`
- `/api/webhooks/shopify/checkouts`
- `/api/webhooks/shopify/inventory`
- `/api/cloudinary/verify`

These API routes are backend ingress/execution surfaces, not separate public domains.

## 5. Canonical backend functions

Current production Supabase functions include payment, catalog, event, commerce, wellness, ChatB2K and content functions such as:

`paystack-init`, `paystack-webhook`, `resoflex-api`, `resofit-event-ingest`, `catalog-public`, `storefront-products`, `verify-order`, `claim-dashboard-entitlement`, `wellness-locator`, `chatb2k-orchestrator`, `chatb2k-recommend`, `resofit-network-discovery`, `resofit-content-engine`, `buffer-publisher`, `content-queue-ingest`, `content-asset-ingestion`, `content-intelligence-enricher`, `martial-content-enricher`, `imagekit-auth`, `imagekit-webhook`, and related production functions.

A function being ACTIVE proves deployment state, not universal runtime success. Runtime evidence determines A/B/E classification.

## 6. Identity and attribution contract

Preserve where available:
- `user_id`
- `session_id`
- `rsid`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`
- `ttclid`
- funnel origin/source
- exact product/SKU/variant
- Paystack reference

Browser attribution may be persisted locally for SPA navigation, but production-wide propagation is only considered fully verified when a live trace demonstrates continuity through recommendation, checkout, payment and revenue/fulfillment state.

## 7. Evidence rules

- Production deployment + current runtime/side-effect evidence = verified.
- Deployment without independent execution proof = deployed/unproven, not failure.
- Development/preview/unfinished expansion is excluded from production-readiness deductions.
- Two systems existing does not prove a technical relationship.
- Historical failure is not current failure unless reproduced/currently evidenced.
- A subsystem failure affects only the directly affected capability unless a causal dependency is proven.
- Never hard-code a commerce domain when the active channel is intended to be dynamically resolved.
- Never invent external sellers, prices, inventory, URLs or verification status.
- Never treat documentation as proof of runtime state.

## 8. Documentation precedence

This document defines current architecture rules. `.lovable/plan.md` is the current execution plan and must remain consistent with this document. Historical audits such as `docs/PRODUCTION_READINESS_AUDIT_2026-08-31.md` are evidence records, not current architecture authority.
