# Import / Export

bluDM app-native exports are portable ZIP bundles for moving campaign data between bluDM
instances without relying on full PostgreSQL dumps.

This first pass supports:

- Everything exports for current-user portable data.
- Campaign exports for one or more campaigns.
- NPC, Player, Item, Spell, Encounter, Map, Shop, Dungeon, Journey, and Roll Table object exports.
- ZIP upload preview with no database writes.
- Clone imports with new IDs and current-user ownership.
- Restore imports for empty-account recovery with original IDs preserved.
- Conflict reporting for likely name collisions.
- Archive verification for manifest shape, graph integrity, dependency completeness, asset
  presence, byte sizes, and optional SHA-256 hashes.
- Dependency graph metadata for export manifests, import previews, and history inspection.
- Persisted import/export history metadata without permanently storing ZIP bundle bytes.
- One-hour in-memory export download cache with explicit history status after expiry.
- Merge Planner preview plus the first safe transactional Merge execution path.
- Field-level missing-value merge for supported simple entities.
- Merge provenance in planner output, imported records, and history inspection.

Custom bundles remain scaffolded in the UI but intentionally disabled until arbitrary object
selection has a safe dependency graph. Merge import is enabled for conservative planner-approved
actions only: create, rename imported copies, reuse exact matches, skip exact duplicates, reuse
same-hash assets, keep standard references, and merge missing fields where the planner proves the
existing value is empty. Replacement, destructive overwrite, child collection merge into existing
objects, and unsupported standalone action template writes are blocked.

See:

- `architecture.md`
- `export-format.md`
- `manifest-schema.md`
- `dependency-graph.md`
- `import-pipeline.md`
- `security.md`
- `test-coverage.md`
- `round-trip-testing.md`
- `fixture-data.md`
- `performance.md`
- `merge-planner.md`
- `merge-policies.md`
- `merge-provenance.md`
- `merge-readiness-audit.md`
