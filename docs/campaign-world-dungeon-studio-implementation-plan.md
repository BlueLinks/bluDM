# Campaign World Dungeon Studio Implementation Plan

## Summary

Dungeon Studio will be a Campaign World tool for drawing grid-based encounter maps and binding the drawn structure back to existing World locations. The first implementation should focus on Dungeon/Floor locations, but the data model and UI should be reusable enough to later support shops, homes, keeps, caves, streets, towns, and other local maps.

This plan expands `docs/campaign-world-dungeon-studio-plan.md` into an implementation sequence that can be worked through incrementally. UX targets and wireframes live in `docs/campaign-world-dungeon-studio-mockups.md`.

## Research Notes

### Dungeon Scrawl

Source reviewed: `https://app.dungeonscrawl.com/`

Observed patterns worth borrowing:

- Layer-first editing model.
- Presets/styles such as classic dungeon hatching, rough cavern, water, lava, and world-building presets.
- Tool modes for rectangle/path drawing, erase mode, snap toggles, roughness, corner radius, grid styling, shadows, opacity, and blend modes.
- Random dungeon generation as a starting point, then manual customization with existing tools.
- Image/object libraries for props and environment dressing.

Takeaways for bluDM:

- Start with fewer tools, but keep the mental model: map layers, visible styles, draw/erase, and random generation as a draft starter.
- Keep generated structures editable by the same tools as hand-drawn structures.
- Terrain like water/lava/cliffs should be first-class layers, not one-off notes.

### Tiled Map Editor

Source reviewed: `https://doc.mapeditor.org/en/stable/manual/introduction/`

Observed patterns worth borrowing:

- Tile layers for grid painting.
- Object layers for non-grid annotations and entities.
- Tilesets, terrains, custom properties, templates, worlds, and export formats.
- Stamp brush, line/circle tools, selection tools, and automatic terrain transitions.
- Supports rectangular tile layers while also supporting richer object placement.

Takeaways for bluDM:

- Separate tile/cell layers from object/entity layers.
- Keep custom metadata on cells, rooms, objects, and maps.
- NPCs, doors, room labels, and markers fit better as object/entity layers than terrain cells.
- Terrain transitions can be deferred, but terrain layer data should be shaped so auto-transitions can be added later.

### rot.js

Sources reviewed:

- `https://github.com/ondras/rot.js`
- `https://ondras.github.io/rot.js/manual/#map/dungeon`
- `https://ondras.github.io/rot.js/manual/#map/cellular`
- npm metadata: `rot-js` v2.2.1, BSD-3-Clause

Observed capabilities:

- Roguelike toolkit with dungeon, maze, and cellular automata generators.
- Dungeon generators include Digger, Uniform, and Rogue.
- Dungeon rooms can be retrieved with `getRooms()` and corridors with `getCorridors()`.
- Room door data can be retrieved and rendered.
- Cellular generator supports cave-like maps, repeated generations, and connecting regions.

Takeaways for bluDM:

- `rot-js` is a strong candidate for random starter generation.
- Digger/Uniform can seed classic dungeon structures.
- Cellular can seed caves/caverns.
- Generated rooms/corridors must be converted into our studio document format, not stored as rot.js-specific data.
- License is compatible enough to consider, but still review before adding as a dependency.

### Konva / react-konva

Source reviewed: `https://konvajs.org/docs/react/index.html`

npm metadata:

- `konva` v10.3.0, MIT
- `react-konva` v19.2.5, MIT

Observed capabilities:

- React bindings for Canvas.
- JSX components for canvas primitives.
- Shape events, drag/drop, transforms, custom shapes, images, undo/redo examples, canvas export.

Takeaways for bluDM:

- Good candidate if SVG performance becomes a problem or if object-heavy editing becomes hard with plain SVG.
- Adds two dependencies and another rendering mental model.
- Not needed for initial data-model and algorithm work.

### PixiJS

Source reviewed: `https://pixijs.com/`

npm metadata:

- `pixi.js` v8.19.0, MIT

Observed capabilities:

- Fast 2D WebGL renderer.
- Suitable for complex/large graphical scenes.

Takeaways for bluDM:

- More rendering power than needed for MVP.
- Consider only if map sizes, effects, or performance requirements outgrow SVG/Konva.

### tldraw

npm metadata:

- `@tldraw/tldraw` v5.1.1, custom license (`SEE LICENSE IN LICENSE.md`)

Takeaways for bluDM:

- Powerful drawing editor, but likely too broad and license needs careful review.
- Not recommended for MVP because Dungeon Studio needs grid-first semantic data rather than a general drawing canvas.

## Dependency Recommendation

Start with no rendering dependency and implement the MVP editor using SVG and React.

Add `rot-js` only when implementing random generation if our own algorithms would add unnecessary complexity. Use it as a generation helper, then convert output to our own `DungeonStudioDocument` shape.

Defer Konva/react-konva until one of these becomes true:

- SVG performance is unacceptable for target grid sizes.
- Object manipulation, transforms, or canvas export become painful.
- We need canvas-specific effects or rendering scale.

