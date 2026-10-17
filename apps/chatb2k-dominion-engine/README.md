# ChatB2K Dominion Engine — GitHub App Gateway

A dependency-free Node.js service for ChatB2K orchestration to inspect the installed GitHub App's repositories and workflows. Workflow dispatch is disabled by default and requires explicit enablement plus exact allowlists.

## Endpoints

- `GET /healthz`: process liveness.
- `GET /readyz`: configuration readiness without exposing secrets.
- `GET /v1/github/repos`: installation repositories intersected with an exact allowlist.
- `GET /v1/github/repos/:owner/:repo/workflows`: workflow inventory for an allowlisted repository.
- `POST /v1/github/workflows/dispatch`: optional dispatch; disabled unless enabled, allowlisted, and supplied an idempotency key.
- `POST /webhooks/github`: validates `X-Hub-Signature-256`, deduplicates delivery IDs, and acknowledges without executing actions.

## Security

- All `/v1/*` routes require `Authorization: Bearer <DOMINION_API_TOKEN>`; use a random 32+ character secret.
- App JWT signing and installation token exchange happen server-side. Never expose the private key or tokens to browsers or logs.
- Set `GITHUB_ALLOWED_REPOSITORIES` to the smallest required set. Workflow dispatch also needs an exact `GITHUB_ALLOWED_WORKFLOWS` list and the GitHub App's Actions: write permission.
- Configure the webhook secret identically in GitHub Developer Settings and the deployment secret store; keep SSL verification enabled.
- Rate limiting and delivery deduplication are process-local. Use shared storage before horizontally scaling.
- A dispatch response means `accepted/submitted`, not `executed` or `verified`. Verify the Actions run and artifacts separately.

## Local run

Use Node.js 20+. Copy `env.template` values into your local shell or deployment secret manager; the service intentionally does not load dotenv files automatically. Run `node src/server.mjs`.

## Registration and deployment gates

1. Register **chatb2k-dominion-engine** under `EliteFitness101` in GitHub Developer Settings.
2. Start with repository Metadata: read-only, Contents: read-only, Actions: read-only. Add Actions write only if dispatch is required.
3. Install on selected repositories only.
4. Configure webhook URL `https://YOUR-HOST/webhooks/github`, a long random secret, SSL verification, and only required events.
5. Store App ID, installation ID, private key, API bearer secret, and webhook secret in the deployment secret manager.
6. Verify readiness and authorized repository/workflow inventory. Test invalid bearer/signature, duplicate delivery, allowlist denial, and dispatch disabled.
7. Deploy to a TLS-enabled host only after the runtime tests pass.

## Release status

This is a source scaffold for review, **not** a registered GitHub App, deployed service, or verified production integration. Those statuses require app registration/installation, secrets, deployment, and live smoke tests.
