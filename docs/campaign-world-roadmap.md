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

## In Progress

No active implementation phase.

## Planned

### Dungeon And Encounter Prep

- Goal: Continue improving Dungeon, Floor, and Room pages for session prep and running exploration.
- Value: Very high; these pages support immediate DM prep/play workflows.
- Rough effort: Medium to high, depending on whether work stays in profile cards or expands encounter editing.
- Dependencies: Existing encounter creation flow, location hierarchy, Room/Floor/Dungeon profile cards.
- Remaining opportunities: richer room/floor structure workflows and deeper room-level prep prompts beyond the first next-step prompt slice.

### Maps Workspace Polish

- Goal: Continue improving map list/editor usability, pin placement, navigation, and blank-grid map handling after the focused polish slices.
- Value: High; maps are the only dedicated World workspace and strongly affect location usability.
- Rough effort: Medium to high due to canvas interactions.
- Dependencies: Existing map model, map pins, `CampaignWorldMaps`, `CampaignWorldMapCanvas`.
- Remaining opportunities: deeper real-campaign mobile touch testing and targeted follow-ups from observed canvas friction.

### Travel Improvements

- Goal: Improve compact travel summaries and contextual route planning without embedding a full planner into profile pages.
- Value: Medium to high for travel-heavy campaigns.
- Rough effort: Medium.
- Dependencies: Existing journey log, Travel tool/modal, map distance APIs.

### Commerce Improvements

- Goal: Improve stock editing, merchant context, and pricing workflows on Shop pages.
- Value: Medium; important for shop-heavy campaigns but narrower than dungeon/map prep.
- Rough effort: Medium.
- Dependencies: Existing item APIs, location stock APIs, NPC links.

### Additional UX Tightening

- Goal: Reduce clutter, clarify copy/actions, and fix layout issues discovered through use.
- Value: High when based on observed friction.
- Rough effort: Low to medium.
- Dependencies: Browser QA and user feedback.

## Deferred

- Standalone Travel workspace.
  - Rationale: Travel currently works as a contextual tool/modal and compact summary. A workspace should wait for clear route-planning pain.
- Standalone Shops workspace.
  - Rationale: Shop workflows are currently strongest from Shop profile pages. A campaign-wide shop overview should wait for clear user need.
- Standalone Encounters workspace inside World.
  - Rationale: Encounters already have existing campaign flows and are contextual from Dungeon/Floor/Room pages. A World-specific encounter workspace should wait for clear review/prep pain.
- Major backend redesigns.
  - Rationale: Current UX phases use existing models and APIs adequately. Backend changes should be driven by specific limitations.
- Full map editor redesign.
  - Rationale: Maps needs polish first; redesign only if targeted improvements expose model or interaction limits.

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

Consider Contextual Travel Improvements as the next controlled bundle now that Dungeon prep and Maps have both received polish passes. Keep travel contextual to World/location pages and the existing calculator; do not introduce a standalone Travel workspace unless concrete route-planning pain emerges.
