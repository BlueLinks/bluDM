# bluDM MCP And External Authoring

bluDM exposes two authenticated authoring adapters over one shared Go application layer:

- Streamable HTTP MCP at `POST /mcp`
- Versioned REST at `/api/external/v1`

The browser, REST handlers, and MCP tools share campaign authorization, validation, generation,
transactions, idempotency, encounter revisioning, compatibility checks, rate limits, and audit
records. MCP handlers do not call REST over localhost.

## Local Codex Setup

1. Open **Settings → AI and Vault access**.
2. Create a read-only, encounter-builder, campaign-writer, or custom token.
3. Choose all campaigns or an explicit campaign allow-list.
4. Copy the `bludm_v1_...` secret once and store it in an environment variable.

```sh
export BLUDM_TOKEN=bludm_v1_replace_with_the_shown_secret
```

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.bludm]
url = "http://localhost:3080/mcp"
bearer_token_env_var = "BLUDM_TOKEN"
default_tools_approval_mode = "writes"
startup_timeout_sec = 10
tool_timeout_sec = 60
```

Restart Codex, then ask it to call `list_campaigns`. Never paste the token value into project
configuration, prompts, source files, or screenshots.

For an ephemeral CLI smoke, pass the same `mcp_servers.bludm` overrides without
`--ignore-user-config`; that option intentionally suppresses runtime MCP activation even though a
separate `codex mcp list` command can still display the supplied override.

Discovery tools return a `page` object and accept `limit` from 1 to 100 plus the opaque
`nextCursor` from the prior response. Every MCP tool publishes a concrete input schema and an
object-shaped output schema with explicit success and structured-error alternatives; unknown input
fields are rejected.

## Direct REST Setup

```sh
export BLUDM_URL=http://localhost:3080
curl -H "Authorization: Bearer $BLUDM_TOKEN" \
  "$BLUDM_URL/api/external/v1/campaigns"
```

JSON writes reject unknown properties, enforce the configured body limit, and use the error
envelope:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "invalid JSON body",
    "details": {},
    "requestId": "req-..."
  }
}
```

List endpoints accept `limit` from 1 to 100 and an opaque `cursor`. Creation and destructive
replacement operations require a caller-stable `idempotencyKey`; REST callers may also send it in
`Idempotency-Key`.

Operational limits are configurable with `MCP_MAX_REQUEST_BYTES`,
`MCP_TOOL_TIMEOUT_SECONDS`, `MCP_READ_REQUESTS_PER_MINUTE`,
`MCP_WRITE_REQUESTS_PER_MINUTE`, `MCP_GENERATION_REQUESTS_PER_MINUTE`, and
`MCP_AUTH_FAILURES_PER_MINUTE`. MCP rate classification follows tool semantics rather than treating
every Streamable HTTP `POST` as a write.

## Health And Discovery

- `GET /api/health` checks the API.
- `GET /mcp/health` checks the MCP mount.
- `GET /.well-known/oauth-protected-resource/mcp` publishes RFC 9728 protected-resource metadata;
  the root well-known path is retained as an alias.
- Unauthenticated protected requests return `401` with a `WWW-Authenticate` metadata pointer.

## Guides

- [MCP tool catalogue](tool-catalog.md)
- [Durable encounter authoring](encounter-authoring.md)
- [Fantasy Statblocks export](fantasy-statblocks.md)
- [Token scopes and campaign restrictions](token-security.md)
- [Remote OAuth/OIDC deployment](oauth-deployment.md)
- [Threat model](threat-model.md)
- [Migration and troubleshooting](migration-and-troubleshooting.md)
- [Agent evaluation prompts](agent-evals.md)
- [External REST OpenAPI](../api/external-v1.openapi.yaml)

## Deliberate Boundaries

There are no MCP deletion tools and no live-combat mutation tools. The server never accepts
arbitrary SQL, file paths, URLs, or binary uploads through MCP. A remote server returns Markdown;
a local user or agent decides whether to write that Markdown into an Obsidian Vault.
