# ChatB2K101 Ecosystem Dominion and Capability Contract

**Status:** Proposed governance/specification; not a runtime implementation or production certification.
**Owner:** ResoFit ecosystem architecture
**Applies to:** ChatB2K101 orchestration, ChatB2K agents, ResoFit/ResoFlex surfaces, registered internal services, external commerce/supply providers, and automation workflows.
**Canonical business authority:** Supabase `resonance-fitness` / `vbqjvmnhdtdhmeeudqnn`.
**Change rule:** Audit → additive patch → verify. Production changes require separate review and deployment approval.

## 1. Purpose

ChatB2K101 is the ecosystem-wide intelligence, planning, routing, synchronization, and orchestration plane. Its intended reach includes registered internal repositories and services, approved external commerce and supply endpoints, content/media generators, customer support and lifecycle workflows, and monitoring systems.

Orchestration authority does not transfer ownership of business truth. A service can be visible to the orchestrator without granting it broad credentials, unrestricted write access, or authority to override the owning system.

This document complements `docs/ECOSYSTEM_ARCHITECTURE.md` and `docs/CHATB2K_OPERATING_PROTOCOL.md`; it does not replace them.

## 2. Authority and ownership boundaries

- The canonical production Supabase project `vbqjvmnhdtdhmeeudqnn` remains authoritative for ResoFit business state unless a separately reviewed architecture decision explicitly changes a bounded responsibility.
- Canonical catalog/commerce systems own SKU identity, price, inventory claims, checkout, payment verification, order state, entitlements, refunds and fulfillment status.
- ChatB2K owns orchestration decisions, capability selection, workflow state, ingestion/enrichment coordination, attribution continuity and operational evidence—not duplicate financial ledgers or competing product catalogs.
- External suppliers, marketplaces and competitor sources are evidence/supply inputs. They do not override canonical product recommendations or become approved sellers merely because a URL or API responds.
- The ResoFlex Edge Node is an execution/compute target under reconciliation. A healthy project status does not establish schema parity, production readiness, or permission to move commerce authority.
- Each repository, function, workflow, agent, endpoint and provider must have a declared owner and environment.

## 3. Capability registry contract

Each registered capability should declare, where applicable:

- Stable capability ID and version; owning repository and team/system.
- Environment, project ref, region, endpoint/function identifier, and canonical domain.
- Purpose, supported actions, input/output schema, and event contracts.
- Authentication mechanism and secret *names* (never secret values); scopes and least-privilege role.
- Data classification, permitted data flows, retention rules and customer-consent requirements.
- Dependencies, health probe, timeout, retry policy, idempotency key, rate/cost budget and circuit-breaker behavior.
- Operational owner, rollback/recovery procedure, last successful invocation, last verified timestamp, and evidence reference.
- Status selected from: `planned`, `implemented`, `deployed_unverified`, `verified`, `degraded`, `disabled`, `retired`.

A repository, endpoint, secret name, scheduled workflow or deployed function is not sufficient evidence by itself to mark a capability `verified`. Verification requires a bounded successful invocation and expected side effect, where applicable.

## 4. Cross-system discovery and synchronization

The orchestrator should be able to discover approved capabilities across the registered ecosystem without needing unrestricted write permissions to every repository.

Required behaviors:

1. Read source/configuration metadata and deployed inventory separately; report drift between declared, committed and deployed states.
2. Correlate events using stable event IDs, schema versions, timestamps and trace/correlation IDs.
3. Preserve `user_id`, `session_id`, `rsid`, UTM fields, funnel origin, exact SKU/variant and payment reference where present and permitted.
4. Use idempotent upserts, replay-safe consumers, bounded retries, dead-letter/recovery queues and reconciliation jobs.
5. Never overwrite a system-of-record value from a derived cache or unverified external source.
6. Record sync lag, last successful sync, rejected records, retry counts and unresolved conflicts.
7. Keep discovery/read access separate from execution, mutation and deployment permissions.
8. Require approval for schema changes, financial mutations, external commitments, bulk publishing and destructive operations.

## 5. External product sourcing lifecycle

External sourcing is not complete until all required stages have evidence:

1. **Discover:** Query approved APIs or permitted public sources using the customer's intent, geography, budget and constraints.
2. **Normalize:** Map the offer into a staging representation; preserve original provider ID, canonical URL, retrieved-at timestamp and raw-source reference.
3. **Verify:** Check seller identity/reputation where possible, item identity, region eligibility, price/currency, availability freshness, shipping/lead time, returns/refunds, warranties and supplier terms.
4. **Rights/commercial review:** Confirm listing, image, description and content-use rights, affiliate/commission terms, and whether resale or referral is allowed. Reachability is not permission.
5. **Risk score:** Record evidence quality and unresolved risks. Missing seller, price, stock or commercial permission means `pending_review`, not purchasable.
6. **Register:** Create/update a canonical external-offer record with provider, seller, source SKU, currency, price timestamp, availability timestamp, rights status, fulfillment owner and expiry/recheck policy. Do not create a competing first-party SKU authority.
7. **Offer:** Present the source and fulfillment responsibility transparently to the customer.
8. **Revalidate:** Recheck price and availability before checkout or external handoff when supported.
9. **Fulfill and reconcile:** Record external order/reference, delivery evidence, status transitions, customer communications, commission/refund state and exceptions.
10. **Learn:** Store permitted outcome data for quality/ranking improvements without treating unverified outcomes as ground truth.

## 6. Hybrid offer and bundle contract

A hybrid offer may combine a verified external physical/digital item with a ResoFit-owned guide, generated deliverable, coaching service, subscription or booking only when each component has:

- A stable item identity and an authoritative owner.
- Explicit price, currency, tax/shipping treatment where applicable, availability and commercial terms.
- A clear fulfillment actor, delivery SLA/estimate, entitlement rule and refund/cancellation responsibility.
- Rights clearance for supplied and generated media.
- A durable order-to-component mapping and idempotent fulfillment state machine.

Use a parent bundle/order with independently tracked component states. Never mark the whole order delivered merely because one component succeeded. If a component fails after payment, enter a recoverable partial-failure state and execute the configured replacement, retry, support escalation or refund path. Do not promise a single checkout when provider/payment constraints do not support it.

## 7. Digital product and media generation

Generation capability must be evaluated per output type (text, document/PDF, image, audio, video and other media) and per provider. A prompt, generation specification, database job, source-library record or function deployment does not prove a deliverable exists.

A deliverable is complete only when:

1. The generation job was actually invoked and has a successful terminal state.
2. Output bytes or a valid persisted asset URL are available and can be retrieved.
3. Format, integrity, content QA and required accessibility/quality checks pass.
4. Rights and commercial-use status meet publisher allowlists.
5. The asset is attached to the correct product/factory job and registry entry with provenance.
6. Buyer/user entitlement and identity-specific watermarking are applied where required and supported.
7. Delivery uses a secure, expiring link with authorization checks; the link and expiry are verified.
8. A controlled test confirms delivery to the entitled test identity and denial to an unauthorized identity.

If any gate fails, keep the product/job pending or blocked and do not claim fulfillment. Generation, asset ingestion, publishing and delivery are distinct stages.

## 8. Resilience and operational safety

- Use explicit connect/read timeouts, bounded exponential backoff with jitter, retry budgets and provider-specific circuit breakers.
- Require idempotency keys for payment, order, bundle component, publish, ingestion and fulfillment actions.
- Isolate third-party failure from unrelated first-party capabilities.
- Support outbox/inbox patterns, durable queueing, dead-letter review, replay controls and reconciliation.
- Use backward-compatible additive schema changes and expand/contract rollout where schema migration is required.
- Define service-level objectives per customer-critical journey; do not promise literal zero downtime across independent providers.
- Provide kill switches per provider, workflow, agent and high-risk action; log who/what invoked them.
- Keep credentials server-side and scoped. Prefer short-lived workload identity/OIDC where supported. Never place secret values in source, logs, reports or model prompts.
- Rate-limit external calls and enforce per-agent, per-provider and global cost budgets.

## 9. Access and repository governance

- Broad ecosystem intelligence may use read-only access to relevant repositories and metadata.
- Write access is granted only to repositories that an approved workflow must modify.
- Deployment access is granted per target/environment and remains disabled until migration, function, secret, JWT and rollback requirements are reconciled.
- Runtime API permissions are independent of GitHub repository permissions.
- External endpoint registration does not grant permission to transact, scrape restricted content, republish content or use a supplier's credentials.
- Changes to payment, catalog, entitlement, customer identity, rights or production routing require explicit review by the owning system.

## 10. Production readiness evidence levels

Use the following labels consistently:

- **A — Verified production:** current production deployment plus successful, correlated runtime/side-effect evidence.
- **B — Execution unproven:** source/configuration exists or deployment is present, but successful runtime behavior has not been proven.
- **C — Development/planned:** code, plan or draft exists without accepted production deployment.
- **D — Integration unproven:** a dependency/credential/connection is intended or configured but the authenticated end-to-end operation is not verified.
- **E — Current failure:** a current reproducible failure or explicit unhealthy state is evidenced.

Every readiness report should include owner, repository, project/environment, route/function, evidence source, test timestamp, status, user/business impact, blocker, next action and rollback/recovery path. Historical evidence must be dated and must not be presented as current verification.

## 11. Required acceptance tests before full-autonomy certification

1. Registry reconciliation detects a deliberately introduced source/deployment mismatch without mutating production.
2. A read-only agent can discover capabilities but cannot perform a prohibited write or deploy.
3. A test external offer with missing rights or stale price remains ineligible for purchase.
4. A verified external offer is registered with provenance, price/availability timestamps and fulfillment owner.
5. A hybrid bundle records independent component states and recovers safely from one simulated provider failure.
6. A controlled digital-product job produces retrievable bytes, passes QA/rights gates, attaches to the correct factory job and delivers only to the entitled test identity.
7. Duplicate event/retry injection does not duplicate payments, orders, posts or fulfillment.
8. Correlation/attribution survives discovery → recommendation → checkout/handoff → order → fulfillment.
9. Kill switches, cost limits, alerting and dead-letter recovery are exercised.
10. Current production evidence is captured for each test; passing static tests alone does not certify runtime readiness.

## 12. Immediate reconciliation plan

1. Keep the primary `resonance-fitness` project as commerce/payment/catalog/entitlement/fulfillment authority.
2. Keep Edge Node production auto-deployment disabled until the repository's migrations and function directories are reconciled with the target's recorded inventory.
3. Resolve the BIGO routing discrepancy explicitly: active workflow currently calls the primary project's `bigo-live-pipeline`, while Edge Node exposes `xbang-live-pipeline`. Do not rename or reroute by inference.
4. Inventory existing sourcing, capability registry, media factory, fulfillment, agent router and ecosystem QA functions before building duplicates.
5. Map each acceptance test to an existing function/table/workflow and mark gaps; patch only the smallest missing contract or implementation.
6. Publish a CEO readiness report that separates verified capabilities from partial, unverified and blocked paths.

## Current disposition

This contract is a proposed additive specification. It does not assert that the described capabilities have been implemented, that all external providers are connected, or that full autonomous orchestration is production-ready. Merge and runtime implementation require review against current source, database schemas, deployed function configuration, credentials, provider terms and controlled tests.
