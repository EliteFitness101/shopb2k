# ChatB2K Gemini + Google Drive Bridge

**Status: implementation scaffold — not deployed or live-credential tested.** This is an additive, read-only integration under `shopb2k`; it does not replace ChatB2K orchestration, provider routing, or any ResoFit commerce/catalog/payment/fulfillment authority.

## What it does

- Exposes `GET /healthz`, `GET /readyz`, and authenticated `POST /v1/drive/query`.
- Uses a Google service account with the Drive read-only scope.
- Restricts retrieval to files directly inside explicitly configured folder IDs.
- Extracts Google Docs, Google Sheets (CSV export), PDF, DOCX, TXT, Markdown, CSV, and JSON text.
- Sends bounded excerpts to the configured Gemini model and returns answer plus source names, IDs, modification times, and Drive links.
- Keeps credentials server-side and returns redacted errors.

## Security and access setup

1. Create a dedicated Google Cloud service account only if no existing authenticated Drive connector can be reused. Enable the Google Drive API in that project.
2. Share only the intended archive folders with the service account's `client_email` as **Viewer**. Do not grant Editor access.
3. Configure folder IDs in `GOOGLE_DRIVE_ALLOWED_FOLDER_IDS`. Only direct children of these folders are currently indexed; nested folder traversal is intentionally not implemented.
4. Set `BRIDGE_API_TOKEN`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`, and `GEMINI_MODEL` in the deployment secret manager. Use `.env.example` as a variable-name reference only. Never commit a real `.env`, service-account JSON, private key, or API key.
5. Select a currently available Gemini model in your Google AI project and set its exact model ID in `GEMINI_MODEL`; do not assume a model ID is available without checking the account's API access and quotas.
6. Deploy behind HTTPS and network/access controls. Rotate the bridge bearer token and provider credentials if exposed.

## Run locally

Python 3.11+ is recommended.

```sh
cd integrations/gemini-drive-bridge
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app:APP --host 127.0.0.1 --port 8080
```

Set the variables from `.env.example` in your shell or a local untracked environment file. Do not use production credentials for local smoke tests.

## Request example

```sh
curl -X POST http://127.0.0.1:8080/v1/drive/query \
  -H "Authorization: Bearer $BRIDGE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Summarize the executive milestones and action items","max_files":5}'
```

To analyze a specific file, pass its `file_id`; the API checks that its parent is one of the approved folder IDs before reading it.

## ChatB2K integration contract

Call this service from the existing ChatB2K orchestrator/provider route, not directly from a public browser. Preserve the existing request correlation/session identifiers in the caller's audit record; do not forward customer PII unless needed and authorized. Treat `status=completed` as a successful bridge response only, not proof that any downstream business action was executed. Any action based on the answer must pass through existing policy checks and the owning system's APIs.

## Known limitations / release gates

- No service-account credential, Gemini key, folder ID, deployment URL, or production access was available during repository implementation.
- Direct children only; no recursive folder crawl, vector database, durable cache, or long-running indexing job.
- Ranking is a lightweight filename match plus recency, not semantic retrieval. A file-ID query is best for deterministic lookups.
- Scanned PDFs may need OCR; binary formats outside the documented list are rejected/skipped.
- API token auth is a minimum gateway control; production should also use platform identity/network policy, rate limiting at the edge, durable audit storage, and per-caller authorization.
- Before production: run unit tests, validate Drive export and shared-drive permissions, validate model availability/quota, test unauthorized and out-of-scope file requests, and complete an end-to-end query with non-sensitive test documents.
