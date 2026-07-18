# Merge Provenance

Merge provenance records where imported data came from and how the planner handled it. It exists for
audit and history, not for user-facing identity matching.

## Stored Fields

- archive fingerprint
- archive version
- import timestamp
- import mode
- original exported object reference
- import batch reference
- merge lineage

Object-level provenance is stored in the best available JSON metadata field for the entity, such as
item `data`, spell `mechanics`, creature `stat_block`, player `character_sheet`, asset `metadata`,
campaign `metadata`, encounter `metadata`, location/shop/dungeon `map_anchor`, map `metadata`,
journey `weather`, or roll table `metadata`.

## UI Rules

Normal users should see:

- Imported from archive
- Import date
- Import mode

Developer/history details may show shortened archive fingerprints, original export references,
batch references, lineage counts, and planner metadata. Full raw UUIDs should not be shown in the
normal review path.

## Fingerprints

Content fingerprints intentionally ignore identity, owner IDs, timestamps, archived state, and
`mergeProvenance`. This keeps repeated imports idempotent after provenance has been attached.

## Deferred

- a queryable provenance table
- per-field provenance
- archive signature verification
- UI filtering by provenance source
