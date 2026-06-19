# Campaign World Navigation Plan

## Purpose

This plan evaluates navigation options for the Campaign World feature from a DM workflow perspective. The goal is to keep the experience focused and scalable without fragmenting related world-building tasks across too many disconnected pages.

## Recommendation

Keep **Campaign World** as the primary workspace, but evolve it into a hybrid workspace:

- **Explorer** remains the default and primary entry point.
- Location detail becomes **profile-aware**: area, settlement, building, shop, dungeon, room, landmark.
- Maps, Travel, Shops, and Encounters become **World workspace modes**, not separate campaign top-level pages.
- The selected location profile exposes contextual summaries and shortcuts into those modes.

Recommended campaign-level navigation:

```text
Campaign
  Overview
  World
```

Recommended World-level navigation:

```text
World
  Explorer
  Maps
  Travel
  Shops
  Encounters
```

Maps, Travel, Shops, and Encounters should be reachable both from the World navigation and from contextual actions inside a selected location.

Example:

```text
Town detail > Open town map
Shop detail > Manage stock
Region detail > Plan travel
Dungeon room > Create encounter here
```

This keeps the mental model simple: the DM is still working in the campaign world, but can switch into focused tools when needed.

---

## Common DM Tasks Used For Comparison

Approximate click counts assume the DM is already inside the campaign.

| Task | Description |
|---|---|
| Find a town | Locate and open a settlement in a large hierarchy. |
| Add a building to a town | Select town, create child location. |
| Stock a shop | Find shop, add or edit inventory. |
| Place a town on a region map | Open region map, place or move settlement pin. |
| Plan travel | Calculate route between known locations. |
| Prep a dungeon encounter | Select dungeon room and create/attach encounter. |
| Review all shops | See all shops and stock status across the campaign. |
| Review all location encounters | See encounter prep by place. |

---

# Approach 1: Single Explorer / Single Workspace Only

## Model

Campaign World remains one page:

```text
Campaign > World
  Search/filter/tree
  Selected location detail
  All contextual sections on the same detail surface
```

The selected location profile changes section order and visibility, but there are no separate map, travel, shop, or encounter workspace modes.

## User Workflow

The DM starts with the location tree/search, selects a location, and works from that location detail page. Every task begins by finding a location first.

Example workflows:

- To stock a shop: search/select shop, use stock section.
- To prep a dungeon encounter: select room, use encounter section.
- To plan travel: open travel tool from the world page or selected region.
- To place map pins: select parent location, use embedded map panel.

## Approximate Click Counts

| Task | Clicks |
|---|---:|
| Find a town | 1-3 |
| Add building to town | 2-4 |
| Stock shop | 3-6 |
| Place town on region map | 4-7 |
| Plan travel | 2-5 |
| Prep dungeon room encounter | 4-8 |
| Review all shops | 5+ unless filtered |
| Review all encounters by location | 5+ unless filtered |

## Trade-Offs

### Strengths

- Simple navigation model.
- Strong sense of place: everything starts from the world hierarchy.
- Low implementation complexity.
- Good for small campaigns.
- Profile-aware ordering can reduce clutter without changing routes.

### Weaknesses

- Still risks becoming a giant location page.
- Tool-heavy workflows compete for space.
- Reviewing all shops, maps, or encounters requires filtering or repeated tree navigation.
- Map and travel workflows remain subordinate to location detail even when the DM thinks task-first.
- Scaling relies heavily on search/filter quality.

## Scaling To Hundreds Of Locations

This approach scales poorly unless search and filters become very strong. A DM with hundreds of places may not always remember where a shop, dungeon room, or encounter lives in the hierarchy. Global task views become necessary.

## Verdict

Good as a transitional step, but not enough long-term. It improves the current page by making it profile-aware, but it does not fully solve overloaded workflow problems.

---

# Approach 2: Separate Top-Level Campaign Pages

## Model

Maps, Travel, Shops, and Encounters become peers of World in campaign navigation:

```text
Campaign
  Overview
  World
  Maps
  Travel
  Shops
  Encounters
```

Each page is task-specific.

## User Workflow

The DM chooses the tool first:

- Want inventory? Go to Shops.
- Want a map? Go to Maps.
- Want travel? Go to Travel.
- Want combat prep? Go to Encounters.
- Want hierarchy? Go to World.

## Approximate Click Counts

