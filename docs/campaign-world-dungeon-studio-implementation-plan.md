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
  | "cave"
  | "castle"
  | "sewer"
  | "shop"
  | "home"
  | "town";
```

### Cell Layers

```ts
export type DungeonStudioCellLayer = {
  id: string;
  name: string;
  kind: "cells";
  visible: boolean;
  opacity: number;
  cellKind: "floor" | "water" | "cliff" | "chasm" | "rubble" | "hazard" | "road" | "grass";
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
  cells: GridCell[];
};
```

Room regions can create or link Campaign World Room locations.

### Entity/Object Layer

```ts
export type DungeonStudioEntity = {
  id: string;
  kind: "npc" | "stairs" | "label" | "marker" | "light" | "prop";
  cell: GridCell;
  xOffset?: number;
  yOffset?: number;
  linkedId?: string;
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

### Phase 3: Terrain And Cliffs

Next milestone. Build on the Phase 2 sparse cell/edge editing helpers rather than adding a rendering dependency.

Deliverables:

- Terrain layer mode.
- Water cells.
- Chasm/cliff cells.
- Cliff-edge feature support.
- Basic cave tileset styling.

Acceptance criteria:

- User can mark floor holes/chasms and water.
- Terrain renders distinctly from normal floor.
- Terrain survives save/reload.

### Phase 4: Room Layer Editor

Deliverables:

- Room mode with cell selection.
- Create room region from selected cells.
- Link region to existing Room location.
- Create new Room location from selected cells.
- Show room labels and colors.
- Show unassigned floor-cell count.

Acceptance criteria:

- User can draw structure first, then define rooms by cells.
- Creating a room region can create a Campaign World Room.
- Existing room locations can be linked to regions.
- Dungeon/Floor child list still reflects canonical Room locations.

### Phase 5: Random Generation MVP

Deliverables:

- Generator panel.
- Classic dungeon generator.
- Cave generator.
- Seeded output.
- Preview/regenerate/apply flow.
- Convert generator output into studio cells/edges/rooms.

Recommended implementation:

- Prefer `rot-js` if dependency review is accepted.
- If not, implement minimal local generators:
  - rectangular rooms + corridors.
  - cellular cave smoothing.

Acceptance criteria:

- User can generate a classic dungeon and edit it manually.
- User can generate a cave/cavern and edit it manually.
- Same seed/settings reproduce the same draft.
- Generated rooms can become room regions.

### Phase 6: NPC Placement

Deliverables:

- NPC tool mode.
- Campaign NPC picker.
- Place NPC entity on grid.
- Render NPC avatar/initials on map.
- Inspector for placed NPC.
- Optional prompt to connect NPC to room location under the token.

Acceptance criteria:

- User can place, move, and remove NPC markers.
- NPC markers link to existing NPC records.
- Avatar display matches current NPC avatar helper behavior.
- No duplicate NPC records are created.

### Phase 7: Broader Location Map Support

Deliverables:

- Generalize naming from `DungeonStudio` internals where appropriate.
- Add scope presets for:
  - shop
  - home
  - tavern
  - castle/keep
  - town/street
- Add object/entity presets for furniture, counters, beds, roads, stalls, etc.

Acceptance criteria:

- The same editor can open for non-dungeon local maps without dungeon-only assumptions.
- Existing Dungeon/Floor behavior remains unchanged.
- Map scope controls available tools and tilesets.

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
