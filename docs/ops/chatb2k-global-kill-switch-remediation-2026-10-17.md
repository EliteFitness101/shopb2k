# ChatB2K global kill-switch remediation — 2026-10-17

## Scope
This review branch mirrors the active `chatb2k-orchestrator` v32 source for review. It does not deploy or change the Supabase runtime, control-plane value, schema, secrets, or agent registry.

## Code changes proposed
- The `tool_gateway` branch now checks the global kill switch after its existing internal authorization check and before forwarding any action to `chatb2k-ecosystem-tool-gateway`.
- The public discovery route remains read-only while the switch is active: it suppresses agent-router invocation and does not write search-gap records.
- The existing revenue/orchestration branch already returns 503 while the global switch is active.
- The switch reason is returned in the existing error response; no secrets are returned.

## Required verification before production promotion
1. Run Deno type-check and lint against the mirrored function.
2. In a non-production/staging project, test switch OFF: public discovery works; authorized tool-gateway calls and revenue orchestration work.
3. Test switch ON: tool-gateway and revenue/orchestration return 503; public discovery still returns directory/catalog results but does not invoke the agent router or insert search-gap rows.
4. Confirm all other autonomous side-effecting Edge Functions have their own fail-closed switch guard; this function-level patch alone cannot establish an ecosystem-wide stop.
5. Verify payment initiation, Paystack webhooks, order verification, and existing digital-product delivery remain independently governed and are not unintentionally disabled.

## Release status
Review-only. No production deployment or live kill-switch toggle performed.