Do not use PixiJS or tldraw for MVP.

## Architecture Principles

- Campaign World remains canonical for locations, rooms, NPCs, encounters, notes, links, and shops.
- Dungeon Studio owns geometry, map layers, and visual annotations.
- Studio data should be versioned and stored on existing `CampaignMap.metadata.studio` for MVP.
- Generated structures are drafts; users can edit them manually.
- Rooms are not just shapes. Room regions should link to `CampaignLocation` records.
- NPC placements should link to existing campaign NPCs, not duplicate NPC records.
- The same document model should eventually support shop/home/town maps.

## Proposed Data Contract

Store on `CampaignMap.metadata.studio`.

```ts
export type DungeonStudioDocument = {
  version: 1;
  kind: "dungeon-studio";
  scope: "dungeon" | "floor" | "shop" | "home" | "town" | "custom";
  tileset: DungeonStudioTilesetKey;
  grid: DungeonStudioGrid;
  layers: DungeonStudioLayer[];
  rooms: DungeonStudioRoomRegion[];
  entities: DungeonStudioEntity[];
  generation?: DungeonStudioGenerationMetadata;
};

export type DungeonStudioGrid = {
  width: number;
  height: number;
  cellSizeFeet: number;
};

export type DungeonStudioTilesetKey =
  | "dungeon"
  | "stone"
  | "cave"
  | "castle"
  | "cellar"
  | "forest"
  | "sewer"
  | "house"
  | "ruins"
  | "temple"
  | "crypt"
  | "shop"
  | "home"
  | "town";
```

Tileset/theme keys describe visual treatment, not location type. A Dungeon location might use `cave`, `ruins`, or `temple`; a Room region can override the parent theme; and individual painted cells can later carry tile overrides without changing walls, doors, room identity, or furniture placement.

### Cell Layers

```ts
export type DungeonStudioCellLayer = {
  id: string;
  name: string;
  kind: "cells";
  visible: boolean;
  opacity: number;
  cellKind: "floor" | "water" | "cliff" | "chasm" | "rubble" | "hazard" | "road" | "grass";
  themeKey?: DungeonStudioTilesetKey;
  cells: GridCell[];
};
```

Use this for:

- Floors.
- Cavern floors.
- Water.
- Chasms/cliffs.
- Difficult terrain/rubble.
- Hazards.
- Future outdoor/town ground layers.

### Edge Features

```ts
export type DungeonStudioEdgeFeature = {
  id: string;
  cell: GridCell;
  direction: "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";
  kind: "wall" | "door" | "secret-door" | "window" | "gate" | "cliff-edge";
  state?: "open" | "closed" | "locked" | "barred" | "hidden";
};
```

Use edge features for walls, doors, diagonal walls, cliff boundaries, windows, and gates.

### Room Regions

```ts
export type DungeonStudioRoomRegion = {
  id: string;
  locationId?: string;
  label: string;
  color: string;
  themeKey?: DungeonStudioTilesetKey;
  cells: GridCell[];
};
```

Room regions can create or link Campaign World Room locations.

### Entity/Object Layer

```ts
export type DungeonStudioEntity = {
  id: string;
  kind: "npc" | "stairs" | "label" | "marker" | "light" | "prop" | "trap";
  cell: GridCell;
  xOffset?: number;
  yOffset?: number;
  rotation?: 0 | 90 | 180 | 270;
  linkedId?: string;
  assetKey?: string;
  label?: string;
  metadata?: Record<string, unknown>;
};
```

For NPC placement:

- `kind: "npc"`
- `linkedId: creature.id`
- `cell` stores grid position.
- Use existing campaign NPC avatar/name in rendering.

## Generator Types

Generators should create editable studio documents.

### MVP Generators

1. Classic dungeon
   - Rectangular rooms and corridors.
   - Candidate algorithm: `rot-js` Digger or Uniform.
   - Output: floor cells, wall edges, room regions, optional doors.

2. Cave/cavern
   - Cellular automata.
   - Candidate algorithm: `rot-js` Cellular or local cellular implementation.
   - Output: organic floor cells, cliff/chasm/water optional layers later.

3. Castle/keep
   - Symmetric rooms, halls, courtyards.
   - Likely custom lightweight algorithm.
   - Output: rectilinear floors/walls/doors.

### Later Generators

- Shop/home floor plans.
- Tavern/common room + rooms.
- Town blocks/streets.
- Sewer networks.
- Ruins with missing floor/chasm patches.
- Encounter dressing prompts: NPCs, hazards, loot, lighting.

### Generator UX

Generation should be a panel, not a separate workflow.

User can choose:

- Generator type.
- Tileset.
- Size.
- Seed.
- Density/room count.
- Corridor winding.
- Cave openness.
- Water/chasm chance.
- Door chance.
- Whether to create room regions automatically.

After generation:

- Show preview.
- User can regenerate with same settings/seed.
- User can apply to current map as:
  - replace current structure, or
  - add to new layer.

## NPC Placement

NPC placement should be implemented as an entity layer.

MVP behavior:

- Add `NPC` tool.
- Pick from campaign NPCs.
- Click a grid cell to place.
- Render avatar/initials on the grid.
- Store entity with `linkedId` to creature.
- Clicking NPC entity opens a small inspector:
  - NPC name.
  - role/notes from existing location link if present.
  - quick action to open NPC sheet.
  - quick action to connect NPC to the current Room if a room region is under the NPC.

Important rule:

- Placing an NPC on a room cell should suggest linking them to the Room location, but should not silently mutate location links without confirmation.

## Caverns, Floors, And Cliffs

Support cavern floors as floor cells with cave tileset styling.

Support cliffs/chasm in two complementary ways:

1. Cell terrain
   - `cellKind: "chasm"` or `"cliff"` layer marks blocked/void terrain.

2. Edge features
   - `kind: "cliff-edge"` marks the dangerous boundary between floor and drop.

This lets a map represent:

- A cavern floor with a hole/chasm inside it.
- A cliff boundary along one side of a path.
- Raised/lowered terrain using optional elevation metadata later.

MVP should include chasm/cliff cells and cliff-edge rendering if it does not slow down structure tools. Full elevation can wait.

## UI Layout

Suggested Dungeon Studio shell:

```text
┌────────────────────────────────────────────────────────────┐
│ Header: breadcrumb, map name, save state, return to World  │
├───────────────┬──────────────────────────────┬─────────────┤
│ Tool palette  │ Canvas / grid editor         │ Inspector   │
│ - Structure   │ - pan/zoom                   │ - selected  │
│ - Terrain     │ - hover cell                 │ - layer     │
│ - Rooms       │ - room overlays              │ - generator │
│ - NPCs        │ - entity markers             │ - settings  │
├───────────────┴──────────────────────────────┴─────────────┤
│ Layer bar / room coverage / warnings                       │
└────────────────────────────────────────────────────────────┘
```

Keep repeated layout pieces in `frontend/src/components/layout` if they become shared.

## Planned Dungeon Creation Workflow

Dungeon Studio should support a flexible DM workflow rather than a forced wizard. The UI can suggest a natural order, but every tool should remain available so the DM can change theme, tiles, rooms, or objects at any point.

Recommended mental model:

1. **Floor plan / layout first**
   - Paint floor cells manually, draw shapes, or later generate a starter layout.
   - Add or drag walls, doors, cliff edges, and basic terrain.
   - Wall drag should be constrained to the dominant axis so horizontal drags only place horizontal wall segments and vertical drags only place vertical wall segments. Diagonal walls remain explicit through diagonal mode.
2. **Room definition and editing**
   - Select, brush, or fill floor cells into room regions.
   - Link a region to an existing Campaign World Room or create a new Room location from the region.
   - Support renaming, recoloring, unlinking, and reassigning room cells without changing the structural floor plan.
3. **Terrain / map tile selection**
   - The DM can select or change visual tiles/themes before, during, or after drawing rooms so the map is visually understandable while building.
   - Theme changes should not destroy structure, room links, furniture, or encounters.
4. **Stairs and multi-floor thinking**
   - Stairs should be placeable objects/entities with a direction or target floor reference.
   - A floor should be able to link stairs to another Floor location when the target exists, or hold an unresolved stair marker until the next floor is created.
5. **Furniture / object placement**
   - Objects are a visual/object layer on top of floors, terrain, walls, and room regions.
   - Placing an object should not mutate Campaign World records unless the object is explicitly linked to something canonical such as an NPC, trap note, or encounter hook.
6. **Save / exit / return to World**
   - Save should sit near the Return to World action in the studio header so leaving and persistence are treated as one decision area.
   - If the user clicks Return to World with unsaved changes, prompt with:
     - **Save and exit**
     - **Exit without saving**
     - **Cancel / stay**
   - Match the existing character/NPC creator unsaved-changes behavior where practical.
   - Return should preserve the Campaign World location context.

## Tiles, Themes, And Visual Layers

Dungeon Studio should treat map visuals as layered styling rather than hardcoding a dungeon appearance into the structural model.

Theme keys to plan for:

- `cave`
- `castle`
- `cellar`
- `forest`
- `sewer`
- `house`
- `dungeon` / `stone`
- `ruins`
- `temple`
- `crypt`

Theme application levels:

1. **Global dungeon/floor theme**
   - Stored on `DungeonStudioDocument.tileset`.
   - Defines default floor, wall, terrain, door, and object palette styling.
   - Best first implementation target.
2. **Per-room theme**
   - Stored as optional `DungeonStudioRoomRegion.themeKey`.
   - Useful for mixed environments such as a stone dungeon with a crypt wing or flooded sewer room.
   - Should override visuals only for room floor cells and suggested object palette, not room identity.
3. **Per-tile / painted-area theme**
   - Stored on visual/tile layers or cell metadata, separate from structure layers.
   - Useful for rugs, cracked floors, moss, forest patches, lava, sewer sludge, rubble, or room dressing.
   - Should be introduced after global/per-room themes to avoid UI overload.
