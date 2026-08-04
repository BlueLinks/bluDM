# Durable Encounter Authoring

The first MCP generation call writes a real `planned` encounter. It is not an orphan preview.

## Recommended Flow

1. Call `list_campaigns`.
2. Read `get_campaign_context`, `list_players`, `list_locations`, and `search_creatures`.
3. Optionally call `evaluate_encounter` for an explicit roster.
4. Ask the user to approve `create_generated_encounter`.
5. Keep the returned `encounter.id`, `revision`, seed, generator version, warnings, and actual
   difficulty evidence.
6. Read the encounter again before changing it.
7. Use `regenerate_encounter` for a reroll, `update_encounter` for a surgical edit, or
   `restore_encounter_revision` for undo.
8. Export with `export_encounter_bundle`.

## Creation Guarantees

`create_generated_encounter` atomically creates the encounter, optional party roster,
generator-managed enemies, generation metadata, revision 1 snapshot, and idempotency response.
Unknown party, creature, source, campaign, or location IDs fail before an empty encounter appears.
A valid roster outside the requested band is saved with `withinTarget: false` and explicit
warnings.

Retries with the same principal, operation, idempotency key, and normalized input return the
original response. Reusing a key with different input returns `idempotency_conflict`.

## Rerolls And Edits

Every replacement command requires `expectedRevision`. A stale value returns `conflict` with the
current revision. Rerolls:

- keep the same encounter ID;
- preserve name, notes, location, and manual/chosen combatants;
- replace generator-managed enemies unless explicitly preserved;
- use the supplied seed or a server-generated fresh seed;
- save a new immutable snapshot and revision reason.

Browser metadata and roster edits increment the same revision, so an agent cannot overwrite a
concurrent human edit.

The browser random-preview flow receives a deterministic `previewFingerprint`. Saving the
untouched reviewed roster submits that fingerprint to the same atomic encounter service; the
service rejects any mismatched preview before writing. Manually changing the preview clears the
fingerprint and follows the explicit authored-roster path.

## Restore

Restore reads an old snapshot, writes it as a new head revision, and leaves the intervening history
intact. It is an auditable write, not history deletion.

## Difficulty Evidence

The server returns `dnd-5e-2014-xp-v1` evidence. It sums the 2014 Easy, Medium, Hard, and Deadly
threshold for each selected character level (levels are bounded to 1–20), totals the base XP of
every enemy body, and applies the group multiplier below.

| Enemy bodies | Base multiplier |
| ------------ | --------------- |
| 1            | 1×              |
| 2            | 1.5×            |
| 3–6          | 2×              |
| 7–10         | 2.5×            |
| 11–14        | 3×              |
| 15+          | 4×              |

For one or two characters, the multiplier moves up one step. For six or more characters it moves
down one step. `partySizeAdjustment` reports `1`, `0`, or `-1`, while `baseMultiplier` and
`multiplier` expose the before/after values. `rawXp` is the unmultiplied total and `adjustedXp` is
the rounded multiplied total.

Requested target bands are lower-inclusive and upper-exclusive: Easy is `[easy, medium)`, Medium
is `[medium, hard)`, Hard is `[hard, deadly)`, and Deadly is `[deadly, 1.5 × deadly)`. At or above
1.5 × Deadly the actual label is `Over Deadly`. The response always distinguishes
`requestedDifficulty` from `actualDifficulty` and includes `targetMinimum`, `targetMaximum`, and
`withinTarget`.

Valid off-target results are persisted with `withinTarget: false` and warnings. Missing references,
an empty party, invalid source restrictions, impossible body constraints, or malformed inputs are
hard failures and create nothing. Zero-XP creatures, missing player levels, small/large party
adjustments, sparse candidate pools, archetype fallback, and unsupported hazard budgeting are
reported rather than hidden. A requested hazard is currently narrative guidance only: it is not
silently inserted into the roster or XP budget. The generator version is
`bludm-encounter-generator-v2`.

## Snapshot And Latest Export

Encounter exports accept `creatureData: "snapshot"` or `"latest"`. New encounter snapshots include
custom actions and spellcasting alongside core creature data. Legacy snapshots missing adjacent
records use current adjacent data and report that fallback as lossy. The default is `latest`.

Inline combatants without a linked creature remain in the bluDM encounter Markdown but cannot
produce a creature stat block. Encounter export reports each one in `omittedCombatants` and adds a
warning; it never silently treats the inline combatant as a complete creature.
