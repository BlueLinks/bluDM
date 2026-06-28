# Campaign World Roadmap

## Vision

Campaign World is the campaign-level place for world structure, location prep, and contextual tools.

```text
Campaign
├─ Overview
└─ World
   ├─ Explorer
   └─ Maps
```

Explorer is the default place-first workflow. Location pages are profile-aware so Region, Town, Dungeon, Floor, Shop, and Room pages prioritise different DM tasks without becoming one giant generic page.

Maps is the only dedicated World workspace for now. Travel, encounters, and commerce remain contextual tools and profile sections unless future use clearly justifies broader workspace changes.

## Completed

- Route-addressable World locations.
- `/world`, `/world/location/:locationId`, and `/world/maps` routes.
- Browser reload and back/forward support for selected locations.
- Location profile detection for Container variants, Shop, and Room.
- Profile-aware location layouts and card ordering.
- Shared profile header, primary actions, secondary actions, and badges.
- Hierarchy breadcrumbs, parent context, child context, and clickable child/link rows.
- Tree expansion to route-selected locations.
- Filter-hidden selected-location notice and missing-location fallback.
- Map visibility rules:
  - Region/Town/Dungeon/Floor show map cards.
  - Shop/Room show compact map summaries.
  - Full map editing remains in Maps.
- Compact travel summaries for Region/Town and relevant Dungeon contexts.
- Shop stock and pricing surfaced as the dominant Shop workflow.
- Room/Dungeon/Floor encounters and exits made more prominent.
- Docker-served browser QA pass for route, profile, map, hierarchy, filter, and narrow-layout behavior.
- `make verify` and Docker rebuild validation for Phase 1/2 work.
- Dungeon/Floor/Room prep overview card with ready-to-run signals.
- Dungeon structure card now surfaces child floor/room navigation.
- Dungeon/Floor encounter lists include descendant location encounters.
- World encounter cards reuse the main campaign encounter actions for Run, Test, Edit, and Clone from location context.
- Encounter creation from Room/Floor pages now carries clearer room context.
- Maps workspace polish slice:
  - clearer map selection/list cards in the existing Maps workspace.
  - explicit pin placement counts, active placement cancel affordance, and placed/unplaced labels.
  - more visible map-to-location navigation from pinned-location rows.
  - zoom state, reset availability, pan/touch affordances, and blank-grid map guidance.
- Narrow Campaign World profile headers now keep action groups left-aligned on mobile while preserving desktop alignment.
- Dungeon/Floor child rows now show lightweight prep chips for child spaces, encounters, exits, notes, and map context where existing page data supports it.
- Room prep overview now surfaces compact next-step prompts for missing encounters, exits, notes, and map placement.
- Dungeon prep polish bundle:
  - encounter cards show compact status summaries.
  - Room profile encounter actions are less duplicated while preserving an obvious primary action.
  - Dungeon/Floor child lists show aggregate incomplete-child prep summaries from existing page data.
- Maps workspace polish follow-up bundle:
  - map selection cards show per-map pin coverage, map scope, and selected state.
  - pin placement lists separate unplaced and placed locations with clearer status/action labels.
  - map canvas supports focus, keyboard pan/zoom/reset, Escape placement cancel, and clearer pin/control labels.
  - map controls, placement callouts, and pinned-location actions wrap more safely for narrow and touch layouts.
  - focused Campaign World map tests cover coverage summaries, placement scanability, and keyboard/cancel behavior.
- Contextual travel improvements bundle:
  - Plan Travel from location pages now opens the existing calculator with that location prefilled as the route origin.
  - Travel cards show distance, terrain, and pace context for relevant saved journeys.
  - Journey log cards identify world-linked origins/destinations and direct-distance entries.
  - Travel panel summary shows saved route, world-linked route, and direct-distance counts.
- Commerce improvements bundle:
  - Shop stock rows now show item catalog context, quantity, price, availability, and notes more clearly.
  - Existing stock can be adjusted from the Shop page and pricing review without leaving the profile.
  - Shop pricing summary calls out priced, market-price, limited, hidden, and special-order inventory.
  - Shop NPC sections are merchant-aware, including merchant/staff copy, merchant notes, and merchant relationship links.
  - Focused Campaign World commerce tests cover inventory summaries, stock adjustment, pricing, and merchant links.
