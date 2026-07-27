# Markdown Campaign Bridge

bluDM can turn small structured blocks inside ordinary Markdown notes into encounters, campaign
NPCs, and Dungeon Studio-backed World locations and maps.

The boundary is intentional:

- Markdown remains the source of truth for campaign prose, secrets, NPC writing, map source files,
  and session prep.
- bluDM stores only the structured NPC, World/map, roster, and runtime state used at the table.
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

| Field         | Required | Meaning                                                                     |
| ------------- | -------- | --------------------------------------------------------------------------- |
| `version`     | Yes      | Schema version. The current and only supported version is `1`.              |
| `id`          | Yes      | Stable lowercase ID using letters, numbers, `.`, `_`, or `-`.               |
| `name`        | Yes      | Encounter name shown in bluDM.                                              |
| `description` | No       | Table-facing encounter description. YAML `\|` is useful for longer text.    |
| `status`      | No       | `planned`, `completed`, or `skipped`; defaults to `planned`.                |
| `location`    | No       | Exact Campaign World location name or free text.                            |
| `location_id` | No       | Unambiguous bluDM location ID. Prefer this only when names collide.         |
| `room`        | No       | Room number or short room label.                                            |
| `loot`        | No       | Loot and reward notes.                                                      |
| `add_party`   | No       | Adds every current player in the target campaign.                           |
| `combatants`  | No       | Players, library creatures, or inline combatants to add to the roster.      |

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

## NPC block

`bludm-npc` creates or updates a custom creature and links it to the selected campaign. Optional
location fields use the existing Campaign World NPC/location relationship. An NPC may refer to a
dungeon or floor declared in the same note.

````markdown
```bludm-npc
version: 1
id: keeper-voss
name: Keeper Voss
description: |
  The keeper of the flooded archive.
size: Medium
creature_type: humanoid
alignment: lawful neutral
armor_class: 13
hit_points: 22
hit_dice: 4d8+4
challenge_rating: "1"
xp: 200
disposition: neutral
location: The Sunken Keep
location_role: keeper
visibility: dm
location_notes: Knows which stair remains safe.
avatar: Assets/keeper-voss.webp
stat_block:
  abilityScores:
    strength: 10
    dexterity: 12
    constitution: 12
    intelligence: 15
    wisdom: 14
    charisma: 16
```
````

Required fields are `version`, `id`, `name`, `armor_class`, and `hit_points`. `disposition` accepts
`friendly`, `neutral`, or `hostile`. `visibility` accepts `dm` or `public`. `stat_block` is stored on
the normal custom creature and can contain the same reusable sheet data used by bluDM.

`avatar` may be an HTTP(S) URL or a Vault-relative image path. The local bridge reads a referenced
PNG, JPEG, GIF, or WebP without altering it and sends the bytes with the import. The browser flow
allows those images to be selected alongside the note.

## Dungeon block

`bludm-dungeon` creates or updates a Campaign World Dungeon. Floors become child Floor locations.
Each map may reference an existing image, ask the backend generator for an editable Studio document,
or contain a complete version 1 `dungeon-studio` document.

````markdown
```bludm-dungeon
version: 1
id: sunken-keep
name: The Sunken Keep
summary: A drowned border fortress above an older archive.
parent_location: Brindleford
tags: [ruin, flooded]
floors:
  - id: upper-keep
    name: Upper Keep
    map:
      generator:
        type: classic
        seed: sunken-keep-upper
        tileset: ruins
        width: 36
        height: 28
        room_count: 7
        density: 45
        create_rooms: true
        add_furniture: true
        add_stairs: true
  - id: drowned-archive
    name: Drowned Archive
    map:
      image: Maps/sunken-archive.webp
      width: 1800
      height: 1200
      scale_distance_per_pixel: 0.25
      scale_distance_unit: feet
```
````

Generated maps are preview-only documents until import. They are stored in the existing
`CampaignMap.metadata.studio` format and remain fully editable in Dungeon Studio. Generated Studio
room regions create and link source-managed World Room locations. Re-import updates those rooms and
removes only source-managed floors, maps, rooms, and uploaded assets no longer present in the
structured block. Manually created World records are not reconciled as source content.

An image map requires `image`; width/height default to 1000×700 if omitted. A structured map uses
either `generator` or `studio`, never both. The same Vault-relative path + block ID identity rule
applies to the dungeon, its floors, maps, and generated rooms.

## Browser workflow

1. Open **Import / Export → Markdown**, or use **Import Markdown** in a campaign.
2. Choose the target campaign, a Markdown note, and any referenced images.
3. Preview. No data is written during this step.
4. Review create/update operations, resolved roster entries, warnings, and errors.
5. Import, then open the encounter, NPC, or dungeon in its normal bluDM editor.

An exported encounter is available at `GET /api/encounters/{encounterId}/markdown`. Export produces
a reusable encounter block; it does not modify the source note.

## AI authoring prompt

This short prompt is suitable for an AI working inside a Vault:

> Keep all existing Markdown prose and frontmatter. Add or update version 1 fenced
> `bludm-encounter`, `bludm-npc`, or `bludm-dungeon` YAML blocks only for records needed by bluDM at
> the table. Use stable lowercase IDs and exact existing names. Prefer a seeded dungeon `generator`
> over writing a full Studio cell document by hand. Use Vault-relative paths for images. Do not
> invent bluDM IDs, copy ordinary prose into structured fields unnecessarily, or alter unrelated
> campaign writing.

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
requests begin. Each endpoint import is transactional, and stable source IDs make a retry safe.

Export writes Markdown to standard output, never into the Vault:

```sh
node scripts/bludm-vault.mjs export --encounter ENCOUNTER_ID
```

## External REST API

External endpoints require `Authorization: Bearer bludm_v1_...`.

| Method | Endpoint                                                                 |
| ------ | ------------------------------------------------------------------------ |
| `GET`  | `/api/external/v1/campaigns`                                             |
| `POST` | `/api/external/v1/campaigns/{campaignId}/encounters/markdown/preview`    |
| `POST` | `/api/external/v1/campaigns/{campaignId}/encounters/markdown/import`     |
| `POST` | `/api/external/v1/campaigns/{campaignId}/content/markdown/preview`       |
| `POST` | `/api/external/v1/campaigns/{campaignId}/content/markdown/import`        |
| `POST` | `/api/external/v1/campaigns/{campaignId}/generation/encounter-preview`  |
| `POST` | `/api/external/v1/campaigns/{campaignId}/generation/dungeon-preview`    |
| `GET`  | `/api/external/v1/encounters/{encounterId}/markdown`                     |

Preview and import accept:

```json
{
  "sourcePath": "Triboar Trail/Cairncut Survey Camp.md",
  "markdown": "# The complete note, including one or more bluDM blocks",
  "assets": [
    {
      "path": "Triboar Trail/Maps/camp.webp",
      "filename": "camp.webp",
      "contentType": "image/webp",
      "dataBase64": "..."
    }
  ]
}
```

The browser uses equivalent session-authenticated endpoints without `/external/v1`.

Generation endpoints never persist. Encounter generation accepts `options`, `playerIds`,
`locationId`, and `roll`; dungeon generation accepts the same `settings` object used in a dungeon
block. The returned versioned preview is what the existing UI reviews and, for dungeons, edits.

MCP remains optional: it becomes worthwhile only if agents need tool discovery and multi-step
orchestration that the documented REST endpoints and local bridge do not provide.
