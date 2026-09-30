# ResoFit OS™ Integration Contract

## Canonical flow

`ResoFit ecosystem → ChatB2K™ → recommendation service → current data/service layer → offer resolver → payment provider → verified webhook → fulfilment → member status/notifications`

## Domain boundaries

- `resofit.fit`: primary ecosystem.
- `reset.resofit.fit`: dedicated Reset acquisition pathway.
- `shop.resofit.fit`: independent shop property.
- `store.resofit.fit`: independent store property.
- Other ecosystem domains remain independently owned by their current Vercel/repository configuration.

No service may silently collapse `shop.resofit.fit` into `store.resofit.fit`.

## Data boundary

ChatB2K consumes a stable recommendation contract. It does not read UI constants as catalogue truth.

Canonical data may be served from the current production data layer, with adapters for existing commerce systems. A dedicated `catalog.resofit.fit` domain is not required for the intelligence contract.

## Payment boundary

Frontend requests an offer/checkout. The server resolves the current offer, currency, amount and provider. The payment provider callback/webhook is authoritative for successful payment. Client redirects are not proof of payment.

## Identity boundary

Use the existing authentication system for members. Use a non-secret anonymous journey ID before authentication. Preserve allowed attribution and journey context across ecosystem transitions without exposing credentials or secrets.

## Observability

Minimum events:

- `assessment_started`
- `assessment_complete`
- `recommendation_requested`
- `recommendation_returned`
- `recommendation_selected`
- `checkout_start`
- `payment_success`
- `payment_failed`
- `fulfillment_complete`
- `status_viewed`
- `notification_sent`

## Provider independence

Provider-specific code belongs in adapters/service boundaries. ChatB2K must not contain Paystack, Shopify or other provider-specific product selection logic.
