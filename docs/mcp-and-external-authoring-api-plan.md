# MCP And External Authoring API Implementation Plan

Status: Implemented locally; production OAuth deployment gate remains
Last updated: 2026-08-06

## Implementation Record

All repository-local phases are implemented through the shared Go application layer, external REST
API, Streamable HTTP MCP adapter, scoped-token UI, migrations, Docker/nginx path, canonical
statblock exporter, revisioned encounter authoring, Campaign World/bulk writes, and advanced
preparation tools. Contract tests cover concrete MCP input/output schemas, bounded cursor
pagination, authorization, audit data, idempotency, optimistic concurrency, and transport-aware
rate classes.

Two plan boundaries remain deliberate:

- bluDM is the OAuth protected resource, not a production authorization server. An authorization
  code flow with PKCE S256 is proven with a local test provider; selecting/provisioning the real
  provider, DNS, public HTTPS deployment, third-party consent, and production security review
  require explicit external authorization and credentials.
- Fantasy Statblocks import remains the explicitly optional later extension described by the
  representability contract. Export, compatibility preview, strict/partial behavior, and
  round-trippable bluDM Markdown imports are complete; no exporter output is treated as a promised
  lossless Fantasy Statblocks import format.

The browser preview-first constraint is resolved with a deterministic preview fingerprint. An
untouched reviewed roster is saved through the same atomic encounter application service; a
mismatch is rejected before mutation.

The repository-controlled release path was revalidated on 2026-08-04. `make verify` and
`make verify-security` pass, including 71 frontend test files/289 tests, every Go package, the
production frontend build, the scoped dependency audit, `govulncheck`, and `gosec`. Fresh-Postgres
application, REST, MCP, OIDC/PKCE, migration, idempotency, concurrency, revision, generator, and
stat-block suites pass. All 664 enabled standard creatures remain supported. The read-only Vault
verifier confirms that all seven curated notes use Fantasy Statblocks 4.10.3 and contain the exact
checked-in fences; the snapshot fixture was also rendered live in Obsidian, while the complete
seven-note visual pass remains recorded by the 2026-07-30 check.

The 2026-08-06 campaign/player management expansion adds six MCP tools and separate
`campaigns:write`/`party:write` grants. Its Streamable HTTP workflow and scope-boundary tests pass,
as does `make verify` with 73 frontend test files/300 tests, all backend packages, the production
frontend build, and Compose configuration. The prior live Inspector/Codex interoperability record
predates these six tools; the repository-controlled MCP client and contract suites cover the new
surface locally.

The current contract suite discovers all 52 tools with object-shaped success/error output unions.
The last live Inspector pass on 2026-08-04 discovered the then-current 46 tools and successfully
called `list_campaigns` through the nginx-served `http://localhost:3080/mcp` endpoint. The installed
Codex CLI then connected to that exact endpoint, invoked the same tool, received structured
content, and returned the campaign ID. The current migration binary passed a full isolated
PostgreSQL backup/destroy/restore drill, and the newly compiled API plus newly built SPA assets
passed nginx health/discovery and both production Playwright journeys in isolated containers.

The only current verification infrastructure limitation is the Docker Desktop daemon's inability
to resolve any Docker Hub manifest, including a direct `alpine:3.24` pull. Consequently the
prescribed `make verify-docker` image rebuild, and therefore the wrapper `make verify-full`, cannot
finish until registry access returns. The cached-base substitute above exercises the changed
runtime artifacts and nginx streaming path but is not recorded as a successful image rebuild.

## Decision Summary

bluDM should add an authenticated MCP server for campaign preparation and authoring while keeping
REST as a first-class integration surface for the browser, CLI tools, scripts, and clients that do
not speak MCP.

MCP and REST must not contain separate domain implementations. Both adapters should call shared Go
application services that own validation, authorization, transactions, encounter difficulty, and
response contracts.

The first useful authoring release should target local and self-hosted Codex use through Streamable
HTTP and the existing revocable bearer-token model. Its primary workflow is write-first encounter
authoring: the first generation call creates a real planned encounter in bluDM, and later rerolls
revise that same encounter through recoverable, revisioned writes. Remote ChatGPT/plugin use should
follow only after a standards-compliant OAuth 2.1 deployment is available.

## Why The Previous Deferral Is Now Resolved

MCP was deferred while the versioned REST API and Vault bridge were sufficient. Real usage has now
shown the missing orchestration layer:

- An agent cannot discover campaign players or locations before generating an encounter.
- Encounter generation returns a preview but not enough authoritative difficulty evidence.
- An agent has no first-class way to save an accepted generated encounter.
- The current CLI does not expose generation.
- Campaign writing needs compact discovery and search tools rather than knowledge of many internal
  REST routes.
- Safe multi-step writes need preview, confirmation, idempotency, and conflict handling.

This is the concrete discovery and orchestration gap that the roadmap said should trigger an MCP
revisit.

## Primary Authoring Use Case

The MCP encounter generator is a campaign-writing aid, not a disposable random-monster picker.
A representative workflow is:

1. The user asks an agent to write or develop a dungeon.
2. The agent discovers the campaign, party, creature library, locations, and existing encounters.
3. The agent creates the dungeon/room structure, or selects existing room IDs.
4. For an encounter-bearing room, the agent calls `create_generated_encounter`.
5. That call atomically creates a normal `planned` encounter and its initial roster in bluDM. It
   returns the encounter ID, revision, actual difficulty evidence, warnings, app URL, and export
   links.
6. The agent and user review the result as part of the dungeon prose. A reroll calls
   `regenerate_encounter` with the same encounter ID; a surgical change calls `update_encounter`.
7. Each generative replacement creates a recoverable revision and keeps the stable encounter ID,
   location link, title, notes, and user-owned combatants unless the caller explicitly changes
   them.
8. The agent exports the encounter reference plus deduplicated Fantasy Statblocks-compatible
   creature blocks and places the returned Markdown in the user's Obsidian note.
9. The user can open the same encounter in bluDM at any point to edit, test, or run it.

This makes bluDM the durable source of truth throughout an iterative writing session. There is no
orphan preview that the user must remember to save later.

The browser builder may keep its existing preview-first interaction because a human is already
reviewing a form. It should call the same generation/evaluation application service and use the
same atomic persistence command when the user selects **Create encounter**. MCP intentionally uses
the write-first workflow because the tool name, write approval, and returned entity make the
persistence side effect explicit.

Hard input failures do not create an empty record: unknown or cross-campaign IDs, an inaccessible
party, or no eligible creatures return an error. If a valid roster exists but misses the requested
difficulty band, the encounter is still created with `withinTarget: false` and prominent warnings
so it remains available for iteration.

## Goals

- Let a DM connect Codex to a self-hosted bluDM instance with a revocable, expiring token.
- Let an agent discover campaigns, players, locations, NPCs, encounters, and library content
  without guessing IDs.
- Make encounter evaluation and generation server-authoritative and auditable.
- Create a durable bluDM encounter on the first MCP generation call and revise it safely through
  iterative rerolls or targeted edits.
- Export full creature stat blocks in a Fantasy Statblocks-compatible Obsidian format.
- Prove export compatibility field by field, normalize standard/custom storage differences, and
  reject unsupported stat blocks instead of silently losing data.
- Let an agent save other authored campaign data safely after review.
- Support campaign-writing workflows such as location development, NPC creation, world
  consistency checks, prep-gap review, roll tables, journeys, and session recaps.
- Keep the browser, REST clients, and MCP tools behaviorally consistent.
- Preserve campaign ownership boundaries and allow least-privilege, campaign-restricted tokens.
- Keep destructive live-combat and deletion operations out of the initial MCP surface.

## Non-Goals

- Do not build a second campaign database for MCP.
- Do not have MCP handlers call bluDM's REST API over localhost.
- Do not embed a language model in the bluDM backend. The connected client authors prose; bluDM
  supplies structured context, deterministic generation, validation, and persistence.
