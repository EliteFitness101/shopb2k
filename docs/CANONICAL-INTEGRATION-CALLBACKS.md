# ResoFit canonical integration callbacks

Canonical production origin: `https://resofit.fit`

## Source-supported routes

| Purpose | Canonical URL | Implementation / authority |
| --- | --- | --- |
| Paystack server-to-server webhook | `https://resofit.fit/api/webhook/paystack` | Same-origin route proxy forwards the exact raw body and `x-paystack-signature` to the active Supabase `paystack-webhook` Edge Function, which verifies the signature and processes idempotently. |
| Paystack customer return | `https://resofit.fit/payment/callback` | Existing TanStack page verifies the returned reference with Supabase `verify-order`. |
| Same-origin payment verification API | `https://resofit.fit/api/payment/verify-order?reference=...` | Same-origin alias to the active Supabase `verify-order` Edge Function. |

## Not yet implemented; do not register as production callbacks yet

- Buffer OAuth callback: `https://resofit.fit/api/auth/buffer/callback`
- Telegram bot webhook: `https://resofit.fit/api/webhook/telegram`
- YouTube OAuth callback: `https://resofit.fit/api/auth/youtube/callback`

These require their matching handlers, state/signature validation, and a defined secure token persistence/rotation path. Buffer currently uses the existing server-side publisher and has a confirmed provider-side `RATE_LIMIT_EXCEEDED` condition; a callback URL alone will not resolve that condition.

## Provider configuration notes

- Paystack webhook: register `https://resofit.fit/api/webhook/paystack` in Paystack dashboard. Never place the Paystack secret in browser code.
- Paystack customer return: keep `https://resofit.fit/payment/callback`; the customer return is not a substitute for webhook verification.
- OAuth providers: only register a callback after its matching authorization-start route, callback handler, CSRF `state` validation, redirect URI allowlist, token storage and refresh/revocation handling are implemented and smoke-tested.
- Localhost callback URLs are development-only and must not be used for production OAuth clients.

## Verification gate

A source commit or PR is not production certification. After merge/deploy, smoke-test each route on the canonical host, verify expected method/status behavior, and complete provider-side handshake tests without publishing real content or initiating real payments.
