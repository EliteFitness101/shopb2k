# Hardened Secrets Bridge — ShopB2K rollout

**Status:** bridge and test draft on feature branch; active Shopify webhook handlers have not been migrated.

## Current boundary
ShopB2K has Node/Vercel-style Shopify webhook handlers in `api/webhooks/shopify/` that currently read `SHOPIFY_WEBHOOK_SECRET` with a legacy `SHOPIFY_CLIENT_SECRET` fallback. The deployed environment's configured key names cannot be verified from repository source alone. Replacing that fallback before inspecting the deployment's actual secret bindings could interrupt order, checkout, and inventory webhook processing.

The new `api/lib/secrets-bridge.js` deliberately requires `SHOPIFY_WEBHOOK_SECRET` and never silently substitutes an app/client credential. **Do not switch active handlers to it until the dedicated webhook secret is confirmed configured or an explicit migration is approved and tested.**

## Runtime rule
For Node/Vercel API handlers, pass only required server-side values into the bridge. Never import this server-only module into browser/client bundles. The bridge does not read `process.env`, hold a global singleton, or return all environment variables.

## Verification
Run `node --test tests/secrets-bridge.test.js`, then `npm run lint` and `npm run build`. The repository currently has no declared general test script. Validate existing production webhook secret bindings and Supabase credentials before migrating live handlers.

No secrets were created or modified; no deployment was triggered.