- Do not expose every existing HTTP route as a tool.
- Do not add live combat mutation tools in the initial release.
- Do not allow arbitrary SQL, arbitrary file reads, arbitrary URLs, or unrestricted binary uploads.
- Do not make the remote bluDM MCP server write directly into an Obsidian Vault. It returns
  Markdown; a local agent or the existing Vault workflow owns placement in the Vault.
- Do not publish a remote ChatGPT plugin before OAuth, HTTPS, privacy, and security review are
  complete.

## Current Foundation

bluDM already has:

- Session-authenticated browser routes.
- Versioned external REST routes under `/api/external/v1`.
- High-entropy `bludm_v1_...` API tokens stored only as hashes.
- Token expiry, revocation, prefix display, and last-used tracking.
- External bearer-authenticated routes for campaign discovery, generation previews, Markdown
  preview/import, and encounter Markdown export.
- Campaign ownership checks in stores and handlers.
- Markdown preview/import for encounters, NPCs, and dungeons.
- `bludm-encounter` Markdown export for bluDM round trips.
- Deterministic encounter and dungeon preview generators.
- Creature records with structured stat blocks, actions, and spellcasting data that can feed an
  Obsidian exporter.
- Campaign World locations, links, NPC relationships, shops, maps, journeys, and roll tables.
- A Go backend that can host the MCP transport without adding another runtime.

The implementation should extend these foundations rather than replace them.

## Getting A Local Token

A scoped token can be created for MCP and the external REST API:

1. Open bluDM.
2. Open **Settings**.
3. Find **AI and Vault access**.
4. Choose a descriptive name and expiry.
5. Select **Create token**.
6. Copy the `bludm_v1_...` secret immediately. It is shown only once.
7. Store it in a secret manager or a local environment variable, not in Git or Codex project
   configuration.

For the current REST API:

```sh
export BLUDM_URL=http://localhost:3080
export BLUDM_TOKEN=bludm_v1_replace_with_the_shown_secret
```

Local Codex configuration should reference the environment variable rather than containing the
token value:

```toml
[mcp_servers.bludm]
url = "http://localhost:3080/mcp"
bearer_token_env_var = "BLUDM_TOKEN"
default_tools_approval_mode = "writes"
startup_timeout_sec = 10
tool_timeout_sec = 60
```

The server must work with a direct bearer-token connection before OAuth work begins.

## Architecture

```text
React frontend       CLI / scripts        Codex / MCP client
      │                    │                       │
session REST          bearer REST          Streamable HTTP MCP
      │                    │                       │
      └────────────── transport adapters ──────────┘
                              │
                    authenticated Principal
                              │
             shared application/domain services
                              │
        stores + generation + import/export + authorization
                              │
                          PostgreSQL
```

### Shared Application Services

Introduce small domain-oriented services under `backend/internal/app`, for example:

```text
backend/internal/app/
  campaigns/
  encounters/
  library/
  party/
  world/
  authoring/
```

Each service should:

- Accept an authenticated principal rather than reading HTTP or MCP state.
- Enforce ownership and token campaign restrictions.
- Validate typed commands and queries.
- Own transactions for multi-record operations.
- Return transport-neutral result types and typed domain errors.
- Avoid importing `net/http` or MCP SDK packages.

Existing HTTP handlers should migrate incrementally. The first extraction should cover MCP Phase 1
queries and encounter generation; unrelated handlers do not need a broad rewrite.

### Transport Adapters

- `backend/internal/httpapi` remains responsible for HTTP decoding, status codes, and REST
  envelopes.
- Add `backend/internal/mcpserver` for MCP registration, tool schemas, annotations, and structured
  results.
- `backend/cmd/server` mounts both API routes and `/mcp` on the same Go server.
- `frontend/nginx.conf` proxies `/mcp` to the API service with streaming-safe settings, no response
  buffering, and appropriate timeouts.
- Do not introduce a Node or Python sidecar.

### MCP SDK And Protocol

- Use the official `github.com/modelcontextprotocol/go-sdk`.
- Pin a reviewed stable version in `backend/go.mod`; do not follow an unpinned latest release.
- Start with the broadly supported Streamable HTTP behavior negotiated with current Codex clients.
- Verify both the 2025-11-25 compatibility path and the current protocol supported by the pinned
  SDK before enabling newer protocol-only behavior.
- Prefer stateless requests where supported because all durable state belongs in PostgreSQL.
- Add server instructions that make the first 512 characters self-contained: choose a campaign,
  discover IDs, read before writing, explain that encounter generation creates a durable planned
  encounter, require user approval for writes, reuse the returned encounter ID for rerolls, and
  never invent identifiers.

## Authentication And Authorization

### Phase 1: Local Bearer Tokens

Reuse the current opaque API token format for local Codex, CLI, and trusted self-hosted tools.

Refactor token authentication to return a principal:

```text
Principal
├─ user ID
├─ token ID or session ID
├─ authentication method
├─ scopes
├─ allowed campaign IDs
└─ expiry / audit metadata
```

The application-service layer, not only middleware, must enforce the principal.

### Token Scopes

Add explicit scopes:

| Scope              | Capability                                                        |
| ------------------ | ----------------------------------------------------------------- |
| `campaigns:read`   | List campaigns and read campaign summaries.                       |
| `campaigns:write`  | Create campaigns and update campaign settings and rulesets.       |
| `party:read`       | Read campaign players and character information.                  |
| `party:write`      | Create, update, move, and clone players.                           |
| `world:read`       | Read locations, links, NPC placement, shops, maps, and prep gaps. |
| `world:write`      | Create or update locations and world relationships.               |
| `library:read`     | Search and read creatures, spells, items, and standard entries.   |
| `library:write`    | Create or update custom creatures, NPCs, spells, and items.       |
| `encounters:read`  | Read encounters, rosters, and difficulty.                         |
| `encounters:write` | Create or update prepared encounters.                             |
| `generation:run`   | Run deterministic generation and evaluation.                      |
| `content:import`   | Preview and apply bulk authored campaign content.                 |
| `sessions:read`    | Read completed run summaries when that phase is implemented.      |

There should be no initial `sessions:write` or general `delete` scope.

### Token Presets And Campaign Restrictions

Update **AI and Vault access** with:

- A read-only campaign assistant preset.
- An encounter builder preset with `campaigns:read`, `party:read`, `world:read`, `library:read`,
  `encounters:read`, `encounters:write`, and `generation:run`.
- A campaign writer preset with scoped writes.
- An advanced custom scope picker.
- A campaign selector: one campaign, selected campaigns, or all owned campaigns.
- Expiry, last used, prefix, scopes, campaign restriction, and revoke controls.

New tokens should default to read-only. A user must explicitly select write access.

Existing tokens must keep their current external REST behavior, but should not silently gain new MCP
write permissions. Require creation of a new MCP-scoped token or an explicit permission upgrade.

### Data Model Changes

Extend API token storage with:

- Scope set.
- Campaign restriction mode.
- Optional related allowed-campaign records.
- Authentication version.
- Optional revoked-at timestamp for better auditing, while preserving immediate denial.

Token lookup should return the token and user in one authentication result. Continue storing only a
hash and short display prefix.

Encounter authoring needs a small, explicit revision model:

- Add an integer `revision` to encounters for optimistic concurrency.
- Store generation metadata under the existing encounter metadata JSON: generator/ruleset version,
  seed, normalized options, selected party snapshot, location context, actual difficulty evidence,
  warnings, and the actor/token that initiated the change.
- Add `encounter_revisions` with encounter ID, monotonically increasing revision, a complete
  metadata-and-combatant snapshot, normalized generation input/output when applicable, change
  reason, actor, and timestamp.
- Mark generated combatants in their existing snapshot JSON with an authoring origin and generation
  batch ID. A reroll replaces only generator-managed enemy combatants by default; manually added
  enemies, allies, player combatants, encounter prose, loot, and location links are preserved.
