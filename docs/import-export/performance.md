# Import / Export Performance

The export pipeline records lightweight timing metadata in `exportStats`:

- graph traversal time
- manifest generation time
- ZIP generation time when the archive is created through the HTTP layer
- node, edge, root, reverse-edge, and warning counts
- archive byte size and asset counts in the export response
- import duration in history for clone, restore, and merge execution

These fields are included in export responses and history records so the UI can show practical
diagnostics without exposing internal implementation details.

## Current Measurement Points

- `PlanExport` measures dependency graph traversal.
- `ManifestFromExportPlan` measures graph reachability filtering and manifest finalization.
- The HTTP ZIP builder can attach ZIP generation timing.
- History records store duration and counts for completed exports/imports.
- `TestDeterministicArchiveFixturesAndPerformanceThresholds` measures graph generation, ZIP
  generation, archive parsing, and archive verification for deterministic medium, large, and maximum
  fixtures.
- `BenchmarkImportExportArchivePipelineLarge` provides a local benchmark command for repeated large
  archive pipeline runs.

## Recommended Baselines

Track these fixture sizes:

- Small: one root object and dependencies
- Medium: one campaign slice with all supported relationship types
- Large: multiple campaigns, large maps/assets, and repeated child records
- Maximum: CI-reasonable stress shape with more campaigns, maps, encounters, assets, journeys, and
  roll tables

For each size, capture:

- total export duration
- graph traversal duration
- ZIP generation duration
- archive byte size
- preview parse duration
- clone import duration
- restore import duration for empty-account recovery fixtures
- merge planning and execution duration from import history
- graph node and edge counts

## Current Thresholds

The deterministic archive pipeline test uses conservative thresholds:

- Medium: 2 seconds
- Large: 4 seconds
- Maximum: 8 seconds

These thresholds cover graph generation, ZIP generation, archive parsing, and archive verification.
Clone, Restore, and Merge import timing remains covered through DB-gated integration shape and
import history duration fields because realistic write performance requires PostgreSQL.

## Follow-Up Work

- Add DB-backed benchmarks for clone, restore, and merge import when a stable local benchmark
  database is available.
- Surface slow-stage hints in history after backend streaming progress exists.
- Keep asset compression disabled until image rewrite and manifest integrity rules are designed.
