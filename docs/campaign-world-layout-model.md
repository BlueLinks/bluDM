# Campaign World Layout Model

Campaign World is a place-first workspace. The left browser selects a location, but the detail pane is the primary canvas. Focused location pages use a compact hero, strong preview panel, and a small number of contextual sections instead of broad always-on dashboard panels.

## Presentation rules

- The world route uses a compact command bar; global World Summary and Travel panels are not shown below focused location pages.
- The location browser is intentionally narrow and quiet so the selected place remains visually dominant.
- Every location opens with a compact hero: breadcrumb, icon, type pill, title, short subtitle, useful stats, primary action, and secondary actions.
- Region, town, dungeon, floor, and room profiles keep spatial context above the tab bar. The tab bar changes the details beneath the map; it must not bury the map or duplicate it inside each tab.
- The default tab is **Overview**. It prioritizes a map/preview or inventory panel, then only the context a DM likely needs at the table.
- Secondary tabs progressively disclose details: places/floors, inventory, people, encounters, notes, and connections. Tab content should contain the card that changed and a small amount of supporting context, not the whole page again.
- Empty states explain missing prep with one clear next action and use map/grid placeholders where visual context matters.

## Responsive composition

- Desktop uses asymmetric columns only when the detail pane has enough real width; otherwise sections stay stacked so cards do not become narrow just because the overall viewport is wide.
- Shop and room overview pages use a balanced card flow on very wide panes instead of fixed left/right buckets. Source order still defines priority, but cards may wrap into two visual columns to avoid one tall cramped support column beside an empty primary column.
- Tablet stacks the spatial anchor first, then the active tab content, then secondary/support cards.
- Mobile is single-column. The selected place, persistent map/preview, and current tab content appear before secondary cards.
- Repeated child-place tiles use content-aware wrapping so a two-column layout only appears when each tile can remain readable.
- Shops are the main exception to persistent map-first composition: inventory and pricing are primary, while map position remains secondary.

## Location types

- **Region**: persistent region map first, then settlements/landmarks, travel context, and regional notes. Encounters stay behind the Encounters tab unless they are the active task.
- **Town / settlement**: persistent town map or placeholder, grouped places by type, people/NPCs, travel from here, and notes. Commerce, encounters, and route details stay secondary unless selected.
- **Shop / business**: inventory and pricing first, category-grouped stock rows, merchants/staff, encounters if present, notes, map position, and parent context.
- **Dungeon**: persistent dungeon map preview first, then nested floors/rooms, prep cues, encounters, connections, and notes. Dungeon profiles link to Dungeon Studio.
- **Floor**: persistent floor map preview, rooms, prep cues, encounters, connected spaces, and notes.
- **Room**: persistent room preview first, focused to the linked Studio room where possible; encounters, connected rooms, NPCs present, and room notes sit beneath the tab bar. Connected rooms are inferred from Dungeon Studio room adjacency and map edges when possible, with manual links as supplementary records.

## Dungeon, floor, and room nesting

Dungeons own floors and direct rooms. Floors own rooms. Room locations are hidden from the broad overview unless selected or searched so the world browser stays readable; room navigation is surfaced inside dungeon/floor profiles.

Dungeon Studio remains the map editor. Campaign World renders Studio thumbnails and contextual room focus rather than duplicating editing controls. Room and floor pages may look up usable Dungeon Studio maps through their dungeon ancestry so spatial context remains available even when the Studio map is attached higher in the hierarchy.

Room connectivity should be read from the Studio topology before falling back to authored link text. Adjacent room regions with open edges are passages; explicit door, secret-door, gate, or stair-like map records should be shown as the connection type. Campaign World should avoid empty connected-room states when the map already proves a valid connection.

## Shop inventory metadata

Shop stock uses existing `CampaignLocationStock` fields:

- item link (`itemId`, `librarySource`)
- quantity
- price amount and currency (`cp`, `sp`, `ep`, `gp`, `pp` where supported by the currency selector)
- availability
- notes

The frontend now displays category-grouped stock sections with product-style item rows, prominent price blocks, quantity, catalog value, availability, notes, overflow actions, and a derived markup hint when the stock currency matches the catalog currency.

The shop inventory presentation should read as a product shelf, not an admin table. Stock rows prioritize item artwork/icon, item name, and a large right-aligned shop price. Category, rarity, availability, quantity, tags, catalog value, markup, and source stay as quieter metadata. Row management actions live in a compact overflow menu so Adjust/Delete do not compete with the product content.

Add Stock follows a lightweight three-part workflow that shows one primary pane at a time:

1. Choose items from searchable image cards, or add a custom item.
2. Configure selected items inline with quantity, price, currency, availability, and notes.
3. Review selected stock before committing.

The modal should use Campaign World surface tokens, compact step tabs, a short selected-item strip, a focused scroll area, and a sticky footer for the current primary action. It should avoid showing catalogue, configuration, and review sections all at once.

Backend follow-up: add explicit stock metadata for price rules/markup, restock cadence, hidden stock, and transaction history if shop-heavy campaigns need it. Today those details belong in stock notes.

## Generators

### Random encounter generator

Location encounter actions open a contextual local generator. It supports selected location, environment/theme, party level, difficulty, encounter type, a location-lore toggle, seed, generated result, regenerate, discard, and save-to-location.

The generator is deterministic/local placeholder logic. Future AI or backend generation should preserve the same save contract and location context.

Compact encounter cards in Campaign World are management cards, not combat-session surfaces. They show name, status/difficulty when available, short description, Run, and a More menu for Clone, Edit, and Delete. Initiative order and deeper combat state belong in the run/session context.

### Random dungeon generator

Creating a dungeon now asks for Fully Custom or Random Generation. Random Generation shows a Dungeon Studio preview and seed before creation. After creation, dungeon locations open the Studio route for editing/acceptance.

Starter settlement options are shown as planning toggles for generated places, NPCs, map placeholder, and districts. Backend creation of those starter records is deferred.

## Map placeholder behaviour

When no map exists, Region/Town/Dungeon/Floor profiles show a generated-style grid placeholder with an add-map action. Shop/Room profiles show map position context and can open the relevant parent map or Dungeon Studio where available.

Map tools remain contextual and hidden until requested.
