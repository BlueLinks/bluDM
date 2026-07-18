# Merge Policies

Merge policies are intentionally conservative. The current implementation favors creating,
renaming, reusing identical data, and filling missing fields over overwriting existing prep.

## Policy Matrix

| Kind               | Create | Rename  | Reuse/Skip Exact | Missing Field Merge | Child Merge | Destructive Replace |
| ------------------ | ------ | ------- | ---------------- | ------------------- | ----------- | ------------------- |
| Campaign           | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| NPC / Creature     | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| Player             | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| Item               | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| Spell              | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| Encounter          | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| Shop / Dungeon     | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| Location           | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| Map                | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| Journey            | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| Roll Table         | Yes    | Yes     | Yes              | Yes                 | No          | No                  |
| Uploaded Asset     | Yes    | By hash | By hash          | No                  | No          | No                  |
| Standard Reference | No row | No      | Yes              | No                  | No          | No                  |

## Missing Field Merge

`merge_missing_fields` is allowed only when:

- the existing and imported object share a stable identity match
- all non-same field diffs are `added`
- the existing field is empty and the imported field has a value
- the object has no internal child rows that would need collection reconciliation
- the executor can save the existing object in the same transaction

The executor does not overwrite non-empty fields. JSON maps are merged only when the existing map is
empty or is a subset of the imported map.

Relationship fields such as campaign, parent location, image asset, encounter location, and
background asset references are ignored for missing-field merge. Those IDs are handled by dependency
mapping, not copied from the source archive into the target database.

## Child Collections

Child rows are imported when their parent object is created. Merge into an existing parent remains
planner-blocked with `block_child_collection_merge` until duplicate detection and additive
collection reconciliation are implemented per child type.

## Assets

Assets are reused by content hash when possible. If an imported asset is new, it is created with
provenance. The planner does not overwrite existing asset bytes.

## Unsupported In This Release

- destructive replace
- child row replacement or additive merge into an existing root
- relationship duplicate reconciliation after ID remapping
- standalone action template merge
- manual conflict resolution choices beyond the planner default
