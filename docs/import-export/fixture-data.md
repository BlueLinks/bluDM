# Import / Export Fixture Data

Fixture coverage is split into four sizes so tests can stay focused:

## Small

One object and its minimum required dependencies. Examples:

- one NPC with no actions
- one item
- one spell with no automation
- one journey with campaign context
- one roll table with one row

Use small fixtures for validation, graph root, archive parser, and UI object selection tests.

## Medium

One campaign-shaped slice with representative relationships:

- campaign
- player
- NPC linked to the campaign
- item and shop stock row
- spell
- encounter and combatants
- location hierarchy
- map and pin
- journey
- roll table and rows
- uploaded asset

Use medium fixtures for round-trip clone import, restore import, relationship remapping tests, and
the baseline archive performance check.

## Large

Multiple campaigns with many dependent records and assets. The large fixture should measure export
planning, graph projection, ZIP generation, preview parsing, and clone import time.

Large fixtures are generated deterministically in
`backend/internal/httpapi/import_export_performance_test.go` and should not be checked in as bulky
binary archives.

## Maximum

Maximum fixtures should stress operational limits without becoming the default local test path:

- many campaigns owned by one user
- repeated maps with image assets
- dense encounter combatant lists
- large roll tables
- nested dungeon locations
- duplicated names across object types

Use maximum fixtures for explicit performance checks and release-readiness sweeps. The current
maximum fixture remains CI-reasonable and exercises the archive pipeline without requiring a
database.

## Edge Case

Edge-case fixtures should cover:

- empty campaign
- campaign with only standard references
- missing optional asset
- duplicated names in the target database
- dungeon with nested child locations
- map pin referencing a descendant location
- roll table with sparse ranges
- journey with distance-only route input
- unsupported future manifest version
- malformed split archive index
- asset hash mismatch
- restore into a target account that already has portable data
- bad asset hash
- maps without images
- empty shops
- dungeons without encounters
- duplicate names
- standard references

## Ownership Rule

Fixtures must always distinguish source and target users. Import tests should fail if any cloned
record keeps a source-owned ID or owner.
