# Import Pipeline

## Preview

Preview performs validation only. It does not write to the database.

Preview checks:

- valid multipart ZIP upload
- upload size limit
- ZIP readability
- supported ZIP compression methods
- duplicate ZIP entries
- unsafe ZIP paths
- manifest presence
- manifest JSON validity
- manifest format and version
- v2 archive file index references existing logical data files
- v2 archive rejects unindexed logical JSON files
- v2 `graph.json` parses successfully
- v2 `internal/records.json` parses successfully
- duplicate manifest object IDs
- manifest asset paths, MIME types, sizes, SHA-256 hashes, and missing/unlisted files
- archive verification status
- restore readiness status
- conflict detection for likely name collisions

Preview returns bundle counts, warnings, unsupported entries, conflicts, the raw dependency graph,
and a high-level projected summary. Merge previews also return the executable merge plan, including
per-object decisions, confidence, matched rules, parent context, dependency impact, field-level
diffs for supported entities, provenance, blockers, and asset/reference decisions. Conflict rows
prefer projected entities such as Campaign, Shop, Dungeon, NPC, Item, Map, and Encounter rather
than low-level implementation rows.

## Clone Import

Clone import is the default write mode.

Clone import:

- runs in one database transaction
- creates new IDs
- assigns records to the current user
- creates uploaded assets first
- remaps IDs across campaign, library, encounter, map, location, roll table, and combat records
- fails the transaction when a required imported relationship cannot be remapped
- clears optional references that are not present in the selected bundle
- rolls back completely on failure

Standalone player, NPC, item, and spell bundles can be imported without a campaign. Encounter, map,
shop, and dungeon bundles include a cloned parent campaign context because the current campaign
world tables require `campaign_id`.

## Restore Import

Restore import is implemented for empty-account recovery.

Restore import:

- runs in one database transaction
- preserves original archive IDs
- rewrites owner-owned records to the current user
- creates uploaded assets before rows that reference them
- restores parent locations before child rooms
- rejects current-user targets that already contain portable data
- requires explicit API/UI confirmation
- rolls back completely on write failure

Restore is not Merge. It is intended for fresh accounts or reset-database recovery where preserving
IDs is desirable.

## Merge Import

Merge import is implemented for the first conservative policy set.

Merge import:

- runs in one database transaction
- re-plans inside the transaction before writing
- requires explicit API/UI confirmation
- only executes planner-approved create, rename, exact reuse/skip, same-hash asset reuse, standard
  reference keep, and missing-field merge decisions
- can merge missing scalar/JSON fields for supported entities when the existing value is empty, the
  imported value is present, relationship IDs are ignored, and the object has no internal child rows
  to reconcile
- blocks destructive replace, unsafe existing object modification, child collection merge into
  existing objects, unsupported archive shapes, and missing required dependencies
- creates uploaded assets before rows that reference them
- remaps created and reused dependencies through the same merge execution state
- records the merge plan and merge provenance in import history on success and failure
- rolls back completely on write failure

Merge is still intentionally conservative. It does not replace non-empty existing fields, reconcile
child collections into existing roots, or execute standalone action template archives.
