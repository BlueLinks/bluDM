# Export Format

bluDM exports are ZIP files. Current exports use the v2 split archive format. The importer still
accepts the original v1 single-file archive for backwards compatibility.

```text
bludm-export.zip
├── manifest.json
├── graph.json
├── campaigns/
├── encounters/
├── npcs/
├── players/
├── shops/
├── dungeons/
├── maps/
├── items/
├── spells/
├── roll-tables/
├── internal/
│   └── records.json
└── assets/
```

`manifest.json` is an index and metadata file. The logical object files hold high-level entities,
`internal/records.json` holds implementation rows, and asset files are referenced by manifest
`assets[].path` entries.

## Versioning

The current archive wrapper is:

```json
{
  "format": "bludm.export",
  "version": 2,
  "dataFormat": "bludm.campaign-export",
  "dataVersion": 1
}
```

Import rejects unknown formats and unsupported versions. Future versions should add migration code
rather than silently accepting incompatible bundles.

The `bundleType` field identifies the dependency rules used to create the manifest. The current
portable data version supports `everything`, `campaign`, `encounter`, `npc`, `player`, `item`,
`spell`, `map`, `shop`, `dungeon`, `journey`, and `roll-table`. `custom` is reserved for a later
arbitrary-selection workflow.

Asset entries include byte size and SHA-256 metadata. Import rejects archives when a listed asset is
missing, has a different size, has an unsupported content type, or does not match the manifest hash.

## Shop And Dungeon Bundles

Shop bundles root at shop-like locations and include stock rows, referenced user items, linked NPC
placements, linked NPC entities, and relevant assets.

Dungeon bundles root at dungeon-like container locations. Descendant floors and rooms are exported
with the bundle, but they are treated as internal location areas in the projected graph rather than
standalone export roots. Maps, pins, encounters linked to descendant locations, linked NPCs, and
assets are included where the graph can discover them.

## Standard Content

Standard content should be referenced by stable source keys or slugs wherever possible. Custom
content is embedded into the bundle.

## Dungeon Studio

Dungeon Studio data remains embedded in `campaign_maps.metadata.studio` and is exported intact.
User-uploaded Studio custom prop data URLs remain part of Studio metadata in this pass.

## Download Cache

Generated ZIP bytes are cached in memory for one hour. Export history persists manifest summary,
counts, and graph metadata after the cached archive expires, but the original ZIP must be generated
again before it can be downloaded.

## Merge Metadata

Merge provenance is not part of the archive contract. It is attached when an archive is imported and
stored in destination metadata fields so repeated imports can be reviewed through history without
changing the exported bundle format.