- Record revision 1 after the initial encounter and roster are created. Restoring an old revision
  creates a new head revision; it never rewinds or deletes history.

The encounter remains in the existing `planned` status during authoring. Do not add a second draft
status merely to distinguish MCP-created records; generation metadata and revision history carry
that provenance without changing existing filters and run behavior.

### Authorization Rules

- Every tool verifies user ownership and token scope.
- Every campaign-scoped tool verifies the campaign restriction.
- Library queries require campaign context when standard-source visibility depends on campaign
  settings.
- Unknown IDs return a typed not-found error; they are never silently ignored.
- Insufficient scope returns a distinct forbidden error.
- MCP tool metadata declares its required OAuth scopes, but server checks remain authoritative.

### Phase 2: Remote OAuth 2.1

Bearer environment variables are suitable for local Codex, but a remote ChatGPT/plugin connection
requires OAuth rather than a pasted custom API key.

For a remotely reachable MCP server:

- Serve `/.well-known/oauth-protected-resource`.
- Return a `WWW-Authenticate` challenge pointing to that metadata.
- Use an established OAuth 2.1/OIDC authorization server that supports the MCP client-registration
  requirements; do not build a production authorization server casually.
- Support authorization code with PKCE S256.
- Propagate and validate the MCP `resource` value as the token audience.
- Validate signature, issuer, audience, expiry/not-before, and scopes on every request.
- Map the authorization-server subject to one bluDM user.
- Support revocation, refresh, reauthorization, and scope upgrades.
- Include tool-level OAuth security schemes and MCP authentication error metadata.
- Require HTTPS and verify proxy-forwarded scheme/host handling.

If bluDM later implements its own authorization server, it needs separate threat modelling and tests
for authorization codes, PKCE, client registration, consent, refresh-token rotation, replay, and
revocation. That work should not block the local MCP release.

## External REST Contract

The external REST API remains useful independently and becomes the contract reference for CLI
clients. REST and MCP should share DTOs where practical.

### Contract Rules

- Keep `/api/external/v1` backward compatible.
- Add fields rather than changing existing meanings.
- Use explicit pagination with `limit` and opaque `cursor`.
- Return stable IDs and user-openable bluDM URLs.
- Reject unknown JSON fields.
- Use typed machine-readable errors in addition to human-readable messages.
- Require an idempotency key for creates, imports, generation, and regeneration.
- Require `expectedUpdatedAt` or an equivalent version for agent-driven updates.
- Return conflicts instead of overwriting records changed since the agent read them.
- Set request-size and result-size limits.
- Document the API in `docs/api/external-v1.openapi.yaml` and validate examples in tests.

### Phase 1 Read Endpoints

| Method | Endpoint                                                         | Purpose                                                |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------ |
| `GET`  | `/api/external/v1/campaigns`                                     | Discover campaigns.                                    |
| `GET`  | `/api/external/v1/campaigns/{id}`                                | Compact campaign context and capability links.         |
| `GET`  | `/api/external/v1/campaigns/{id}/players`                        | Discover party IDs and levels.                         |
| `GET`  | `/api/external/v1/campaigns/{id}/players/{playerId}`             | Read a character sheet.                                |
| `GET`  | `/api/external/v1/campaigns/{id}/locations`                      | Discover location hierarchy and IDs.                   |
| `GET`  | `/api/external/v1/campaigns/{id}/locations/{locationId}`         | Read location context and relationships.               |
| `GET`  | `/api/external/v1/campaigns/{id}/world-graph`                    | Compact hierarchy and connection graph.                |
| `GET`  | `/api/external/v1/campaigns/{id}/encounters`                     | List prepared encounters.                              |
| `GET`  | `/api/external/v1/campaigns/{id}/encounters/{encounterId}`       | Read roster and difficulty.                            |
| `GET`  | `/api/external/v1/campaigns/{id}/library/creatures`              | Search allowed custom and standard creatures.          |
| `GET`  | `/api/external/v1/campaigns/{id}/library/creatures/{creatureId}` | Read full creature details, actions, and spells.       |
| `GET`  | `/api/external/v1/campaigns/{id}/library/entries`                | Search spells, items, and rules entries.               |
| `GET`  | `/api/external/v1/campaigns/{id}/search`                         | Search campaign content across supported entity types. |
| `GET`  | `/api/external/v1/campaigns/{id}/prep-gaps`                      | Return deterministic missing-prep signals.             |

### Encounter Evaluation And Generation

Add:

| Method | Endpoint                                                                         | Purpose                                                                           |
| ------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `POST` | `/api/external/v1/campaigns/{id}/generation/encounter-evaluation`                | Evaluate an explicit party and enemy roster without saving.                       |
| `POST` | `/api/external/v1/campaigns/{id}/generation/encounter-preview`                   | Keep the existing browser-oriented deterministic preview without saving.          |
| `POST` | `/api/external/v1/campaigns/{id}/encounters/generate`                            | Generate and atomically create a durable planned encounter and initial revision.  |
| `POST` | `/api/external/v1/campaigns/{id}/encounters/{encounterId}/regenerate`            | Reroll generator-managed enemies on the same encounter and create a new revision. |
| `GET`  | `/api/external/v1/campaigns/{id}/encounters/{encounterId}/revisions`             | List compact encounter revision history.                                          |
| `POST` | `/api/external/v1/campaigns/{id}/encounters/{encounterId}/revisions/{n}/restore` | Restore an earlier snapshot as a new head revision.                               |

`POST .../encounters/generate` is the REST equivalent of the primary MCP authoring tool. Its input
includes:

- Idempotency key.
- Location/room ID and optional authored name/description.
- Explicit `allCampaignPlayers` or selected player IDs.
- Whether selected players should also be added to the saved encounter roster; default `true`.
- Target difficulty, archetype/role constraints, total enemy-body range, required/forbidden
  creatures, source filters, boss/minion/hazard preferences, and deterministic seed.
- Optional writing context such as intended narrative purpose and room theme. Context may influence
  only documented deterministic tags/filters; it must not be treated as executable instructions.

The create and regenerate responses must include:

```text
saved encounter ID, revision, status, and app URL
generator version and deterministic seed
campaign, location, and selected-party snapshot
requested target difficulty
actual calculated difficulty
easy / medium / hard / deadly thresholds
raw enemy XP
enemy-count multiplier
adjusted XP
target band and whether the result is inside it
warnings and confidence limitations
candidate-pool summary
exact enemy references and quantities
which combatants are generator-managed
created/preserved/replaced combatant counts
Obsidian and bluDM Markdown export links
```

Required behavioral changes:

- A caller explicitly selects `allCampaignPlayers` or supplies player IDs.
- Missing, duplicate, cross-campaign, or unknown player IDs are errors.
- The `difficulty` value cannot echo the requested target while hiding a different actual result.
- Sparse libraries and missed targets return a structured warning and `withinTarget: false`.
- Zero-XP or incomplete creatures are excluded or clearly warned about.
- The ruleset and party-size behavior are explicit and tested.
- Allies are never silently ignored. The contract either accepts a documented equivalent-level
  adjustment or returns an `alliesNotBudgeted` warning.
- Terrain, boss, minion, and hazard flags describe actual generator behavior; prose-only flags must
  not imply mechanical tuning.
- `create_generated_encounter` persists the selected party combatants and generated enemies in one
  transaction, so retries cannot expose an encounter with a partial roster.
- A valid but off-target result is saved with warnings so the author can reroll it. Hard validation
  failures create nothing.
- `regenerate_encounter` requires `expectedRevision`, chooses a fresh seed when the caller requests
  a reroll, and replaces only generator-managed enemies unless explicit preserve/replace options
  say otherwise.
- Reusing the same idempotency key and normalized input returns the original result. Reusing a key
  with different input is a conflict.
