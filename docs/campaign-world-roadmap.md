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
- World encounter cards reuse the main campaign encounter actions for Run, Edit, Clone, and Delete from location context, while leaving test/session-specific combat details out of compact management cards.
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
  - Image map forms preview the uploaded/current image and use image dimensions as read-only map resolution.
  - Map distance now auto-calculates when two pins are selected, and the same distance panel can calibrate map scale from a known distance between those pins.
  - Map pins now use the pinned location's existing type icon, such as settlement, shop, dungeon, room, or landmark.
- Shop layout refinement bundle:
  - Shop stock summaries now use compact non-zero status pills instead of a large repeated pricing grid.
  - Shop stock rows use compact item catalog glyphs, subtitles, and chips while surfacing shop-specific price, quantity, availability, and notes.
  - Shop creation supports templates for general stores, armouries, potion stores, taverns, magic shops, and black markets.
  - World NPC rows now show NPC avatars or initials beside their location role and notes.
- Dungeon Studio planning document added:
  - documents a grid-based dungeon/floor editor concept with tilesets, diagonal walls, doors, terrain layers, and room-region assignment back to Campaign World locations.
- Dungeon Studio forward plan clarified:
  - Documents the flexible dungeon-building workflow, save/exit prompt, tile/theme model, furniture/object catalog, vetted asset candidates, Campaign World dungeon presentation, multi-floor stairs, random generation, and user-uploaded asset phases.
  - recommends starting with studio metadata on existing CampaignMap records before considering backend schema expansion.
- Dungeon Studio Phase 1 shell:
  - Dungeon/Floor profiles open a location-scoped Studio route that creates or reuses a studio map, stores versioned metadata on `CampaignMap.metadata.studio`, and renders the read-only SVG grid shell.
- Dungeon Studio Phase 2 manual structure drawing:
  - Studio maps now support grid floor paint/erase, wall and diagonal wall toggles, door placement, undo/redo, dirty-state tracking, and save/reload persistence.
- Dungeon Studio Phase 3A shape drawing and auto-walls:
  - Studio maps now support grid-snapped rectangle/square rooms, round/oval room approximation from occupied floor cells, live shape previews with Escape cancellation, selected-region feedback, undo/redo, and undoable outer-wall generation that preserves door openings.
- Dungeon Studio Phase 3B terrain and cliffs:
  - Studio maps now support water, chasm, and cliff terrain cells; terrain erasing; cliff-edge features; distinct terrain rendering; cave floor styling; map-editor-style select/floor/terrain/delete modes; brush delete strokes; wall placement validation; undo/redo; and save/reload persistence.
- Dungeon Studio usability refinement bundle:
  - Wall tools now support drag strokes with one undo action, room fill treats doors as blockers, right-click erases contextually, delete targets are clearer, and Room mode has a compact workflow panel for naming, paint/fill, done/start-next, edit, and delete.
- Dungeon Studio editor UI cleanup:
  - Editor controls now follow a clearer tool layout with global save/undo/redo/zoom controls in the canvas toolbar, primary tools in the left palette, active tool options above the canvas, and contextual room/selection details in the inspector.
- Dungeon Studio interaction and UI cleanup:
  - Room actions now live in the contextual room inspector instead of being duplicated in top options; room state copy distinguishes new-room drafts from existing-room editing; wall/cliff-edge drag strokes axis-lock to avoid wobble edges; middle mouse drag pans the canvas; and decorative status panels/badges around the editor were simplified.
- Dungeon Studio Forward Phase 1-7 completion bundle:
  - Save moved beside Return to World with a three-choice unsaved-exit prompt, while the canvas toolbar now focuses on undo/redo/zoom/reset.
  - Room regions can be recolored, theme-overridden, linked to existing Campaign World Rooms, or used to create/link new Room locations.
  - Theme keys now cover cave, castle, cellar, forest, sewer, house, dungeon/stone, ruins, temple, crypt, shop, home, and town with lightweight SVG rendering and safe metadata parsing.
  - Object mode adds a reusable built-in glyph catalog for furniture, storage, decor, lighting, gates, traps, and stairs without bundling third-party assets.
  - Placed objects are normal `DungeonStudioEntity` records and can be inspected, rotated, duplicated, moved, deleted, saved, and reloaded.
  - Stairs can remain unresolved or link to existing Floor locations.
  - A deterministic local generator creates editable classic-room and cave maps with walls, optional room regions, stairs, and furniture from seed/settings.
  - User-uploaded image props are stored as private studio metadata and appear in the same catalog as built-in objects.
