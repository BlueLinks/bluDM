# Campaign World Implementation Plan

## Purpose

This file is the source of truth for implementing the next Campaign World UX phase.

It consolidates the approved navigation plan, wireframes, and latest refinement decisions into implementation guidance. Implement from this document before referring back to the earlier exploratory planning documents.

## Scope

### This phase includes

- Route-addressable selected locations.
- Location profile detection.
- Profile-aware location detail layouts.
- Profile-specific card ordering and visibility.
- Standardised header/action layout across profiles.
- Hierarchy breadcrumbs and parent/child context.
- Map visibility rules.
- Compact travel visibility rules.

### This phase does not include

- Standalone Travel workspace.
- Standalone Shops workspace.
- Standalone Encounters workspace.
- Major backend model changes.
- Full map editor redesign.
- Complex new UI framework/components.
- New campaign-level pages beyond the approved World structure.

---

## Approved Architecture

Campaign navigation remains:

```text
Campaign
├─ Overview
└─ World
```

World contains:

```text
World
├─ Explorer
└─ Maps
```

### Architecture rules

- Explorer is the default place-first workflow.
- Maps is the only dedicated task workspace for now.
- Travel remains a contextual tool/card/action.
- Stock is managed primarily from Shop location pages.
- Encounters are managed primarily from Dungeon/Floor/Room location pages and existing encounter flows.
- Do not add standalone Travel, Shops, or Encounters workspaces in this phase.

---

## Location Profile Model

Use three current profiles:

```text
Container
  ├─ Region variant
  ├─ Town variant
  ├─ Dungeon variant
  └─ Floor variant

Shop

Room
```

Dungeon should **not** become a separate standalone profile yet. Dungeon and Floor are specialised Container variants.

---

## Profile Definitions

## Container - Region Variant

### Included location types

- world
- continent
- kingdom
- empire
- nation
- province
- region
- territory
- wilderness
- biome
- plane
- landmark containers when used as broad areas
- custom locations that primarily contain settlements/landmarks

### Primary DM intent

Understand a large area and the important places inside it.

### Primary sections, in order

1. Map card.
2. Child settlements/landmarks.
3. Compact travel summary.
4. Linked locations.
5. Notes.

### Secondary sections

- Encounter hooks summary, if encounters exist.
- NPC/faction summary, if NPC links exist.

### Hidden sections

- Stock/inventory.
- Pricing.
- Full travel planner.
- Full map editor.
- Room-style exits as primary UI.

### Primary actions

- Add Town/Settlement.
- Add Landmark.

### Secondary actions

- Edit.
- Open Map.
- Plan Travel.
- Add Encounter.
- Link Location.
- Delete.

---

## Container - Town Variant

### Included location types

- settlement
- city
- town
- village
- hamlet
- district
- neighborhood
- ward
- camp
- outpost

### Primary DM intent

Manage a social hub: places, services, NPCs, shops, and local hooks.

### Primary sections, in order

1. Map card.
2. Buildings/shops/important places.
3. NPC summary.
4. Compact travel-from-here summary.
5. Notes.

### Secondary sections

- Local encounter summary, if encounters exist.
- Linked gates/roads/nearby locations.
- Shops/services summary when shop children exist.

### Hidden sections

- Full stock editor for child shops.
- Full travel planner.
- Full map editor.
- Dungeon room prep unless selected child is a dungeon/floor/room.

### Primary actions

- Add Building.
- Add Shop.

### Secondary actions

- Add District.
- Edit.
- Open Map.
- Place Buildings.
- Plan Travel.
- Link NPC.
- Add Local Encounter.
- Delete.

---

## Container - Dungeon Variant

### Included location types

- dungeon
- lair
- cave
- mine
- tomb
- crypt
- ruin interior
- fortress interior
- stronghold dungeon
- custom locations that primarily contain floors/rooms

### Primary DM intent

Build and run exploration structure: floors, rooms, maps, encounters, and exits.

### Primary sections, in order

1. Structure.
2. Floors/rooms.
3. Map card.
4. Encounters.
5. Exits/links.
6. Notes.

### Secondary sections

- NPCs/factions, if present.
- Travel-to-dungeon summary only when relevant.

### Hidden sections