- A user may make a precise roster edit through `update_encounter` instead of rerolling the entire
  generated portion.

The browser preview route can retain a preview fingerprint so its human-reviewed candidate can be
saved exactly. MCP does not use a separate save-preview tool: its explicitly named generation tool
creates the durable record on the first call.

### Encounter And Stat-Block Exports

Keep the existing `GET /api/external/v1/encounters/{encounterId}/markdown` route for bluDM's
round-trippable `bludm-encounter` format. Add campaign-scoped export routes:

| Method | Endpoint                                                                                                  | Purpose                                                                |
| ------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `GET`  | `/api/external/v1/campaigns/{id}/library/creatures/{creatureId}/exports/fantasy-statblocks`               | Export one complete creature stat block.                               |
| `GET`  | `/api/external/v1/campaigns/{id}/library/creatures/{creatureId}/exports/fantasy-statblocks/compatibility` | Validate and explain field coverage without rendering.                 |
| `GET`  | `/api/external/v1/campaigns/{id}/encounters/{encounterId}/exports/fantasy-statblocks`                     | Export one stat block per distinct encounter creature.                 |
| `GET`  | `/api/external/v1/campaigns/{id}/encounters/{encounterId}/exports/fantasy-statblocks/compatibility`       | Validate every distinct encounter creature.                            |
| `GET`  | `/api/external/v1/campaigns/{id}/encounters/{encounterId}/exports/obsidian-bundle`                        | Export the bluDM encounter block, roster summary, and creature blocks. |

These routes support `application/json` for structured clients and `text/markdown` for direct note
insertion. The encounter exporter deduplicates repeated creatures while retaining quantities in a
roster summary.

Use a versioned export profile, initially `fantasy-statblocks-basic-5e@1`, which produces the
Fantasy Statblocks plugin's fenced YAML form:

````markdown
```statblock
layout: Basic 5e Layout
name: Goblin
source: SRD 5.2.1
size: Small
type: Fey
subtype: Goblinoid
alignment: Neutral Evil
ac: 15
hp: 7
hit_dice: 2d6
speed: 30 ft.
stats: [8, 14, 10, 10, 8, 8]
damage_vulnerabilities: ""
damage_resistances: ""
damage_immunities: ""
condition_immunities: ""
senses: Darkvision 60 ft., Passive Perception 9
languages: Common, Goblin
cr: 1/4
traits: []
actions:
  - name: Scimitar
    desc: "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage."
```
````

### Stat-Block Representability Contract

Export compatibility is a release gate, not a best-effort serializer. Before implementing YAML
rendering, introduce a canonical, transport-neutral `Canonical5eStatBlock` under the shared
application/domain layer.

The canonical builder must merge:

- Core `Creature` columns.
- Standard-creature JSON, which currently uses fields such as `abilities`, `defenses`,
  `specialAbilities`, embedded action sections, and `spellcasting`.
- User-creature JSON, which currently uses fields such as `abilityScores`,
  `savingThrowProficiencies`, typed senses, and separate passive values.
- Separate user creature actions and action-roll parts.
- Separate spellcasting profiles and resolved spell references.
- The saved encounter-combatant snapshot when an encounter requests historical data.

Do not map either raw JSON shape directly to YAML. Normalize both sources into the canonical model,
validate it, and only then convert it to the versioned Fantasy Statblocks profile.

The initial field-compatibility matrix is:

| bluDM source                                                          | Fantasy Statblocks field                                            | Conversion and fidelity                                                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Name                                                                  | `name`                                                              | Direct; required.                                                                                              |
| Avatar/Vault image override                                           | `image`                                                             | Direct only for an explicit Vault path or safe public URL; authenticated bluDM URLs are omitted.               |
| Size                                                                  | `size`                                                              | Direct; required for complete output.                                                                          |
| Creature type and subtype                                             | `type`, `subtype`                                                   | Direct after normalizing standard/user field names.                                                            |
| Alignment                                                             | `alignment`                                                         | Direct.                                                                                                        |
| Armor class                                                           | `ac`                                                                | Direct; preserve textual AC notes when present.                                                                |
| Hit points and hit dice                                               | `hp`, `hit_dice`                                                    | Direct.                                                                                                        |
| Walk/swim/fly/burrow/climb speeds                                     | `speed`                                                             | Deterministically format one plugin-compatible string.                                                         |
| Standard `abilities` or user `abilityScores`                          | `stats`                                                             | Normalize to `[STR, DEX, CON, INT, WIS, CHA]`; all six are required.                                           |
| Standard save bonuses                                                 | `saves`                                                             | Direct keyed bonuses.                                                                                          |
| User save proficiencies                                               | `saves`                                                             | Derive signed bonuses from ability modifier and CR proficiency bonus; report that the value was derived.       |
| Standard skill bonuses                                                | `skillsaves`                                                        | Direct keyed bonuses.                                                                                          |
| User skill proficiency/expertise                                      | `skillsaves`                                                        | Derive signed bonuses from ability, CR proficiency bonus, and expertise.                                       |
| Vulnerabilities/resistances/immunities                                | `damage_vulnerabilities`, `damage_resistances`, `damage_immunities` | Join normalized lists without changing restrictions such as “from nonmagical attacks.”                         |
| Condition immunities                                                  | `condition_immunities`                                              | Join normalized values.                                                                                        |
| Senses and passive Perception                                         | `senses`                                                            | Combine enabled senses and passive Perception into one stable string.                                          |
| Languages                                                             | `languages`                                                         | Direct.                                                                                                        |
| Challenge rating                                                      | `cr`                                                                | Preserve fractional values as strings.                                                                         |
| Source label                                                          | `source`                                                            | Direct, subject to export/licensing policy.                                                                    |
| Standard special abilities or typed custom traits                     | `traits`                                                            | Map `{name, description}` to `{name, desc}`.                                                                   |
| Standard actions or custom creature actions                           | `actions`                                                           | Map names and synthesize a complete readable `desc` from structured mechanics.                                 |
| Bonus actions, reactions, legendary/mythic/lair actions               | Corresponding plugin action arrays                                  | Direct only when bluDM carries an explicit section classification.                                             |
| Legendary/mythic introductory text                                    | `legendary_description`, `mythic_description`                       | Direct when present.                                                                                           |
| Standard spellcasting text or resolved user spellcasting              | `spells`, `spellsNotes`                                             | Preserve standard text; otherwise build headings from caster level, ability, save DC, attack bonus, and slots. |
| Description, environment, XP, disposition, IDs, icons, and provenance | Adjacent bundle metadata or namespaced structured response          | Not part of the Basic 5e visual layout; never pretend these fields are visibly represented by the plugin.      |
| Structured attack rolls, area data, miss effects, and usage           | Action `desc` plus structured API metadata                          | Visually representable after deterministic prose rendering, but not losslessly round-trippable through YAML.   |

### Current Repository Compatibility Audit

The initial audit of `backend/internal/db/standard_creatures.json` on 2026-07-30 found:

- 664 standard creatures.
- All 664 have names, sizes, creature types, AC, and HP.
- Four SRD 5.2.1 records currently have no challenge rating: Gold Dragon Wyrmling, Silver Dragon
  Wyrmling, White Dragon Wyrmling, and Young White Dragon.
- Young White Dragon also lacks an Intelligence score.
- 72 records contain bonus actions, 36 contain reactions, 62 contain legendary actions, and 36
  contain spellcasting data. These sections therefore need first-class compatibility coverage and
  cannot be treated as rare optional extras.

The 2026-08-04 source-data repair corrected the importer rather than guessing in the exporter. The
SRD 5.2.1 parser now accepts both `XP 700` and `700 XP` CR lines and the source's unsigned zero
ability/save notation. Regeneration restored the authoritative CR, XP, proficiency, and Young
White Dragon Intelligence values from each record's checked-in raw SRD text. Strict validation also
identified and repaired four source-extraction speed omissions—Darkmantle, Sahuagin Warrior,
Succubus, and Xorn—from that same raw text. Sentinel tests cover the repaired records. All 664
enabled records now pass strict compatibility with zero exporter-fabricated fields and zero
quarantined standards.