- Dungeon Studio refinement bundle:
  - Wall/cliff dragging now commits one locked continuous segment instead of painting parallel walls when pointer drift crosses grid rows or columns, including snapped diagonal wall strokes.
  - Wall tools show hover and drag previews for the exact segment/path that will be committed.
  - Blank studio maps now start with a choice between custom drawing and random generation; random generation previews the result before entering the full editor.
  - Object placeholders now use clearer in-repo vector shapes for common furniture, traps, lights, gates, and stairs while preserving the user-uploaded asset path.
  - Campaign World map cards now render tightly framed actual Dungeon Studio thumbnails, and Room profiles focus the preview around the linked room and adjacent rooms where available.
  - Dungeon/floor/room map cards hide older map tools when Dungeon Studio is the relevant map workflow, keeping Campaign World as preview/navigation/context rather than a duplicate editor.
  - The global location tree keeps rooms out of the broad overview unless selected or searched; floors remain nested under dungeons, and dungeon profiles show floor-first room navigation.
- Campaign World visual design refactor:
  - Location profiles now use clearer overview/detail tabs for map, places/floors, inventory, people, encounters, notes, and connections.
  - Region, town, dungeon, floor, room, and shop profiles are preview-first where map or Studio context exists.
  - Shop inventory rows surface price, quantity, availability, catalog value, notes, actions, and derived markup hints.
  - NPC-in-location workflows support role/notes entry and role editing using existing link records.
  - Create-location flow starts with location type selection and shows dungeon custom/random generation modes with a local preview before opening Dungeon Studio.
  - Location encounter actions now open a contextual local random encounter generator before saving to the campaign.
  - Map, NPC, stock, encounter, notes, travel, and dungeon-structure empty states are more compact and action-oriented.
  - Follow-up visual pass moved the page closer to the saved mockups: compact command bar, quieter location tree, removed always-on bottom World Summary/Travel panels, compact hero header with primary action, larger preview-first map cards, grouped child-place tiles, and category-grouped shop stock.
  - `docs/campaign-world-layout-model.md` records the current layout model, presentation rules, inventory metadata, generator flows, and map placeholders.
- Campaign World context-first redesign follow-up:
  - Replaced the generic equal-weight location detail grid with profile-specific scene layouts for regions, towns, dungeons/floors, rooms, and shops.
  - Region and town pages now prioritize map and place context, while support panels stack around travel, NPCs, encounters, and notes.
  - Shop pages now put inventory first, with merchant, notes, map position, and parent context as supporting content.
  - Dungeon and room pages now keep Dungeon Studio/map context, structure, encounters, exits, and prep cues in dedicated running surfaces.
  - Encounter cards on location pages now expose a more table-facing run panel with initiative, combatant summary, rewards, and run/test/edit actions.
  - Map placeholders were polished into intentional canvas previews rather than large empty boxes.
  - Narrow Campaign World routes now open on the selected place before the location tree, and app-shell route changes reset the internal scroll container.
- Campaign World and Dungeon Studio refinement pass:
  - Profile-specific scene layouts were tightened for Region, Settlement, Shop, Dungeon, Floor, Room, NPC, and Encounter contexts with wider support columns, safer wrapping, and less empty map/support imbalance.
  - Dungeon overview composition now keeps the map as the primary surface while structure and prep cards use the side column more consistently.
  - Dungeon Studio room-location sync now treats Studio-managed room anchors as authoritative: generated rooms create/link Room locations, renames update linked rooms, deleted rooms remove linked managed locations, duplicates are pruned, and save reconciliation repairs missing/stale links.
  - Generic Campaign World creation paths no longer offer free-standing Floor/Room creation for dungeon contexts; those records should come from Dungeon Studio map structure.
  - Light-mode Campaign World colors were brought closer to the dark-mode styling language using semantic tokens for cards, heroes, maps, chips, placeholders, and sidebar brand contrast.
  - Targeted browser QA covered Region, Settlement, Shop, Dungeon, Floor, Room mobile, NPC list, Encounter edit, and Dungeon Studio generated-room synchronisation.
