# Import / Export Merge Readiness Audit

Merge import now has a conservative execution path with planner review, field-level missing-value
merge, provenance, and history inspection. This audit records what the current graph-first archive
system can safely execute, what it still blocks, and the work required before Merge can support
destructive update-existing or child-collection merge policies.

## Current Architecture

- Exports use `PortableManifest` plus split ZIP archive files: `manifest.json`, `graph.json`,
  logical object files, `internal/records.json`, and optional `assets/*` entries.
- The dependency graph is the source of truth for object reachability, grouped preview nodes, graph
  audit messages, and relationship round-trip tests.
- Clone import is available and intentionally generates new IDs while assigning imported
  user-owned records to the current user.
- Restore import is available for empty-account restore scenarios. It preserves source IDs, verifies
  assets and graph health, requires explicit confirmation through the API, and rejects current-user
  targets that already contain portable data.
- Preview performs archive verification, restore readiness checks, and merge planning without
  database writes.
- Merge execution is available for planner-approved safe actions only. It re-plans inside one
  transaction, requires explicit confirmation, records the plan in import history, and rolls back
  completely on failure.
- Merge provenance is attached to created or missing-field-merged records through entity metadata
  JSON fields and is shown in normal and developer history views.

## Merge Requirements

Merge needs to import into an account that already has data, so it must decide per object whether to
create, update, skip, rename, or attach relationships to existing records. It also needs to protect
data the archive should not overwrite, such as current campaign prep, custom item edits, uploaded
assets, and encounter state.

Minimum requirements for the current Merge path:

- deterministic identity matching beyond raw UUID equality: implemented for stable IDs, scoped
  names, content fingerprints, asset hashes, and standard references
- explicit conflict decisions for supported user-facing object types: implemented for conservative
  create, rename, reuse, skip, and block decisions
- safe relationship rewiring when a dependency resolves to a created or reused object: implemented
  for supported merge writes
- preview-visible impact summaries before writes: implemented in the Merge preview/review UI
- field-level diff review for supported simple entities: implemented for planner output and UI
  review, including changed, added, removed, and unchanged fields
- transactional execution with a dry-run plan that matches the executed writes: implemented by
  re-planning in the transaction
- import history that records merge decisions and provenance: implemented for the merge plan;
  per-created-ID history remains coarse through existing import counts

## Identity Strategy

| Identity Source               | Useful For                                         | Risk                                                                               |
| ----------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Original UUID                 | Restore, same-origin re-imports                    | Collides with unrelated data after manual database resets or cross-instance copies |
| Owner-scoped name             | Campaigns, custom items, spells, NPCs, players     | Names are mutable and not unique enough by themselves                              |
| Campaign-scoped name and type | Locations, maps, encounters, journeys, roll tables | Can collide when campaigns are cloned or renamed                                   |
| Content fingerprint           | Assets and some JSON-heavy custom objects          | Needs stable canonicalization and versioning                                       |
| Standard reference ID         | Standard spells/items/creatures                    | Only resolves objects that are intentionally outside the portable payload          |

Recommended approach: create a merge identity layer that scores candidates instead of relying on a
single key. Raw UUID match should be a strong signal, but user-facing conflict screens should still
show the matched name, type, owner scope, and changed fields before an update happens.

## Conflict Taxonomy

| Conflict                             | Example                                 | Default Policy                                  |
| ------------------------------------ | --------------------------------------- | ----------------------------------------------- |
| Exact existing object                | Same item UUID and same content         | Skip                                            |
| Same identity, changed content       | Same NPC UUID with edited stat block    | Block destructive replace                       |
| Same name, different identity        | Two custom spells named "Ash Bolt"      | Rename imported copy                            |
| Missing required dependency          | Encounter references a missing campaign | Block                                           |
| Optional missing dependency          | Image asset omitted from archive        | Warn and import without image                   |
| Relationship target already exists   | Campaign already has linked NPC         | Block child collection merge into existing root |
| Asset duplicate                      | Same hash, different filename           | Reuse existing asset                            |
| Asset name collision, different hash | `portrait.png` already exists           | Rename imported asset                           |
| Standard reference unavailable       | Standard spell ID no longer exists      | Block when required                             |
| Unsupported archive version          | Future manifest version                 | Block                                           |

