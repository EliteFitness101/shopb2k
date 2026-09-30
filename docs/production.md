# ResoFit OS™ Production Contract — P3

## Production invariants

1. ChatB2K™ does not hardcode SKU, price or permanent commerce destination.
2. Recommendation data is resolved from current production data/services.
3. Payment amounts are server-authoritative.
4. Signed provider webhooks are authoritative for successful payment.
5. Digital delivery is not blocked by physical inventory semantics.
6. Country/currency/provider routing is resolved before payment.
7. `shop.resofit.fit`, `store.resofit.fit` and `reset.resofit.fit` remain distinct.
8. Lovable two-way integration remains intact.
9. Customer/member identity and permitted journey state persist through cross-domain handoffs.
10. Recommendation, payment and fulfilment events are observable.

## Deployment sequence

1. Create isolated branch.
2. Run unit/type/build checks.
3. Deploy Vercel preview.
4. Verify recommendation contract against current data.
5. Verify exact destination for several different intents.
6. Verify no stale SKU/price fallback is shown.
7. Verify country/currency resolution.
8. Verify payment initialization uses server-resolved amount.
9. Verify webhook and fulfilment in a controlled transaction.
10. Verify member/status recovery.
11. Review diff and merge only after all gates pass.
12. Verify production aliases and domain separation after deployment.

## Rollback

If recommendation, payment, identity or fulfilment regressions appear, revert the release commit/PR. Do not mutate production catalogue prices as a frontend workaround.

## Security

- Never expose payment secrets to the browser.
- Never trust client-provided price.
- Never treat a success redirect as payment confirmation.
- Validate signed webhooks.
- Avoid secrets in URLs or analytics payloads.
- Apply rate limits and authorization to privileged operations.
- Keep audit logs for consequential actions.