This matrix exposes two implementation gaps to resolve before claiming full custom-creature
compatibility:

1. Add an explicit display section/category for user creature features and actions:
   `trait`, `action`, `bonus_action`, `reaction`, `legendary_action`, `mythic_action`, or
   `lair_action`. Existing records default to `action`; migration must not guess other categories.
2. Add typed legendary/mythic descriptions and typed custom traits, or formally normalize their
   existing stat-block JSON representations into the canonical model.

These are bluDM modelling gaps, not limitations of the Fantasy Statblocks plugin. Until resolved,
the compatibility report must identify affected custom records rather than putting every custom
action into the wrong section.

Compatibility levels:

- `complete`: every supported Basic 5e visual field held by bluDM is represented without loss of
  visible meaning.
- `complete_with_warnings`: the rendered stat block is valid and usable, but some structured bluDM
  mechanics were flattened into prose or non-layout metadata was omitted.
- `unsupported`: a required identity/combat field is missing, an action cannot be assigned to a
  truthful section, content is not exportable, or the selected snapshot cannot be resolved.

The MCP and REST exporters default to strict mode. `unsupported` records return a structured
compatibility error and no misleading Markdown. A caller may explicitly request `allowPartial` for
diagnostic output, but the response and resulting note must visibly contain the warnings.

The full self-contained block is the default. The plugin also supports reference/extension fields
such as `monster`, but those work only when the target creature already exists in the Vault
bestiary and therefore are not reliable for portable exports. A frontmatter-ready YAML variant
with `statblock: true` may be offered for users who configure the plugin's Bestiary Folder.

Exporter rules:

- Produce a per-creature compatibility report containing `status`, `profile`, `sourceShape`,
  `mappedFields`, `derivedFields`, `flattenedFields`, `adjacentOnlyFields`, `omittedFields`,
  `blockingFields`, and warnings.
- Validate every distinct creature before rendering an encounter bundle. In strict mode, one
  unsupported creature blocks the bundle instead of silently dropping it.
- Serialize YAML with a real encoder and test colons, quotes, multiline descriptions, dice text,
  empty lists, and Unicode.
- Return `missingFields` and `lossyFields` warnings rather than fabricating unsupported values.
- Treat unknown stat-block JSON fields as explicit unmapped fields in the compatibility report;
  never silently discard them.
- Resolve encounter creature data from its saved combatant snapshot when that is the canonical
  historical stat block; otherwise resolve the linked current library creature according to an
  explicit `snapshot` or `latest` option.
- Do not emit authenticated bluDM asset URLs in notes. Accept an optional caller-provided Vault
  image path or omit the image with a warning. A future asset-sync feature should be a separate,
  explicit local workflow.
- Preserve source labels and enforce an `exportAllowed` policy for standard/provider content.
  User-authored and redistributable SRD content may be exported; restricted content must fail
  clearly rather than leaking through a combatant snapshot.
- Include format profile/version and source entity IDs in the JSON response for reproducibility,
  but keep bluDM-only metadata out of the plugin YAML unless the selected layout supports it.
- Keep the original structured bluDM data in the JSON response/bundle metadata when mechanics are
  flattened to visible prose. Fantasy Statblocks output is a rendering format, not a promised
  lossless import/export format.

The remote MCP server returns the Markdown; it does not need access to the user's filesystem. An
agent with local Vault access can insert the bundle into a dungeon or encounter note. Importing
Fantasy Statblocks YAML back into bluDM is a useful later extension, but should use separate
`preview_creature_statblock_import` and `apply_creature_statblock_import` tools with provenance,
validation, and custom-library writes rather than being coupled to export.

### Phase 2 Write Endpoints

| Method  | Endpoint                                                   | Purpose                                                        |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| `POST`  | `/api/external/v1/campaigns/{id}/encounters`               | Atomically create metadata and full roster.                    |
| `PATCH` | `/api/external/v1/campaigns/{id}/encounters/{encounterId}` | Update metadata or replace roster with concurrency protection. |
| `POST`  | `/api/external/v1/campaigns/{id}/locations`                | Create a location.                                             |
| `PATCH` | `/api/external/v1/campaigns/{id}/locations/{locationId}`   | Update a location.                                             |
| `POST`  | `/api/external/v1/campaigns/{id}/npcs`                     | Create a campaign NPC/custom creature.                         |
| `PATCH` | `/api/external/v1/campaigns/{id}/npcs/{npcId}`             | Update an NPC.                                                 |
| `POST`  | `/api/external/v1/campaigns/{id}/npc-location-links`       | Place or relate an NPC to a location.                          |
| `POST`  | `/api/external/v1/campaigns/{id}/location-links`           | Create a route, door, portal, or relationship.                 |
| `POST`  | `/api/external/v1/campaigns/{id}/roll-tables`              | Create a roll table.                                           |
| `POST`  | `/api/external/v1/campaigns/{id}/journeys`                 | Create a planned journey.                                      |
| `POST`  | `/api/external/v1/campaigns/{id}/content/changes/preview`  | Validate a structured multi-entity change set.                 |
| `POST`  | `/api/external/v1/campaigns/{id}/content/changes/apply`    | Apply an approved change set transactionally.                  |

The existing Markdown preview/import endpoints remain supported. Structured change sets should use
the same resolution, provenance, and transaction concepts instead of creating another import model.

## MCP Tool Plan

Tool names should describe user outcomes, not internal handlers. Inputs should accept stable IDs
returned by discovery tools and never require the model to invent them.

### Phase 1: Read And Discovery

| Tool                            | Purpose                                                                                                | Scope                              | Annotation |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- | ---------- |
| `list_campaigns`                | Find campaigns available to the token.                                                                 | `campaigns:read`                   | read-only  |
| `get_campaign_context`          | Return a compact campaign brief, counts, party summary, and useful follow-up IDs.                      | `campaigns:read`                   | read-only  |
| `search_campaign_content`       | Search locations, NPCs, encounters, notes, journeys, and roll tables with type filters and pagination. | relevant read scopes               | read-only  |
| `list_players`                  | List campaign characters with compact level and combat context.                                        | `party:read`                       | read-only  |
| `get_player`                    | Read one character sheet and current campaign state.                                                   | `party:read`                       | read-only  |
| `list_locations`                | List or filter the Campaign World hierarchy.                                                           | `world:read`                       | read-only  |
| `get_location`                  | Read one location with parent/path, notes, links, NPCs, encounters, shop, and map references.          | `world:read`                       | read-only  |
| `get_world_graph`               | Return a compact location hierarchy and connection graph for planning routes and consistency.          | `world:read`                       | read-only  |
| `list_encounters`               | Find encounters by status, location, or text.                                                          | `encounters:read`                  | read-only  |
| `get_encounter`                 | Read metadata, revision, roster, generation provenance, and server-authoritative difficulty.           | `encounters:read`                  | read-only  |
| `search_creatures`              | Search campaign-visible custom and standard creatures using name, type, CR, source, and text filters.  | `library:read`                     | read-only  |
| `get_creature`                  | Read a full stat block, actions, spellcasting, source, and campaign usage.                             | `library:read`                     | read-only  |
| `check_statblock_compatibility` | Report direct, derived, flattened, adjacent-only, omitted, and blocking fields for a creature or encounter. | matching encounter/library reads   | read-only  |
| `export_creature_statblock`     | Return one self-contained Fantasy Statblocks block as structured data or Markdown.                     | `library:read`                     | read-only  |
| `export_encounter_statblocks`   | Return a deduplicated roster summary and Fantasy Statblocks blocks for an encounter.                   | `encounters:read` + `library:read` | read-only  |
| `export_encounter_bundle`       | Return the bluDM encounter block plus its deduplicated Obsidian creature blocks.                       | `encounters:read` + `library:read` | read-only  |
| `search_library`                | Search spells, items, and rules entries with an explicit content type.                                 | `library:read`                     | read-only  |
| `get_library_entry`             | Read one spell, item, or rules entry.                                                                  | `library:read`                     | read-only  |
| `get_prep_gaps`                 | Return deterministic room, dungeon, NPC, encounter, map, note, and route prep gaps.                    | campaign/world read                | read-only  |
| `evaluate_encounter`            | Calculate difficulty for an explicit party and enemy roster without saving.                            | `generation:run`                   | read-only  |