- Campaign World contextual action and map navigation refinement:
  - Encounter creation now lives in the Encounter card for towns, dungeons, floors, and rooms instead of Prep Overview/header surfaces.
  - Notes cards expose add, edit, and delete controls in the note section, with note-clearing routed through the existing location update API.
  - Dungeon overview maps can render a child floor's Dungeon Studio map, and linked room hit targets navigate directly to the matching Campaign World Room.
  - Room map previews focus around the linked room with nearby connected rooms visible and fall back cleanly when a stale room focus ID is encountered.
  - Dungeon overview composition now places Prep Overview beneath the map and delays two-column dungeon/room scenes until the page content has enough width for the map to remain dominant.
  - Browser QA caught an SVG clickability edge case, so map room hit targets now use concrete rectangular SVG buttons instead of group-only hit areas.
  - Focused regression tests cover room click navigation, keyboard room navigation, preview padding/zoom behavior, town encounter tab actions, and notes tab controls.
- Campaign World persistent spatial layout refinement:
  - Region, town, dungeon, floor, and room profiles now keep map/spatial context above the detail tab bar so switching tabs does not bury the map.
  - Focused tab scenes no longer reinsert the map as a generic support card; tabs render only the changing detail surface and immediate supporting context.
  - Region and town overview scenes hide secondary empty encounter surfaces unless the Encounters tab is selected.
  - Dungeon, floor, and room scenes delay asymmetric grids until very wide viewports, preventing support panels from being squeezed inside a narrow detail pane.
  - Child-place tiles now use content-aware wrapping instead of viewport-only two-column breakpoints.
  - Room and floor map cards can use ancestor Dungeon Studio maps when direct parent maps do not provide the usable spatial preview.
  - `docs/campaign-world-layout-model.md` now records persistent spatial context, location-specific primary/secondary content, and responsive stacking rules.
  - Browser QA screenshots covered Region, Settlement, Shop, Dungeon, Floor, Room, NPC/People, Encounter, tablet dungeon/room, mobile room, and a light-mode room encounter pass.
- Campaign World layout consistency and component simplification pass:
  - Shop and room overview scenes now use a balanced wide-pane card flow instead of fixed primary/support buckets that left stock or prep cards stranded beside cramped columns.
  - Room connection language now uses Connected rooms where map topology is the source of truth, with inferred adjacent room links and connection types from Dungeon Studio map edges.
  - Compact encounter cards were simplified to name, status, short description, Run, and a More menu for Clone, Edit, and Delete; initiative/order details were removed from management cards.
  - Regression tests cover inferred room connections, connected-room rendering, balanced shop/room scene flow, and compact encounter management actions.
- Shop stock row presentation tweak:
  - Item prices now render as larger right-aligned row values instead of inline metadata pills, keeping quantity, catalog value, markup, rarity, and tags in the compact chip line.
- Shop inventory mockup-alignment pass:
  - Shop stock rows now prioritize product imagery, item name, and price over management metadata.
  - Adjust and Remove moved into a compact row overflow menu so inventory scans as merchandise rather than controls.
  - Add Stock now follows choose items, configure selected items, and review sections with searchable item cards and inline configuration.
  - `docs/campaign-world-layout-model.md` records the product-shelf inventory hierarchy and guided Add Stock flow.
- Shop Add Stock simplification pass:
  - Add Stock now behaves as a focused Choose, Configure, Review stepper instead of showing catalogue, configuration, and review content at the same time.
  - Catalogue choices, selected-item summaries, and configure controls were reduced in density and recolored with existing Campaign World surface tokens.
  - Shop row price blocks now use semantic card/border tokens while retaining price hierarchy through placement and type scale.
