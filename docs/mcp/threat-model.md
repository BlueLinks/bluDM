# MCP And External Authoring Threat Model

## Protected Assets

Campaign notes, characters, maps, NPCs, encounters, session outcomes, custom library content,
credential links, bearer tokens, and the integrity of authored revisions are protected assets.

## Trust Boundaries

- Browser session cookie to session REST.
- Local or remote bearer credential to external REST/MCP.
- Reverse proxy to Go API.
- Go application services to PostgreSQL.
- bluDM resource server to configured OIDC discovery/JWKS endpoints.
- Returned Markdown to a user-controlled local Vault.

## Threats And Controls

| Threat | Control |
| --- | --- |
| Token theft | One-time display, hash-only storage, expiry, soft revocation, environment indirection, HTTPS guidance. |
| Excess authority | Explicit scopes, presets, campaign allow-lists, service-layer checks. |
| Cross-campaign ID probing | Ownership and campaign validation for every referenced ID. |
| Stale-agent overwrite | Encounter revisions and `expectedRevision`; timestamp concurrency elsewhere. |
| Duplicate retries | Principal/operation/key idempotency records plus normalized input hashes. |
| Preview substitution | Random token stored as a hash and bound to principal, campaign, exact operation hash, expiry, and single apply. |
| Partial multi-record writes | PostgreSQL transactions; failure rolls back all linked entities. |
| Tool deception | Closed-world annotations, stable IDs, no arbitrary SQL/files/URLs, explicit destructive hints. |
| Silent data loss | Canonical compatibility report and strict-by-default statblock export. |
| Source-license leakage | Standard export allow-list requires redistributable SRD source identity. |
| SSRF through OIDC | Operator-configured issuer only; no per-request issuer or JWKS URL. |
| JWT confusion | Signature, issuer, audience, expiry, subject, scope, resource, and identity-link checks. |
| Proxy/header spoofing | Forwarded headers disabled by default; trusted-proxy deployment requirement. |
| Request exhaustion | Body limit, read/write/generation/authentication-failure rate classes, client cancellation, finite timeouts. |
| Live game disruption | No MCP live-combat mutation or deletion tools. |
| Audit gaps | Per-request operation, actor, campaign, target, result class, duration, revision, seed, and generator metadata. |

## Preview Is Not Read-Only Storage

Preview tools create short-lived authorization records, but do not mutate campaign content. They
are annotated read-only because the user-visible domain remains unchanged. Expired previews are
unusable and may be removed by routine retention.

## Residual Risks

- A fully authorized campaign-writer token can make broad changes the user approves.
- Model-authored prose can be wrong even when IDs and transactions are correct.
- PostgreSQL compromise exposes campaign content and token metadata, though not reusable opaque
  token values.
- A malicious or compromised configured identity provider can issue accepted identities.
- A local agent with filesystem authority may write returned Markdown to unintended locations;
  bluDM intentionally does not perform that write.

Use least privilege, review write previews, retain backups, rotate credentials, and inspect audit
records for unusual generation or import volume.
