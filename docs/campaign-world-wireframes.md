# Campaign World UX Wireframes And Screen Architecture

## Purpose

This document turns the approved hybrid Campaign World architecture into concrete UX wireframes, navigation flows, and screen responsibilities before implementation.

No implementation details or React component designs are included here. The focus is information architecture, DM workflows, and screen-level usability.

## Approved Direction

Campaign-level navigation remains simple:

```text
Campaign
├─ Overview
└─ World
```

Inside World:

```text
Explorer | Maps | Travel | Shops | Encounters
```

Core principles:

- Explorer remains the primary workspace.
- Maps, Travel, Shops, and Encounters are focused world tools.
- Location detail pages are profile-aware.
- Location pages show summaries and shortcuts.
- Heavy editing moves into focused tools.
- The experience should feel like one connected Campaign World workspace, not several unrelated applications.

---

# 1. Recommended Location Profiles

The current location model should remain flexible, but the UI should map specific `locationType` values into a small number of profiles.

The goal is not to create a unique page for every type. The goal is to group locations by how a DM thinks about them.

## Profile Summary

| Profile | Purpose | Layout Family |
|---|---|---|
| Area | Large-scale geography and political/geographic containers | Area layout |
| Settlement | Places where parties interact with people, services, districts, and shops | Settlement layout |
| Building | Individual venues inside a settlement or area | Building layout |
| Shop | Commerce-focused building | Building layout variant |
| Dungeon | Exploration complex containing floors and rooms | Dungeon layout |
| Floor | Dungeon level or structured sub-map | Dungeon layout variant |
| Room | Tactical/exploration unit | Room layout |
| Landmark | Point of interest, travel node, lore site, or special place | Area/building hybrid |
| Custom | Fallback for unknown types | Adaptive generic layout |

## Location Type Mapping

### Area Profile

Includes:

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
- custom large-scale location when tagged/typed accordingly

Primary DM question:

> What exists in this part of the world, and how do places connect?

### Settlement Profile

Includes:

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

Primary DM question:

> What can the party do here, who is here, and what locations matter?

### Building Profile

Includes:

- building
- tavern
- inn
- guild
- temple
- house
- manor
- keep
- castle
- warehouse
- barracks
- library
- school
- tower

Primary DM question:

> What is this venue, who is here, and how does the party interact with it?

### Shop Profile

Includes:

- shop
- market
- vendor
- merchant
- blacksmith
- apothecary
- general-store
- magic-shop
- stable

Primary DM question:

> What can the party buy, what does it cost, and who sells it?

Shop is a specialized Building profile because its main workflow is inventory and pricing.

### Dungeon Profile

Includes:

- dungeon
- lair
- cave
- mine
- ruin interior
- tomb
- crypt
- fortress interior
- stronghold dungeon

Primary DM question:

> How do I structure exploration, rooms, maps, and encounters?

### Floor Profile

Includes:

- floor
- level
- dungeon-level
- basement
- upper-floor
- sublevel

Primary DM question:

> What rooms and encounters exist on this level?

Floor is a Dungeon profile variant, not a completely separate layout family.

### Room Profile

Includes:

- room
- chamber
- corridor
- hall
- cave room
- area
- zone

Primary DM question:

> What happens when the party enters this space?

### Landmark Profile

Includes:

- landmark
- ruins
- shrine
- monument
- portal
- crossing
- bridge
- road
- pass
- camp site
- resource site
- point of interest

Primary DM question:

> Why does this place matter on the map, and what can happen here?

### Custom Profile

Includes:

- custom
- unknown types
- future user-defined types

Primary DM question:

> What is the safest useful default layout?

Custom should use adaptive logic:

- if it has stock, surface commerce summary
- if it has many children, surface child locations
- if it has encounters, surface encounters
- if it has maps/pins, surface map summary

---

# 2. Workspace Wireframes

## 2.1 Explorer Workspace

Primary purpose:

> Understand and edit the world hierarchy.

The Explorer is the default World screen.

```text
Campaign > World > Explorer

[Campaign Header]
Campaign Name World
Copy: Build and navigate places, maps, encounters, shops, and travel from one connected workspace.

[World Workspace Nav]
Explorer | Maps | Travel | Shops | Encounters

[Explorer Toolbar]
Search locations...
Type filter | Profile filter | Tag filter | Relationship filter
Create Location

[Main Layout]
┌─────────────────────────────┬──────────────────────────────────────────────┐
│ Location Tree / Results     │ Selected Location Detail                     │
│                             │                                              │
│ - Region                    │ [Profile-aware detail page]                  │
│   - Town                    │                                              │
│     - District              │ Uses selected location profile:              │
│       - Shop                │ - Area                                       │
│       - Tavern              │ - Settlement                                 │
│   - Dungeon                 │ - Building                                   │
│     - Floor 1               │ - Shop                                       │
│       - Room 1              │ - Dungeon                                    │
│       - Room 2              │ - Floor                                      │
│                             │ - Room                                       │
└─────────────────────────────┴──────────────────────────────────────────────┘

[Optional Bottom Summary]
World health / incomplete prep:
- Unpinned locations
- Shops without stock
- Dungeons without rooms
- Encounters without locations
```