4. **Separate visual layer**
   - Keep visual tile paint separate from walls, doors, room regions, and furniture objects.
   - A tile/theme paint operation should be undoable and should not remove walls or room links.

Implementation note: start with SVG/CSS pattern fills or simple color/pattern variants before bundling large image tile atlases. This keeps the editor useful while asset licensing and sprite rendering are settled.

## Furniture And Object Catalog Plan

Object placement should use a catalog with stable object keys. The first catalog should prioritize common DM map dressing rather than exhaustive decoration.

Initial object categories:

- tables
- chairs
- chests
- barrels
- crates
- beds
- bookshelves
- rugs
- torches / light sources
- doors / gates as edge features or placeable gate props when needed
- statues
- traps
- stairs

Object behavior:

- Place on a cell with optional offset and rotation.
- Render above floor/terrain and below NPC/label overlays where practical.
- Allow move, rotate, duplicate, delete, and inspect.
- Store object `assetKey` and minimal metadata in `DungeonStudioEntity`.
- Keep traps as visible/hidden object entities with optional notes; do not force encounter creation.
- Keep stairs as first-class object entities that can later link floors.

### Asset Research Notes

Do not add third-party assets to the repository unless the license and redistribution terms are clear. Prefer CC0/public domain/MIT or explicitly free-for-commercial-use assets. Keep source and license metadata beside bundled assets if assets are added later.

| Source                                                                                                 | Coverage                                                                   | License signal found                                                                                                 | Attribution                                                     | Bundle with app?                                                                                     | Notes                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kenney assets (`https://kenney.nl/assets`, support/license page)                                       | Broad 2D/3D game assets, including dungeon/texture packs and props         | Kenney support page states game assets on asset pages are public domain licensed (CC0) and commercial use is allowed | Not required; credit “Kenney” optional; logo should not be used | Likely yes, after checking the specific downloaded pack's included license file                      | Strong candidate for clean, legally simple starter assets. Visual style may need filtering to match bluDM.                                                |
| Dungeon Crawl 32x32 tiles on OpenGameArt (`https://opengameart.org/content/dungeon-crawl-32x32-tiles`) | Large fantasy roguelike tileset: terrain, walls, items, monsters, features | OpenGameArt page lists `License(s): CC0`; page says no attribution required, courtesy links requested                | Not required under CC0; courtesy link recommended               | Likely yes, with source/license metadata retained                                                    | Very complete but pixel-art style may not match the current SVG map look. Large sheet should be curated before bundling.                                  |
| 0x72 16x16 DungeonTileset II (`https://0x72.itch.io/dungeontileset-ii`)                                | Dungeon tiles, props, traps, doors, with community extensions              | Page text says “You can use this tileset for whatever you like (CC-0)” and credit is not necessary                   | Not required; creator appreciates credit                        | Likely yes for the base pack, after retaining page/license evidence; extensions need separate review | Good candidate for small object/tile prototypes. Treat linked extensions as separate candidates, not automatically covered.                               |
| OpenGameArt individual packs                                                                           | Potential furniture, ruins, sewer, crypt, and theme-specific tiles         | Varies by pack                                                                                                       | Varies                                                          | Candidate only until each pack is reviewed                                                           | Use only packs with clear CC0/public domain/permissive licenses. Avoid mixing attribution-heavy assets until attribution UI/package metadata is designed. |

Asset risks:

- Some “free” assets are free only for personal use or require attribution/share-alike; do not bundle those without explicit approval.
- Asset packs often include mixed contributors or extensions with different licenses.
- Pixel-art assets may clash with the current clean SVG style; curated subsets or a consistent icon style may be needed.
- Bundled assets increase app size; lazy-load catalog sprites by theme/category.

### User-Uploaded Assets

Plan user uploads as a later phase, not part of the bundled catalog MVP.

- Allow image upload for custom props/objects with per-campaign scope.
- Store asset metadata: name, category, dimensions, default scale, source/license notes entered by the user.
- Let users mark assets as private campaign assets.
- Do not redistribute user uploads beyond their self-hosted instance.
- Add a simple asset manager only after core object placement works.

## Random Dungeon Generation Plan

Random generation should be a future feature that creates an editable draft, not a separate immutable map type.

Generation targets:

- room layouts and irregular areas
- corridors and loops
- doors and secret-door candidates
- stairs up/down and potential floor connections
- themed tiles based on selected global/per-room theme
- furniture/object dressing by room type
- treasure, trap, and encounter hooks as optional notes/prompts
- seed-based reproduction

Generator UX:

- Open a generator panel from the editor; do not replace the editor.
- Choose generator type, theme, size, seed, density, room count, corridor winding, cave openness, door chance, and whether to create room regions.
- Preview output before applying.
- Apply as replace-current-draft or add-to-current-map where feasible.
- Generated output uses the same floor, edge, room, terrain, and object layers as manual editing.
- Store generation metadata (`seed`, generator type, settings) so a result can be reproduced or audited.

Suggested generation phases:

1. Small local rectangular room + corridor generator with deterministic seed and editable output.
2. Cave/cellular generator for cave themes.
3. Theme-aware tile dressing.
4. Furniture/object placement by room role.
5. Treasure/encounter hook prompts linked to Campaign World encounter creation.