| Task | Clicks |
|---|---:|
| Find a town | 1-3 in World |
| Add building to town | 2-4 in World |
| Stock shop | 2-4 in Shops |
| Place town on region map | 2-5 in Maps |
| Plan travel | 1-3 in Travel |
| Prep dungeon room encounter | 2-5 in Encounters, 4-7 if starting from World |
| Review all shops | 1-2 |
| Review all encounters by location | 1-2 |

## Trade-Offs

### Strengths

- Very clear task-oriented workflows.
- Scales well for global review tasks.
- Shops and encounters can have purpose-built list/table views.
- Maps can get a full canvas-oriented interface without crowding location detail.
- Travel can become a proper planner rather than a modal attached to World.

### Weaknesses

- Fragments the campaign workspace.
- Top-level navigation grows quickly.
- The DM may lose sense of place when switching between pages.
- A location detail may need duplicate summaries from Maps/Shops/Encounters.
- More routes and page shells to maintain.
- Might overstate the importance of Shops or Travel for campaigns that barely use them.

## Scaling To Hundreds Of Locations

This scales well for task-based review, especially shops and encounters. However, it can split related information across multiple pages. A DM preparing one town may need to bounce between World, Maps, Shops, and Encounters.

## Verdict

Powerful but too fragmented as the next architecture. It solves clutter by splitting the workspace apart, but risks making Campaign World feel like separate applications rather than one coherent campaign-prep environment.

---

# Approach 3: Hybrid World Workspace With Contextual Tools

## Model

Campaign navigation stays simple:

```text
Campaign
  Overview
  World
```

World gets internal workspace modes:

```text
World
  Explorer
  Maps
  Travel
  Shops
  Encounters
```

Explorer remains default. Other modes are focused tools inside the World workspace, not campaign top-level destinations.

Location profiles show contextual summaries and actions:

| Profile | Primary contextual tools |
|---|---|
| Area / region | Maps, Travel, child settlements/landmarks |
| Settlement | Maps, Shops, NPCs, local encounters |
| Building | NPCs, links, optional map |
| Shop | Stock, pricing, merchant, parent settlement |
| Dungeon | Floors, rooms, maps, encounters |
| Room | Links/exits, encounters, tactical map |
| Landmark | Map placement, travel relevance, encounter hooks |

## User Workflow

The DM can start either place-first or task-first.

### Place-first examples

- Select region, then open its map.
- Select town, then add districts/buildings.
- Select shop, then manage stock.
- Select dungeon room, then create encounter.

### Task-first examples

- Open Shops mode to review all shops.
- Open Maps mode to place unpinned locations.
- Open Travel mode to plan a route.
- Open Encounters mode to review all location-linked encounters.

The selected location should carry across modes where practical.

Example:

```text
Explorer: Brindleford selected
Maps: opens focused on Brindleford-related maps
Shops: filters to Brindleford shops if requested
Encounters: shows encounters in/under Brindleford
```

## Approximate Click Counts

| Task | Clicks |
|---|---:|
| Find a town | 1-3 |
| Add building to town | 2-4 |
| Stock shop from Explorer | 2-4 |
| Stock shop from Shops mode | 2-4 |
| Place town on region map from Explorer | 3-5 |
| Place town on region map from Maps mode | 2-5 |
| Plan travel | 2-4 |
| Prep dungeon room encounter from Explorer | 3-5 |
| Prep dungeon encounters from Encounters mode | 2-4 |
| Review all shops | 2 |
| Review all encounters by location | 2 |

## Trade-Offs

### Strengths

- Keeps Campaign navigation simple.
- Preserves World as the coherent mental model.
- Supports both place-first and task-first DM workflows.
- Avoids one giant location page by moving heavy editing into focused World modes.
- Scales better than a single explorer because global task views exist.
- Avoids top-level fragmentation because tools remain inside World.
- Lets location profiles expose only relevant tools.

### Weaknesses

- Requires clear World subnavigation.
- Requires state handoff between Explorer and modes.
- More complex than a single page.
- Needs careful labeling so modes do not feel like unrelated tabs.

## Scaling To Hundreds Of Locations

This scales best while preserving context.

For large worlds, the DM needs both:

1. a hierarchy to understand geography, and
2. task indexes to manage repeated objects such as shops, maps, and encounters.

The hybrid model supports both without forcing every task through the tree and without splitting world prep into unrelated top-level campaign pages.

## Verdict

Recommended. This is the simplest architecture that provides clear workflows without fragmenting the user experience.

---

# Recommended Detailed Navigation Model

## Campaign Navigation

Keep campaign-level navigation minimal:

```text
Overview | World
```

Do not add Maps, Travel, Shops, or Encounters as campaign top-level pages yet.

