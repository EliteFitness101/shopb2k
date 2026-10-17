# Shopify App Proxy → ChatB2K assessment handoff

This integration is intentionally staged behind Shopify App Proxy configuration. It does not deploy itself, change the live theme, alter Paystack, or prove that a Shopify native cart contains the variant.

## Server environment

Configure these values in the server runtime only (never in theme JavaScript):

- `SHOPIFY_APP_SECRET`: client secret for the registered Shopify app that owns this App Proxy.
- `SHOPIFY_ADMIN_ACCESS_TOKEN`: Admin API token for the authorized shop, with the minimum product-read scope needed for `productVariant`.
- `SHOPIFY_ALLOWED_SHOP_DOMAINS`: comma-separated exact `.myshopify.com` domains, for example `store-name.myshopify.com`. Use the store's actual canonical myshopify domain, not an arbitrary request value.
- `SHOPIFY_ADMIN_API_VERSION`: pinned supported Admin API version; defaults to `2026-01` in this branch.
- Existing server-only `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL`.

Do not put any of these secrets in `VITE_*` variables, storefront assets, or browser storage. Use a per-shop token if the app will serve more than one shop.

## Shopify App Proxy settings

In the registered Shopify app configuration, set:

- Prefix: `apps`
- Subpath: `chatb2k`
- Proxy URL: `https://resofit.fit/api/shopify-app-proxy`

The resulting storefront endpoint is exactly `/apps/chatb2k`; this route does not use an `/orchestrate` suffix. Proxy the selected prefix/subpath directly to `https://resofit.fit/api/shopify-app-proxy`.

Call the proxy with signed query parameters `variant_id`, `quantity`, and a UUID `request_id`; UTM values may also be sent as query parameters. Shopify appends its signed `shop`, `timestamp`, `path_prefix`, `logged_in_customer_id`, and `signature` parameters. The handler validates the HMAC, timestamp, exact shop allow-list, request fields, and variant through the Admin GraphQL API before issuing an opaque correlation ID.

## Data and trust boundaries

The handler stores the orchestration record in the existing `public.resofit_events` table, using its unique `idempotency_key` and `correlation_id`; this avoids introducing a duplicate session table while the existing handoff/assessment engine already reads this event contract. The verified price and currency are taken from Shopify's Admin API response, not client input.

This event is an attribution and assessment handoff record, not proof of Shopify checkout, payment, inventory reservation, or native-cart membership. App Proxy HMAC signs the forwarded query parameters; it does not independently attest that a browser actually completed `/cart/add`. Do not use this record to authorize fulfillment or payment. Shopify checkout and verified payment/webhook flows remain authoritative.

## Rollout checklist

1. Set server secrets and the exact allowed shop domain in the server runtime.
2. Configure the registered app's App Proxy settings.
3. Update the unpublished theme's campaign flow to call the App Proxy with signed query parameters after Shopify's native Ajax add-to-cart succeeds.
4. Test valid signature, invalid signature, stale timestamp, unapproved shop, nonexistent variant, quantity bounds, replay/idempotency, and network/API failure.
5. Verify the correlation ID reaches `https://resofit.fit/me?correlation_id=...` and that an expired handoff is rejected.
6. Only after review and explicit authorization should the app be deployed or the theme published.
