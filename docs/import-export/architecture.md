# Import / Export Architecture

The implementation has three layers:

1. Frontend data-management page at `/import`.
2. HTTP endpoints under `/api/import-export`.
3. Store-level export/import orchestration with ZIP packaging in the HTTP layer.

## Backend Endpoints

- `POST /api/import-export/exports`
- `GET /api/import-export/exports/{id}/download`
- `GET /api/import-export/history`
- `GET /api/import-export/history/{id}`
- `DELETE /api/import-export/history/{id}`
- `DELETE /api/import-export/history`
- `POST /api/import-export/imports/preview`
- `POST /api/import-export/imports/execute`

Exports are generated synchronously and cached in memory for download. This avoids new persistence
tables in the first pass. Cached downloads expire after one hour.

## Export Pipeline

The export pipeline now has an internal planning stage:

```text
Requested export
↓
Live database candidate rows
↓
Dependency graph
↓
Graph-filtered manifest
↓
v2 split ZIP package
↓
History snapshot
```

The previous flow built the manifest first and then generated an explanatory graph from that
manifest. That made the graph useful for inspection but weak as an architectural contract. The
current flow creates an `ExportPlan` first, builds the graph from live database rows, and generates
the final manifest from graph-reachable nodes. Export history, inspector data, and response
statistics all consume that plan output.

This is an incremental graph-first transition. Existing bundle-specific database queries still load
candidate rows, but final manifest inclusion is now graph-owned. Future passes should continue
moving relationship discovery into graph walkers so candidate loading can become broader and less
bundle-specific.

## Archive Format

New exports write a v2 archive:

- `manifest.json` contains metadata, roots, file indexes, counts, references, and export stats.
- `graph.json` contains the raw graph plus the projected high-level graph used by the UI.
- high-level object files live under logical folders such as `campaigns/`, `encounters/`, `npcs/`,
  `players/`, `shops/`, `dungeons/`, `maps/`, `items/`, `spells/`, and `roll-tables/`.
- `internal/records.json` contains implementation details needed to restore relationships and
  child data.
- `assets/` contains uploaded binaries referenced by manifest asset records.

The importer still accepts the older v1 `bludm-export.json` single-file format.

## Bundle Ownership

Imported records ignore source ownership IDs. Clone import assigns all supported imported records to
the current authenticated user.

## Dependency Rules And Extension Points

Campaign exports include campaign-owned records plus referenced user-owned data:

- players
- NPCs / creatures
- creature actions and roll parts
- creature spellcasting and spell references
- custom spells and spell actions
- custom items referenced by location stock
- action templates referenced by creature actions
- uploaded assets referenced by avatars, maps, icons, and encounter backgrounds

Everything exports include all current-user campaigns, user library content, and uploaded assets.

Object bundle exports use the same manifest shape but collect a narrower graph:

- NPC bundles include selected user creatures, creature actions, roll parts, spellcasting profiles,
  creature spell links, referenced custom spells, referenced action templates, and referenced assets.
- Player bundles include selected player characters and portrait assets. A player exported without
  its source campaign imports as unassigned to a campaign.
- Item bundles include selected custom user items.
- Spell bundles include selected custom spells, projectile scaling, spell actions, and roll parts.
- Encounter bundles include selected encounters, their parent campaign context, combatants, runs,
  run combatants, spell slots, active effects, alerts, combat log, referenced location records, and
  referenced user creatures/players/spells/assets.
- Map bundles include selected maps, parent campaign context, pins, pinned/parent locations,
  Dungeon Studio metadata stored on the map record, and referenced assets.

Standalone export entities are campaigns, encounters, NPCs/creatures, players, items, spells, maps,
locations, shops, dungeons, journeys, and roll tables. Single rooms, map pins, stock rows, NPC
placements, combatants, run combatants, spell slots, active effects, alerts, combat log entries,
roll table rows, and join rows are internal records.

Object bundle imports use clone semantics just like campaign imports. Required parent references
must exist inside the bundle and be remapped during import. Optional references are cleared when
their source object is intentionally not included.

New bundle types should add:

- root selection rules for requested objects
- graph node labels and dependency edges
- candidate row loading only where the graph cannot yet discover rows itself
- manifest filtering tests proving the graph owns final inclusion