Dependency note: `rot-js` remains a candidate for dungeon/cellular generation if dependency review is approved. A minimal local generator may be enough for the first deterministic proof of concept.

## Campaign World Dungeon Presentation Plan

Campaign World should show dungeons as useful world places without turning the world screen into a dense dungeon dashboard.

Creation and attachment model:

- A user can create a Dungeon as an independent top-level location.
- A user can attach or move that Dungeon under a Region, Town/Settlement, Landmark, Cave, Ruin, Building, or other parent later using existing location parent editing.
- A Region/Town/Location child list can include Dungeon entries alongside settlements, landmarks, buildings, and shops.
- Dungeon Studio opens from the Dungeon/Floor entry, not from a separate global workspace.

Dungeon metadata to surface in Campaign World:

- name
- type/theme, e.g. cave, crypt, ruins, temple, stone dungeon
- floors and rooms summary
- prep/status summary only when useful: unlinked rooms, missing encounters, unmapped floors, unsaved studio changes if known
- notes summary
- linked encounters count and next runnable encounter actions
- map/studio entry point

Avoid clutter:

- Do not show every internal map count or tile/layer count in primary world cards.
- Keep advanced studio metadata inside expandable details or inside Dungeon Studio.
- Child lists should show the dungeon name, type/theme, short summary, and a clear Open/Open Studio action where context supports it.
- Dungeon profile pages can prioritize floors, rooms, encounters, maps/studio, notes, then advanced details.
- Floor profile pages can prioritize rooms, encounters, stairs/exits, studio map, notes.
- Room profile pages can prioritize room prep, encounters, notes, exits, map position, then advanced details.

## Implementation Phases

### Phase 0: Contract And Tests

Status: Completed as Phase 1 support. The frontend now has the versioned document contract, metadata parser/serializer, safe defaults, map-input helper, cell/edge key helpers, and focused unit tests.

Deliverables:

- Add frontend domain file for studio document types and helpers.
- Add parser/normalizer for `CampaignMap.metadata.studio`.
- Add serializer that strips transient UI state.
- Add fixtures for dungeon, cave, cliffs, NPC entities, and room regions.
- Add tests for cell keys, edge keys, diagonal edge normalization, and room coverage.

Acceptance criteria:

- Can parse an empty/missing studio document into safe defaults.
- Can serialize and round-trip a sample studio document.
- Invalid/stale metadata does not crash the World page.

### Phase 1: Route And Read-Only Preview

Status: Completed. Dungeon/Floor profiles now expose `Open Dungeon Studio`, the location-scoped studio route creates or reuses a studio map, reads/writes `CampaignMap.metadata.studio`, and renders the first read-only shell with tool rail, canvas preview, inspector, save action, and bottom status.

Deliverables:

- Add location-scoped route for studio.
- Add `Open Dungeon Studio` action for Dungeon/Floor profiles.
- Create or find a studio map for the selected Dungeon/Floor.
- Render a read-only grid preview from studio metadata.
- Add save plumbing through existing `updateCampaignMap` API.

Acceptance criteria:

- Dungeon/Floor page can open studio.
- Studio can load an existing map's metadata.
- Empty map shows a useful starter state.
- Returning to World preserves selected location.

### Phase 2: Manual Structure Drawing

Status: Completed. The SVG canvas now supports floor paint/erase, orthogonal wall toggles, diagonal wall toggles, door placement/removal, selected cell/edge feedback, undo/redo history, dirty-state badges, and save/reload persistence through `CampaignMap.metadata.studio`.

Deliverables:

- Tool palette: floor brush, erase floor, wall edge, diagonal wall, door.
- Click/drag floor painting.
- Edge hit zones for walls/doors.
- Undo/redo stack.
- Dirty state and save action.

Acceptance criteria:

- User can draw a small dungeon manually.
- User can place orthogonal and diagonal walls.
- User can place doors on edges.
- Save/reload preserves structure.

### Phase 3A: Shape Drawing And Auto-Walls

Status: Completed. The SVG editor now supports rectangle/square and round/oval shape tools with live previews, Escape cancellation, grid-cell persistence, selected-region feedback, undo/redo history, and an undoable Add outer walls action that uses the existing wall edge model without replacing existing door openings.

Deliverables:

- Shape drawing tools for quickly creating room and area footprints:
  - rectangle room tool.
  - square room tool if distinct/useful in the UI.
  - circle/round room tool.
  - ellipse/oval room tool.
  - freeform floor brush remains available.
  - erase remains available.
- Rectangles and squares snap to grid cells.
- Circles and ellipses approximate occupied grid cells from a grid-aligned drag box.
- Shape tools create floor/room area cells using the existing floor-cell layer model.
- Do not introduce a separate geometry persistence model unless a later phase clearly justifies it.
- Live drag preview for shape tools.
- Common drawing-app behavior:
  - select a shape tool.
  - click/touch a start cell.
  - drag to preview.
  - release to apply.
  - Escape cancels the active drawing.
  - undo/redo treats each completed shape as one action.
  - active tool state is clear.
  - keyboard accessibility is preserved where practical.
  - mobile/touch behavior is considered through pointer events and grid snapping.