### Explorer Information Priority

1. Search and navigate locations.
2. See where selected location sits in hierarchy.
3. Perform the most common action for that profile.
4. Jump to focused tools when heavy editing is needed.
5. Avoid showing every possible section at once.

### Explorer Actions

Global:

- Add location
- Search/filter
- Clear filters
- Open workspace mode

Selected location:

- Edit location
- Add child
- Delete location
- Profile-specific primary action
- Open related workspace

### Explorer Scaling Notes

For hundreds of locations, Explorer needs:

- route-addressable selected location
- persistent expanded tree state if practical
- strong filters
- profile filter
- incomplete-prep filters, such as:
  - shops missing stock
  - locations without map pins
  - dungeons without rooms
  - encounters missing locations

---

## 2.2 Region / Area Profile Wireframe

Primary purpose:

> Manage a large geographic or political area.

```text
Explorer > Region

[Header]
Breadcrumb path: World / Continent / Region
Region Name
Type badge: Region
Tags
Actions: Edit | Add Settlement | Add Landmark | Open Maps | Open Travel

[Primary Content]
┌──────────────────────────────────────────────────────────┐
│ Map Summary                                               │
│ - Regional map thumbnail / status                         │
│ - Pinned settlements: 8/12                                │
│ - Unpinned landmarks: 3                                   │
│ Actions: Open Map Workspace | Place Locations             │
└──────────────────────────────────────────────────────────┘

[Secondary Content Grid]
┌───────────────────────────┬──────────────────────────────┐
│ Settlements               │ Landmarks                     │
│ - Town A                  │ - Shrine                      │
│ - Town B                  │ - Ruins                       │
│ - Village C               │ - Mountain Pass               │
│ Action: Add Settlement    │ Action: Add Landmark          │
└───────────────────────────┴──────────────────────────────┘

┌───────────────────────────┬──────────────────────────────┐
│ Travel Summary            │ Encounter Hooks               │
│ - Saved journeys here     │ - 2 planned in region         │
│ - Common route distances  │ - 1 unresolved landmark hook  │
│ Action: Open Travel       │ Action: Open Encounters       │
└───────────────────────────┴──────────────────────────────┘

[Notes]
Public notes
DM notes

[Lower Priority / Collapsed]
Linked locations
NPC/faction links
```

### Region Page Priority

1. Map and child places.
2. Settlements/landmarks.
3. Travel summary.
4. Regional encounter hooks.
5. Notes.
6. Links/NPCs only if present or expanded.

### Removed From Region

- Inventory/stock editor.
- Full encounter management UI.
- Shop pricing.
- Room-style exits as primary UI.

Reason: region prep is about geography, routes, and important places.

---

## 2.3 Town / Settlement Profile Wireframe

Primary purpose:

> Manage a social hub with districts, buildings, shops, NPCs, and local hooks.

```text
Explorer > Settlement

[Header]
Breadcrumb path: Region / Town
Town Name
Type badge: Settlement
Actions: Edit | Add District | Add Building | Add Shop | Open Map

[Primary Content]
┌──────────────────────────────────────────────────────────┐
│ Settlement Overview                                       │
│ Summary / atmosphere / quick DM notes                     │
│ Key facts: districts, shops, NPCs, encounters             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Town Map Summary                                          │
│ - Map available / missing                                 │
│ - Buildings pinned: 10/18                                 │
│ Actions: Open Map Workspace | Place Buildings             │
└──────────────────────────────────────────────────────────┘

[Main Management Grid]
┌───────────────────────────┬──────────────────────────────┐
│ Districts & Locations     │ Shops & Services              │
│ - Market District         │ - Blacksmith: 12 stocked      │
│ - Temple Ward             │ - Apothecary: no stock        │
│ - Docks                   │ - Inn: services only          │
│ Action: Add Child         │ Action: Open Shops Workspace  │
└───────────────────────────┴──────────────────────────────┘

┌───────────────────────────┬──────────────────────────────┐
│ NPCs Here                 │ Local Encounters / Hooks      │
│ - Mayor                   │ - Tavern brawl planned        │
│ - Guard Captain           │ - Market theft unresolved     │
│ Action: Link NPC          │ Action: Open Encounters       │
└───────────────────────────┴──────────────────────────────┘

[Secondary]
Travel to/from this settlement
Linked locations / roads / gates
Public notes
DM notes
```

### Town Page Priority

