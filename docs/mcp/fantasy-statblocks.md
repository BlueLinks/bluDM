# Fantasy Statblocks Compatibility

Profile `fantasy-statblocks-basic-5e@1` targets Fantasy Statblocks `4.10.3`, tag `4.10.3`,
source commit `f248f4af8a3d748c2f64534f15e01c2d846e8b12`, and integrated layout
`Basic 5e Layout` version 9. Changing any of those identifiers is an explicit compatibility
change.

The checked-in [profile schema](fantasy-statblocks-basic-5e.schema.json) and
[upstream filled example](fixtures/fantasy-statblocks-official-example.md) are release fixtures.
The official source is
`src/layouts/basic 5e/publish/Basic 5e Layout.md` in the Fantasy Statblocks repository.

Curated rendered fixtures cover
[ordinary](fixtures/statblock-ordinary.md),
[spellcasting](fixtures/statblock-spellcasting.md),
[legendary](fixtures/statblock-legendary.md),
[all custom sections](fixtures/statblock-custom-sections.md),
[incomplete partial output](fixtures/statblock-incomplete-partial.md),
[repeated encounter rosters](fixtures/statblock-repeated-roster.md), and
[encounter snapshots](fixtures/statblock-snapshot.md).

## Output

Exports return:

- a canonical, storage-independent 5e statblock;
- a field-by-field compatibility report;
- YAML encoded with `gopkg.in/yaml.v3`;
- a fenced ` ```statblock ` block;
- source/profile/version metadata;
- for encounters, stable roster quantities and one block per distinct creature.

The Obsidian bundle adds a fenced `bludm-encounter` block before the deduplicated creature blocks.
bluDM never writes the remote result directly into a Vault.

## Field Mapping

| Canonical field             | Plugin property                    | Classification                                                        |
| --------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| identity/source/image       | `name`, `source`, `image`          | direct; unsafe/authenticated image URLs omitted                       |
| size/type/subtype/alignment | same names                         | direct                                                                |
| armor/hit points/hit dice   | `ac`, `hp`, `hit_dice`             | direct; AC notes flattened into the accepted string form              |
| movement                    | `speed`                            | normalized from structured standard or custom speed                   |
| abilities                   | `stats`                            | ordered STR, DEX, CON, INT, WIS, CHA                                  |
| saves/skills                | `saves`, `skillsaves`              | direct or derived from proficiency and ability modifiers              |
| defenses                    | `damage_*`, `condition_immunities` | normalized text                                                       |
| senses/languages/CR         | `senses`, `languages`, `cr`        | direct/normalized                                                     |
| traits/actions              | `traits`, `actions`                | standard arrays or typed custom actions flattened to name/description |
| bonus/reaction              | `bonus_actions`, `reactions`       | explicit custom display section or standard section                   |
| legendary/mythic/lair       | matching properties                | direct section mapping                                                |
| regional effects            | `regional_effects`                 | direct when present                                                   |
| spellcasting                | `spells`, `spellsNotes`            | prepared/innate groups flattened to plugin lines                      |

bluDM-only description, XP, entity IDs, source keys, structured automation, and encounter snapshot
metadata are adjacent or omitted from the visual block and named in the report.

## Compatibility Status

- `complete`: no known loss or warning.
- `complete_with_warnings`: renderable, with every derived, flattened, omitted, unknown, or lossy
  field identified.
- `unsupported`: a required property is missing or the source is not approved for redistribution.

Strict export is the default and returns `unsupported` without Markdown when blocked. Partial mode
is diagnostic and emits a warning before incomplete Markdown; it never hides missing fields.

Required canonical fields are name, size, type, AC, HP, hit dice, speed, six positive ability
scores, and CR. The source importer—not the exporter—owns correcting bad source records.

## Source And Image Safety

Standard content is exportable only when its source key/label identifies redistributable SRD
content enabled for that campaign. Arbitrary standard source text is not copied out.

Vault image overrides must be safe Vault-relative paths. Remote authenticated URLs, traversal, and
unsupported schemes are omitted with a warning.

## Verification

Automated tests:

- parse rendered YAML and fencing;
- exercise standard, custom, caster, legendary, and every action display section;
- test unknown/restricted/incomplete records;
- deduplicate repeated encounter creatures;
- require strict atomic failure if one distinct creature is unsupported;
- validate every 664 enabled standard creature fixture with zero unsupported results.

Before a release, open the curated notes in a dedicated Obsidian test Vault using plugin `4.10.3`
and visually check the Basic 5e layout. This visual check is intentionally separate from
parse/contract tests.

The checked fixture fences can be compared with the dedicated Vault before opening Obsidian:

```sh
scripts/verify-fantasy-statblocks-vault.sh \
  "/absolute/path/to/bluDM MCP QA Vault"
```

The script fails if the Vault plugin is not exactly `4.10.3`, a curated note is missing, or a
Vault fence differs from its checked-in fixture. It does not replace the visual rendered-layout
check.

The 2026-07-30 release check used Obsidian 1.9.10 and Fantasy Statblocks 4.10.3. Ordinary,
spellcasting, legendary, custom-section, incomplete-diagnostic, repeated-roster, and
encounter-snapshot notes all rendered. The mixed bundle visibly retained the roster quantity
`Dire Wolf ×3` while rendering one Dire Wolf stat block, and the incomplete fixture visibly
retained its strict-export warning.

The 2026-08-04 revalidation compared all seven Vault fences byte-for-byte with the checked-in
fixtures, reconfirmed plugin 4.10.3, and rendered the encounter-snapshot note live. The prior full
visual pass remains applicable because the fixture fences are unchanged.