- Dungeon Studio workflow refinement pass:
  - Add Location no longer duplicates the custom-vs-random dungeon decision; new dungeons open Dungeon Studio, where the blank-map start screen owns the single custom/generated choice.
  - Studio tools now default to Room select with Rectangle as the default brush, and the palette follows the main map-building order: Floor, Room, Door, Wall, Terrain, Objects, Delete.
  - Room creation now starts from Add room in the top options bar, exposes single/rectangle/circle/fill brush choices there, and returns to Room select after the single room Save action.
  - Removed duplicate side-panel room creation/link controls; standard room connections are reconciled from Dungeon Studio topology into generated Campaign World links on save.
- Encounter Builder unification first pass:
  - Main campaign encounter creation and Campaign World location encounter actions now open the same Encounter Builder.
  - The first step is a single Custom Encounter or Random Encounter choice.
  - Campaign World launches preselect the originating location and save the encounter back to that location.
  - Custom and random flows share party/allies/enemies, details, review, save, and the existing full encounter editor after creation.
  - Random encounters now use archetype-style presets, challenge, enemy count, terrain, location theme/notes, boss, and minion options with a regenerate/accept preview loop.
  - Focused regression tests cover the single first decision, Add All Party Members, random regenerate/accept, location preselection, save payloads, and opening the normal editor.
- Encounter edit polish pass:
  - Encounter Edit now follows the unified builder visual language with a compact hero, primary difficulty summary, section navigation, grouped Party/Allies/Enemies rosters, and overview/details/notes/running support panels.
  - Add Enemy and Add Ally now use searchable portrait-led catalogue dialogs with filters, preview cards, quantity steppers, roles, and ally tabs for NPCs, creatures, summons, and custom allies.
  - Generated random previews now show portrait-first enemy cards with AC, HP, CR, roles, and quantities while preserving settings across repeated Regenerate actions.
  - Combatant rows now prioritize portrait, name, AC, HP, CR, role, quantity, and contextual row actions.
  - Focused regression tests cover edit layout sections, add dialogs, richer rows, difficulty summaries, portrait rendering, quantity behavior, contextual actions, regenerate preservation, and clean initial dirty-state handling.
  - Browser QA contact sheet covers create, random, generated preview after repeated regenerations, edit, Add Enemy, Add Ally, desktop, tablet, dark mode, and light mode.
- Encounter Builder random refinement pass:
  - Random archetype options now use attributed Game-icons.net SVG masks with semantic theme colors.
  - Number of enemies uses a bounded keyboard-accessible stepper instead of a select.
  - The generated preview reuses the edit-screen difficulty summary and shows party avatars plus portrait-led enemy combat stats.
  - Regenerate preserves selected party and random options while rerolling the generated enemy preview.
  - Focused regression tests cover icon metadata/rendering, stepper behavior, preview AC/HP/CR/quantity, party avatars, difficulty reuse, regenerate persistence, and theme-token rendering.
  - Browser QA contact sheet covers Random setup, archetype icons, stepper, generated preview after regenerations, accepted preview transition, desktop/tablet, and light/dark modes.
- DM-only encounter flow refresh:
  - Custom/random builder steps now use compact combatant cards, clearer selected-archetype contrast, a sticky generated preview, and a persistent review action row.
  - Encounter Edit is a roster-and-review workspace with Party/Allies/Enemies context, details and DM notes, readiness cues, and one Run/Test action location.
  - Physical initiative setup keeps player rolls manual, supports NPC/ally generation and overrides, accepts zero/negative values, clears values back to unresolved, previews turn order, and preserves explicit tie ordering.
  - Encounter runs cannot begin while any initiative remains unresolved; the backend guard and clear paths are covered by store integration tests.
  - The live tracker now prioritizes the active actor, action picker, target, turn order, compact target rows, and progressively disclosed Overview/Actions/Defenses details.
  - Focused frontend tests cover builder, editor, initiative, action selection, tracker hierarchy, target treatment, and progressive combat sheets.