1. Overview and notes.
2. Map summary.
3. Districts/buildings.
4. Shops/services.
5. NPCs.
6. Local encounter hooks.
7. Travel summary.

### Removed From Town

- Full stock editor for every shop inline.
- Full map editor inline.
- Full travel calculator inline.
- Room-level dungeon encounter panels unless selected location is a dungeon/room.

Reason: town prep is about usable places and people, not every child workflow expanded at once.

---

## 2.4 Shop Profile Wireframe

Primary purpose:

> Manage what the party can buy, pricing, availability, and merchant notes.

```text
Explorer > Shop

[Header]
Breadcrumb path: Region / Town / Shop
Shop Name
Type badge: Shop
Actions: Edit | Manage Stock | Open Shops Workspace

[Primary Content]
┌──────────────────────────────────────────────────────────┐
│ Stock Summary                                             │
│ - 24 stocked items                                        │
│ - 3 rare items                                            │
│ - 2 unavailable/special order                             │
│ Actions: Add Stock | Edit Inventory | Pricing View        │
└──────────────────────────────────────────────────────────┘

┌───────────────────────────┬──────────────────────────────┐
│ Merchant / NPC            │ Shop Notes                    │
│ - Owner linked            │ Public description            │
│ - Attitude / secrets      │ DM notes                      │
│ Action: Link NPC          │                              │
└───────────────────────────┴──────────────────────────────┘

[Secondary Content]
┌───────────────────────────┬──────────────────────────────┐
│ Parent Settlement Context │ Map / Placement Summary       │
│ - Located in Market Ward  │ - Pinned on town map          │
│ - Nearby locations        │ Action: Open Map              │
└───────────────────────────┴──────────────────────────────┘

[Collapsed / If Present]
Encounter hooks
Linked exits / rooms
```

### Shop Page Priority

1. Stock and pricing.
2. Merchant/NPC.
3. Shop notes.
4. Parent town context.
5. Map summary only.
6. Encounters only if present.

### Removed From Shop

- Full travel planning.
- Large full map editor inline.
- Full child-location management unless shop has rooms.
- Generic encounter panel by default if no encounters exist.

Reason: a DM opening a shop is most likely preparing commerce or merchant interaction.

---

## 2.5 Dungeon Profile Wireframe

Primary purpose:

> Build and run an exploration complex.

```text
Explorer > Dungeon

[Header]
Breadcrumb path: Region / Dungeon
Dungeon Name
Type badge: Dungeon
Actions: Edit | Add Floor | Add Room | Open Maps | Open Encounters

[Primary Content]
┌──────────────────────────────────────────────────────────┐
│ Dungeon Structure                                         │
│ Floors: 3                                                 │
│ Rooms: 42                                                 │
│ Encounters: 12 planned                                    │
│ Unmapped rooms: 8                                         │
│ Actions: Create Floor | Create Room | Open Dungeon Map    │
└──────────────────────────────────────────────────────────┘

[Main Grid]
┌───────────────────────────┬──────────────────────────────┐
│ Floors / Rooms            │ Dungeon Map Summary           │
│ Floor 1                   │ - Dungeon overview map        │
│   - Room 1                │ - Floor maps available        │
│   - Room 2                │ Actions: Open Maps            │
│ Floor 2                   │                              │
└───────────────────────────┴──────────────────────────────┘

┌───────────────────────────┬──────────────────────────────┐
│ Encounters By Area        │ Navigation / Links            │
│ - Room 3: Goblin ambush   │ - Secret passage to crypt     │
│ - Room 7: Trap            │ - Exit to forest shrine       │
│ Action: Open Encounters   │ Action: Link Location         │
└───────────────────────────┴──────────────────────────────┘

[Secondary]
Dungeon notes
NPCs/factions if present
Treasure/stock only if explicitly supported later
```

### Dungeon Page Priority

1. Floors and rooms.
2. Maps.
3. Encounters.
4. Navigation links.
5. Notes.
6. NPCs/factions.

### Removed From Dungeon

- Shop stock.
- Region-style travel planner.
- Generic child card without dungeon-specific grouping.
- Full global NPC management as a primary panel.

Reason: dungeon prep is about structure, traversal, and encounter readiness.

---

## 2.6 Floor Profile Wireframe

Primary purpose:

> Manage a dungeon level as a map and room collection.

