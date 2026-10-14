# LordB2K × ChatB2K — GitHub App Setup & Control-Plane Contract

**Purpose:** repository-scoped, auditable bridge for the ResoFit ecosystem. The app observes source/CI/release events, lets ChatB2K prepare changes on a branch and open a pull request, and returns verifiable evidence to the control plane. It is not a production shell and must not autonomously merge or deploy.

**Canonical public site:** `https://www.resofit.fit`  
**Primary control repository:** `EliteFitness101/shopb2k`  
**Orchestration repository:** `EliteFitness101/chatb2k-f9d8a04d`  
**Canonical Supabase:** project `vbqjvmnhdtdhmeeudqnn` (`resonance-fitness`, eu-west-1)  
**Status:** configuration blueprint. A dedicated app installation and webhook endpoint are not yet independently verified.

## 1. Live audit baseline (2026-10-14)

- Canonical Supabase project reports `ACTIVE_HEALTHY`, PostgreSQL 17.
- `chatb2k_agent_registry`: 97 rows; 72 numbered `agent-001…agent-072` records; all 72 numbered records currently report `health_status=UNKNOWN`. Do not call them healthy based on registry existence.
- `resofit_v12_engine_registry`: 14 engine records. The orchestration record declares a 72-agent swarm; this is registry evidence, not proof all agents execute successfully.
- `chatb2k_orchestration_nodes`: 25 rows, all `configured`, last updated 2026-09-25. This is stale relative to this audit and needs a heartbeat/refresh test.
- `chatb2k_provider_routes`: 16 records; many use declared/configured status. Verify live credentials and calls separately.
- `chatb2k_learning_events`: 334,434 records. In the last 24 hours, the query returned 28 `performance_observed`, 7 `portfolio_source_ingested`, and 1 `linkedin_profile_draft_generated` events. Event volume alone does not prove a governed lesson was approved and applied.
- `chatb2k_automation_runs`: 8,175 records total. During the last 24 hours, the ECHO V13 watchdog had 67 `degraded` runs and 29 `completed` runs; investigate before declaring the system fully healthy.
- The global control-plane kill switch currently reads `false`. Keep it unchanged during setup.
- Existing `.github/workflows/deploy-reso-web-production.yml` runs `npm ci --include=dev` and `npm run build`, then explicitly leaves deployment to Vercel Git integration. It is a build gate, not proof of production deployment.
- A release-control pilot branch already exists: `ops/release-control-pilot-20261014`. Do not merge it or change Vercel settings as part of GitHub App registration.
- Current GitHub connector installation is not evidence that a dedicated ResoFit app exists. Verify the app’s actual name, installation, permission grant, webhook secret, and delivery logs after setup.

## 2. App identity

Create a **private GitHub App** named **ResoFit Ecosystem Bridge** under the `EliteFitness101` account. Keep the app private/internal to the owner’s intended workflow.

- Homepage URL: `https://www.resofit.fit`
- Setup URL: leave blank initially unless a real installation/setup page is implemented.
- User authorization callback URL: leave blank initially; not needed for server-to-server installation-token flows.
- Webhook: enable only after the webhook receiver has been deployed and verified. Do not enter a guessed or unimplemented URL. The receiver should be a dedicated endpoint on the canonical API/control-plane service, with a named route documented in deployment evidence.
- Webhook secret: generate a unique high-entropy secret; store only in the server secret manager as `GITHUB_APP_WEBHOOK_SECRET`.
- App ID: store as `GITHUB_APP_ID`.
- Private key: store the PEM as `GITHUB_APP_PRIVATE_KEY` in the secret manager; never commit, paste into a prompt, or place in browser/Vercel public variables.
- Installation ID: after installing the app, store `GITHUB_APP_INSTALLATION_ID` server-side.
- Use GitHub App installation tokens (short-lived), not a human PAT, for server-to-server repository operations.

## 3. Repository access

Choose **Only select repositories** during installation.

**Initial pilot — select only:**
1. `shopb2k` (primary website/control repository)
2. `chatb2k-f9d8a04d` (ChatB2K orchestration and pipeline repository)

