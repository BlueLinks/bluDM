# Manifest Schema

bluDM currently writes v2 split ZIP archives and still reads the original v1 single-file archive for
backwards compatibility.

## v2 Split Archive

New exports use this structure:

```text
manifest.json
graph.json
campaigns/<campaign-key>.json
encounters/<encounter-key>.json
npcs/<npc-key>.json
players/<player-key>.json
locations/<location-key>.json
dungeons/<dungeon-key>.json
shops/<shop-key>.json
maps/<map-key>.json
items/<item-key>.json
spells/<spell-key>.json
roll-tables/<roll-table-key>.json
internal/records.json
assets/...
```

The top-level `manifest.json` is an index and metadata file, not the full export payload:

```json
{
  "format": "bludm.export",
  "version": 2,
  "dataFormat": "bludm.campaign-export",
  "dataVersion": 1,
  "bundleType": "campaign",
  "roots": [{ "type": "campaign", "key": "lost-mine-a1b2c3d4", "label": "Lost Mine" }],
  "files": {
    "campaigns": ["campaigns/lost-mine-a1b2c3d4.json"],
    "graph": ["graph.json"],
    "internal": ["internal/records.json"],
    "assets": ["assets/map.webp"]
  },
  "graph": "graph.json"
}
```

High-level entity files contain portable objects. Internal implementation rows such as stock rows,
map pins, encounter combatants, run effects, and join rows are grouped in `internal/records.json`
so import can restore them without presenting them as standalone export objects. Dungeon child
floors and rooms are stored as location records but are projected under their dungeon container
rather than exposed as selectable bundle roots.

## v1 Legacy Manifest

The v1 manifest shape is a typed JSON document with table-oriented arrays. It is still accepted by
the importer when found as `bludm-export.json`.

Core metadata:

```json
{
  "format": "bludm.campaign-export",
  "version": 1,
  "exportedAt": "2026-07-04T00:00:00Z",
  "sourceAppVersion": "local",
  "bundleType": "campaign"
}
```

Supported bundle types in the portable data schema:

- `everything`
- `campaign`
- `encounter`
- `npc`
- `player`
- `item`
- `spell`
- `map`
- `shop`
- `dungeon`

Scaffolded bundle types:

- `custom`

Primary arrays:

- `campaigns`
- `players`
- `npcs`
- `creatureLinks`
- `creatureActions`
- `creatureRollParts`
- `spellcasting`
- `creatureSpells`
- `spells`
- `spellScaling`
- `spellActions`
- `spellRollParts`
- `items`
- `actionTemplates`
- `actionRollParts`
- `encounters`
- `combatants`
- `runs`
- `runCombatants`
- `runSpellSlots`
- `runEffects`
- `runAlerts`
- `combatLog`
- `locations`
- `locationLinks`
- `npcLocationLinks`
- `locationStock`
- `maps`
- `mapPins`
- `journeys`
- `rollTables`
- `rollTableRows`
- `assets`
- `dependencyGraph`
- `exportStats`

Asset entries include:

```json
{
  "id": "old-asset-id",
  "filename": "avatar.png",
  "contentType": "image/png",
  "byteSize": 12345,
  "path": "assets/001-avatar.png"
}
```

`dependencyGraph` is planning and inspection metadata. It contains graph roots, deterministic
traversal order, human-labelled nodes, relationship edges, reverse dependency edges, counts,
warnings, and audit results. Importers should treat uploaded graph data as inspectable metadata and
recompute it from the table arrays when validating trust-sensitive behavior.

`exportStats` records basic graph/manifest timing and graph size measurements for inspector and
history views.
