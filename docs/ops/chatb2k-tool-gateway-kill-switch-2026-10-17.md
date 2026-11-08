# ChatB2K ecosystem tool-gateway kill-switch guard — 2026-10-17

Review-only mirror of active `chatb2k-ecosystem-tool-gateway` v6.

- The gateway now checks `chatb2k_control_plane.kill_switch_enabled` for every `invoke` action, independently of the orchestrator caller.
- If the control-plane read fails, the gateway fails closed (returns an error rather than proceeding with the tool invocation).
- `list_tools` remains available as a read-only diagnostic; actual invocations return HTTP 503 while the global switch is active.
- Existing service-role runtime authorization and per-agent enablement/kill-switch checks remain in place.

This is not a complete ecosystem-wide switch by itself. Each independently callable side-effecting Edge Function/worker still needs a shared guard. Review the full function inventory before release. No production deployment or live switch change was performed.
