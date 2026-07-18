# Campaign World Locations Workspace Spec

Issue: [#100 docs(rp): specify campaign-world locations workspace](https://github.com/BlueLinks/bluDM/issues/100)

Parent: [#29 Add RP and campaign-world management features](https://github.com/BlueLinks/bluDM/issues/29)

Mockups: [campaign-world-locations-mockups.html](./campaign-world-locations-mockups.html)

## Summary

The campaign world workspace gives DMs one campaign-scoped place to create, browse, connect, and run towns, shops, houses, dungeons, floors, rooms, and other useful places. It should start as a structured worldbuilding and session-running surface, then grow cleanly into maps, richer NPC notes, shop inventory, encounter generation, and campaign-wide search.

The core design principle is that a location is flexible. The app can offer helpful type presets, but it must not block a DM from putting a cellar dungeon under a shop, a portal in a bedroom, or a secret room inside a town square.

## Product Goals

- Let a DM maintain nested places with quick navigation from campaign context.
- Keep the current location path visible, for example `Veyrune Reach / Brindleford / Copper Kettle / Cellar / Hidden Shrine`.
- Make relationships visible: child locations, linked exits, NPCs, shops, stock, attached encounters, notes, tags, and future map anchors.
- Support session flow when play changes suddenly, such as a party starting a fight in a shop.
- Preserve existing travel-location behavior while creating a richer campaign-world model.
- Keep RP data campaign-scoped and separate from reusable creature, item, and stat-block library data.

## Information Architecture

### Navigation Placement

Add the workspace inside the campaign detail context as `World` or `Locations`. It should sit near the existing campaign tools for party, encounters, NPCs, travel, and roll tables. The v1 workspace does not need a global top-level nav item.

The campaign page can show a compact overview card:

- Total locations.
- Shops.
- NPC links.
- Open or planned encounters.
- Last updated location.

### Workspace Layout

Desktop layout:

- Left rail: searchable location tree with type and tag filters.
- Main panel: selected location detail.
- Right panel: relationship and action summary for maps, NPCs, encounters, and shop stock when width allows.

Mobile layout:

- Header and path remain visible.
- Tree, details, and related panels become tabs or stacked sections.
- Primary actions remain reachable from the selected location header.

## Domain Model Shape

### Location Record

Each campaign location should include:

- Stable ID.
- Campaign ID and owner permissions.
- Name.
- Type preset: region, settlement, district, street, shop, house, dungeon, floor, room, landmark, wilderness, portal, custom.
- Optional custom type label.
- Parent location ID.
- Sort order within parent.
- Short summary for cards and tree rows.
- Public notes.
- DM-only notes.
- Tags.
- Status: active, archived.
- Created and updated timestamps.
- Future map fields: world map anchor, local map geometry, marker icon, and optional map layer references.

Type presets are display hints, not validation constraints. Any location may contain any other location type.

### Location Path

Every selected location should display a path heading:

```text
Veyrune Reach / Brindleford / Copper Kettle / Cellar / Hidden Shrine
```

Path segments are clickable navigation targets. The current segment is text. Long paths wrap and collapse gracefully:

```text
Veyrune Reach / Brindleford / ... / Cellar / Hidden Shrine
```

The path must be available to encounters, NPC links, shops, and search results so DMs can orient quickly during play.

### Location Links

Location links represent non-hierarchical connections. Examples:

- Road.
- Door.
- Stairs.
- Secret passage.
- Portal.
- Trail.
- Sewer route.
- Line of sight.

Each link should include:

- Source location ID.
- Target location ID.
- Link type.
- Label.
- Direction: one-way or two-way.
- Visibility: public, hidden from players, discovered.
- Travel or access notes.

Links are separate from parent/child nesting. A shop can be inside a town and also have a secret tunnel to a dungeon room.

### Map Readiness

The model should prepare for two map layers:

- World or region map: towns, landmarks, roads, wilderness zones, and travel routes.
- Local map: towns, buildings, shop interiors, dungeon floors, rooms, doors, and room-to-room links.

Do not require maps for v1. Location records should still be useful as pure structured notes. The future map integration should be able to attach pins, shapes, doors, rooms, and paths to existing location IDs without migrating the worldbuilding data again.

## Location Types

### Region

Used for countries, provinces, wilderness areas, or large campaign areas. Often contains settlements, landmarks, and travel routes.

### Settlement

Used for towns, cities, villages, camps, forts, and similar social hubs. Often contains districts, shops, houses, temples, taverns, and hidden dungeons.

### Shop

Used for stores, taverns, inns, services, guild counters, market stalls, and other purchasable services. Shop details are expanded in issue #105, but the workspace must reserve the surface now.

### House

Used for homes, estates, safehouses, rooms rented by the party, noble villas, and hideouts.

### Dungeon, Floor, And Room

Dungeon planning uses the same location model:

- Dungeon: top-level adventure site.
- Floor: optional grouping for levels, wings, or zones.
- Room: playable room, chamber, hallway, trap space, or encounter area.

Room-to-room movement should be modeled with location links, not only child lists, so maps can later use doors, stairs, secret passages, and portals.

### Custom

Custom supports anything the presets miss. The UI should ask for a custom label and still use the same fields and relationship surfaces.

## Primary Workflows

### Browse

The DM can:

- Search by name, path, tag, type, NPC, shop stock, or attached encounter.
- Expand and collapse the tree.
- Filter to a subtree, type, tag, or relationship.
- Select a location and see its path, children, links, notes, NPCs, encounters, and shop data.
- Jump from a related NPC, shop item, or encounter back to the relevant location.

### Create

The create flow should be available from:

- Workspace header.
- Selected location detail.
- Empty child-location section.
- Search empty state.

Fields:

- Name.
- Type preset and optional custom label.
- Parent location.
- Summary.
- Tags.
- Public notes.
- DM-only notes.
- Optional starter relationships: link another location, add NPC link, mark as shop, attach or generate encounter.

The parent picker should support recent locations and path search.

### Edit

The edit flow should allow changing all location fields, including parent. Moving a location updates its path and keeps children, linked locations, NPC links, shop profile, and attached encounters intact.

### Duplicate

Duplication should support recurring rooms, houses, shops, and floor templates. The first implementation can duplicate only the selected location fields without children. Later implementations may add `Duplicate with child locations`.

### Move Or Re-parent

Moving a location changes its parent and sort order. The UI should preview:

- Old path.
- New path.
- Number of child locations affected.
- Related records that will keep pointing to this location.

The backend must prevent cycles.

### Archive And Delete

Prefer archive for records that have children or related records. Deleting should require confirmation and explain what happens to:

- Children.
- Location links.
- NPC links.
- Shop details.
- Attached encounters.
- Future map anchors.

Implementation issues should decide whether hard delete is blocked when related records exist.

## Detail Page Surfaces

### Header

The selected location header shows:

- Location name.
- Type badge.
- Tags.
- Clickable path.
- Primary actions: add child, link location, edit.
- Context action: run or generate encounter here.

### Children

Child cards show:

- Name.
- Type.
- Summary.
- Tags.
- Counts for children, NPCs, encounters, and shop stock where available.

### Linked Locations

Linked locations show:

- Target path.
- Link type.
- Direction.
- Visibility.
- Notes.

### Notes

Public notes and DM-only notes should be visually distinct. DM-only notes are available only to the owner/DM context and must not leak to player-facing views.

### NPC Links

The location page should show linked NPCs from issue #103:

- NPC name.
- Relationship to place: lives here, works here, frequents, owns, staff, enemy, contact, prisoner, custom.
- Public summary.
- DM-only note preview.
- Quick action to open campaign NPC notes.

NPC links should reference campaign-scoped NPC/RP notes, not mutate reusable creature/stat-block records.

### Shop Profile And Stock

If the location is a shop or has shop details, show:

- Owner and staff links.
- Opening or availability notes.
- Restock notes.
- Stock rows: item reference or custom item name, quantity/availability, price override, currency, and DM-only notes.
- Action to add stock or open full shop editor.

Stock should be useful before full inventory automation exists. It should support catalog item links where available and custom placeholders where not.

### Encounters

Attached encounters from issue #104 should show:

- Encounter name.
- Status: planned, possible, active, resolved, archived.
- Difficulty or party-fit summary where available.
- Free-text encounter location preserved from existing encounter data.
- Structured location path.
- Actions: open encounter, attach existing, create encounter here, generate encounter here.

### Map Placeholder

The detail page should include a restrained map placeholder when map integration is unavailable:

- For region or settlement: `Map pin not placed`.
- For dungeon floor or room: `Local map not drawn`.
- Action text can say `Prepare map anchor` or `Add map later`; it should not imply maps are implemented in #100.

## Random Encounter Flow

The workspace should support sudden session changes. Example: the party starts a fight in a shop.

Flow:

1. DM is viewing `Brindleford / Copper Kettle`.
2. DM selects `Generate encounter here`.
3. Dialog opens with location path prefilled and locked by default.
4. DM selects trigger: brawl, guards arrive, monster breaks in, rival crew, custom.
5. DM sets intent: social complication, chase, combat, hazard, mixed.
6. DM chooses party context and difficulty budget when combat is possible.
7. Generator suggests one or more encounter seeds with creatures, NPC involvement, terrain features, complications, and loot/aftermath prompts.
8. DM can save as planned, start now, or attach to the shop without starting.

The first implementation does not need a full generator if the encounter system is not ready. The spec requires the UI and data model to leave a clean action path:

- Location path passed into encounter creation.
- Free-text prompt or trigger stored with generated/created encounter.
- Structured location link stored separately from encounter display text.
- Existing random roll tables can later feed encounter seeds.

## Search And Filters

Campaign-world search from issue #106 should search:

- Location names.
- Paths.
- Type labels.
- Summaries and notes.
- Tags.
- Linked NPC names and relationship labels.
- Shop stock item names.
- Attached encounter names and metadata.

Filters:

- Type.
- Tag.
- Parent subtree.
- Has shop profile.
- Has stock.
- Has NPC links.
- Has attached encounters.
- Has map anchor.
- Archived or active.

Search results should show the location path and relationship badges so a DM can jump directly to the relevant detail.

## States

### Empty

When no locations exist, show a clear first action:

- Create first region.
- Create first town.
- Import or add from travel locations if migration data exists.

### Loading

Loading states should preserve layout skeletons for the tree and detail panel.

### Error

Errors should state what failed and preserve the DM's current unsaved edits where practical.

### No Search Results

Show the current query and filters, with actions to clear filters or create a matching location.

### Unsaved Changes

Location editors should use the existing unsaved-change protection pattern used elsewhere in the frontend.

## Existing Feature Interactions

### Travel Locations

Existing campaign travel locations should remain compatible. Migration should preserve their names and notes. Travel locations can become campaign-world locations with a general type, such as `landmark`, `settlement`, or `custom`, without deleting the travel calculator's saved choices.

### Encounters

Existing encounter free-text location fields must not disappear during migration. New structured links should augment, not replace, the display text until the DM edits it deliberately.

### NPCs And Creatures

Campaign/RP NPC notes should live apart from reusable creature/stat-block data. A campaign NPC note may optionally reference a creature or NPC stat block, but roleplay fields such as accent, residence, secrets, and shop employment are campaign-specific.

### Items And Inventory

Shop stock should reference catalog items where possible but allow custom placeholders. The model should not require player inventory transfer, ration automation, or spell component automation to be implemented first.

### Roll Tables

Roll tables can later provide encounter triggers, shop events, town rumors, restocks, and dungeon room details. The location model should let roll-table output attach to a location as notes, encounters, or generated children.

## Backend Implementation Notes For #101

- Add campaign-scoped location CRUD.
- Support parent/child nesting and explicit location links.
- Enforce ownership and campaign membership on every access.
- Prevent parent cycles.
- Preserve existing travel-location behavior.
- Return path data or enough ancestry data for the frontend to render paths cheaply.
- Add deletion/archive behavior with relationship safety.

## Frontend Implementation Notes For #102

- Build reusable location tree, path heading, relation cards, and location picker components.
- Use route/domain modules rather than a monolithic campaign page file.
- Support desktop and mobile layouts from the start.
- Keep cards compact and scannable.
- Provide create/edit dialogs or panels that can be opened from multiple contexts.

## Acceptance Checklist

- Written spec exists under `docs/ui/`.
- HTML mockups cover list/tree, detail, create/edit, shop, NPC, encounter, and dungeon planning states.
- The model supports future maps for towns and local building/dungeon layouts.
- Path-style headings are required across detail, search, NPC links, shop stock, and encounters.
- Random encounter flow from a current location is specified.
- Interactions with travel, encounters, NPC/creature records, items, inventory, and roll tables are called out.
