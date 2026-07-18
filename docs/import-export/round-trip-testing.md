# Import / Export Round-Trip Testing

Round-trip tests prove that a bundle can be exported, imported in clone mode, and still preserve the
relationships users expect while assigning new IDs and current-user ownership.

## Supported Bundle Matrix

The first integration matrix covers:

- Everything
- Campaign
- Dungeon
- Shop
- Encounter
- NPC / Creature
- Player
- Item
- Spell
- Map
- Journey
- Roll Table

The store matrix exports from a shared fixture and imports into a fresh target user. The fixture
includes a campaign, player, NPC, item, spell, encounter, shop, dungeon room, map pin, journey, roll
table, asset, stock row, and NPC/location link.

The HTTP archive matrix also exercises the production ZIP pipeline: export package, split ZIP
generation, write/read from disk, split ZIP parsing, preview archive verification, and clone import.
The matching Restore matrix uses the same ZIP pipeline, then restores into a separate target schema
so original IDs can be preserved without colliding with source data.

Both matrices live in `backend/internal/httpapi/import_export_archive_roundtrip_integration_test.go`.

## Relationship Checks

The reusable relationship matrix verifies:

- imported user-owned records belong to the target user
- imported campaign records belong to newly cloned campaigns
- cloned rows do not reuse original IDs
- location parent links are remapped
- map pins point at cloned maps and cloned locations
- stock rows point at cloned locations and cloned user items
- encounter combatants point at cloned encounters, players, and creatures
- roll table rows point at cloned roll tables

This deliberately checks relational shape rather than only headline counts.

Restore checks additionally verify:

- original IDs are present after restore
- owner-owned rows are rewritten to the target user
- assets are restored before rows that reference them
- internal rows such as combatants, map pins, stock rows, and roll table rows are restored
- dirty target accounts are rejected
- write failures roll back fully

## Running

The database round-trip tests follow the existing integration pattern and are skipped unless a test
database is configured:

```sh
BLUDM_TEST_DATABASE_URL=postgres://... go test ./internal/store ./internal/httpapi
```

Fast unit tests still compile the integration test, but do not require a local PostgreSQL instance.

## Next Gates

- Add explicit edge-case fixtures for empty campaigns, missing optional assets, standard-only
  references, and archived records.
- Add merge coverage only after merge planning and conflict policy work is complete.
