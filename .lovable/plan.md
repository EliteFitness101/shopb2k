# ResoFit™ Ecosystem Production Plan — Canonical v3.0

**Updated:** 2026-09-12
**Repository:** `EliteFitness101/shopb2k`
**Canonical architecture:** `docs/ECOSYSTEM_ARCHITECTURE.md`

## Objective

Operate ResoFit as one evidence-driven personalized wellness-commerce ecosystem:

`Traffic → Personalized assessment/conversation → Canonical Supabase truth → ChatB2K recommendation → exact offer/SKU/variant → premium contextual page → checkout → verified payment → fulfillment/entitlement → retention.`

## Non-negotiable rules

- Additive-only changes unless a removal is explicitly authorized.
- Do not rename/remove existing routes, tables, APIs or event contracts.
- Do not create a competing catalog/payment/business-data source.
- Supabase production `vbqjvmnhdtdhmeeudqnn` remains canonical business truth.
- ChatB2K recommends; it does not own truth.
- External APIs are verified supply fallbacks, not recommendation authority.
- Resolve the active Shopify commerce domain dynamically; do not hard-code a migration target.
- `store.resofit.fit` remains the ResoFit-owned fallback/native commerce surface.
- Preserve RSID, session, UTM, funnel-origin, identity, SKU/variant and payment-reference context wherever the path supports it.
- Never claim LIVE/VERIFIED/READY without current evidence.
- Preview/development/unfinished expansions do not reduce production readiness.
- No invented seller, price, inventory, URL or verification status.

## Current production surface

### Main experience
`https://resofit.fit` / `https://www.resofit.fit`

Owns public experience, assessment, personalization, content, product presentation, wellness discovery, first-party conversion and backend API ingress.

### Commerce surfaces
- `shop.resofit.fit` — current live Vercel `reso-flex` surface; Shopify domain migration is an external configuration state and must be verified from Shopify Admin before calling it the Shopify primary domain.
- `store.resofit.fit` — current live Vercel `shop-resoflex` surface; native/fallback commerce channel.
- `catalog.resofit.fit` — current live Vercel `resocatalog` surface; catalog/commerce access layer.

### Operations
- `dashboard.resofit.fit` — current live `reso-dash`.
- `reset.resofit.fit` — current live `joy-funnel-ai-u5vw`; production checkout fix is on commit `0964db2e50fd2eccf302b3724201345fe40c5a11` and deployment `dpl_3EAK5MWcevMB9FjSFaEw5CJEKsdw`.
- `martial.resofit.fit` — current live `redzone-recruit`.
- `chatb2k.resofit.fit` — separate standalone project; do not route current core revenue flow through it until its development work is explicitly accepted.

## Main route contract

Customer/public routes remain under `resofit.fit`, including `/`, `/me`, `/programs`, `/programs/:slug`, `/shop`, `/product/:handle`, `/recommendation/:handle`, `/blog`, `/blog/:slug`, `/knowledge`, `/success-stories`, `/stories`, `/about`, `/contact`, `/content`, `/network`, `/network/:entityType/:slug`, `/jumia`, `/community/play`, `/community/play/:game`, Martial-X routes, auth/compliance routes, and the complete wellness/Makaveli/Resonance route family.

Server ingress remains on the main origin for content publishing, Shopify webhooks, Makaveli/Resonance booking and checkout, media verification and related APIs.

## Recommendation contract

Assessment/conversation produces intent/profile context. ChatB2K recommendation queries canonical production catalog/intelligence, excludes unavailable products, returns the exact offer identity, and opens `/recommendation/:handle`.

The recommendation page must show the exact product/service context, live commercial metadata, premium hero/media, details/features and direct checkout action without sending the customer back through a generic shop or second assessment.

## Commerce contract

`Recommendation → exact offer → commerce resolver → active Shopify/native channel → Paystack where applicable → verified webhook → Supabase payment/revenue/event state → fulfillment/entitlement → next action.`

## Attribution contract

Persist/carry `rsid`, `session_id`, UTM parameters, `ttclid`, funnel origin, user identity, exact SKU/variant and payment reference when available. Browser persistence is useful for navigation continuity; end-to-end propagation is only certified after a live trace.

## Content contract

`resofit-content-engine → content_queue → approved distribution → buffer-publisher → destination channels → publish log.`

Content Engine/Buffer are distribution infrastructure and never become canonical business truth.

## Wellness contract

`states → cities → hubs → services → locator/discovery → booking/checkout → canonical event/payment state`.

External partner discovery remains separate from verified ResoFit hubs; discovery never equals verification.

## Verification gate

Every production change follows:

`Audit → additive patch → build/deployment verification → route/runtime verification → database/transaction verification where applicable → report.`

Historical documentation remains historical evidence. Current runtime/deployment/database evidence overrides stale plan text when they conflict; the architecture document is then updated to reflect the verified state.