- Stock/inventory.
- Pricing.
- Region-style travel card by default.
- Town shops/services summary.
- Generic unordered child card as the primary structure.

### Primary actions

- Add Floor.
- Add Room.

### Secondary actions

- Open Map.
- Place Rooms.
- Add Encounter.
- Link Location/Exit.
- Edit.
- Delete.

### Dungeon-specific rule

Dungeon remains a Container variant, but its card ordering must not match a generic Region/Town container. It must prioritise structure, rooms, maps, and encounters.

---

## Container - Floor Variant

### Included location types

- floor
- level
- dungeon-level
- basement
- upper-floor
- sublevel

### Primary DM intent

Manage a dungeon level: room list, map placement, encounters, and exits.

### Primary sections, in order

1. Map card.
2. Rooms.
3. Encounters.
4. Exits/linked locations.
5. Notes.

### Secondary sections

- NPCs/contents, if present.

### Hidden sections

- Travel by default.
- Stock/inventory.
- Pricing.
- Settlement/shop summaries.
- Region/town child grouping.

### Primary actions

- Add Room.
- Open Map.

### Secondary actions

- Place Rooms.
- Add Encounter.
- Link Exit.
- Edit.
- Delete.

---

## Shop Profile

### Included location types

- shop
- market
- vendor
- merchant
- blacksmith
- apothecary
- general-store
- magic-shop
- stable
- custom locations with stock/inventory as the main workflow

### Primary DM intent

Manage what the party can buy, what it costs, availability, and merchant context.

### Primary sections, in order

1. Stock/inventory.
2. Pricing summary.
3. Merchant/NPC context.
4. Notes.
5. Compact map summary.
6. Parent context.

### Secondary sections

- Encounters, only if present or explicitly added.
- Linked locations/exits, collapsed unless present.
- Child areas, only if children exist.

### Hidden sections

- Travel by default.
- Full map editor.
- Large child-location panel when no children exist.
- Dungeon-style encounter grouping.

### Primary actions

- Add Stock.
- Edit Inventory.

### Secondary actions

- Pricing View.
- Link Merchant/NPC.
- Edit.
- Open Map.
- Place Shop.
- Add Encounter.
- Delete.

---

## Room Profile

### Included location types

- room
- chamber
- corridor
- hall
- cave room
- dungeon area
- zone
- custom locations used as immediate play spaces

### Primary DM intent

Prepare what happens when the party enters this space.

### Primary sections, in order

1. Room notes/description.
2. Encounters here.
3. Exits/linked rooms.
4. Contents/NPCs.
5. Compact map summary.
6. Parent context.

### Secondary sections

- Child areas, only if children exist.

### Hidden sections

- Travel by default.
- Stock/inventory unless custom/shop-like data exists.
- Pricing.
- Full map editor.
- Region/town child grouping.
- Large NPC management panel.

### Primary actions

- Add Encounter.
- Link Exit.

### Secondary actions

- Edit.
- Open Map.
- Place Room.
- Add NPC.
- Delete.

---

## Profile Rules Summary

### Container - Region

Prioritise:

1. Map card.
2. Child settlements/landmarks.
3. Compact travel summary.
4. Linked locations.
5. Notes.

### Container - Town

Prioritise:

1. Map card.
2. Buildings/shops/important places.
3. NPC summary.
4. Compact travel-from-here summary.
5. Notes.

### Container - Dungeon

Prioritise:

1. Structure.
2. Floors/rooms.
3. Map card.
4. Encounters.
5. Exits/links.
6. Notes.

### Container - Floor

Prioritise:

1. Map card.
2. Rooms.
3. Encounters.
4. Exits/linked locations.
5. Notes.

### Shop

Prioritise:

1. Stock/inventory.
2. Pricing summary.
3. Merchant/NPC context.
4. Notes.
5. Compact map summary.
6. Parent context.

Hide travel by default.

### Room

Prioritise:

1. Room notes/description.
2. Encounters here.
3. Exits/linked rooms.
4. Contents/NPCs.
5. Compact map summary.
6. Parent context.

Hide travel by default.

---

## Map Visibility Rules