`search_campaign_content` should be a compact discovery tool, not a replacement for detailed get
tools. Results contain entity type, ID, name, short excerpt, path/location, updated time, and app URL.

Export-tool inputs use discovered IDs and an explicit format:

- `profile`: initially `fantasy-statblocks-basic-5e@1`.
- `output`: `structured`, `yaml`, `markdown`, or `obsidian-bundle`.
- `creatureData`: `snapshot` or `latest` for encounter exports.
- `strict`: default `true`; partial output requires an explicit opt-in.
- Optional `layout` and Vault image-path overrides.

Results include both the requested payload and compact structured metadata: unique creature IDs,
roster quantities, export profile/version, source labels, per-creature compatibility reports,
omitted restricted content, and the bluDM app/export URLs. This lets an agent reason about warnings
without having to parse its own Markdown output.

### Phase 2: Safe Writes

| Tool                         | Purpose                                                                                                           | Scope                                    | Annotation                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| `create_generated_encounter` | Generate and atomically create a planned encounter, party roster, managed enemies, and revision 1.                | `encounters:write` + `generation:run`    | write, idempotent                      |
| `regenerate_encounter`       | Reroll generator-managed enemies on the same encounter using `expectedRevision`; preserve manual work by default. | `encounters:write` + `generation:run`    | write, destructive, idempotent         |
| `list_encounter_revisions`   | List revision numbers, reasons, actors, seeds, difficulty, and timestamps.                                        | `encounters:read`                        | read-only                              |
| `restore_encounter_revision` | Restore a selected snapshot as a new head revision.                                                               | `encounters:write`                       | write, destructive                     |
| `create_encounter`           | Atomically create an authored, non-generated encounter and roster.                                                | `encounters:write`                       | write, idempotent                      |
| `update_encounter`           | Make a targeted metadata or roster change with `expectedRevision`.                                                | `encounters:write`                       | write; destructive if replacing roster |
| `create_campaign`            | Create a campaign with an explicit 2014 or 2024 ruleset.                                                      | `campaigns:write`                        | write, idempotent                      |
| `update_campaign`            | Update campaign settings with optimistic concurrency.                                                            | `campaigns:write`                        | write                                  |
| `create_player`              | Create a character in a campaign or Unassigned.                                                                  | `party:write`                            | write, idempotent                      |
| `update_player`              | Partially update character fields with optimistic concurrency.                                                    | `party:write`                            | write                                  |
| `move_player`                | Move a character between accessible campaigns or to Unassigned.                                                   | `party:write`                            | write, idempotent                      |
| `clone_player`               | Create a deterministic copy that preserves campaign assignment.                                                   | `party:write`                            | write, idempotent                      |
| `create_location`            | Create a typed Campaign World location under an existing parent.                                                  | `world:write`                            | write, idempotent                      |
| `update_location`            | Update authored location fields with optimistic concurrency.                                                      | `world:write`                            | write                                  |
| `create_npc`                 | Create a custom NPC/creature with campaign linkage.                                                               | `library:write`                          | write, idempotent                      |
| `update_npc`                 | Update an NPC with optimistic concurrency.                                                                        | `library:write`                          | write                                  |
| `link_npc_to_location`       | Add or update a role/relationship at a location.                                                                  | `world:write`                            | write, idempotent                      |
| `create_location_link`       | Create a route, exit, door, portal, or narrative relationship.                                                    | `world:write`                            | write, idempotent                      |
| `preview_campaign_changes`   | Validate a structured batch of authored entities and return a diff plus approval token.                           | relevant write scopes                    | read-only                              |
| `apply_campaign_changes`     | Apply the exact approved change set transactionally.                                                              | `content:import` + relevant write scopes | write, idempotent                      |

Write results return the saved entity, warnings, unchanged/created/updated operation, app URL,
idempotency result, and updated timestamp.

The encounter tools have deliberately different meanings:

- `create_generated_encounter` is the first call for a new authored scene and always returns a new
  durable encounter ID.
- `regenerate_encounter` changes the generator-managed portion of that existing encounter. It is
  the normal "reroll this" operation and never creates a second encounter.
- `update_encounter` is for intentional edits such as changing one creature quantity, preserving a
  chosen boss, rewriting the description, or moving the encounter to another room.
- `restore_encounter_revision` is an explicit undo path. A restore is itself recorded, so an agent
  cannot erase the intervening history.

The generator input may include `preserveCreatureIds`, `forbidCreatureIds`, and
`replaceManagedCombatantsOnly`; the server still decides the exact valid roster. The response
should explain which prior combatants were kept and why.

No delete tool should ship in this phase. If deletion is later justified, it must be separate,
marked destructive, require a short-lived confirmation token, and prefer archive/unlink behavior
where the domain supports it.

### Phase 3: Campaign-Writing Extensions

Add only after core tools are reliable:

| Tool                                                      | Use                                                                                                                   |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `list_roll_tables` / `roll_on_table`                      | Retrieve or deterministically roll campaign tables.                                                                   |
| `create_roll_table` / `update_roll_table`                 | Store authored encounter, treasure, rumor, weather, or location tables.                                               |
| `calculate_travel` / `create_journey`                     | Plan routes using existing Campaign World and travel rules.                                                           |
| `generate_dungeon_preview` / `save_generated_dungeon`     | Use the existing deterministic Dungeon Studio contract.                                                               |
| `get_completed_run_summary`                               | Provide facts for post-session recaps without exposing live mutation.                                                 |
| `get_campaign_continuity_context`                         | Return compact facts relevant to consistent prose: people, places, links, unresolved encounters, and recent outcomes. |
| `preview_shop_stock_changes` / `apply_shop_stock_changes` | Author shop inventory through the existing item and stock models.                                                     |

Town, quest, rumor, or session-outline prose is authored by the connected model using retrieved
facts. Add backend generators for those only when deterministic product behavior is defined.

### MCP Resources And Prompts

After tools are stable, consider read-only resource templates:

```text
bludm://campaigns/{campaignId}/brief
bludm://campaigns/{campaignId}/party
bludm://campaigns/{campaignId}/world
bludm://campaigns/{campaignId}/prep-gaps
bludm://campaigns/{campaignId}/encounters/{encounterId}
```

Optional MCP prompts can orchestrate tools for:

- Prepare a session.
- Develop a location.
- Build and review an encounter.
- Create an NPC tied to a place.
- Check continuity before writing.
- Draft a recap from completed encounter runs.

Prompts must not bypass tool authorization or write approval.

## Safe Write Workflow

General agent-authored multi-entity data should follow:

```text
discover current state
        ↓
prepare typed changes with idempotency keys
        ↓
preview and validate
        ↓
show normalized diff, warnings, and conflicts
        ↓
user approves
        ↓
apply exact preview token transactionally
        ↓
return saved IDs, versions, and app links
```

The approval token should bind:

- User and token.
- Campaign.
- Normalized operations and their hash.
- Expected entity versions.
- Expiry.

Changing any operation requires a new preview.

Encounter generation is a deliberate exception to the separate preview/apply sequence. The
`create_generated_encounter` name and description state that it creates a planned record, the MCP
client requests write approval, and the server can validate and perform the whole operation
atomically. Requiring an earlier preview would recreate the orphan-candidate problem this authoring
flow is designed to avoid.