```text
Explorer > Dungeon > Floor

[Header]
Breadcrumb path: Dungeon / Floor 1
Floor Name
Type badge: Floor
Actions: Edit | Add Room | Open Floor Map | Open Encounters

[Primary Content]
┌──────────────────────────────────────────────────────────┐
│ Floor Map Summary                                         │
│ - Floor map available                                     │
│ - Rooms pinned: 15/18                                     │
│ Actions: Open Map Workspace | Place Rooms                 │
└──────────────────────────────────────────────────────────┘

[Main Grid]
┌───────────────────────────┬──────────────────────────────┐
│ Rooms                     │ Encounters                    │
│ - Entrance Hall           │ - Room 2: Skeletons           │
│ - Guard Room              │ - Room 5: Puzzle guardian     │
│ - Shrine                  │ Action: Open Encounters       │
└───────────────────────────┴──────────────────────────────┘

┌───────────────────────────┬──────────────────────────────┐
│ Exits / Vertical Links    │ Notes                         │
│ - Stairs to Floor 2       │ Floor-wide notes              │
│ - Secret lift             │ DM notes                      │
└───────────────────────────┴──────────────────────────────┘
```

### Floor Page Priority

1. Floor map.
2. Rooms.
3. Encounters.
4. Exits/links.
5. Notes.

### Removed From Floor

- Travel planner.
- Shop inventory.
- Settlement-style shop/NPC summaries.
- Region child categories.

Reason: floors are operational dungeon prep surfaces.

---

## 2.7 Room Profile Wireframe

Primary purpose:

> Prep and run the immediate location the party enters.

```text
Explorer > Dungeon > Floor > Room

[Header]
Breadcrumb path: Dungeon / Floor 1 / Room 3
Room Name
Type badge: Room
Actions: Edit | Add Encounter | Link Exit | Open Floor Map

[Primary Content]
┌──────────────────────────────────────────────────────────┐
│ Room Notes                                                │
│ Boxed/read-aloud text or public notes                     │
│ DM notes                                                  │
│ Tags: locked, trapped, secret                             │
└──────────────────────────────────────────────────────────┘

[Main Grid]
┌───────────────────────────┬──────────────────────────────┐
│ Encounters Here           │ Exits / Linked Rooms          │
│ - Goblin ambush           │ - North door -> Room 4        │
│ - Trap hazard             │ - Secret tunnel -> Room 9     │
│ Action: Add Encounter     │ Action: Link Exit             │
└───────────────────────────┴──────────────────────────────┘

┌───────────────────────────┬──────────────────────────────┐
│ Map Position              │ Contents / NPCs               │
│ - Pinned on Floor 1 map   │ - Prisoner NPC linked         │
│ Action: Open Floor Map    │ - Treasure notes              │
└───────────────────────────┴──────────────────────────────┘

[Optional]
Child locations only if room contains subareas
```

### Room Page Priority

1. Notes/read-aloud/DM content.
2. Encounters.
3. Exits/links.
4. Map position.
5. NPCs/contents.

### Removed From Room

- Travel planning.
- Inventory editor unless room is also a shop-like custom profile.
- Full map editor inline.
- Region/town child-management emphasis.

Reason: room prep is for immediate play.

---

## 2.8 Maps Workspace Wireframe

Primary purpose:

> Manage maps, pins, placement, navigation, and distance measurement.

```text
Campaign > World > Maps

[Header]
Maps
Copy: Place locations, manage pins, navigate visually, and measure distances.
Actions: Create Map

[Workspace Nav]
Explorer | Maps | Travel | Shops | Encounters

[Maps Toolbar]
Search maps or locations...
Map type filter | Parent location filter | Unpinned only

[Main Layout]
┌─────────────────────────────┬──────────────────────────────────────────────┐
│ Map List / Context          │ Active Map Canvas                            │
│                             │                                              │
│ - Regional Map              │ [Map controls]                               │
│ - Town Map                  │ Select map | Grid | Zoom | Reset             │
│ - Dungeon Floor 1           │                                              │
│                             │ [Canvas]                                     │
│ Related locations           │ Pins visible                                 │
│ - Pinned                    │                                              │
│ - Unpinned                  │                                              │
└─────────────────────────────┴──────────────────────────────────────────────┘

[Right / Side Panel]
Pin Placement
- Place selected location
- Move pin
- Remove pin

Pinned Locations
- Click to open location

Distance
- From pin
- To pin
- Calculate
- Send to Travel Planner
```

### Maps Workspace Should Own

- full map editor/canvas
- map creation
- pin placement and movement
- pin removal
- grid/zoom/pan
- straight-line distance
- map-focused navigation

### Location Pages Should Only Show

- map summary
- placement status
- thumbnail/preview if available
- shortcut to open focused map

---

## 2.9 Travel Workspace Wireframe

Primary purpose:

> Plan routes and save journeys.