- Region, Town, Dungeon, and Floor always show a map card.
- Shop and Room show only a compact map summary.
- Floor: `Open Map` is a primary action.
- Dungeon: `Open Map` is near-primary/prominent but secondary to `Add Floor` and `Add Room`.
- Region/Town: `Open Map` is prominent but secondary to creation actions.
- Shop/Room: `Open Map` is secondary.
- The full map editor remains in the Maps workspace.
- Location pages should show map status, preview/thumbnail when available, pin/placement status, and clear action links into Maps.

### Example map card expectations

Region/Town/Dungeon/Floor map card:

```text
[Map]
Map status or preview
Pinned count / unpinned relevant children
Actions: Open Map | Place Locations/Buildings/Rooms
```

Shop/Room compact map summary:

```text
[Map Position]
Pinned on parent map or not placed
Optional floorplan status
Actions: Open Map | Place Location
```

---

## Travel Visibility Rules

- Region: show compact travel summary.
- Town: show compact “Travel from here” summary.
- Dungeon: show travel only when relevant, such as saved journeys to the dungeon or explicit travel links.
- Floor/Shop/Room: hide travel by default.
- Full route planning remains in the contextual Travel tool and is deferred from this page phase.

### Region travel summary may show

- Known routes.
- Nearby settlements.
- Saved journeys involving the region or child locations.
- Common terrain note if already available.
- `Plan Travel` action.

### Town travel summary may show

- Connected places.
- Saved journeys to/from the town.
- `Plan Travel From Here` action.

### Do not show on profile pages

- Full route planner.
- Weather controls.
- Pace controls.
- Terrain modifier controls.
- Encounter distance rolls.
- Route calculation result panels unrelated to the current location.

---

## Header And Navigation Rules

Every profile should use the same high-level layout:

```text
[Breadcrumb]
[Title + Type Badge]
[Primary Actions]
[Secondary Actions]
```

### Required header rules

- Always show breadcrumb path.
- Always show title.
- Always show type/profile badge.
- Always show parent context when available.
- Containers show child context.
- Primary actions are limited to 1-2 actions.
- Secondary actions stay in a consistent action row/menu.
- Destructive actions, such as Delete, should remain secondary.

### Hierarchy context rules

Always make world structure obvious:

- Breadcrumb segments are clickable.
- Parent context is visible when a parent exists.
- Containers show child counts/categories.
- Cards that reference locations are clickable.
- Child location rows open the child location.
- Linked location rows open the linked location.
- Map pin clicks can navigate to locations.
- The tree auto-expands to the selected location.

---

## Routing Requirements

Required routes for this phase:

```text
/campaigns/:campaignId/world
/campaigns/:campaignId/world/location/:locationId
/campaigns/:campaignId/world/maps
```

### Route behaviour rules

- Selected location is reflected in the URL.
- Reload preserves the selected location.
- Browser back/forward works for selected location navigation.
- Map pin clicks can navigate to location routes.
- Encounter/shop/location references can deep-link to location routes where appropriate.
- Tree auto-expands to reveal the selected location.
- If filters hide the selected location, show a notice and offer to clear filters.
- If a location route references a deleted/missing location, show a graceful fallback and return path to `/world`.

### Do not add in this phase

```text
/campaigns/:campaignId/world/travel
/campaigns/:campaignId/world/shops
/campaigns/:campaignId/world/encounters
```

Those workspaces are intentionally deferred.

---

## Component Guidance

Before implementing, audit existing shared layout components:

```text
frontend/src/components/layout
```

Use or extend existing shared layout primitives where practical.

### Prefer

- Shared card components.
- Shared header/action layout.
- Shared profile layout shell.
- Reusable breadcrumb/hierarchy context components.
- Reusable map summary/card components.
- Existing Campaign World section components where they can be reordered/adapted.

### Avoid

- Duplicate layout primitives.
- Arbitrary Tailwind width/height/grid hacks.
- One-off page-specific layout fixes.
- New workspaces outside the approved architecture.
- Large rewrites that change data models unnecessarily.
- Components that only rename existing components without improving structure.

### Layout safety

Preserve common grid/flex safety patterns:

- `min-w-0` on shrinkable content.
- `min-h-0` on scroll/overflow containers.
- `flex-wrap` for action rows.
- `minmax(0,1fr)` where grid content may overflow.

---

## Implementation Order

Use a safe incremental sequence:

1. Add/update location profile helper.
2. Add route-addressable selected locations.
3. Add shared profile header/hierarchy display.
4. Add profile-aware section ordering/visibility.
5. Add map visibility rules.
6. Add compact travel visibility rules.
7. Refactor existing Campaign World detail to use the profile rules.
8. Run verification.

Implementation should preserve existing behavior while incrementally improving layout and navigation.

---

## Validation Checklist

Implementation is complete when:

- Region/Town/Dungeon/Floor show appropriate map cards.
- Shop/Room show compact map summaries.
- Dungeon/Floor prioritise maps, rooms, and encounters.
- Shop prioritises stock.
- Room prioritises encounters/exits/notes.
- Region/Town show compact travel summaries.
- Dungeon shows travel only when relevant.
- Floor/Shop/Room do not show travel by default.
- Breadcrumbs are always visible.
- Parent context is visible when available.
- Containers show child context.
- Primary actions are limited to 1-2 and match the selected profile.
- Secondary actions are consistently placed.
- Cards that reference locations are clickable.
- Selected location is route-addressable.
- Reload preserves selected location.
- Browser back/forward works for location selection.
- Tree expands to selected location.
- If filters hide the selected location, the UI explains this and offers to clear filters.
- Layout uses shared components and avoids one-off sizing hacks.
- Existing Campaign World behaviors are preserved unless intentionally changed by this plan.

---

## Implementation Status

### Completed

Phase 1 and Phase 2 are complete as of the current Campaign World UX checkpoint.

Completed Phase 1 work:

- Route-addressable selected locations.
- Location profile detection.
- Profile-aware location detail layouts.
- Profile-specific card ordering and visibility.
- Standardised profile header/action layout.
- Hierarchy breadcrumbs and parent/child context.
- Map card versus compact map summary visibility rules.
- Compact travel visibility rules.
- Filter-hidden selected-location notice.
- Graceful missing-location fallback.

Completed Phase 2 polish:

- Shop pages prioritise inline stock/inventory and pricing context.
- Room, Floor, and Dungeon pages surface encounters and exits more clearly.
- Region and Town pages keep travel compact and expose contextual travel shortcuts.
- Map summary cards show clearer status and placement information while keeping full editing in Maps.
- No standalone Travel, Shops, or Encounters workspaces were added.
- No backend model changes were introduced for the UX polish.

---

## Future Phases

Future Campaign World work should remain incremental and driven by actual UX pain observed in use. Do not build every possible workspace pre-emptively. Keep the approved World architecture unless a later plan explicitly changes it.

### Phase 3: Manual QA Fixes And UX Tightening

- Fix layout issues discovered in browser QA.
- Improve confusing copy/actions.
- Reduce clutter where the profile-aware layout still feels overloaded.
- Improve empty states and action labels based on observed use.
- No new workspaces.

### Phase 4: Maps Workspace Polish

- Improve map list/editor UX.
- Improve pin placement flow.
- Improve zoom, pan, and reset controls.
- Improve blank-grid map experience.
- Improve map-to-location navigation.
- Keep the existing map data model unless a specific limitation is found.

### Phase 5: Contextual Travel Improvements

- Improve compact travel summaries.
- Improve route planning as a contextual tool/modal.
- Support map-distance handoff where practical.
- Avoid a standalone Travel workspace unless later use clearly justifies it.

### Phase 6: Encounter And Dungeon Prep Improvements

- Improve encounter creation from Room, Floor, and Dungeon pages.
- Improve room/floor structure workflows.
- Improve dungeon prep summaries.
- Avoid a standalone Encounters workspace unless later use clearly justifies it.

### Phase 7: Shop And Commerce Improvements

- Improve stock editing.
- Improve merchant and pricing workflows.
- Consider a campaign-wide shop overview only if user need becomes clear.
- Avoid a standalone Shops workspace unless later use clearly justifies it.

---

## Testing

Before completing implementation, run:

```sh
make verify
```

If `make verify` cannot be run locally, run the closest practical checks and document what was skipped and why.

Useful fallback checks include:

```sh
cd frontend && npm run lint
cd frontend && npm run format:check
cd frontend && npm run test
cd frontend && npm run build
node scripts/check-file-size.mjs
cd backend && go test ./...
cd backend && go vet ./...
docker compose config
```

Use the repository-level `node scripts/check-file-size.mjs` rather than a frontend-only file-size check.
