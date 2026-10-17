# ResoFit Release Control Pilot — shopb2k

**Status:** audit and policy proposal; not a production deployment controller.

## Verified baseline (2026-10-14)

- Repository: `EliteFitness101/shopb2k`; default branch `main`.
- Vercel team plan observed by the connected account: Hobby.
- Vercel project `reso-web` and project `vercel-blob-default-project` are both linked to this repository.
- Recent Vercel records show both projects creating deployments for the same commit SHAs. Several preview deployments were canceled.
- `.github/workflows/deploy-reso-web-production.yml` builds on pushes to `main`, then explicitly leaves production deployment to Vercel Git integration.
- The current connected GitHub App installation is on `EliteFitness101` with selected repository access and events that do not include `push` or `deployment`. This is not evidence that a dedicated ResoFit release-control app is installed.
- Repository rulesets endpoint returned an empty list. Branch-protection endpoint was not readable with the current integration, so branch protection is **unknown**, not confirmed absent.

## Safety constraints

1. Do not disable Vercel Git integration or change deployment policy until a replacement path has passed a production-safe pilot.
2. Do not remove or rename `vercel-blob-default-project` until its runtime/storage purpose is identified. It currently has no custom domains, but that alone does not prove it is unused.
3. Only `https://www.resofit.fit` is the canonical public URL.
4. Do not create or expose credentials in repository files. Keep credentials in GitHub Actions secrets/environments or the approved secret manager.
5. A green GitHub build is not production deployment evidence. A release is complete only after the deployed commit SHA and canonical production routes are verified.

## Target release policy

- Agent and ChatGPT sessions submit changes through branches/PRs; they do not directly invoke Vercel production deploys.
- Compatible fixes are batched into a PR/release candidate rather than merged as many tiny commits.
- Required CI checks run before merge. Protect `main` with PR review and required status checks once the current branch policy has been inspected and the owner approves the exact requirements.
- The release controller deduplicates by repository + target environment + commit SHA.
- Serialize production releases per project. Do not cancel an in-progress production release to deploy a newer commit.
- Run previews only when needed for review or verification; avoid creating a preview for every internal bot update where policy permits.
- Use Vercel affected-project deployment filtering only after project root directories and shared dependencies have been verified.
- Record request ID, requesting agent/session, PR, commit SHA, checks, deployment ID, canonical URL smoke results, status, and timestamp.

## Required implementation sequence

1. Confirm what `vercel-blob-default-project` does and inspect its project root, Git integration, deployment settings, and environment variable names (never reveal values).
2. Identify the intended ResoFit GitHub App by its actual app name and installation. Confirm selected repositories, permissions, webhook subscriptions, and where its private key/webhook secret are stored. The currently connected ChatGPT GitHub app is not assumed to be that app.
3. Inspect branch protection and required status checks using an account/integration with the required read permissions.
4. Implement a release-queue controller with SHA deduplication, non-canceling production concurrency, batching, and audit evidence. It must initially run in audit/dry-run mode.
5. Test on a non-production candidate and confirm only the intended Vercel project deploys. Do not switch off the current production route until replacement deploy + rollback are demonstrated.
6. After explicit release-owner approval, make the production cutover in a separate change and verify the canonical domain, deployed SHA, key routes, and rollback path.

## Acceptance criteria

- Repeated requests for the same SHA create at most one release request per project/environment.
- Internal commits do not trigger a production release unless they pass the release policy.
- Concurrent requests are queued/batched; production deployments are not canceled mid-flight.
- Only intended projects build for a change.
- The canonical production domain serves the verified release SHA.
- The CEO report includes evidence links and clearly distinguishes build, deployment, and live-route verification.

## Current decision

**Do not make production deployment-setting changes yet.** The duplicate-deployment cause is supported by live records; project purpose and release-controller credentials/permissions remain unresolved. The next safe change is an audit-mode controller and configuration verification, followed by a separate approved cutover.