- Additional UX Tightening bundle:
  - Campaign World profile headers now emphasize the place name, profile type, summary, tags, and parent context while moving generic actions into contextual sections.
  - Map, link, NPC, encounter, shop stock, and travel copy now favors DM-facing status language over implementation/count labels, with lower-priority map counts moved into expandable details.
  - Location detail cards use two-column desktop layouts where practical while preserving narrow wrapping behavior.
  - Demo seed data now includes realistic regions, settlements, shops, merchants, NPC links, dungeon floors/rooms, encounters, exits, maps, pins, stock, and travel routes.
- Dungeon and encounter prep follow-up bundle:
  - Prep overview cards now include compact running cues for scene focus, threats, routes, and note/map references.
  - Room next-step prompts now pair actions with table-facing prep questions for threats, routes, notes/secrets, and map position.
  - Focused prep overview tests cover running cues and deeper room prompts.
- Location picker refinement bundle:
  - World location search now sits directly above the tree in the left picker without widening the sidebar, replacing the former top filter bar.
  - Compact icon actions let DMs add a location or expand/collapse large visible location trees in one step.
  - Location tree rows now use a consistent gutter/button grid and stable row gaps so spacing does not shift between expanded and collapsed states.
- Map refinement audit bundle:
  - Map mode now reveals a collapsible map workspace above the location profile instead of replacing the rest of the location page.
  - Location map summary cards now remove redundant status/count/details copy and use a single Show map tools action.
  - Map zoom/reset/grid controls now live on the canvas, and pan/zoom is constrained so the view cannot expose canvas outside the map.
  - Placed-pin management moved onto map pins with Open, Move, and Remove actions, while the side list focuses on missing placements only.
  - The Map profile card now owns the single Show/Hide map tools toggle, embedding tools beside the map frame instead of using a separate top workspace disclosure.
  - Map tools now render the single active map directly in the Map card instead of nesting a redundant Maps selector frame.
  - Map canvas supports scroll-wheel/trackpad zoom anchored under the pointer while preserving the existing bounds clamp and consuming page scroll while the pointer is over the canvas.
  - Existing maps can be edited after creation, including replacing a blank map with an uploaded image while preserving pin positions by their prior x/y percentages.
  - Map pins now use the pinned location's existing type icon, such as settlement, shop, dungeon, room, or landmark.

## In Progress

No active implementation phase.

## Planned

No active Campaign World implementation items remain planned for this PR.

## Deferred

- Standalone Travel workspace.
  - Rationale: Travel currently works as a contextual tool/modal and compact summary. A workspace should wait for clear route-planning pain.
- Standalone Shops workspace.
  - Rationale: Shop workflows are currently strongest from Shop profile pages. A campaign-wide shop overview should wait for clear user need.
- Standalone Encounters workspace inside World.
  - Rationale: Encounters already have existing campaign flows and are contextual from Dungeon/Floor/Room pages. A World-specific encounter workspace should wait for clear review/prep pain.
- Major backend redesigns.
  - Rationale: Current UX phases use existing models and APIs adequately. Backend changes should be driven by specific limitations.
- Embedded encounter editing inside World profile cards.
  - Rationale: Dungeon/Room pages now surface running cues, creation entry points, and links to existing encounter editing. More editing UI should wait for specific prep friction rather than duplicating existing encounter flows.
- Full map editor redesign.
  - Rationale: Maps needs polish first; redesign only if targeted improvements expose model or interaction limits.
- Additional Maps workspace polish beyond the completed slices.
  - Rationale: The remaining map notes are deeper real-campaign mobile touch testing and targeted canvas follow-ups. Those should be driven by observed canvas friction rather than speculative UI changes in this PR.
- Additional Travel improvements beyond the completed contextual travel bundle.
  - Rationale: Saved-route filtering and stronger journey naming prompts should wait for travel-heavy campaign use to show concrete friction.
- Additional Commerce improvements beyond the completed shop-profile bundle.
  - Rationale: Campaign-wide shop review, restock reminders, and richer merchant pricing rules should wait for shop-heavy play needs instead of expanding scope in this PR.

## Rejected

- One giant generic location page.
  - Rationale: It overloads every profile with every possible tool and hides the DM’s current intent.
- Separate campaign-level Maps, Travel, Shops, and Encounters applications.
  - Rationale: This fragments Campaign World, expands top-level navigation, and weakens place context.
- Adding all possible World workspace modes immediately.
  - Rationale: Future work should be evidence-driven and incremental, not based on speculative workspace completeness.
- Making Dungeon a standalone top-level profile outside Container variants.
  - Rationale: The approved model treats Dungeon and Floor as specialised Container variants for now.

## Next Recommended Task

No remaining Campaign World roadmap item is planned for this PR. Future Campaign World work should start from a deferred item only when concrete play or QA friction justifies reopening it.