```text
Campaign > World > Travel

[Header]
Travel
Copy: Calculate travel time, weather, pace, roads, and save reusable journeys.
Actions: New Journey

[Workspace Nav]
Explorer | Maps | Travel | Shops | Encounters

[Primary Planner]
┌──────────────────────────────────────────────────────────┐
│ Route Planner                                             │
│ Mode: Saved Locations | Custom Distance                   │
│ Origin: [Location picker / custom]                        │
│ Destination: [Location picker / custom]                   │
│ Distance source: Map-derived / Manual                     │
│ Terrain | Pace | Roads                                    │
│ Weather controls                                          │
│ Actions: Calculate | Save Journey                         │
└──────────────────────────────────────────────────────────┘

[Results]
Duration
Effective pace
Weather
Encounter distance
Assumptions

[Journey Log]
Search/filter journeys
- Region A to Town B
- Town B to Dungeon C
Actions: Edit | Duplicate | Delete

[Context Sidebar]
Selected location context if opened from a location:
- Routes involving this location
- Nearby pinned locations
```

### Travel Workspace Should Own

- full travel calculator
- weather rolling
- journey saving/editing
- journey log
- map-derived distance selection

### Location Pages Should Only Show

- travel summary for relevant profiles
- saved journeys involving this place
- shortcut to open Travel prefilled from this location

---

## 2.10 Shops Workspace Wireframe

Primary purpose:

> Manage campaign commerce across all shops.

```text
Campaign > World > Shops

[Header]
Shops
Copy: Review shops, stock, prices, merchants, and missing inventory.
Actions: Add Shop | Add Stock To Selected

[Workspace Nav]
Explorer | Maps | Travel | Shops | Encounters

[Toolbar]
Search shops/items...
Settlement filter | Stock status filter | Merchant missing | Tag filter

[Main Layout]
┌─────────────────────────────┬──────────────────────────────────────────────┐
│ Shop List                   │ Selected Shop Inventory                      │
│                             │                                              │
│ - Copper Kettle             │ [Shop summary]                               │
│   Brindleford               │ Stock count | Merchant | Parent              │
│   24 stocked                │                                              │
│ - Black Anvil               │ [Inventory table/list]                       │
│   0 stocked                 │ Item | Qty | Price | Availability | Notes    │
│                             │                                              │
│                             │ Actions: Add Stock | Pricing View            │
└─────────────────────────────┴──────────────────────────────────────────────┘

[Shortcuts]
Open Shop Location
Open Parent Settlement
```

### Shops Workspace Should Own

- all-shop overview
- stock editing
- pricing management
- identifying missing stock
- parent settlement context
- merchant completeness checks

### Shop Profile Should Show

- stock summary
- top inventory highlights
- manage stock shortcut
- merchant/NPC summary

---

## 2.11 Encounters Workspace Wireframe

Primary purpose:

> Prepare and review encounters by location, especially dungeon rooms.

```text
Campaign > World > Encounters

[Header]
Encounters
Copy: Review planned encounters, location hooks, and dungeon-room prep.
Actions: Create Encounter

[Workspace Nav]
Explorer | Maps | Travel | Shops | Encounters

[Toolbar]
Search encounters...
Status filter | Location profile filter | Dungeon filter | Missing location

[Main Layout]
┌─────────────────────────────┬──────────────────────────────────────────────┐
│ Location / Group List       │ Encounter Detail / List                      │
│                             │                                              │
│ By Dungeon                  │ Selected group: Old Well / Floor 1           │
│ - Old Well                  │ - Room 1: Guard post                         │
│   - Floor 1                 │ - Room 3: Goblin ambush                      │
│   - Floor 2                 │ - Room 7: Trap                               │
│                             │                                              │
│ By Settlement               │ Actions: Add Encounter Here | Open Builder   │
│ - Brindleford               │                                              │
│                             │                                              │
│ Unplaced                    │                                              │
│ - 3 encounters              │                                              │
└─────────────────────────────┴──────────────────────────────────────────────┘

[Side Summary]
Prep completeness
- Rooms without encounters
- Encounters without rooms
- Planned/running/completed counts
```

### Encounters Workspace Should Own

- all encounter review
- grouping by location
- dungeon/floor/room prep
- missing location cleanup
- status management shortcut
- opening full encounter builder

### Location Pages Should Show

- encounter summary
- top attached encounters
- create encounter here shortcut
- full editor only in existing encounter builder

---

# 3. What Belongs Where

## Maps

| Placement | Recommendation | Reason |
|---|---|---|
| Profile page | Summary + status + shortcut | Gives context without overwhelming detail. |
| Workspace | Full editor | Map editing needs canvas, pin controls, distance tools. |
| Only workspace | Map creation/editing, pin movement, distance tool | These are heavy workflows. |

## Travel

| Placement | Recommendation | Reason |
|---|---|---|
| Profile page | Relevant summary only | Regions/settlements/landmarks benefit from travel context. |
| Workspace | Full planner and journey log | Travel is task-first and can span many locations. |
| Hidden on some profiles | Shops, rooms, most buildings | Usually irrelevant and creates clutter. |

## Encounters