The encounter-specific workflow is:

```text
discover campaign, room, party, and available creatures
        ↓
user approves create_generated_encounter
        ↓
generate + evaluate + save encounter and revision 1 atomically
        ↓
review returned roster, evidence, warnings, and app link
        ↓
regenerate same ID or make targeted update with expectedRevision
        ↓
record every resulting state as a recoverable revision
```

This does not weaken write safety:

- All creation and regeneration calls require idempotency keys.
- Every mutation after creation requires `expectedRevision`.
- A write returns a normalized summary of what it created, preserved, replaced, and warned about.
- Generated enemy replacements are limited to generator-managed combatants by default.
- Revision history provides explicit inspection and restore tools.
- Invalid requests roll back completely.
- The recommended Codex configuration asks for approval on write tools.

## Encounter Difficulty Work Required Before Agent Authoring

The current XP-based implementation is a useful starting point but needs a formal contract.

### Required Rules Decisions

- Name the initial ruleset, expected to be the existing 2014-style XP thresholds.
- Implement and test party-size multiplier adjustments where applicable.
- Decide how allies are represented; never silently omit them.
- Define exact target bands and the meaning of `Over Deadly`.
- Document that XP budgeting does not model optimization, magic items, current resources, terrain
  advantage, control effects, or monster synergy.
- Return confidence warnings when required data is missing or the candidate pool is weak.

### Generator Improvements

- Separate creature eligibility, role/archetype matching, roster search, scoring, and presentation.
- Make `enemyCount` semantics explicit: distinct creature types versus total bodies.
- Allow repeated creature types when that is the best valid roster.
- Use exhaustive or bounded-search behavior appropriate to candidate-pool size.
- Ensure boss/minion flags affect roster construction rather than only prose.
- Treat terrain and location notes as selection inputs only when deterministic matching exists.
- Report why a candidate was selected and which constraints could not be satisfied.

### Difficulty Acceptance Tests

Add table-driven and property tests for:

- Party sizes from one through eight.
- Mixed levels and level boundaries one and twenty.
- Every target band.
- One enemy, pairs, groups, and large groups.
- Minion and boss quantities.
- Sparse, zero-XP, duplicated, and incomplete libraries.
- Unknown and cross-campaign player/creature IDs.
- Same seed/input determinism.
- Generate/create atomicity and idempotent replay.
- Regeneration that preserves manual combatants and increments revisions.
- Restoring an old revision as a new head revision.
- Browser preview/save fingerprint equivalence.
- Backend/frontend parity until the frontend uses the backend result directly.

## Safety, Privacy, And Operational Controls

### Tool Safety

- Mark every read tool with `readOnlyHint`.
- Mark write and destructive behavior accurately.
- Mark `create_generated_encounter` as non-read-only, non-destructive, and idempotent.
- Mark `regenerate_encounter`, roster-replacing `update_encounter`, and
  `restore_encounter_revision` as destructive even though revision history makes them recoverable.
- Keep read and write tools separate.
- Require Codex's `writes` approval mode in the documented setup.
- Treat tool inputs and stored campaign prose as untrusted data.
- Never interpret stored notes as server instructions.
- Cap query breadth, page size, generated candidates, combatant count, and import size.

### Audit

Record:

- Request ID.
- Timestamp and duration.
- User ID and token ID, never the token secret.
- Client metadata when available.
- Tool or REST operation.
- Campaign and target entity IDs.
- Required scopes and authorization outcome.
- Result class: success, validation failure, conflict, forbidden, or internal error.
- Idempotency replay state.
- Encounter revision, generator version, and seed for encounter authoring operations.

Do not log full character sheets, DM notes, imported prose, binary data, or bearer tokens by default.

### Rate Limits

Use configurable per-token classes:

- Read/search.
- Expensive generation.
- Writes/imports.
- Authentication failures.

Return retry information in REST and structured MCP errors.

### Network And Deployment

- Local HTTP is acceptable only on loopback or a trusted private network.
- Public MCP requires HTTPS.
- Validate forwarded host/protocol against configured public origins.
- Preserve `Authorization` through nginx.
- Disable proxy buffering for MCP streaming.
- Apply request body, header, idle, and tool execution timeouts.
- Keep MCP and API health checks separate enough to identify transport failures.

## Testing Strategy

### Unit Tests

- Application-service validation and transactions.
- Scope and campaign restriction checks.
- Token expiry/revocation and principal construction.
- Encounter evaluation and generation.
- Encounter revision creation, managed-combatant replacement, and restore semantics.
- Canonical stat-block construction from both standard and user creature storage shapes.
- Derived save/skill bonuses, speed/sense formatting, action-section classification, and
  spell-group rendering.
- Fantasy Statblocks field mapping and YAML encoding.
- Idempotency and optimistic concurrency.
- MCP input/output schema helpers and error mapping.

### Integration Tests

- External REST bearer authentication for every scope class.
- MCP initialize/discovery, tool listing, and tool calls.
- Same service result through session REST, external REST, and MCP.
- Cross-user and cross-campaign denial.
- Missing, expired, revoked, and insufficient-scope tokens.
- Preview/apply binding and transaction rollback.
- Atomic generate/create and regenerate rollback.
- Export authorization, source restrictions, and snapshot-versus-latest resolution.
- Nginx Streamable HTTP proxy behavior.
- Database migrations and compatibility with existing tokens.

### Contract Tests

- Validate OpenAPI examples.
- Snapshot MCP tool names, descriptions, schemas, annotations, and required scopes.
- Ensure detailed get calls accept IDs returned by list/search calls.
- Ensure no tool requires an undiscoverable identifier.
- Ensure tool results contain stable IDs and app URLs.
- Snapshot `fantasy-statblocks-basic-5e@1` fixtures for a basic creature, spellcaster, legendary
  creature, custom creature, repeated encounter roster, and incomplete data.
- Parse exported YAML in tests and verify required plugin fields, fenced-block syntax,
  deduplication, quantities, source labels, and warning behavior.
- Run the compatibility validator across every enabled standard creature fixture; the release gate
  is zero `unsupported` standard creatures.
- Exercise custom fixtures for every supported action section and require explicit warnings for
  structured mechanics flattened into prose.
- Verify strict encounter exports fail atomically when one distinct creature is unsupported and
  partial mode names every omitted/incomplete creature.
- Keep a checked-in copy of the supported profile schema and official example fixtures. Updating
  the tested Fantasy Statblocks plugin/profile version is an explicit compatibility change, not an
  unreviewed dependency update.
- Before release, open curated generated notes in an Obsidian test Vault with the documented plugin
  version and visually verify the Basic 5e layout for a normal creature, caster, legendary
  creature, and mixed encounter bundle.

### Agent Evaluations

Create a repeatable prompt set:

- Find a campaign and summarize the party.
- Find undead suitable for a level-four party.
- Create a Medium encounter in a specific dungeon room and report its saved bluDM ID and actual
  difficulty.
- Reroll the same encounter while preserving a chosen creature and verify that the ID is unchanged.
- Make a targeted quantity change without rerolling unrelated combatants.
- Restore the earlier revision after a rejected reroll.
- Check export compatibility and explain which fields will be derived or flattened before
  producing a stat block.
- Export the encounter bundle for an Obsidian note and include only one stat block per distinct
  creature.
- Develop a room using existing dungeon context without inventing IDs or creating a duplicate
  encounter.
- Create an NPC, then link it to the correct settlement.
- Detect and explain an optimistic-concurrency conflict.
- Refuse a write with a read-only token.
- Avoid deletion and live-combat mutation.

Run the MCP Inspector plus Codex local smoke tests before each tool-surface release.

## Implementation Phases

### Phase 0: Contracts And Difficulty Foundation

- Approve tool inventory, scopes, and local-first deployment.
- Define external API DTOs, error format, pagination, idempotency, and concurrency.
- Specify write-first generation, encounter revision semantics, managed-combatant preservation, and
  the `fantasy-statblocks-basic-5e@1` export mapping.