## Merge Policy Matrix

| Object Type       | Create | Update        | Skip | Rename         | Notes                                                                   |
| ----------------- | ------ | ------------- | ---- | -------------- | ----------------------------------------------------------------------- |
| Campaign          | Yes    | No            | Yes  | Yes            | Destructive campaign root updates remain blocked.                       |
| NPC / Creature    | Yes    | Missing only  | Yes  | Yes            | Child rows remain deferred; missing top-level fields may merge.         |
| Player            | Yes    | Missing only  | Yes  | Yes            | Player state may be live campaign state; non-empty fields are kept.     |
| Item              | Yes    | Missing only  | Yes  | Yes            | Missing scalar and JSON fields can be filled conservatively.            |
| Spell             | Yes    | Missing only  | Yes  | Yes            | Spell actions and roll parts need child-row replacement policy.         |
| Encounter         | Yes    | Later         | Yes  | Yes            | Combatants can rewire to existing imported or existing library objects. |
| Location          | Yes    | Later         | Yes  | Yes            | Parent/child trees require topological merge order.                     |
| Map               | Yes    | Later         | Yes  | Yes            | Pins must resolve after locations and assets are mapped.                |
| Journey           | Yes    | Later         | Yes  | Yes            | Campaign-scoped identity should include origin/destination.             |
| Roll Table        | Yes    | Missing only  | Yes  | Yes            | Row replacement should be all-or-nothing per table.                     |
| Uploaded Asset    | Yes    | Not needed    | Yes  | Not needed     | Prefer hash-based reuse, otherwise create.                              |
| Relationship Rows | Yes    | Replace later | Yes  | Not applicable | Duplicate detection should be based on resolved foreign keys.           |

## Remaining Data Model Gaps

- Import provenance exists on JSON metadata fields, but there is no dedicated queryable provenance
  table.
- No durable import alias table exists for repeated imports across renamed objects.
- Import history records the merge plan, headline counts, and metadata, but not a dedicated
  queryable per-object merge result table.
- Some child records are best replaced as a set, but there is no shared replacement strategy yet for
  action roll parts, spell internals, roll table rows, stock rows, map pins, and combatants.
- Standalone action template archives are blocked in Merge until they have planner identities and
  execution policy.

## Follow-Up Merge Work

1. Add planner identities and tests for standalone action templates, or keep them blocked by policy.
2. Add import aliases for objects created by Clone, Restore, and Merge when repeated renamed imports
   need durable identity tracking.
3. Expand field-level merge only after child-row and user-decision UX are designed.
4. Add all-or-nothing child collection policies for action roll parts, spell internals, roll table
   rows, stock rows, map pins, and combatants.
5. Broaden transaction tests to every supported bundle family.
6. Add queryable per-object merge result history if users need audit/filtering beyond the stored
   plan snapshot.

## Merge Implementation Plan

1. Build a backend-only merge planner that accepts a manifest, assets, and current user ID, then
   returns decisions without writing data. Done.
2. Support a conservative first policy set: create new, skip exact duplicate, rename same-name
   collision, reuse same-hash asset, and block missing required dependencies. Done.
3. Store merge decisions in import history and expose them in preview. Done.
4. Add Merge UI review states after planner output is stable. Done.
5. Implement merge execution from the deterministic plan inside one transaction. Done.
6. Add destructive update-existing policies only after child-row replacement UX exists. Deferred.

## Current Merge Blockers

- Dedicated queryable per-object merge result history does not exist.
- Child collection replacement/merge policy does not exist.
- Standalone action template merge policy does not exist.
- Relationship duplicate detection for merging child rows into existing roots still needs
  resolved-ID rules per relationship table.