- `Add outer walls` action/tool:
  - wraps outside walls around a selected floor/room region when a region selection exists.
  - otherwise wraps outside walls around all painted floor cells.
  - uses the existing wall edge model.
  - avoids replacing existing door openings where practical.
  - is undoable.

Acceptance criteria:

- User can draw rectangle/square and circle/ellipse floor areas with preview.
- Escape cancels a pending shape without changing the document.
- Completed shapes are stored as floor cells and survive save/reload.
- Add outer walls generates boundary wall edges around the selected shape or all floor cells.
- Existing doors are not unnecessarily overwritten by generated walls.
- Shape drawing and auto-wall actions are undoable/redoable.
- Existing brush, erase, wall, diagonal wall, and door tools continue to work.

### Phase 3B: Terrain And Cliffs

Status: Completed. Dungeon Studio now supports terrain layer tools for water, chasm, and cliff cells; terrain erasing that preserves structure; cliff-edge features using the existing edge model; distinct SVG rendering for terrain and cliff edges; terrain/cliff inspector counts; save/reload persistence; basic cave tileset floor styling; and a map-editor-style workflow with select/floor/terrain/delete modes, brush-like terrain/delete strokes, and wall placement validation.

Deliverables:

- Terrain layer mode.
- Water cells.
- Chasm/cliff cells.
- Cliff-edge feature support.
- Basic cave tileset styling.
- Map-editor-style mode workflow for Select, Floor, Terrain, and Delete.
- Brush-like floor, terrain, and delete strokes with undoable drag operations.
- Wall placement validation so walls are only created adjacent to existing floor or terrain geometry.

Acceptance criteria:

- User can mark floor holes/chasms and water.
- Terrain renders distinctly from normal floor.
- Terrain survives save/reload.

### Phase 4: Room Layer Editor

Status: Completed. Dungeon Studio now has room mode with floor-cell room selection, room brush/eraser tools using the shared brush workflow, shared single/rectangle/circle brush shapes across floor/room/terrain/delete where applicable, clearer delete targets, room fill preview/fill for orthogonal wall/door-bounded areas that protects existing rooms by default, room-region creation from selections, room naming/recoloring/theme overrides, Campaign World Room linking and create/link actions, a compact Room Workflow panel, implicit rendered boundary walls around exposed floor edges, locked wall strokes that draw one continuous horizontal, vertical, or snapped diagonal segment with hover/drag preview, right-click contextual erase, middle-mouse panning, room overlays, room counts, unassigned floor coverage status, a consolidated undo/redo/zoom toolbar, a left primary tool palette, contextual inspector details, simplified non-decorative editor chrome, canvas wheel zoom, undo/redo integration, and save/reload persistence through the existing document model. Diagonal-aware fill is intentionally deferred until diagonal walls become room-boundary blockers throughout the editor.

Deliverables:

- Room mode with cell selection.
- Create room region from selected cells.
- Contextual room naming, done/start-next, and delete controls.
- Shared brush shape controls for single-cell, rectangle, and circle application.
- Orthogonal room fill based on floor cells, manual walls, doors, and implicit floor boundaries.
- Link region to existing Room location.
- Create new Room location from selected cells.
- Show room labels and colors.
- Show unassigned floor-cell count.

Acceptance criteria:

- User can draw structure first, then define rooms by cells.
- Creating a room region can create a Campaign World Room.
- Existing room locations can be linked to regions.
- Dungeon/Floor child list still reflects canonical Room locations.

### Forward Phase 1: Core Dungeon Studio UX Fixes

Status: Completed. Save now sits beside Return to World, the canvas toolbar only owns undo/redo/zoom/reset, Return to World prompts for Save and exit / Exit without saving / Cancel when dirty, room regions can create/link Campaign World Room locations, room color controls are available, unassigned floor coverage is surfaced, and dominant-axis wall/cliff drag regression tests are locked in.

Deliverables:

- Move Save next to Return to World in the studio header.
- Add unsaved-changes prompt on Return to World:
  - Save and exit.
  - Exit without saving.
  - Cancel / stay.
- Match existing character/NPC creator navigation-guard behavior where practical.
- Keep the existing canvas toolbar for undo/redo/zoom/reset, but avoid duplicating Save.
- Finish room-region linking to Campaign World Room locations.
- Add room color controls.
- Refine unassigned floor-cell coverage handling.
- Add diagonal-aware room fill follow-up if it can be done without destabilizing room editing.
- Keep wall/cliff drag constrained to dominant axis and add focused tests around horizontal/vertical wall strokes.

Acceptance criteria:

- Returning to World with no changes exits immediately.
- Returning to World with unsaved changes prompts and honors all three choices.
- Saving then exiting persists the studio document and returns to the same Campaign World location.
- Room regions can be linked to Room locations without losing existing floor/wall/terrain data.
- Horizontal wall/cliff drags do not create vertical segments; vertical drags do not create horizontal segments.

