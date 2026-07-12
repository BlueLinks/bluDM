# Merge Planner

The merge planner is the read-only decision layer for Merge import. Preview builds it before any
write, and execution builds it again inside the database transaction before applying planner-approved
actions.

## Inputs

- uploaded portable manifest and split archive metadata
- dependency graph projection
- current user-owned records
- existing uploaded assets and SHA-256 hashes
- merge policy matrix

## Decisions

Each decision includes:

- user-facing kind and label
- planner action and final user decision
- confidence, matched rule, code, and reasons
- dependency impact counts
- field diffs for supported simple entities
- merge provenance

The UI must show labels, kinds, actions, and dependency summaries rather than raw UUIDs. Developer
details may show shortened references for provenance and audit work.

## Current Actions

- `create`: create the imported entity as new content.
- `rename_imported`: create the imported entity with a collision-safe imported name.
- `skip_exact_duplicate`: map the imported object to the existing identical object.
- `reuse_existing`: map a dependency to an existing compatible object.
- `reuse_asset_by_hash`: map an imported asset to an existing asset with the same hash.
- `keep_standard_reference`: keep a standard-content reference without importing a row.
- `merge_missing_fields`: fill only empty existing fields from imported values.
- `block_destructive_replace`: block a same-identity object whose imported values would overwrite
  existing data.
- `block_child_collection_merge`: block a matched existing object when the archive also contains
  child records that would need collection reconciliation.
- `unsupported`: block archive shapes that do not yet have a merge policy.

## Field Diffs

For supported entities, the planner compares exported struct fields after ignoring ownership,
identity, relationship IDs, timestamps, and merge provenance. Diff statuses are:

- `same`
- `added`
- `removed`
- `changed`

Only `added` diffs are eligible for `merge_missing_fields`, and only when the candidate has no
internal child rows. `same` rows are present for review but do not affect the safety decision.
Semantically empty values, such as `nil` and empty arrays/maps, are treated as unchanged.

Supported field-merge entities are campaign, NPC/creature, player, item, spell, encounter,
shop/dungeon/location metadata, map metadata, journey, and roll table.

## Child Collections

Child records are created when their parent object is created as part of the merge. The planner does
not yet merge child collections into an existing matched parent. If an imported object matches an
existing object and the archive also contains internal child records, the planner emits
`block_child_collection_merge` so execution cannot surprise the caller with a late transaction
failure.

## Replanning

Execution never trusts a stale preview. It re-runs planning in the transaction and verifies every
decision is still executable. If the database changed underneath the preview, execution fails and
rolls back.

## Deferred

- scored multi-candidate identity matching beyond current stable ID/name/fingerprint rules
- manual user decision editing
- additive child collection merge into existing roots
- standalone action template merge
- durable per-object merge result rows separate from import history
