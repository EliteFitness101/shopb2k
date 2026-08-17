# ResoFit OS™ P3 Execution Plan — Runtime Intelligence

## Objective

Replace intent-to-product hardcoding with a runtime, data-driven recommendation and commerce orchestration layer while preserving all existing working integrations and the Lovable two-way workflow.

## Phase 1 — Source-of-truth contract

- Define canonical offer/product/service response schema.
- Resolve current price, currency, availability and delivery type at runtime.
- Keep provider adapters behind service interfaces.
- Treat Shopify as optional adapter, not ChatB2K's architectural dependency.

## Phase 2 — ChatB2K recommendation service

- Send assessment and page-graph context to a recommendation endpoint.
- Query current eligible offerings.
- Rank by intent fit, eligibility, availability, value and journey stage.
- Return one best action plus alternatives and related opportunities.
- Never embed SKU, price or destination assumptions in the reasoning layer.

## Phase 3 — Commerce resolver

- Resolve canonical offer to current checkout destination.
- Resolve country/currency/provider server-side.
- Create payment intents from server-side canonical price.
- Preserve idempotency and attribution.

## Phase 4 — Member journey

- Preserve anonymous journey ID through permitted cross-domain transitions.
- Bind to authenticated member identity after login.
- Preserve assessment, recommendation, order and delivery state.
- Expose status/dashboard recovery paths.

## Phase 5 — Cross-sell and retention

- Related products, bundles, customers-also-bought and upgrades come from current data.
- Do not hardcode recommendation relationships.
- Track recommendation impression, selection, checkout start, payment success and delivery.

## Phase 6 — Governance

- Audit logs for recommendation and payment decisions.
- Permission boundaries for LordB2K™ orchestration.
- Human approval thresholds for consequential operations.
- Kill switch and rollback path.

## Non-goals

- No forced catalog subdomain.
- No forced Shopify dependency.
- No hardcoded ₦12,500 campaign logic.
- No hardcoded SKU mapping.
- No merging of `shop.resofit.fit` and `store.resofit.fit`.
- No removal of Lovable integration.

## Release gate

P3 cannot merge to production until automated tests and a live preview verify:

1. multiple intents can resolve to different current offers;
2. no SKU/price hardcoding exists in ChatB2K routing;
3. unavailable offers are excluded;
4. country/currency resolution precedes payment;
5. payment amount is server-authoritative;
6. member/anonymous journey state persists through the handoff;
7. exact recommendation destination resolves successfully;
8. shop/store/reset domain separation remains intact.