| Placement | Recommendation | Reason |
|---|---|---|
| Profile page | Summary/list + create-here action | Location context matters. |
| Dungeon/floor/room profiles | Prominent summary | Encounters are central to dungeon prep. |
| Workspace | Full grouped prep view | Best for reviewing readiness across many places. |
| Existing encounter builder | Full encounter editing | Combat setup remains its own detailed workflow. |

## Stock / Inventory

| Placement | Recommendation | Reason |
|---|---|---|
| Shop profile | Prominent stock summary + quick add | Shop exists primarily for commerce. |
| Shops workspace | Full inventory/pricing editor | Better for campaign-wide stock management. |
| Other profiles | Hidden unless stock exists | Avoids irrelevant UI on regions, rooms, dungeons. |

## NPC Links

| Placement | Recommendation | Reason |
|---|---|---|
| Settlement/building/shop | Prominent | Social locations need people. |
| Dungeon | Secondary | Useful for factions/inhabitants, but not always primary. |
| Room | If present | Useful for prisoners/occupants. |
| Area | Collapsed/secondary | May represent rulers/factions, but usually not core. |

## Linked Locations

| Placement | Recommendation | Reason |
|---|---|---|
| Dungeon/floor/room | Prominent | Exits and navigation matter. |
| Landmark | Prominent | Roads, portals, passes matter. |
| Area/settlement | Secondary | Useful but not always the main workflow. |
| Shop | Collapsed unless present | Shop exits rarely need primary space. |

## Child Locations

| Placement | Recommendation | Reason |
|---|---|---|
| Area | Prominent, categorized | Regions contain settlements/landmarks. |
| Settlement | Prominent, categorized | Towns contain districts/buildings/shops. |
| Dungeon/floor | Prominent, structured | Dungeons contain floors/rooms. |
| Shop/building/room | Secondary unless children exist | Most are leaf nodes. |

---

# 4. Navigation Flows And Click Counts

Click counts are approximate and assume the DM is already inside Campaign World unless noted.

## 4.1 Creating A New Town

```text
Explorer
→ Select Region
→ Add Settlement
→ Fill Town Details
→ Create
→ Town Profile Opens
→ Open Maps or Add Buildings
```

Approximate clicks:

1. Select region.
2. Click Add Settlement.
3. Fill/save form.
4. Optionally Open Map or Add Building.

Total: 3-5 clicks plus form entry.

Why this works:

- Region is the natural parent.
- The DM thinks: “This town belongs in this region.”
- Town page opens immediately with town-specific next steps.

## 4.2 Adding A Map And Placing Buildings In A Town

```text
Town Profile
→ Open Map Workspace
→ Create Town Map if missing
→ Place Buildings
→ Return To Town
```

Approximate clicks:

1. Open Map Workspace.
2. Create map if missing.
3. Select/place building pins.
4. Return to selected town or stay in Maps.

Total: 3-6 clicks depending on whether map exists.

Why this works:

- Town page gives map status.
- Full placement happens in Maps where canvas controls have room.

## 4.3 Stocking A Shop

Place-first flow:

```text
Explorer
→ Town
→ Shop
→ Manage Stock
→ Shops Workspace focused on Shop
→ Edit Inventory
→ Return To Shop
```

Approximate clicks:

1. Select town or search shop.
2. Select shop.
3. Manage Stock.
4. Add/edit inventory.

Total: 3-5 clicks plus item entry.

Task-first flow:

```text
World > Shops
→ Select Shop
→ Edit Inventory
```

Approximate clicks:

1. Open Shops mode.
2. Select shop.
3. Add/edit inventory.

Total: 2-3 clicks.

Why this works:

- A DM stocking one known shop can start from place.
- A DM reviewing all commerce can start from Shops.

## 4.4 Creating A Dungeon

```text
Explorer
→ Select Parent Region/Landmark
→ Add Dungeon
→ Dungeon Profile Opens
→ Create Floor
→ Create Rooms
→ Open Maps Workspace
→ Place Rooms
→ Open Encounters Workspace
→ Add Encounters By Room
```

Approximate clicks:

1. Select parent.
2. Add Dungeon.
3. Create Floor.
4. Create Rooms.
5. Open Maps.
6. Place rooms.
7. Open Encounters.
8. Add encounters.

Total: 6-10 clicks plus form/detail entry.

Why this works:

- Dungeon profile provides a prep checklist.
- Heavy room placement happens in Maps.
- Heavy encounter review happens in Encounters.

## 4.5 Creating A Room Encounter

Place-first flow:

```text
Explorer
→ Dungeon
→ Floor
→ Room
→ Add Encounter
→ Encounter dialog/builder
```

Approximate clicks:

1. Select dungeon/floor/room.
2. Click Add Encounter.
3. Save or open builder.

Total: 2-4 clicks if room is visible in tree.

Task-first flow:

```text
World > Encounters
→ Select Dungeon/Floor
→ Add Encounter To Room
```

