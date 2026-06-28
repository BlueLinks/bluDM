# Campaign World Dungeon Studio Plan

## Purpose

Dungeon Studio is a proposed Campaign World tool for building grid-based dungeon maps directly in bluDM instead of creating every room only through menus first.

The goal is to let a DM sketch the physical dungeon structure visually, then bind parts of that map back to Campaign World locations, rooms, exits, notes, encounters, and maps.

This document is planning only. It does not reopen the existing Campaign World architecture by itself.

## Current Context

Campaign World currently supports:

- Location hierarchy: Region, Town, Dungeon, Floor, Room, Shop, and related custom types.
- Map records attached to locations.
- Blank or image maps.
- Map pins for placing existing locations.
- Room/floor/dungeon prep cards, encounters, exits, and notes.

This works for hierarchical prep, but dungeon construction is still menu-first. A DM must create rooms/floors, then place them. Dungeon Studio should invert that workflow for dungeon maps: draw the structure first, then turn areas into rooms.

## Product Goals

- Provide a dedicated visual workflow for Dungeon and Floor locations.
- Keep the first version grid-based for predictable editing, storage, and play use.
- Support square grids with diagonal edges/walls where needed.
- Let users draw rooms, corridors, caves, doors, terrain, hazards, and boundaries.
- Support layer-based editing so users can define which grid cells belong to a room after the physical map exists.
- Preserve existing Campaign World concepts rather than creating a separate dungeon application.
- Keep the map usable for table prep even before every square is fully annotated.

## Non-Goals For The First Implementation

- Freehand painting.
- Full VTT automation.
- Dynamic lighting, fog-of-war, or player-facing live maps.
- Procedural dungeon generation.
- Isometric maps.
- Arbitrary pixel-level image editing.
- Replacing the existing Maps workspace for world/region/settlement maps.

## Where It Fits In The Site

Dungeon Studio should be contextual to Campaign World.

Recommended entry points:

1. Dungeon profile page
   - Add a primary or map-card action: `Open Dungeon Studio`.
   - Creates or opens the active dungeon/floor studio map for that dungeon.

2. Floor profile page
   - Add the same `Open Dungeon Studio` action.
   - Floors are likely the best default editing scope because room layout usually belongs to one floor/level.

3. Maps workspace
   - Existing dungeon/floor maps can show `Edit in Dungeon Studio` when their metadata identifies them as a studio map.
   - Non-studio maps continue using the current map tools.

Potential route:

```text
/campaigns/:campaignId/world/location/:locationId/studio
```

Alternative route if the Maps workspace should own all map editing:

```text
/campaigns/:campaignId/world/maps/:mapId/studio
```

Preferred: start from the location route so the user stays oriented around the Dungeon/Floor profile and can still use existing World breadcrumbs, notes, encounters, rooms, and exits.

## Core UX Flow

### 1. Create/Open Studio Map

From a Dungeon or Floor:

- If no studio map exists, offer templates:
  - Dungeon
  - Cave
  - Castle/Keep
  - Sewer/Crypt
  - Blank grid
- User chooses grid size and scale:
  - default square size: 5 ft
  - default map size: 40x30 or current blank-map defaults
- A `CampaignMap` is created with `mapType: "dungeon"` or `"floor"`, `mode: "blank"`, and studio metadata.

### 2. Draw Structure

The first editor mode is structure drawing:

- Paint floor cells.
- Erase floor cells.
- Draw walls on cell edges.
- Draw diagonal walls/cut corners.
- Place doors on edges.
- Add stairs, secret doors, windows, gates, portcullises, bridges, and archways as edge/object features.

### 3. Add Terrain Layers

Terrain is overlaid on top of structure:

- Water.
- Chasms/cliffs.
- Difficult terrain.
- Rubble.
- Lava/acid/hazard.
- Elevation markers.
- Darkness/light source markers later.

Terrain can be simple metadata per cell in MVP. It does not need simulation.

### 4. Room Layer Editor

After the physical dungeon structure exists, the user opens a Room Layer editor.

The Room Layer lets a user:

- Select cells that make up a room or area.
- Assign that selection to an existing Room location.
- Create a new Room location from the selection.
- Name the room.
- Set a room number/label.
- Add a short prep note.
- See which cells are unassigned.
- See rooms as colored translucent overlays.

This connects visual drawing back to Campaign World rather than making isolated map shapes.

### 5. Play/Prep Review

The finished studio map should feed existing pages:

- Dungeon/Floor child room list can show map coverage.
- Room profile can show its selected cells/preview.
- Encounters can reference a room and eventually a map area.
- Exits/links can be inferred or suggested from doors between assigned room areas.

## Editor Modes

Dungeon Studio should be mode-based, not a giant all-at-once toolbox.

Suggested modes:

1. Structure
   - Floor brush
   - Eraser
   - Wall edge tool
   - Diagonal edge tool

2. Features
   - Door
   - Secret door
   - Stairs
   - Window/arrow slit
   - Gate/portcullis

3. Terrain
   - Water
   - Cliff/chasm
   - Rubble/difficult terrain
   - Hazard
   - Elevation

4. Rooms
   - Select cells
   - Assign/create room
   - Color overlay
   - Room labels

5. Labels/Notes
   - Map labels
   - DM-only notes
   - Simple markers

MVP can ship only Structure + Doors + Rooms.

## Grid And Geometry Decisions

Use a square grid.

Coordinate system:

```ts
type GridPoint = { x: number; y: number };
type GridCell = { x: number; y: number };
```

Recommended dimensions:

- `gridWidth`: number of columns.
- `gridHeight`: number of rows.
- `cellSizeFeet`: default 5.

Walls/features should be edge-based rather than cell-fill-only:

```ts
type EdgeDirection = "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";

type DungeonEdgeFeature = {
  cell: GridCell;
  direction: EdgeDirection;
  kind: "wall" | "door" | "secret-door" | "window" | "gate";
  state?: "open" | "closed" | "locked" | "barred" | "hidden";
};
```

Diagonal support can be represented as diagonal edge directions on a cell. This avoids needing arbitrary polygons for MVP while allowing diagonal walls and angled room edges.

Cells can carry terrain:

```ts
type DungeonCell = {
  x: number;
  y: number;
  terrain?: "floor" | "water" | "chasm" | "rubble" | "hazard";
  elevation?: number;
};
```

Room regions can be stored as cell lists initially:

```ts
type DungeonRoomRegion = {
  id: string;
  locationId?: string;
  label: string;
  color: string;
  cells: GridCell[];
};
```

Cell lists are easy to edit and reason about. Compression can come later if maps become large.

## Data Model Options

### Option A: Store Studio Document In `CampaignMap.metadata`

Recommended for MVP.

Current map records already support `metadata?: Record<string, unknown>`.

Example:

```json
{
  "studio": {
    "version": 1,
    "kind": "dungeon-studio",
    "tileset": "dungeon",
    "gridWidth": 40,
    "gridHeight": 30,
    "cellSizeFeet": 5,
    "cells": [],
    "edges": [],
    "rooms": [],
    "objects": []
  }
}
```

Pros:

- Avoids backend schema expansion for the design spike/MVP.
- Keeps studio maps compatible with existing map ownership, routes, and APIs.
- Lets current map preview and pin systems continue to work.

Cons:

- Large maps could make map payloads heavy.
- Harder to query individual rooms/features server-side.
- Versioning must be handled carefully.

### Option B: New Dungeon Studio Tables

Possible later if needed:

- `campaign_dungeon_maps`
- `campaign_dungeon_cells`
- `campaign_dungeon_edges`
- `campaign_dungeon_room_regions`

Pros:

- Better incremental saves and queries.
- More robust for large maps and collaboration.

Cons:

- More backend complexity before the editor proves itself.

Recommendation: start with Option A, with a clear `metadata.studio.version` field and export/import-safe JSON structure.

## Tilesets

Tilesets should start as semantic visual themes, not heavy external asset packs.

Initial tilesets:

- Dungeon/stone.
- Cave/natural stone.
- Castle/keep.
- Sewer/crypt.

Each tileset can define colors, textures, line styles, and default icons:

```ts
type DungeonTileset = {
  key: "dungeon" | "cave" | "castle" | "sewer";
  label: string;
  wallColor: string;
  floorColor: string;
  gridColor: string;
  waterColor: string;
  hazardColor: string;
};
```

Future asset tiles can be introduced later, but MVP should use CSS/canvas/SVG drawing to avoid dependency and licensing complexity.

## Rendering Approach

Likely frontend approach:

- Use SVG for MVP if map sizes stay moderate.
- Consider Canvas later for very large grids or richer textures.
- Keep interaction state in React, but avoid rendering every hover change through expensive full-tree updates.

SVG advantages:

- Easier hit targets for cells, edges, doors, labels.
- Easier accessibility labels and debug inspection.
- Easier to integrate with existing React components.