- Campaign World dungeon information-density cleanup:
  - Dungeon overview now uses the floor/room navigation card as the single dungeon hierarchy surface instead of repeating a separate Dungeon structure card.
  - Prep Overview stays on overview scenes while encounters, people, notes, and connections tabs render only their relevant detail cards.
  - Room/floor navigation chips now keep useful encounter, NPC, and connection counts while hiding map/notes/no-exit status badges and generated cell-count summaries.
  - Connected-room rows use route-first readable text such as Door to Guard Room, with safe fallbacks for unnamed or stale linked rooms instead of UUIDs/internal IDs.
  - Focused regression tests cover duplicate dungeon hierarchy removal, cell-count hiding, useful prep counts, overview-only prep, tab-specific connections, connected-room fallback text, and Dungeon Studio room sync summaries.
- Campaign World page alignment cleanup:
  - The command banner, workspace tabs, location browser, and detail pane now share the same workspace-width container instead of mixing a full-width hero with a separately centered detail area.
- Campaign World usability audit follow-up:
  - Replaced the icon-only create affordance with a labelled New location action in the location-browser header.
  - Removed campaign-level encounter creation from the World header so encounters begin from the location where they occur.
  - Shop inventory and encounters now live in dedicated tabs instead of expanding the overview into a long management page.
  - Location edit/delete actions moved into a secondary More menu, keeping the profile's context action prominent.
  - Removed non-functional town starter checkboxes and reduced route-specific gradients, shadows, and nested surface effects.
  - Shared location headers now use the semantic hero gradient, render entity type once, filter duplicate type tags, and leave map placement to map context.
  - Campaign World page rows remain content-sized so headers and navigation do not stretch across unused viewport height.
  - Focused tabs render a single available section at full width without a repeated tab heading, empty second column, or duplicate outer padding.
  - The location browser is one rounded, clipped surface, and tablet shell breadcrumbs no longer wrap inside the fixed-height top bar.

## In Progress

- Campaign World mockup-alignment redesign.
  - Acceptance is visual and structural alignment with `docs/design/campaign-world-refactor/`, not feature presence alone.
  - Current focus: close remaining mockup fidelity gaps after the layout-consistency pass, especially authored placeholder/map art, clean seeded map coverage, and final light-theme nuance.
  - Active iteration areas: browser screenshot comparison against the saved mockups, light/dark parity review, and preserving Dungeon Studio as the source of truth for generated dungeon floors and rooms.
- Campaign World styling consolidation.
  - Route-scoped blue palette overrides are being replaced with shared semantic tokens and the global accent selector so Campaign World reads as a workspace, not a separate product.
  - Shared status, chip, and surface styling should continue to converge on the same design language used by campaign overview and import/export pages.

## Planned

- Monitor Dungeon Studio use for concrete follow-ups around per-tile theme painting, generator add-to-current-layer UX, backend-backed reusable asset storage, generated/artist-made asset policy, and create-floor-from-stair convenience.
- Add backend-backed shop price rules/markup, restock cadence, and transaction history if real shop play needs richer stock modelling.
- Add backend/AI generation for town starter content and random encounters if local deterministic placeholders prove too limited.
- Continue mockup-comparison passes until the major Campaign World screens are recognisably in the same design language as the saved refactor mockups, with special attention to authored map/placeholder visuals and any remaining light-theme rough edges.
- Normalize demo/seed map coverage so region, town, floor, and room examples consistently exercise the intended Studio or image preview paths rather than fallback placeholders.
- After the mockup-alignment pass is structurally accepted, continue real-table polish around richer authored/generated map art for locations without uploaded maps and stronger NPC portrait-first profile routes if NPC-heavy play needs them.
- Continue Encounter Builder polish against `docs/encounter-creation/`, especially richer creature matching and temporary custom allies/summons as first-class records.

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
- Dungeon Studio per-tile theme painting, generator add-to-current-layer UX, backend-backed reusable asset storage, generated/artist-made asset policy, and create-floor-from-stair convenience.
  - Rationale: The implemented metadata-backed foundations cover current actionable phases; these are workflow expansions that should be driven by observed editor use, licensing policy, and metadata-size limits.

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

Continue Campaign World mockup-alignment redesign with browser screenshots for Region, Settlement, Shop, Dungeon, Floor, Room, NPC, and Encounter contexts. Do not treat the issue as complete until those screens are visually and structurally close enough to be mistaken for the saved mockup direction.
