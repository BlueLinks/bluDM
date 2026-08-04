# Remote OAuth/OIDC Deployment

bluDM is an OAuth 2.1 protected resource, not an authorization server. Use an established provider
that supports authorization code with PKCE (`S256`), OIDC discovery or RFC 8414 metadata, signed
JWT access tokens, stable subjects, audience claims, scopes, and HTTPS.

## Required Configuration

```dotenv
PUBLIC_APP_URL=https://bludm.example
COOKIE_SECURE=true
MCP_RESOURCE_URL=https://bludm.example/mcp
MCP_OIDC_ENABLED=true
MCP_OIDC_ISSUER=https://identity.example/realms/bludm
MCP_OIDC_AUDIENCE=bludm-mcp
TRUST_FORWARDED_HEADERS=true
```

Only enable forwarded headers behind a trusted proxy that overwrites inbound forwarded values.
Public MCP must use a stable HTTPS origin.

## Provider Registration

Configure a public OAuth client flow compatible with the consuming MCP client:

- response type `code`;
- PKCE method `S256`;
- redirect URIs supplied by the MCP client/host;
- access-token audience `bludm-mcp`;
- requested bluDM scopes;
- token lifetime appropriate for interactive authoring;
- refresh-token rotation where supported.

The authorization server is responsible for login, consent, client registration, authorization
codes, PKCE, token issuance, and refresh. bluDM verifies tokens only.

## Identity Linking

An authenticated bluDM user links an issuer subject through **Settings** or the session-authenticated
OIDC-link API. Linking requires a valid token from the configured issuer. The database stores
issuer, subject, linked user, display metadata, and timestamps; it never treats an unlinked subject
as a bluDM account.

## Verification

For every request bluDM validates:

- signature against discovered JWKS;
- exact configured issuer;
- exact configured audience;
- expiry and standard JWT time checks;
- non-empty stable subject;
- supported bluDM scopes;
- resource claim exactly equal to `MCP_RESOURCE_URL`;
- campaign restriction mode and selected campaign IDs;
- an existing issuer/subject link.

Issuer, audience, expiry, resource, scope, and campaign-boundary rejection have automated tests.
The local integration suite also runs a complete authorization-code + PKCE S256 exchange against
an in-process provider, discovers its metadata and JWKS, verifies the issued resource-bound token,
and constructs a campaign-restricted bluDM principal.

## Discovery

`GET /.well-known/oauth-protected-resource/mcp` publishes the RFC 9728 path-specific metadata;
`GET /.well-known/oauth-protected-resource` remains an equivalent compatibility alias. Both publish:

- `resource`;
- `authorization_servers`;
- bearer-header support;
- every supported scope;
- documentation URL.

A `401` response includes
`WWW-Authenticate: Bearer resource_metadata="https://bludm.example/.well-known/oauth-protected-resource/mcp"`.
The configured provider must publish OIDC or authorization-server metadata and JWKS.

## Release Gate

Before enabling a remote Codex or ChatGPT connection:

1. Complete a security and privacy review.
2. Confirm no cleartext tokens are logged.
3. Verify HTTPS, host forwarding, body/time limits, rate limits, and audit retention.
4. Test authorization code + PKCE end to end with the real provider and client.
5. Test revoked consent, expired tokens, key rotation, and account unlinking.
6. Keep local API-token access available for trusted self-hosted workflows.

Provider provisioning, DNS, public HTTPS deployment, and third-party client consent cannot be
completed by the repository alone; this guide identifies the exact external release gate.
