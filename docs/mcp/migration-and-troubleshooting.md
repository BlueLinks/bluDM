# Migration And Troubleshooting

## Migration

Runtime startup uses GORM migration for the new columns and tables. A forward SQL reference is
also checked in at `backend/migrations/002_external_authoring.sql`.

The migration adds scoped/campaign-restricted soft-revocable API tokens, OIDC subject links,
encounter metadata/revisions, idempotency records, short-lived authoring previews, audit records,
and action display sections. Existing tokens are marked as legacy credentials so the established
Vault bridge keeps working while users rotate to scoped tokens.

Before production rollout:

1. Back up PostgreSQL.
2. Deploy the API migration before relying on version-2 tokens.
3. Create and test a scoped replacement token.
4. Revoke legacy tokens after their integrations move.
5. Keep `MCP_OIDC_ENABLED=false` until the issuer, audience, HTTPS origin, and identity links are
   configured.

## Troubleshooting

### MCP client cannot connect

Check `/mcp/health`, confirm nginx forwards `Authorization`, and ensure proxy buffering is disabled.
The MCP endpoint accepts `POST`; opening it in a browser is not an MCP initialize request.

### `401 unauthorized`

Confirm the environment variable contains the complete one-time token and Codex uses
`bearer_token_env_var`. For OIDC, inspect the protected-resource metadata, issuer discovery, JWKS,
audience, expiry, and `resource` claim.

### `403 forbidden`

The credential is valid but lacks a required scope or campaign. Use the tool security metadata and
the token settings screen to compare scopes. Do not broaden a token merely to hide an incorrect
campaign ID.

### `409 conflict`

Re-read the record. For encounter writes, submit the new `expectedRevision`; for location, NPC, or
roll-table writes, submit the exact current `expectedUpdatedAt`. For preview/apply, do not alter
the approved operations.

### `422 unsupported`

Strict statblock export found a blocking field or a source that is not redistributable. Read the
compatibility report. Use partial mode only for diagnosis; it names omissions rather than silently
dropping them.

### Repeated creation

Use a stable idempotency key per intended creation. A new random key means a new intended entity.

### Stream closes during a long tool call

Increase the client tool timeout and reverse-proxy read timeout, but keep request and server
execution limits finite. `MCP_TOOL_TIMEOUT_SECONDS` defaults to 60. Generation has a separate
lower per-minute rate class, while MCP read and write calls use their own classes even though the
transport method is always `POST`.
