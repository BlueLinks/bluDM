# Import / Export Test Coverage

Status terms:

- covered: automated or browser coverage exists for the main behavior
- partial: some coverage exists, but important branches remain untested
- missing: no meaningful coverage yet
- not applicable: the row does not use that surface

| Area                   | Export         | Import         | Preview        | Execute        | Conflict       | Asset          | Graph          | Browser QA     |
| ---------------------- | -------------- | -------------- | -------------- | -------------- | -------------- | -------------- | -------------- | -------------- |
| Everything             | covered        | covered        | covered        | covered        | partial        | covered        | covered        | covered        |
| Campaign               | covered        | covered        | covered        | covered        | covered        | covered        | covered        | covered        |
| NPC / Creature         | covered        | covered        | covered        | covered        | covered        | covered        | covered        | partial        |
| Player                 | covered        | covered        | covered        | covered        | covered        | covered        | covered        | partial        |
| Item                   | covered        | covered        | covered        | covered        | covered        | not applicable | covered        | partial        |
| Spell                  | covered        | covered        | covered        | covered        | covered        | covered        | covered        | partial        |
| Map                    | covered        | covered        | covered        | covered        | partial        | covered        | covered        | covered        |
| Shop                   | covered        | covered        | covered        | covered        | covered        | covered        | covered        | partial        |
| Dungeon                | covered        | covered        | covered        | covered        | covered        | covered        | covered        | partial        |
| Encounter              | covered        | covered        | covered        | covered        | partial        | covered        | covered        | covered        |
| Journey                | covered        | covered        | covered        | covered        | partial        | not applicable | covered        | partial        |
| Roll Table             | covered        | covered        | covered        | covered        | partial        | not applicable | covered        | partial        |
| v1 legacy archive      | not applicable | covered        | covered        | covered        | partial        | covered        | partial        | covered        |
| v2 split archive       | covered        | covered        | covered        | covered        | partial        | covered        | covered        | covered        |
| clone ZIP round trip   | covered        | covered        | covered        | covered        | partial        | covered        | covered        | partial        |
| restore ZIP round trip | covered        | covered        | covered        | covered        | partial        | covered        | covered        | partial        |
| malformed archive      | not applicable | covered        | covered        | not applicable | not applicable | covered        | not applicable | partial        |
| unsafe archive         | not applicable | covered        | covered        | not applicable | not applicable | covered        | not applicable | partial        |
| missing asset          | not applicable | covered        | covered        | not applicable | not applicable | covered        | not applicable | missing        |
| asset hash mismatch    | not applicable | covered        | covered        | not applicable | not applicable | covered        | not applicable | missing        |
| archive verification   | not applicable | covered        | covered        | covered        | partial        | covered        | covered        | partial        |
| graph projection       | covered        | covered        | covered        | covered        | partial        | covered        | covered        | covered        |
| raw graph              | covered        | covered        | covered        | covered        | partial        | covered        | covered        | covered        |
| history                | covered        | covered        | covered        | covered        | not applicable | partial        | covered        | covered        |
| export cache expiry    | covered        | not applicable | not applicable | covered        | not applicable | not applicable | covered        | partial        |
| performance            | covered        | partial        | covered        | partial        | not applicable | covered        | covered        | not applicable |
| merge planner          | covered        | covered        | covered        | covered        | covered        | covered        | covered        | partial        |
| merge field diff       | covered        | covered        | covered        | covered        | covered        | not applicable | covered        | partial        |
| merge provenance       | partial        | covered        | covered        | covered        | not applicable | covered        | partial        | partial        |
| missing dependency     | partial        | partial        | covered        | covered        | partial        | not applicable | covered        | missing        |
| duplicate object       | not applicable | covered        | covered        | partial        | covered        | not applicable | covered        | missing        |
| unsupported version    | not applicable | covered        | covered        | not applicable | covered        | not applicable | not applicable | missing        |

## Notes

- Archive format tests cover split ZIP writing, split ZIP parsing, legacy v1 parsing, missing indexed
  files, unindexed logical files, malformed graph JSON, unsafe paths, malformed manifests,
  unsupported versions, missing assets, orphaned assets, invalid asset MIME types, duplicate ZIP
  entries, and asset hash mismatches.
- Graph tests cover deterministic traversal, raw internal nodes, projected high-level nodes, grouped
  shop stock, grouped dungeon floors/rooms, grouped roll table rows, graph reachability filtering,
  and expanded bundle roots.
- Frontend tests cover the app-native Import / Export page, export review, object bundle selection,
  high-level preview summaries, conflict impact text, shop/dungeon location root selection, and
  journey/roll table object selection.
- Store integration tests cover clone round trips for every supported bundle plus merge execution
  checks for create, rename-on-collision, exact duplicate skip, same-hash asset reuse, missing-field
  item merge with provenance, and campaign-scoped metadata missing-field merges for encounter, shop,
  map, and journey when `BLUDM_TEST_DATABASE_URL` is configured.
- HTTP archive integration tests cover split ZIP generation/parsing plus preview and clone import for
  every supported bundle when `BLUDM_TEST_DATABASE_URL` is configured.
- Restore ZIP integration tests cover every supported bundle, dirty-target rejection, ownership
  rewrite, ID preservation, relationship/internal-row restoration, asset restoration, graph metadata,
  and rollback on write failure when `BLUDM_TEST_DATABASE_URL` is configured.
- Cache tests cover cached download success, expired download failure, cache cleanup, history
  inspection metadata after cache expiry, and user-facing expired-download messaging.
- Performance tests cover deterministic medium, large, maximum, and edge-case archive fixtures.
- Browser QA is intentionally smoke-level. It covers the route, tabs, export flow, graph Tree/Raw
  modes, history, settings, and local ZIP inspection, but it is not a full matrix sweep.

## Remaining Gaps

- Execute tests should be expanded per bundle type, especially shop, dungeon, map, and encounter.
- Relationship assertions should be broadened to prove no original UUIDs survive for every supported
  cloned reference type.
- Missing standard references and missing optional assets need clearer warning-vs-blocking tests.
- Browser upload preview remains partially manual because the current in-app browser automation
  surface cannot populate native file inputs directly.
- Merge mode needs broader per-bundle execute tests for campaign, dungeon, location, roll table, and
  unsupported standalone action template archives.
- Field-level merge coverage should expand from item plus campaign-scoped metadata examples to NPC,
  player, spell, campaign, dungeon/location, and roll table examples.
- Provenance is covered at planner/history shape and one DB-backed item merge path; a future pass
  should verify every entity metadata field that stores provenance.
- Additive child collection merge remains intentionally unimplemented; future tests should cover the
  `block_child_collection_merge` planner action and eventual safe per-child additive merge rules.
