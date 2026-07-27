# Markdown Encounter Bridge

bluDM can turn small structured blocks inside ordinary Markdown notes into encounters that use the
normal editor, initiative setup, and combat tracker.

The boundary is intentional:

- Markdown remains the source of truth for campaign prose, secrets, locations, NPC writing, maps,
  and session prep.
- bluDM stores the structured roster and runtime state needed to prepare and run combat.
- The bridge reads Vault files. It never edits them.
- REST is the integration surface. An MCP server is deferred until real usage shows that endpoint
  discovery alone is not enough.

## Encounter block

Add a fenced `bludm-encounter` block anywhere in a note. A note may contain more than one block.
Existing Obsidian frontmatter, links, embeds, headings, and prose remain untouched.

````markdown
## Optional Encounter — Hungry Scavengers

Two wolves and one dire wolf have come for the camp's food. They are hungry rather than malicious.

```bludm-encounter
version: 1
id: hungry-scavengers
name: Hungry Scavengers
description: |
  Two wolves and one dire wolf have come for the camp's food.
  Food or Animal Handling can end the encounter without combat.
status: planned
location: Cairncut Survey Camp
add_party: true
loot: |
  The camp supplies include two potions of climbing.
combatants:
  - creature: Wolf
    quantity: 2
    side: enemy
  - creature: Dire Wolf
    side: enemy
    rolled_hp: true
```
````

`id` is stable within its file. The bridge combines the Vault-relative file path and block ID, so
importing the same block again updates its existing bluDM encounter and replaces that encounter's
roster. It does not create a duplicate.

## Fields

| Field         | Required | Meaning                                                                |
| ------------- | -------- | ---------------------------------------------------------------------- | ---------------------------- |
| `version`     | Yes      | Schema version. The current and only supported version is `1`.         |
| `id`          | Yes      | Stable lowercase ID using letters, numbers, `.`, `_`, or `-`.          |
| `name`        | Yes      | Encounter name shown in bluDM.                                         |
| `description` | No       | Table-facing encounter description. YAML `                             | ` is useful for longer text. |
| `status`      | No       | `planned`, `completed`, or `skipped`; defaults to `planned`.           |
| `location`    | No       | Exact Campaign World location name or free text.                       |
| `location_id` | No       | Unambiguous bluDM location ID. Prefer this only when names collide.    |
| `room`        | No       | Room number or short room label.                                       |
| `loot`        | No       | Loot and reward notes.                                                 |
| `add_party`   | No       | Adds every current player in the target campaign.                      |
| `combatants`  | No       | Players, library creatures, or inline combatants to add to the roster. |

The preview rejects unknown fields. This is useful with AI-generated YAML because a plausible typo
cannot silently disappear.

### Referencing combatants

Use exactly one reference on each combatant:

```yaml
combatants:
  - player: Seraphine Vale
  - player_id: 82982273-...
  - creature: Wolf
    quantity: 3
  - creature_id: b165e5e4-...
  - standard_creature_id: c90d20bc-...
```

Names must match exactly, ignoring letter case. Custom creatures take precedence over standard
creatures with the same name. If more than one exact match exists, preview asks for an explicit ID.
Standard creatures must belong to a rules source enabled for the campaign.

A combatant that is unique to this encounter can carry its runtime stats inline:

```yaml
combatants:
  - name: Root-fed Meenlock
    side: enemy
    armor_class: 15
    hit_points: 95
```

Inline combatants work in initiative and HP tracking but do not gain reusable library actions. Add a
custom creature to the bluDM library when a full reusable stat block and actions are needed.

Optional combatant fields are:

- `name`: display-name override.
- `side`: `player`, `friendly`, or `enemy`; defaults to `enemy`.
- `quantity`: 1–25; defaults to 1.
- `rolled_hp`: roll library hit dice during import.
- `color`: bluDM combatant color label.
- `avatar_url`: external portrait override.

One encounter may expand to at most 100 combatants, and one Markdown file may contain at most 50
encounter blocks.

## Browser workflow

1. Open **Import / Export → Markdown**, or use **Import Markdown** in a campaign's Encounters card.
2. Choose the target campaign and a Markdown note.
3. Preview. No data is written during this step.
4. Review create/update operations, resolved roster entries, warnings, and errors.
5. Import, then open the encounter in the normal editor.

An exported encounter is available at `GET /api/encounters/{encounterId}/markdown`. Export produces
a reusable encounter block; it does not modify the source note.

## AI authoring prompt

This short prompt is suitable for an AI working inside a Vault:

> Keep all existing Markdown prose and frontmatter. Add or update a fenced `bludm-encounter` YAML
> block for each encounter that should run in bluDM. Use schema version 1, a stable lowercase ID,
> exact creature/player names when known, inline `armor_class` and `hit_points` only for unique
> combatants, and `add_party: true` when the full campaign party should be present. Do not invent
> bluDM IDs. Do not alter unrelated campaign writing.

The AI can write normal campaign material freely and only needs to produce a small deterministic
runtime block where bluDM is useful.

## Local Vault bridge

Create a token under **Settings → AI and Vault access**. The secret is shown once, stored by bluDM
only as a SHA-256 hash, expires automatically, and can be revoked immediately.

```sh
export BLUDM_URL=http://localhost:3080
export BLUDM_TOKEN=bludm_v1_your_token

node scripts/bludm-vault.mjs campaigns
node scripts/bludm-vault.mjs preview \
  --campaign CAMPAIGN_ID \
  --vault "/path/to/DND Vault" \
  --file "Triboar Trail/Cairncut Survey Camp.md"
```

Omit `--file` to scan the Vault recursively. `.obsidian`, `.git`, and `node_modules` directories are
ignored. Repeat `--file` to select several notes.

Import is a separate, explicit operation:

```sh
node scripts/bludm-vault.mjs import \
  --campaign CAMPAIGN_ID \
  --vault "/path/to/DND Vault" \
  --file "Triboar Trail/Cairncut Survey Camp.md" \
  --yes
```

The command previews every selected file first. If any file has a blocking error, none of the import
requests begin. Each file is transactionally imported by the server, and stable source IDs make a
retry safe.

Export writes Markdown to standard output, never into the Vault:

```sh
node scripts/bludm-vault.mjs export --encounter ENCOUNTER_ID
```

## External REST API

External endpoints require `Authorization: Bearer bludm_v1_...`.

| Method | Endpoint                                                              |
| ------ | --------------------------------------------------------------------- |
| `GET`  | `/api/external/v1/campaigns`                                          |
| `POST` | `/api/external/v1/campaigns/{campaignId}/encounters/markdown/preview` |
| `POST` | `/api/external/v1/campaigns/{campaignId}/encounters/markdown/import`  |
| `GET`  | `/api/external/v1/encounters/{encounterId}/markdown`                  |

Preview and import accept:

```json
{
  "sourcePath": "Triboar Trail/Cairncut Survey Camp.md",
  "markdown": "# The complete note, including one or more encounter blocks"
}
```

The browser uses equivalent session-authenticated endpoints under
`/api/campaigns/{campaignId}/encounters/markdown`.

## Deliberate follow-ups

The versioned REST boundary can later add NPC or map-reference blocks without making bluDM the home
for campaign prose. Server-side random encounter and dungeon generation can also return the same
previewable documents. MCP should remain optional: it becomes worthwhile only if agents need tool
discovery and multi-step orchestration that the documented REST endpoints and local bridge do not
provide.
