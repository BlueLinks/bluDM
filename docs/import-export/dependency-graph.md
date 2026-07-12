# Import / Export Dependency Graph

The dependency graph is the canonical planning structure for exports and the canonical inspection
structure for imports. Export planning builds it from live database candidate rows before the final
manifest is generated. Import preview rebuilds it from the uploaded manifest because imported data
arrives as a portable bundle.

## Purpose

The graph gives a single inspectable structure for:

- export bundle contents and final manifest inclusion
- import preview summaries
- missing dependency warnings
- asset and standard-content references
- relationship audit checks
- future custom bundle planning

## Shape

Each graph contains:

- `roots`: graph node IDs for the requested export roots.
- `order`: deterministic dependency traversal order from the roots.
- `nodes`: human-labelled objects, assets, missing references, and standard references.
- `edges`: parent-to-child relationships with a relation label and required/optional flag.
- `reverseEdges`: dependent lookups for conflict analysis and future merge planning.
- `counts`: required objects, optional objects, assets, standard references, missing nodes, and
  edge count.
- `warnings`: user-visible graph and audit warnings.
- `audit`: internal audit counters and messages.
- `projection`: a DM-facing graph view with high-level objects, grouped internal counts, and
  non-UUID projection keys.

Node IDs remain implementation keys. UI surfaces must show `label`, `kind`, relation labels, and
badges rather than raw UUID values.

## User-Facing Projection

The projected graph is the default UI surface. It shows standalone/shareable objects:

- campaigns
- encounters
- NPCs / creatures
- players
- items
- spells
- maps
- locations, shops, settlements, and dungeons
- journeys and roll tables
- assets and standard references when enabled

Implementation details are hidden by default and counted under their nearest meaningful parent.
Examples include dungeon floors and rooms, location stock rows, NPC placements, map pins, encounter
combatants, run combatants, spell slots, active effects, alerts, combat log rows, roll table rows,
and join rows.

The raw graph remains available through the developer view for debugging and audit work.

## Audit Checks

The audit currently verifies:

- required dependencies that point at missing nodes
- exported objects that are not reachable from an export root
- unexpected dependency cycles
- referenced assets represented by manifest asset rows
- standard content references represented as non-imported reference nodes

Warnings are persisted in history so an old export can still be inspected after its cached ZIP
download expires.

## Export Planning

Export planning follows this flow:

```text
Database rows
↓
Dependency graph
↓
Reachable node set
↓
Manifest arrays
↓
Split ZIP files
```

The final manifest is filtered through graph reachability. If a candidate row is not represented by
the graph, it does not enter the exported manifest. This keeps export summaries, history, and the
actual bundle aligned around the same source of truth.

## History And ZIP Lifecycle

History persists metadata only:

- action, status, bundle type, version, source app version
- created date, size, duration, warnings, counts
- manifest summary and dependency graph snapshot
- temporary export cache ID when available

ZIP bytes are still stored only in the in-memory export cache and expire after the existing cache
window. Downloading a historical export only succeeds while that cache entry is still available.
