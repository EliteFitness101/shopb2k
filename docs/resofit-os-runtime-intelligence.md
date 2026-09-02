# ResoFit OS™ Runtime Intelligence Architecture

## Status

Proposed production contract for P3. This document is normative for the implementation branch and does not authorize production deployment by itself.

## Core principle

ChatB2K™ is an intelligence layer, not a product catalogue.

It MUST NOT hardcode:

- SKU identities
- product prices
- inventory quantities
- a permanent commerce domain
- a permanent payment provider
- a single country or currency
- a single product for a wellness intent

At runtime it receives customer and journey context, queries the current ResoFit data/service layer, filters eligible offers, ranks them, and returns the best next action plus explainable alternatives.

## Runtime contract

```text
User / member
  -> ecosystem identity + consent + journey context
  -> ChatB2K™ intent/profile understanding
  -> recommendation service
  -> canonical current data/service layer
  -> eligibility + availability + country/currency + fulfilment rules
  -> ranked offers/actions
  -> canonical destination resolver
  -> checkout/payment service where commerce is appropriate
  -> verified payment event
  -> fulfilment/value delivery
  -> member status/dashboard + notification
  -> cross-sell/upsell/retention signals
```

## Recommendation inputs

- declared goal and assessment answers
- current route and referring page
- authenticated member identity when available
- anonymous journey ID when unauthenticated
- consent state
- country/currency context
- current catalogue/offer data
- inventory/availability
- programme/service eligibility
- previous journey and purchase context where permitted
- campaign parameters

## Recommendation output

The recommendation service returns a structured object conceptually equivalent to:

```ts
{
  actionType: "product" | "program" | "service" | "content" | "assessment" | "support",
  offerId?: string,
  sku?: string,
  title?: string,
  price?: { amountMinor: number; currency: string },
  destination?: string,
  reason?: string,
  alternatives?: Array<...>,
  related?: Array<...>,
  confidence?: number,
  sourceVersion?: string
}
```

The frontend must treat all commercial fields as runtime data. It must never substitute a local hardcoded price or SKU when the service returns no offer.

## Reset separation

The ₦1,000 Reset remains a dedicated acquisition pathway at `reset.resofit.fit`. It is not the universal ChatB2K commerce destination. ChatB2K may recommend it only when the current data/service layer identifies it as the best eligible next action.

## Commerce independence

Shopify, Supabase, Paystack, Flutterwave, PalmPay, Stripe or another provider may be implementation details behind the service layer. ChatB2K consumes a stable ResoFit offer/payment contract rather than provider-specific assumptions.

## Country and currency

Country/currency resolution MUST happen before payment initiation. The payment service MUST resolve the merchant-enabled currency and provider from current configuration. Browser-provided amount values are never authoritative.

## Identity persistence

Every cross-domain handoff should preserve a non-secret journey identifier. Authenticated member identity remains the authoritative identity after login. Anonymous identifiers must not be promoted into privileged identities without authentication.

Attribution context such as `rsid`, UTM parameters and `funnel_origin` should be carried where lawful and useful, without placing secrets in URLs.

## Safety and governance

ChatB2K™ may recommend wellness content and commercial options, but consequential medical, payment, security, infrastructure and governance actions require explicit service-level authorization and human oversight where applicable.

LordB2K™ is an orchestration/governance concept, not an unrestricted autonomous production administrator.

## Failure behaviour

If recommendation data is unavailable:

1. preserve the user's journey and answers;
2. do not invent a SKU or price;
3. do not display stale commercial data as current;
4. offer a safe non-commercial next action such as retry, support, or relevant content;
5. record an observable failure event.

## Acceptance criteria

- No ChatB2K code contains permanent SKU/price routing rules.
- No customer is sent to a commerce destination solely because of a hardcoded intent-to-SKU mapping.
- Recommendation data is resolved at runtime.
- Payment amount is resolved server-side from canonical offer data.
- Shop and store remain independent properties.
- Reset remains a separate acquisition domain.
- Member/journey identity survives permitted cross-domain transitions.
- All recommendation and payment decisions are observable and auditable.