Reason: those concepts are world-prep tools. They are meaningful because of locations. Keeping them under World matches the DM mental model: “I am preparing the campaign world.”

## World Navigation

Add internal World navigation:

```text
Explorer | Maps | Travel | Shops | Encounters
```

### Explorer

Primary purpose:

> Browse, search, and edit the campaign geography.

Should include:

- location tree
- search/filter
- selected location detail
- profile-aware section ordering
- contextual tool shortcuts

### Maps

Primary purpose:

> Place locations, manage pins, measure distances, and navigate visually.

Should include:

- map list/filter
- active map canvas
- pin placement
- unpinned relevant locations
- distance measurement
- shortcut to Travel with selected distance

### Travel

Primary purpose:

> Plan and save journeys.

Should include:

- origin/destination selection
- map-derived distance where possible
- manual distance fallback
- terrain, roads, pace, weather
- journey log

### Shops

Primary purpose:

> Manage commerce across the campaign.

Should include:

- all shops
- parent settlement
- stock count
- missing stock / missing merchant indicators
- pricing view
- quick open shop detail

### Encounters

Primary purpose:

> Prepare and review location-linked encounters.

Should include:

- encounters grouped by location
- dungeon/floor/room filters
- missing-location filter
- planned/running/completed status
- quick create for selected location
- open full encounter builder

---

# Contextual Tool Behavior By Location Profile

## Area / Region

Primary actions:

- Open regional map
- Add settlement / landmark
- Plan travel from here
- View child locations

Secondary:

- Encounters in this area
- NPC/faction links

Hidden or collapsed:

- Stock
- Room-style navigation

## Settlement

Primary actions:

- Open settlement map
- Add district/building/shop
- Review shops in settlement
- Review NPCs here

Secondary:

- Local encounters
- Travel to/from settlement

Hidden or collapsed:

- Dungeon-style room flow unless children include dungeon/rooms

## Building

Primary actions:

- Edit notes
- Manage NPCs here
- Link exits/nearby locations

Secondary:

- Optional map/floorplan
- Encounters if present

Hidden or collapsed:

- Travel
- Stock unless shop profile

## Shop

Primary actions:

- Manage stock
- View pricing
- Manage merchant/NPC

Secondary:

- Parent settlement
- Shop notes
- Linked locations/exits

Hidden or collapsed:

- Maps unless floorplan exists
- Travel
- Encounters unless present

## Dungeon

Primary actions:

- Manage floors/rooms
- Open dungeon/floor maps
- Review encounters by room
- Link rooms/exits

Secondary:

- NPCs/factions
- Dungeon notes

Hidden or collapsed:

- Travel
- Stock

## Room / Floor

Primary actions:

- Room notes
- Encounters here
- Linked exits
- Open floor map

Secondary:

- Nearby rooms
- NPCs if present

Hidden or collapsed:

- Travel
- Stock
- Large-scale maps

## Landmark

Primary actions:

- Map placement
- Notes/lore
- Linked locations
- Encounter hooks

Secondary:

- Travel relevance

Hidden or collapsed:

- Stock
- Dungeon room tools unless landmark has dungeon children

---

# Implementation Migration Outline

No implementation should begin until the navigation model is approved.

## Phase 1: Profile-Aware Explorer

- Add location profile mapping.
- Reorder existing sections by profile.
- Hide/collapse low-value sections by profile.
- Keep existing data model and APIs.

## Phase 2: World Internal Navigation

- Add World subnavigation.
- Keep Explorer as default.
- Add placeholder or minimal modes for Maps, Travel, Shops, Encounters using existing components where practical.

## Phase 3: Focused Modes

- Move full map editing into Maps mode.
- Move journey log/planner into Travel mode.
- Add shop index/inventory workflow.
- Add location-linked encounter prep workflow.

## Phase 4: Optional Data Improvements

Only after workflow validation:

- add journey origin/destination location IDs
- improve encounter room/location linkage
- add map layer concepts
- add stronger location taxonomy if needed

---

# Final Recommendation

Use the **hybrid World workspace**.

Campaign World should remain the central mental model, but it should no longer be one generic location page that tries to show every tool at once. The Explorer should be profile-aware, and Maps, Travel, Shops, and Encounters should be focused modes inside World with contextual shortcuts from location details.

This gives DMs both ways of thinking:

- place-first: “I am working on this town/shop/dungeon room”
- task-first: “I need to review shops/maps/travel/encounters”

without turning the campaign into a fragmented set of unrelated top-level pages.