- Define `Canonical5eStatBlock`, the compatibility report, strict/partial behavior, and the action
  section/custom-trait model changes needed for faithful exports.
- Make encounter evaluation server-authoritative and return actual difficulty evidence.
- Add difficulty, generator, revision, and stat-block fixture tests.
- Write the initial OpenAPI document.

Exit criteria:

- A caller can explicitly evaluate a roster and understand every number.
- Invalid party/library references fail loudly.
- Generate and regenerate contracts state exactly what is saved, preserved, and replaced.
- Every current bluDM stat-block source field is classified as direct, derived, flattened,
  adjacent-only, or blocking.
- Representative standard and custom bluDM creatures have an approved, parseable Obsidian mapping.

### Phase 1: Principal, Scopes, And Read APIs

- Add scoped/campaign-restricted token storage and UI.
- Introduce the transport-neutral principal and authorization helpers.
- Extract campaign, party, world, library, encounter, and generation queries into services.
- Add external discovery/search endpoints.
- Add explicit custom action sections and typed custom-trait/legendary-description support chosen
  in Phase 0, including safe defaults for existing records.
- Correct or explicitly quarantine standard-creature source records that fail canonical required
  fields; never repair them with exporter guesses.
- Implement the canonical stat-block builder, compatibility validator, creature/encounter export
  services, and external REST routes.
- Preserve existing token and Vault bridge behavior.

Exit criteria:

- A scoped CLI client can discover every ID needed for encounter generation.
- A scoped CLI client can export an encounter's bluDM block and Fantasy Statblocks blocks.
- All enabled standard creatures pass compatibility validation, and custom-creature gaps are
  surfaced without silent field loss.
- Cross-campaign and insufficient-scope access is tested.
- The browser still passes existing workflows.

### Phase 2: Read-Only MCP

- Add the official Go MCP SDK.
- Mount `/mcp` and configure nginx.
- Register Phase 1 read/discovery, evaluation, and export tools; add resources only if useful.
- Add structured errors, annotations, app URLs, audit records, and rate limits.
- Document Codex connection using `bearer_token_env_var`.

Exit criteria:

- Codex can connect, list tools, discover a campaign, inspect party/world/library data, evaluate an
  explicit roster, and export Obsidian-compatible stat blocks without writes.
- MCP Inspector and Docker proxy tests pass.

### Phase 3: Durable Iterative Encounter Authoring

- Add encounter revision storage, generation metadata, and managed-combatant provenance.
- Add idempotent, atomic generate-and-create behavior.
- Add `create_generated_encounter`, `regenerate_encounter`, `list_encounter_revisions`,
  `restore_encounter_revision`, `create_encounter`, and `update_encounter`.
- Require expected revisions for rerolls, restores, and targeted updates.
- Reuse the same services from browser creation/edit flows where practical.
- Add approval-oriented tool descriptions and write annotations.

Exit criteria:

- The first generation call creates exactly one normal planned encounter despite retries.
- No partial encounter/roster is visible after a failure.
- Rerolls retain the same encounter ID, preserve manual work by default, and create inspectable
  revisions.
- An earlier revision can be restored without deleting later history.
- The returned encounter can immediately be exported as a bluDM/Obsidian bundle.
- Concurrent browser edits produce a conflict instead of data loss.

### Phase 4: World And Bulk Authoring

- Add safe location, NPC, relationship, roll-table, and journey writes.
- Add structured change-set preview/apply.
- Reuse import provenance and reconciliation concepts.
- Add prep-gap and continuity context as real usage requires.
- Add an optional Fantasy Statblocks import preview/apply path for user-authored custom creatures
  after export compatibility has proven stable.

Exit criteria:

- An agent can preview and apply a small connected content set transactionally.
- An agent can create a dungeon/room structure, attach generated encounters by stable location ID,
  and export a coherent writing bundle.
- Every created entity is linked through returned stable IDs.
- Deletes remain out of scope.

### Phase 5: Remote OAuth And Optional Plugin

- Choose and configure an established OAuth 2.1/OIDC authorization server.
- Publish protected-resource metadata and tool security schemes.
- Add token audience/scope verification and identity linking.
- Deploy on stable public HTTPS with privacy, audit, rate-limit, and security review.
- Test OAuth with Codex and ChatGPT developer connections.

Exit criteria:

- OAuth authorization code + PKCE works end to end.
- Incorrect issuer, audience, scope, expiry, and resource are rejected.
- No custom bearer token needs to be pasted into a remote ChatGPT connection.

### Phase 6: Advanced Preparation Tools

- Add completed-run summaries, Dungeon Studio save, roll tables, travel, shop stock, and optional MCP
  prompts based on observed use.
- Review whether campaign continuity needs a dedicated read model.
- Consider safe archive/delete tools only with demonstrated need.

## Verification Commands

For normal implementation phases:

```sh
make verify
```

For authentication, MCP transport, dependency, Docker, or public-deployment phases:

```sh
make verify-security
make verify-docker
make verify-full
```

Also run:

```sh
npx @modelcontextprotocol/inspector
```

and a targeted Codex connection smoke test through `http://localhost:3080/mcp`.

## Documentation Deliverables

- `docs/api/external-v1.openapi.yaml`
- MCP tool catalogue with example inputs and outputs.
- Encounter authoring guide explaining create, reroll, targeted edit, revision restore, and
  write-approval behavior.
- Fantasy Statblocks compatibility guide with the versioned field mapping, example Vault notes,
  canonical source mapping, compatibility-level definitions, example Vault notes, source/export
  restrictions, image-path behavior, and known flattened or adjacent-only fields.
- Token scope and campaign-restriction guide.
- Local Codex connection guide.
- Remote OAuth deployment guide.
- Threat model covering token theft, cross-campaign access, prompt injection, replay, SSRF, and
  unsafe writes.
- Migration notes for existing API tokens and Vault bridge users.
- Troubleshooting for 401, 403, scope upgrade, proxy streaming, timeout, and schema errors.

## Recommended First Implementation Issue

Implement the Phase 0 contract foundation:

1. Define the principal, scopes, and token migration behavior.
2. Specify the `create_generated_encounter`, `regenerate_encounter`, targeted update, revision, and
   restore DTOs, including idempotency and `expectedRevision`.
3. Extract encounter evaluation/generation into a shared application service and return actual
   difficulty, thresholds, adjusted XP, warnings, and generator evidence.
4. Specify `Canonical5eStatBlock`, the direct/derived/flattened/omitted/blocking compatibility
   report, and `fantasy-statblocks-basic-5e@1`.
5. Decide and migrate explicit custom action sections/typed traits so bluDM does not misclassify
   exportable content.
6. Add external player, location, creature, encounter, compatibility, and export discovery
   contracts.
7. Add table-driven difficulty, revision-semantics, all-standard-creature coverage, YAML fixture,
   and external API contract tests.

This locks the difficult behavioral decisions before the MCP transport is added. Phase 1 then
implements the read and export services, Phase 2 proves the MCP/authentication path, and Phase 3
delivers the write-first iterative encounter workflow.

## Standards And References

- OpenAI, Build an MCP server:
  <https://developers.openai.com/plugins/build/mcp-server>
- OpenAI, MCP authentication:
  <https://developers.openai.com/plugins/build/auth>
- OpenAI, Codex MCP configuration:
  <https://learn.chatgpt.com/docs/extend/mcp>
- Model Context Protocol specification:
  <https://modelcontextprotocol.io/specification/>
- Official MCP Go SDK:
  <https://github.com/modelcontextprotocol/go-sdk>
- Javalent community plugin documentation:
  <https://plugins.javalent.com/home>
- Obsidian TTRPG Community, Fantasy Statblocks source and schemas:
  <https://github.com/Obsidian-TTRPG-Community/fantasy-statblocks>