Canvas advantages later:

- Better performance for large maps/textures.
- Better painting feel.

Recommendation: implement MVP as SVG with bounded grid sizes and revisit Canvas only when performance requires it.

## Interaction Requirements

- Click-and-drag painting for cells.
- Shift/option modifiers for erase or alternate tool behavior where discoverable.
- Keyboard shortcuts for common tools after the UI is stable.
- Undo/redo stack for editor actions.
- Snap everything to grid.
- Show current tool, selected tileset, zoom level, and unsaved state.
- Support mouse and touch where practical, but optimize first for desktop DM prep.

## Relationship To Existing Locations

Dungeon Studio should not replace existing room/location forms.

Instead:

- Drawing cells creates map structure.
- Assigning a room region can create or link a Room location.
- Room locations remain the canonical place for notes, encounters, NPCs, links, and prep.
- The studio document stores geometry and visual annotations.
- `CampaignLocation.mapAnchor` may store the room region ID or centroid later.

Possible room metadata link:

```json
{
  "studioMapId": "map-123",
  "roomRegionId": "region-456"
}
```

This could live in `CampaignLocation.mapAnchor` or in the studio document's room region record.

## Suggested MVP Scope

MVP should be intentionally small:

- Open Dungeon Studio from Dungeon/Floor map card.
- Create a studio map using blank grid + tileset.
- Draw/erase floor cells.
- Draw orthogonal and diagonal walls.
- Place doors on cell edges.
- Save studio document in `CampaignMap.metadata`.
- Open Room Layer editor.
- Select cells and create/link Room locations.
- Show basic room overlays and labels.
- Show a read-only preview in the existing Map card.

Do not include terrain, object libraries, procedural generation, or advanced exports in MVP.

## Implementation Phases

### Phase 0: Planning And Data Contract

- Finalize studio metadata JSON shape.
- Decide route ownership: location route vs map route.
- Add fixtures and schema validation helpers on frontend.
- Add backend payload size guard if needed.

### Phase 1: Studio Shell

- Add `Open Dungeon Studio` action for Dungeon/Floor locations.
- Add route and shell layout.
- Load/create the active studio map.
- Render grid with pan/zoom similar to map tools.
- Save/read `metadata.studio`.

### Phase 2: Structure Tools

- Paint floor cells.
- Erase floor cells.
- Draw walls and diagonal walls.
- Place doors.
- Undo/redo.

### Phase 3: Room Layer Editor

- Add room overlay mode.
- Select cells for a room.
- Create/link Room location.
- Store room region geometry.
- Show room labels and unassigned-cell hints.

### Phase 4: Terrain And Feature Expansion

- Add water, cliffs/chasms, rubble, hazards, elevation.
- Add stairs and secret doors.
- Improve tileset styles.

### Phase 5: Prep Integration

- Room profile shows region preview.
- Dungeon/Floor child list shows mapped/unmapped rooms.
- Door adjacency can suggest exits/links.
- Encounter placement can reference room regions.

## Open Questions

- Should one Dungeon have one studio map, or should each Floor own its own studio map?
  - Recommendation: floors own studio maps; a dungeon can show aggregate links to floor studio maps.
- Should doors automatically create exits between rooms?
  - Recommendation: suggest exits but do not auto-create until the DM confirms.
- Should room regions allow disconnected cell islands?
  - Recommendation: allow in data, warn in UI.
- What maximum grid size should MVP support?
  - Recommendation: start with 80x80 or lower until performance is tested.
- Should users be able to import an image and trace over it?
  - Recommendation: defer until the grid editor is useful on its own.

## Risks

- Scope creep into a full VTT map editor.
- Metadata payloads becoming too large.
- Drawing interactions becoming hard to use on touch devices.
- Room geometry diverging from Campaign World room hierarchy.
- Diagonal walls creating edge-case adjacency bugs.

Mitigations:

- Keep MVP grid-only.
- Keep room locations canonical for prep content.
- Version the studio document.
- Treat automatic inference as suggestions, not hidden mutations.
- Add focused tests around geometry helpers before UI polish.

## Success Criteria

A first successful Dungeon Studio release should let a DM:

1. Open a dungeon/floor studio from Campaign World.
2. Draw a small dungeon layout on a grid.
3. Add doors and diagonal walls.
4. Select cells and turn them into room locations.
5. Return to the normal World page and see those rooms in the existing hierarchy.
6. Reopen the studio and continue editing without data loss.