Approximate clicks:

1. Open Encounters.
2. Select dungeon/floor.
3. Add encounter to room.

Total: 3-4 clicks.

Why this works:

- During dungeon prep, the Encounters workspace is faster.
- During room editing, the Room profile is faster.

## 4.6 Planning Travel

Place-first flow:

```text
Region or Settlement Profile
→ Open Travel
→ Origin prefilled if available
→ Select Destination
→ Calculate
→ Save Journey
```

Approximate clicks:

1. Open Travel.
2. Select destination.
3. Calculate/save.

Total: 3-4 clicks.

Task-first flow:

```text
World > Travel
→ Select Origin
→ Select Destination
→ Calculate
→ Save Journey
```

Approximate clicks:

1. Open Travel.
2. Select origin.
3. Select destination.
4. Calculate/save.

Total: 4-5 clicks.

Why this works:

- Travel is often task-first, but region/settlement context can reduce setup.

## 4.7 Reviewing All Shops

```text
World > Shops
→ Filter Missing Stock or Settlement
→ Select Shop
→ Edit Inventory
```

Approximate clicks:

1. Open Shops.
2. Optional filter.
3. Select shop.
4. Edit.

Total: 2-4 clicks.

Why this works:

- This avoids hunting through the tree for every shop.

## 4.8 Reviewing Dungeon Prep Completeness

```text
World > Encounters
→ Filter Dungeon
→ Select Dungeon
→ Review rooms without encounters
→ Add missing encounters
```

Approximate clicks:

1. Open Encounters.
2. Select/filter dungeon.
3. Select missing room.
4. Add encounter.

Total: 3-5 clicks.

Why this works:

- Dungeon prep is task-oriented once the dungeon exists.

---

# 5. Route Design

## Recommended Routes

```text
/campaigns/:campaignId/world
/campaigns/:campaignId/world/location/:locationId
/campaigns/:campaignId/world/maps
/campaigns/:campaignId/world/maps/:mapId
/campaigns/:campaignId/world/travel
/campaigns/:campaignId/world/shops
/campaigns/:campaignId/world/shops/:locationId
/campaigns/:campaignId/world/encounters
/campaigns/:campaignId/world/encounters/location/:locationId
```

## Route Roles

### `/world`

Default Explorer route.

If no location is selected:

- select first/root location, or
- show world overview/empty state.

### `/world/location/:locationId`

Route-addressable selected location.

Benefits:

- deep linking
- browser back/forward works
- reload preserves selected location
- users can share a specific town/shop/room
- focused work can return to exact location

Drawbacks:

- requires route-state synchronization with tree selection
- deleted/missing locations need graceful fallback
- filters must not hide the selected location accidentally, or UI needs to reveal it

### `/world/maps`

Map workspace.

Optional query params later:

```text
?location=:locationId
?map=:mapId
?mode=place
```

### `/world/maps/:mapId`

Direct link to a specific map.

Useful from location map summaries.

### `/world/travel`

Travel planner.

Optional query params later:

```text
?originLocationId=:id
?destinationLocationId=:id
?distanceFromMap=:mapId
```

### `/world/shops`

Shop workspace overview.

### `/world/shops/:locationId`

Shop workspace focused on a specific shop.

If the location is not a shop, show a helpful message or redirect to location detail.

### `/world/encounters`

Encounter prep overview.

### `/world/encounters/location/:locationId`

Encounters workspace focused on a region, dungeon, floor, room, settlement, or shop.

## Browser Navigation Implications

Route-addressable locations improve navigation significantly:

- Selecting a location can push route state.
- Back returns to previous selected location or workspace.
- Opening Maps/Travel/Shops/Encounters can preserve source location in query or state.
- Return links can go back to exact location.

Potential issue:

- If every tree click pushes history, Back may become noisy.

Recommendation:

- Selecting locations from explicit navigation should update URL.
- Rapid focus changes inside search could use replace behavior until committed.
- Workspace mode switches should push history.

---

# 6. Redundant Sections By Profile

## Area / Region

Remove or hide:

- stock/inventory editor
- full encounter editor
- room-style exit management as primary UI
- full travel calculator inline

Keep:

- map summary
- settlements/landmarks
- travel summary
- encounter hooks summary
- notes

## Settlement / Town

Remove or hide:

- full shop inventories inline
- full map editor inline
- full travel calculator inline
- dungeon room prep panels unless child is dungeon

Keep:

- map summary
- districts/buildings/shops
- NPCs
- local hooks
- shop summary
- travel summary

## Building

Remove or hide:

- travel planner
- stock editor unless shop-like
- regional map tools
- encounter section if empty, except shortcut

Keep:

- notes
- NPCs
- linked locations/exits
- optional map summary

## Shop

Remove or hide:

- travel planner
- full map editor inline
- large child location panel if no children
- generic encounter management if empty

Keep:

- stock summary
- pricing shortcut
- merchant/NPC
- parent settlement
- optional map summary
- encounters only if present or manually added

## Dungeon

Remove or hide:

- stock editor
- settlement shops/services panels
- region travel tools
- generic unordered child cards as the primary structure

Keep:

- floors/rooms
- maps
- encounters by room
- navigation links
- notes

## Floor

Remove or hide:

- travel planner
- stock editor
- settlement NPC/shop summaries
- region-style child categories

Keep:

- floor map
- rooms
- encounters
- exits/vertical links
- notes

## Room

Remove or hide:

- travel planner
- stock editor unless explicitly shop-like
- full map editor inline
- large child hierarchy unless room contains subareas

Keep:

- notes
- encounters
- exits/linked rooms
- map position
- NPCs/contents if present

## Landmark

Remove or hide:

- stock editor
- full travel planner inline
- settlement shop/service panels
- dungeon room prep unless it has dungeon children

Keep:

- map placement
- lore/notes
- linked locations
- encounter hooks
- travel relevance summary

---

# 7. Final Recommendation

## 7.1 Recommended Location Profiles

Use these profiles:

1. Area
2. Settlement
3. Building
4. Shop
5. Dungeon
6. Floor
7. Room
8. Landmark
9. Custom fallback

Profiles that can share layouts:

- Building and Shop share a layout family, but Shop prioritizes stock.
- Dungeon and Floor share a layout family, but Floor prioritizes map and rooms.
- Area and Landmark can share some map/placement patterns, but Landmark is more point-of-interest focused.
- Custom should adapt based on actual linked data.

## 7.2 Recommended Workspace Structure

```text
Campaign
├─ Overview
└─ World
   ├─ Explorer
   ├─ Maps
   ├─ Travel
   ├─ Shops
   └─ Encounters
```

## 7.3 Recommended Navigation Structure

- Explorer is default.
- Location tree remains persistent within Explorer.
- Selected locations are route-addressable.
- Focused workspaces are World-level modes.
- Profile pages contain summaries and shortcuts into workspaces.
- Workspaces can be opened with context from selected locations.

## 7.4 Recommended Route Structure

Minimum first pass:

```text
/campaigns/:campaignId/world
/campaigns/:campaignId/world/location/:locationId
/campaigns/:campaignId/world/maps
/campaigns/:campaignId/world/travel
/campaigns/:campaignId/world/shops
/campaigns/:campaignId/world/encounters
```

Later enhancements:

```text
/campaigns/:campaignId/world/maps/:mapId
/campaigns/:campaignId/world/shops/:locationId
/campaigns/:campaignId/world/encounters/location/:locationId
```

## 7.5 Recommended Migration Order

### Phase 1: Route-addressable Explorer

- Add selected location route.
- Preserve existing Explorer behavior.
- Improve browser back/reload/deep link behavior.

### Phase 2: Location Profile Mapping

- Add profile classification.
- Reorder existing sections by profile.
- Hide/collapse low-value sections.
- No new data model.

### Phase 3: Profile-Aware Summaries

- Replace heavy embedded sections with summaries where appropriate.
- Keep full components available behind workspace shortcuts.

### Phase 4: World Subnavigation

- Add Explorer, Maps, Travel, Shops, Encounters modes.
- Move existing Travel panel/modal logic toward Travel workspace.
- Move full map editing toward Maps workspace.

### Phase 5: Focused Shops And Encounters Workspaces

- Add shop index and focused inventory workflow.
- Add encounter prep view grouped by location.

### Phase 6: Optional Model Improvements

Only after validating UX:

- journey origin/destination location IDs
- stronger encounter-room linkage
- map layers or map annotations
- user-defined location profile metadata

## 7.6 Highest-Impact UX Improvements

1. Route-addressable selected locations.
2. Profile-aware section ordering and hiding.
3. Shop stock moved to primary position for shops.
4. Dungeon/floor/room views emphasizing rooms, maps, encounters, and exits.
5. Map summaries on location pages with full editor moved to Maps workspace.
6. Travel moved from a modal/panel into a focused World Travel workspace.
7. Shops workspace for campaign-wide commerce review.
8. Encounters workspace for location-linked prep, especially dungeons.
9. Incomplete-prep filters such as unpinned locations, shops without stock, rooms without encounters.
10. Context-preserving navigation between Explorer and focused tools.

---

# Final UX Principle

Campaign World should support two natural DM modes:

```text
Place-first:
I am working on this region, town, shop, dungeon, floor, or room.

Task-first:
I need to manage maps, travel, shops, or encounters across the world.
```

The Explorer provides place-first navigation. The World workspaces provide task-first workflows. Location profiles connect the two with summaries and shortcuts.
