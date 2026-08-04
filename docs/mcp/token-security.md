# Token Scopes And Campaign Restrictions

API tokens are high-entropy `bludm_v1_...` bearer credentials stored in PostgreSQL only as hashes.
The cleartext value is shown once. Tokens have a name, expiry, scopes, campaign restriction,
last-used time, and revocation time.

## Scopes

| Scope | Grants |
| --- | --- |
| `campaigns:read` | Campaign list, summaries, search, and prep context. |
| `party:read` | Campaign players and character sheets. |
| `world:read` | Locations, links, maps, shops, journeys, tables, and world graph. |
| `world:write` | Locations, relationships, roll tables, journeys, dungeons, and shop stock. |
| `library:read` | Campaign-visible creatures, spells, items, rules, and exports. |
| `library:write` | Custom NPC and library authoring. |
| `encounters:read` | Encounters, rosters, revisions, difficulty, and encounter exports. |
| `encounters:write` | Durable encounter creation, edits, rerolls, and restores. |
| `generation:run` | Encounter evaluation/generation and Dungeon Studio generation. |
| `content:import` | Structured or Markdown preview/apply workflows. |
| `sessions:read` | Completed run summaries; never live mutation. |

Write scope does not silently imply read scope. Presets intentionally include the reads needed to
discover IDs before writing.

## Campaign Modes

- `all`: every campaign owned by the linked bluDM account.
- `selected`: only the explicitly stored campaign IDs.
- `legacy_all`: migration value for pre-scope tokens.

Both the transport and application service enforce restrictions. A handler cannot bypass them by
calling a store with an attacker-supplied ID. Unknown, cross-user, and cross-campaign IDs are
reported as not found or forbidden without revealing another campaign's data.

## Presets

- **Read only**: all read scopes.
- **Encounter builder**: campaign, party, world, library, and encounter reads plus
  `encounters:write` and `generation:run`.
- **Campaign writer**: every supported scope.
- **Custom**: explicit checkboxes; use for constrained automations.

Existing tokens retain the legacy Vault bridge behavior until replaced. New version-2 tokens are
scope checked on both current and legacy external routes.

## Rotation

Create a replacement, update the consuming environment, confirm `list_campaigns`, then revoke the
old token. Revocation is a soft delete for auditability and takes effect on the next request.