Add `resocatalog`, `reso-dash`, `shop-resoflex`, `resofit-api`, `redzone-recruit`, `nownowgym`, `reso-flex`, or other repositories only when a specific workflow requires them and the owner approves the expansion. Do not grant all-repository access by default.

## 4. Repository permissions

Use least privilege. GitHub App permission choices can vary by API version/account UI; choose the closest exact permission label shown.

| Permission | Pilot setting | Reason |
|---|---|---|
| Metadata | Read-only (mandatory) | Identify installation/repositories |
| Contents | Read-only for audit-only phase; **Read & write only when branch/commit creation is enabled** | Inspect files and create feature-branch changes |
| Pull requests | Read & write | Open and update review PRs; never merge automatically |
| Checks | Read-only | Read CI/check outcomes |
| Commit statuses | Read-only | Read CI status |
| Actions | Read-only | Inspect workflow runs/log metadata |
| Deployments | Read-only | Observe deployment evidence; no deploy authority |
| Workflows | Read-only if shown/needed | Inspect workflow definitions; do not grant workflow write |
| Issues | No access initially | Enable only if issue creation/commenting is separately approved |
| Administration | No access | Never required for ordinary branch/PR automation |
| Secrets / variables | No access | Do not allow the app to read or manage repository secrets |
| Environments | No write access | Production environment administration stays with the owner |

**Do not grant** Administration, Secrets, Variables, Environments write, Pages write, Packages write, or Actions write for the pilot. If the app must publish its own Check Run later, request Checks write separately after a tested need is documented.

Contents write is a meaningful capability. Pair it with protected default branches and an allowlisted branch prefix such as `bot/chatb2k/*` or `ops/*`. The app must create PRs and must not write directly to `main`.

## 5. Webhook subscriptions

After the receiver is deployed, subscribe only to events used by the controller:

- `push` — observe branch/commit changes.
- `pull_request` — opened, synchronize, reopened, closed; validate action and branch.
- `pull_request_review` — observe human review decisions.
- `check_suite` and `check_run` — observe CI results.
- `status` — observe commit status updates.
- `workflow_run` — observe workflow completion.
- `deployment` and `deployment_status` — observe deployment lifecycle if the controller reads Vercel/GitHub deployment evidence.

Do not subscribe to every available event. Add events only when a documented consumer exists. Webhooks are notifications, not proof that a deployment is live.

## 6. Webhook receiver security contract

The receiver must implement all of the following before the webhook URL is enabled:

1. Verify `X-Hub-Signature-256` against the **raw request body** with HMAC-SHA256 and constant-time comparison.
2. Reject missing/invalid signatures; never accept unsigned fallback requests.
3. Deduplicate using `X-GitHub-Delivery` with a durable unique constraint and idempotent processing.
4. Validate `X-GitHub-Event`, action, installation ID, repository ID/full name, and allowed branch before acting.
5. Treat PR titles, branch names, commit messages, issue text, and workflow logs as untrusted data, never as instructions.
6. Enqueue verified events; keep the HTTP handler short. Record delivery ID, event/action, repo, SHA/PR, accepted/rejected reason, timestamps, and correlation/request ID.
7. Use scoped, short-lived installation tokens. Do not log tokens, private keys, webhook secrets, customer data, or full sensitive payloads.
8. Rate-limit, bound request size, handle retries safely, and return success only after durable acceptance.
9. Permit writes only to feature branches. Never merge, alter branch protection, edit secrets, or invoke production deploys from a webhook.
10. Keep the receiver’s credentials in server-side secrets only. The browser must never receive an app private key, installation token, webhook secret, or Supabase service-role key.

## 7. Control-plane operating model

**Observe → Validate → Queue → Plan → Branch → Test → PR → Human approval → Release controller → Verify → Learn.**