### Forward Phase 2: Tiles And Themes

Status: Completed. The document contract and parser support all planned theme keys, the inspector exposes global theme selection, lightweight SVG fills render theme differences, room regions can store optional theme overrides, and theme changes are independent from structure, rooms, terrain, and objects.

Deliverables:

- Add global dungeon/floor theme selection for cave, castle, cellar, forest, sewer, house, dungeon/stone, ruins, temple, and crypt.
- Render theme differences using lightweight SVG/CSS colors/patterns first.
- Store selected global theme in `DungeonStudioDocument.tileset`.
- Add optional per-room theme override in the room inspector.
- Keep theme changes independent from walls, doors, rooms, terrain, and objects.

Acceptance criteria:

- A DM can change the visual theme at any point while editing.
- Theme changes survive save/reload.
- Existing documents without newer theme keys parse safely.
- Room theme overrides are visually clear but not required.

### Forward Phase 3: Furniture/Object Catalog

Status: Completed. Dungeon Studio has an object mode and reusable catalog covering tables, chairs, chests, barrels, crates, beds, bookshelves, rugs, torches, gates, statues, traps, and stairs. Objects are stored as normal `DungeonStudioEntity` records, render above map geometry, can be placed/selected/rotated/duplicated/moved/deleted, and use built-in SVG/text glyphs so no third-party asset licensing is introduced.

Deliverables:

- Add object tool mode and catalog panel.
- Start with tables, chairs, chests, barrels, crates, beds, bookshelves, rugs, torches, doors/gates, statues, traps, and stairs.
- Implement place, move, rotate, duplicate, delete, and inspect.
- Store objects as `DungeonStudioEntity` with `kind`, `assetKey`, cell position, offsets, rotation, label, and metadata.
- Use simple built-in SVG glyphs or a small vetted CC0 asset subset first.
- Record source/license metadata for any bundled asset pack.

Acceptance criteria:

- Objects render above floor/terrain and do not affect room/floor/wall data.
- Object operations are undoable and survive save/reload.
- No third-party asset is bundled without clear license evidence.

### Forward Phase 4: Campaign World Dungeon Integration

Status: Completed with the existing Campaign World location model and focused dungeon presentation. Dungeons can be created as top-level locations through the World editor, moved/attached later through parent editing, opened from Dungeon/Floor/Room map cards where context exists, and room regions can create/link canonical Room children. Floors remain nested child locations inside a Dungeon, while Rooms remain canonical deep-linkable locations but are hidden from the global overview tree unless selected or searched so they stay in dungeon/floor context. Technical studio metadata stays inside Dungeon Studio; Campaign World shows actual cropped studio previews, structure summaries, and entry points without duplicating dungeon-map editing controls.

Deliverables:

- Allow creating a Dungeon as an independent top-level Campaign World location.
- Make attaching/moving a Dungeon under a Region/Town/Landmark/Building/Cave/Ruin straightforward through existing location editing.
- Show Dungeon entries in child lists with name, type/theme, short summary, and clear open/profile actions.
- On Dungeon/Floor profiles, surface Open Dungeon Studio without crowding profile cards.
- Show useful dungeon metadata: floors, rooms, notes, linked encounters, and prep gaps.
- Keep technical studio data in details or inside Dungeon Studio.

Acceptance criteria:

- A DM can create a dungeon without first choosing a parent.
- A DM can later attach that dungeon to another world entity.
- Dungeon/Floor/Room profiles prioritize sections according to prep workflow, not generic counts.
- Campaign World remains readable on desktop and narrow layouts.

### Forward Phase 5: Multi-Floor And Stairs

Status: Completed for the foundation. Stairs are first-class object entities with up/down labels and unresolved state, and selected stair objects can link to existing Floor locations without requiring the target floor to exist. Creating a new Floor directly from a stair marker remains intentionally deferred as a convenience workflow.

Deliverables:

- Add stairs object/entity placement.
- Support stairs up/down labels, notes, and unresolved target state.
- Link a stair to another Floor location when available.
- Add floor navigation from Dungeon Studio and Campaign World profiles.
- Support creating a new Floor from a stair marker as a later convenience.

Acceptance criteria:

- Stairs can be placed and linked without requiring the target floor to exist immediately.
- Linked stairs make cross-floor navigation clear in Dungeon Studio and Campaign World.
- Floor creation/linking does not duplicate Room or encounter records.

### Forward Phase 6: Random Generation

Status: Completed for the local deterministic generator and first-run workflow. A blank studio map now starts with a choice between a fully custom dungeon and a randomly generated dungeon. Random generation shows controls and a preview before entering the full editor, supports seeded classic-room and cave generation, room regions, outer walls, stairs, themed floor documents, optional furniture placement, generation metadata, and normal editable output. Destructive generation inside an existing dungeon is not exposed; preview/apply-as-new-layer and encounter/treasure prompt generation are intentionally deferred until a clear workflow need emerges.

Deliverables:

- Add generator panel after manual editing and themes are stable.
- Implement deterministic seed handling.
- Generate classic room/corridor maps and cave maps.
- Generate doors, stairs, themed floors, optional room regions, and optional furniture/treasure/encounter hooks.
- Convert output to normal editable studio layers.

Acceptance criteria:

- Same seed/settings reproduce the same output.
- Generated output can be edited manually with existing tools.
- Generation can be previewed before replacing or adding to current map.
- Generated room regions can link to Campaign World Room locations.

### Forward Phase 7: User-Uploaded Assets

Status: Completed for metadata-backed studio uploads. Custom image props can be uploaded into the studio document, appear in the same object catalog as built-ins, store source/license notes, remain private to the campaign instance/map metadata, and can be placed/moved/removed like bundled glyph objects. A dedicated backend asset manager is intentionally deferred until metadata-size and reuse needs justify it.

Deliverables:

- Add campaign-scoped custom asset upload after object placement is stable.
- Store asset name, category, dimensions, default scale, and user-entered source/license notes.
- Let uploaded assets appear in the object catalog.
- Keep uploaded assets private to the self-hosted instance/campaign.

Acceptance criteria:

- User-uploaded assets can be placed, moved, and removed like bundled catalog objects.
- Uploaded asset metadata survives reload.
- The app does not imply that user-uploaded assets are redistributable.

## Open Questions And Risks

- Asset licensing: even “free” asset packs can include attribution, non-commercial, share-alike, or mixed-contributor terms. Bundle only reviewed packs with clear license files.
- Visual consistency: pixel-art assets may clash with the current clean SVG style. The current implementation uses distinct in-repo vector placeholders. Optional generated, artist-made, or third-party assets should be added later only with a clear repo policy and license/source metadata.
- Metadata size: object-heavy maps and image tile layers can grow `CampaignMap.metadata`; monitor payload size before committing to large embedded data.
- Theme complexity: per-tile theme overrides can create UI clutter. Global theme and per-room overrides are implemented; per-tile theme paint remains deferred until a clear use case emerges.
- Multi-floor linking: stairs can remain unresolved or link to existing Floor locations. Creating a new Floor directly from a stair marker is deferred as a convenience workflow.
- Random generation scope: first local deterministic classic/cave generation is implemented as a pre-editor start workflow. Preview/apply-as-new-layer and encounter/treasure prompt generation are deferred to avoid turning generation into a separate product.
- Campaign World clutter: Dungeon metadata should help prep decisions, not expose every studio internals count. Current integration uses cropped actual studio map thumbnails, theme/room/stair/object summaries, a floor-first dungeon structure card, and existing location/profile sections rather than dense dungeon dashboards. Old map tools are hidden when a Dungeon Studio map/entry point is the relevant editing workflow.
- Save/exit guard: implemented in the studio header using the same three-choice pattern as character navigation guards where practical.

## Backend Work

MVP backend work should be minimal:

- Use existing map create/update endpoints.
- Store studio document inside `CampaignMap.metadata`.
- Ensure metadata payload size is acceptable.
- Add validation if backend currently trusts metadata too broadly.

Possible later backend work:

- Dedicated studio document table.
- Incremental autosave endpoint.
- Server-side generation endpoint if generation should be deterministic across clients or too heavy for browser.

## Testing Strategy

Frontend unit tests:

- Studio document parse/serialize.
- Cell and edge key helpers.
- Generator deterministic output.
- Room region coverage.
- NPC entity linking.
- Terrain layer merging/removal.

React tests:

- Open studio action appears only for valid location profiles.
- Drawing tools mutate document state.
- Save calls map update API with metadata.
- Room region creation calls location create API when requested.
- NPC placement stores linked creature IDs.

Browser/QA tests later:

- Draw/save/reload a small dungeon.
- Generate cave, edit, save, reload.
- Create room from selection and verify it appears in World hierarchy.
- Place NPC and verify avatar marker appears.

## Performance Guardrails

- MVP max grid size: 80x80.
- Warn before generating or editing larger maps.
- Use sparse storage for cells/edges/entities.
- Avoid storing every empty cell.
- Memoize derived render lists.
- Keep hover state local and avoid full document rewrites on every pointer move.

## Resolved Phase 1 Decisions

1. Route ownership:
   - using `/campaigns/:campaignId/world/location/:locationId/studio`.
2. Dependency approval:
   - no new dependency for the shell or manual SVG editing phases.
3. Renderer:
   - starting with SVG and React.
4. Map ownership:
   - Dungeon/Floor locations own their own studio maps; broader floor aggregation can come later.
5. NPC placement mutation:
   - still deferred until the NPC placement phase; initial stance remains prompt before mutating room links.

## Recommended First PR

Keep the first implementation PR small:

- Add studio document types/helpers/tests.
- Add sample fixtures.
- Add route shell behind an `Open Dungeon Studio` action.
- Match the first visual slice in `docs/campaign-world-dungeon-studio-mockups.md`.
- Render read-only empty/sample grid from metadata.
- No drawing tools yet.

This creates the foundation without committing to rendering complexity or generator dependencies too early.
