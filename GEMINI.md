# ChatB2K / ResoFit Ecosystem Instructions

## Purpose
Use this file as persistent project context for Gemini CLI sessions that load repository instructions. It does not configure Gemini mobile/desktop apps globally and does not grant infrastructure access.

## Brand Identity and Routing
- Canonical public production domain: https://www.resofit.fit
- Do not replace canonical links, metadata, robots.txt, sitemap, or manifests with preview, lovable.app, or vercel.app URLs.
- Visual direction: matte obsidian black, restrained champagne-gold accents, and glassmorphism panels.
- Preserve existing production routes and integrations. Audit first; make additive changes only unless explicitly authorized.

## Ecosystem Brands
- ResoFit and ResoFlex: physical and digital wellness management.
- ChatB2K and ChatB2K Orchestra: customer-facing wellness commerce intelligence and agent orchestration.
- Martial-X and RedZone: specialized training and combat-conditioning ecosystems.

## Canonical Ownership and Integration Boundaries
- shopb2k: main ecosystem experience and control repository.
- resofit.fit: canonical public website.
- reso-dash: trainer dashboard/PWA; do not assume its deployment is verified without live evidence.
- shop-resoflex: ResoFlex commerce.
- resocatalog: canonical SKU and pricing authority.
- Commerce systems own pricing, payment, fulfillment, and entitlement truth. Do not create duplicate checkout, profile, assessment, or entitlement engines.
- Preserve rsid, session, and UTM attribution across supported journeys.

## Infrastructure and Evidence Rules
- Supabase project reference: vbqjvmnhdtdhmeeudqnn (resonance-fitness). Verify the target project before any operation.
- Treat Neon, Make.com, n8n, Cloudflare Workers, and any additional provider as unverified until their actual connection/configuration is evidenced.
- Never put API keys, access tokens, passwords, private customer data, or service-role credentials in this repository, logs, prompts, or artifacts.
- Use GitHub Actions secrets for CI credentials. Prefer read-only, least-privilege access for audits.
- A successful prompt or workflow run is not proof of database sync, deployment health, payment success, or end-to-end production readiness.
- Report evidence with timestamp, source, scope, result, and unresolved blockers. Distinguish verified facts from assumptions.
- Do not claim an integration is connected unless a real authenticated operation and its result have been verified.

## Gemini and MCP
- This file provides repository context only. Gemini clients do not automatically share local MCP settings, OAuth sessions, or credentials.
- Configure MCP servers separately in the supported client configuration. Use each provider's current official package and documented authentication method.
- Never commit local Gemini settings or credential-bearing MCP configuration.
- Automated CI audits should be read-only. Schema synchronization or infrastructure writes require a separately designed, explicitly authorized, idempotent workflow with backups and verification.

## Change Protocol
1. Audit existing files, routes, workflows, environment-variable names, and runtime evidence.
2. Apply the smallest additive patch; do not delete or rename existing production resources without authorization.
3. Verify syntax, workflow execution, and each integration independently.
4. Report only what the evidence proves, with exact next actions for anything blocked.