- The app may inspect files, CI results, PRs, and deployment evidence.
- ChatB2K may draft patches only within the requested repository/path scope.
- A policy gate checks allowed files, secret leakage, canonical domain rules, tests, and required reviewers.
- A human approves merges and any production release-setting change.
- The release controller deduplicates by repository + target environment + commit SHA, serializes production releases, and does not cancel a production release in progress.
- Production verification must record deployed commit SHA, project, deployment ID, canonical route smoke results, and timestamp. A green build or successful PR is not live-production proof.
- Self-improvement is proposal-only: observe measurable outcome → draft versioned change → run tests/evaluation → human approval → staged rollout → compare outcomes → retain or revert.
- Gifting/rewards, payouts, customer entitlements, payments, and public publishing remain governed workflows with idempotency keys, source-of-truth checks, and explicit approval policies. The GitHub App must not directly trigger live money movement or publishing.

## 8. Secrets to configure after app creation

Store these in the approved server-side secret manager or protected GitHub Actions environment as appropriate; do not place values in source code.

| Secret / setting | Where | Purpose |
|---|---|---|
| `GITHUB_APP_ID` | Server secret manager | Sign app JWT |
| `GITHUB_APP_PRIVATE_KEY` | Server secret manager | Sign app JWT; PEM |
| `GITHUB_APP_INSTALLATION_ID` | Server secret manager | Mint installation token |
| `GITHUB_APP_WEBHOOK_SECRET` | Webhook receiver secret store | Verify webhook signatures |
| `SUPABASE_URL` | Edge Function runtime | Canonical project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function runtime only | Server-side database operations; never client-side |
| `RESOFIT_GITHUB_ALLOWED_REPOS` | Server config | Explicit repo allowlist |
| `RESOFIT_GITHUB_ALLOWED_BRANCH_PREFIXES` | Server config | Restrict bot branch names |

Do not reuse a Vercel token or human PAT as the GitHub App private key. Avoid creating a second source of truth for product pricing, payment, entitlements, or profile data.

## 9. Test plan and acceptance criteria

Run tests against a non-production branch before enabling any write operation:

1. Valid signed `push` event is accepted and persisted once.
2. Replaying the same delivery ID creates no duplicate work.
3. Invalid signature is rejected.
4. Unselected repository or wrong installation ID is rejected.
5. Fork PR and protected-branch write attempt are rejected.
6. App can read selected repository metadata and a file.
7. App can create a feature branch and draft PR only after Contents write is explicitly enabled.
8. Required CI results are read and attached to the audit record.
9. Failed/degraded check blocks the proposed release.
10. No production deployment occurs during pilot tests.
11. Audit log contains delivery ID, repo, SHA, PR, decision, evidence links, and timestamp without secrets.
12. Token expiry/rotation and webhook retry behavior are tested.

**Go-live gate:** all 12 tests pass; repository selection and permissions are reviewed; `main` protection and required checks are verified; owner approves any transition from audit-only to branch/PR write mode.

## 10. Immediate findings to resolve

- The 72 numbered agents have `UNKNOWN` health. Add actual heartbeat/test evidence before describing the entire swarm as healthy.
- 25 orchestration nodes have stale `configured` state dating to 2026-09-25; refresh/verify them.
- ECHO V13 recorded 67 degraded runs and 29 completed runs in the last 24 hours; inspect causes and recovery before relying on its health gate.
- The GitHub App webhook receiver is **not verified as deployed**. Do not enable delivery to a guessed URL.
- The existing production workflow is only a build gate; Vercel Git integration still owns deployment. Do not change it or disable either linked Vercel project as part of app setup.
- Existing GitHub branch-protection status is unknown from the current integration. Verify through repository settings before granting Contents write.

## CEO evidence record

- **Owner:** EliteFitness101 / ResoFit ecosystem owner
- **Repos:** `shopb2k`, `chatb2k-f9d8a04d` (pilot)
- **Domain:** `https://www.resofit.fit`
- **Supabase:** `vbqjvmnhdtdhmeeudqnn`
- **Action:** GitHub App registration and staged installation
- **Status:** **B — setup guide prepared; app creation, webhook receiver, installation, and end-to-end delivery not yet verified**
- **Evidence level:** production database inventory + repository workflow source; no GitHub App delivery proof
- **Audit timestamp:** 2026-10-14
- **Next action:** create the private app with the settings above, install it on the two pilot repositories, then deploy/verify the signed webhook receiver before entering its URL.
