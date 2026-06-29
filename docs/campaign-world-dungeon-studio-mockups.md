# Campaign World Dungeon Studio Mockups

## Purpose

These mockups define the target UX for Dungeon Studio before implementation. They are intentionally aligned with bluDM's current design language: card sections, rounded borders, compact action rows, muted helper copy, accent icons, small status pills, and profile-aware Campaign World workflows.

The goal is not to copy a VTT. The goal is a DM prep tool that feels like the rest of Campaign World while using common map-editor patterns: top command bar, left tool palette, central canvas, right inspector, layer controls, and contextual bottom status.

## Design Principles

- Keep Campaign World context visible: breadcrumb, location name, parent floor/dungeon, and return action.
- Prefer compact controls over floating tool chaos.
- Use modes rather than showing every editor option at once.
- Make the canvas the visual focus.
- Use the right panel for the selected tool/object/layer settings.
- Preserve existing bluDM patterns:
  - `CardSection`-style framed panels.
  - `SectionHeader`-style headings with icon + meta.
  - `ActionRow` button groups.
  - rounded status chips and badges.
  - muted dashed empty states.
- Avoid permanent vertical clutter. Advanced settings should live in collapsible groups.
- Everything important should be usable from mouse/pointer first; shortcuts are accelerators, not requirements.

## Visual Tokens To Reuse

| Existing Pattern            | Dungeon Studio Use                                |
| --------------------------- | ------------------------------------------------- |
| Accent circular icon chip   | Current mode/tool icon                            |
| Rounded bordered card       | Tool palette, inspector, layer stack              |
| Muted panel / dashed border | Empty layers, unassigned rooms, no NPC selected   |
| Small uppercase pill        | Tool mode, layer type, dirty state, room coverage |
| Secondary buttons           | Toolbar commands, generator preview/apply         |
| Ghost buttons               | Lightweight canvas actions, row actions           |
| Danger button               | Clear map, delete room region/entity              |

## Desktop Layout: Default Structure Mode

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Campaign / World / Lantern Vault / Upper Vault                         Saved  •  Return      │
│ Dungeon Studio                               Dungeon tileset  40×30  5 ft grid  [Save] [⋯]  │
├──────────────┬───────────────────────────────────────────────────────────────┬───────────────┤
│ Tools        │ Canvas toolbar                                                │ Inspector     │
│              │ [−] 100% [+] [Fit] [Grid ✓] [Labels ✓] [Snap ✓] [Undo] [Redo] │ Structure     │
│ ● Structure  ├───────────────────────────────────────────────────────────────┤ Floor Brush   │
│   Floor      │                                                               │               │
│   Erase      │      ╔══════════════╗        ╔════════════════╗               │ Brush size    │
│   Wall       │      ║ Room A       ║──door──║ Guard Room     ║               │ [ 1 cell  v ] │
│   Diagonal   │      ║              ║        ║                ║               │               │
│   Door       │      ╚══════╗   ╔═══╝        ╚═══╲════════════╝               │ Draw mode     │
│              │             ║   ║                 ╲                          │ (•) Paint     │
│ Terrain      │             ║   ║                  ╲                         │ ( ) Erase     │
│ Rooms        │        water░░░░░░░                  ╲                        │               │
│ NPCs         │        water░░░░░░░        cliff ▒▒▒▒▒▒▒                      │ Tips          │
│ Labels       │                                                               │ Drag to paint │
│              │                                                               │ Shift: erase  │
│ Generator    │                                                               │               │
├──────────────┴───────────────────────────────────────────────────────────────┴───────────────┤
│ Layers: Floor ✓  Walls ✓  Doors ✓  Terrain ✓  Rooms ✓  NPCs ✓     Unassigned floor: 28 cells │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Notes

- Top header should feel like Campaign World, not a separate application.
- The left rail is a compact mode/tool palette.
- The canvas toolbar is horizontal and canvas-specific.
- The right inspector changes based on current mode/tool/selection.
- Bottom layer/status bar provides quick visibility toggles and map health signals.

## Structure Mode Detail

```text
┌ Tools ─────────────┐
│ ● Structure         │
│ ┌─────────────────┐ │
│ │ ▦ Floor Brush   │ │ active
│ │ ⌫ Erase         │ │
│ │ ▭ Rectangle     │ │
│ │ □ Square        │ │
│ │ ○ Round         │ │
│ │ ◯ Oval          │ │
│ │ ║ Wall Edge     │ │
│ │ ╱ Diagonal Wall │ │
│ │ ▣ Door          │ │
│ └─────────────────┘ │
│ Terrain             │ collapsed group
│ Rooms               │
│ NPCs                │
│ Labels              │
│ Generator           │
└─────────────────────┘

┌ Inspector ───────────────┐
│ Structure                │
│ Floor Brush              │
│                          │
│ Brush shape              │
│ [Single] [Rect] [Circle] │
│                          │
│ Operation                │
│ (•) Paint floor          │
│ ( ) Erase floor          │
│                          │
│ Snap                     │
│ [✓] Snap to grid         │
│                          │
│ Quick actions            │
│ [Fill enclosed room]     │
│ [Trace wall outline]     │
└──────────────────────────┘
```

### Common Tool Practices Applied

- Use one active tool at a time.
- Tool settings appear in the inspector, not in a modal.
- Erase exists both as a tool and modifier shortcut.
- Advanced structure helpers are explicit actions, not hidden behaviors.
- Exposed floor edges render as implicit boundary walls by default, so an outer-wall helper is no longer part of the primary workflow.

## Terrain Mode With Caverns, Cliffs, And Water

```text
┌ Tools ─────────────┐       ┌ Inspector ───────────────────────┐
│ Structure           │       │ Terrain                          │
│ ● Terrain           │       │ Chasm / Cliff                    │
│ ┌─────────────────┐ │       │                                  │
│ │ ≋ Water         │ │       │ Terrain type                     │
│ │ ▒ Chasm         │ │ active│ [Chasm / pit v]                  │
│ │ ⛰ Cliff edge    │ │       │                                  │
│ │ ░ Rubble        │ │       │ Edge behavior                    │
│ │ ⚠ Hazard        │ │       │ [✓] Draw cliff edge automatically│
│ └─────────────────┘ │       │                                  │
│ Rooms               │       │ Style                            │
│ NPCs                │       │ Fill: dark void                  │
│ Generator           │       │ Edge: amber warning line         │
└─────────────────────┘       └──────────────────────────────────┘
```

Canvas visual intent:

```text
Stone floor cells:      light muted fill
Cave floor cells:       rough irregular edge styling
Water cells:            blue translucent fill with wave marks
Chasm cells:            dark fill
Cliff edge features:    amber/brown edge stroke with small tick marks
Hazards:                accent/destructive toned hatch
```

## Room Layer Editor Mockup

The Room Layer editor is the key workflow after the basic physical map exists.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Dungeon Studio / Room Layers                                      Unsaved changes  [Save]    │
├──────────────┬───────────────────────────────────────────────────────────────┬───────────────┤
│ Tools        │ Canvas toolbar                                                │ Room Region   │
│ Structure    │ [Select] [Paint cells] [Erase cells] [Show unassigned ✓]      │ Selected: A3   │
│ Terrain      ├───────────────────────────────────────────────────────────────┤               │
│ ● Rooms      │                                                               │ Linked room   │
│   Select     │      ┌──────────── translucent teal overlay ────────────┐     │ [Guard Room v]│
│   Paint      │      │ Guard Room                                      │     │               │
│   Fill       │      │ 12 cells                                        │     │ Label         │
│   Erase      │      └─────────────────────────────────────────────────┘     │ [Guard Room]  │
│              │                                                               │               │
│ NPCs         │      Unassigned floor cells shown with dotted outline         │ Color         │
│ Generator    │                                                               │ [ teal v ]    │
│              │                                                               │               │
│              │                                                               │ Quick actions │
│              │                                                               │ [Create Room] │
│              │                                                               │ [Open Room]   │
│              │                                                               │ [Clear Region]│
├──────────────┴───────────────────────────────────────────────────────────────┴───────────────┤
│ Rooms: Guard Room 12 cells • Cistern 28 cells • Unassigned 19 cells                          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Room Editor Behavior

- Selecting cells does not immediately create a Room location.
- The inspector offers `Create Room` or `Link existing room`.
- Room overlays use translucent colors and labels.
- Unassigned floor cells are visually called out but not treated as an error.
- Room profile pages can later show a mini-preview of the assigned region.

## Random Generator Panel Mockup

Generation should be a panel inside Dungeon Studio, not a separate page.

```text
┌ Generator ──────────────────────────────────────────────┐
│ Start with a generated draft, then edit it by hand.      │
│                                                          │
│ Structure type                                           │
│ [Classic dungeon v]                                      │
│                                                          │
│ Preset                                                   │
│ [Balanced rooms and corridors v]                         │
│                                                          │
│ Size                                                     │
│ [40] columns   [30] rows   [5 ft] cells                  │
│                                                          │
│ Controls                                                 │
│ Room count     [────●────] 12                            │
│ Corridor bend  [───●─────] Medium                        │
│ Door chance    [──────●──] High                          │
│ Water/chasm    [─●───────] Low                           │
│                                                          │
│ Seed                                                     │
│ [ lantern-vault-001                  ] [Randomize]       │
│                                                          │
│ [Preview] [Regenerate] [Apply to map]                    │
│                                                          │
│ Apply behavior                                           │
│ (•) Replace current structure                            │
│ ( ) Add as new layer                                     │
└──────────────────────────────────────────────────────────┘
```

### Generator Preview State

```text
┌──────────────────────── Preview ────────────────────────┐
│                                                          │
│  Mini map preview with room/corridor/chasm colors        │
│                                                          │
│  Generated: 11 rooms • 18 doors • 2 chasms • 1 pool      │
│  Room regions can be created automatically.              │
│                                                          │
│ [Apply and create room regions] [Apply structure only]   │
└──────────────────────────────────────────────────────────┘
```

### Generator Types

- Classic dungeon: rectangular rooms and corridors.
- Cave/cavern: organic connected floor from cellular generation.
- Castle/keep: more symmetric halls, chambers, courtyards.
- Sewer/crypt: narrow networks, water channels, repeated chambers.
- Later: shop, home, tavern, town block.

## NPC Placement Mockup

NPC placement should feel like placing a token, but it remains a prep marker linked to campaign NPC data.

```text
┌ Tools ─────────────┐       ┌ Inspector ───────────────────────┐
│ Structure           │       │ NPC Placement                    │
│ Terrain             │       │                                  │
│ Rooms               │       │ NPC                              │
│ ● NPCs              │       │ [Search campaign NPCs...]        │
│ ┌─────────────────┐ │       │                                  │
│ │ ◉ Place NPC     │ │       │ Selected                         │
│ │ ↕ Move NPC      │ │       │ ┌────┐ Mara Vell                 │
│ │ ⌫ Remove NPC    │ │       │ │img │ Merchant / CR 0           │
│ └─────────────────┘ │       │ └────┘                           │
│ Labels              │       │                                  │
└─────────────────────┘       │ Placement behavior               │
                              │ [✓] Suggest room link            │
                              │ [ ] Hidden from player notes     │
                              │                                  │
                              │ Current cell                     │
                              │ Room: Guard Room                 │
                              │ [Connect NPC to room]            │
                              └──────────────────────────────────┘
```

Canvas marker style:

```text
- Circular avatar marker, matching World NPC row avatar style.
- Initials fallback when no avatar exists.
- Small role/status ring can be added later.
- Hover shows name + room + notes.
```

## Selected Object Inspector Examples

### Door Selected

```text
┌ Inspector ───────────────┐
│ Door                     │
│ Between: Hall / Armory   │
│                          │
│ Type                     │
│ [Wooden door v]          │
│                          │
│ State                    │
│ [Closed v]               │
│ [✓] Locked               │
│ [ ] Secret               │
│                          │
│ Notes                    │
│ [Swollen from damp...]   │
│                          │
│ [Suggest exit link]      │
│ [Delete door]            │
└──────────────────────────┘
```

### NPC Selected

```text
┌ Inspector ───────────────┐
│ NPC Marker               │
│ ┌────┐ Borin Ashhand     │
│ │img │ Blacksmith        │
│ └────┘                   │
│                          │
│ Location                 │
│ Cell 18,12               │
│ Room: Armory             │
│                          │
│ [Open NPC sheet]         │
│ [Connect to room]        │
│ [Remove marker]          │
└──────────────────────────┘
```

### Room Region Selected

```text
┌ Inspector ───────────────┐
│ Room Region              │
│ Guard Room               │
│ 12 cells                 │
│                          │
│ Linked location          │
│ [Guard Room v]           │
│                          │
│ Room label               │
│ [Guard Room]             │
│                          │
│ Prep shortcuts           │
│ [Open room profile]      │
│ [Add encounter]          │
│ [Link exit]              │
└──────────────────────────┘
```

## Layer Stack Mockup

```text
┌ Layers ─────────────────────────────────┐
│ ✓ Room overlays       70%        [⋯]    │
│ ✓ NPC markers         100%       [⋯]    │
│ ✓ Doors & features    100%       [⋯]    │
│ ✓ Walls               100%       [⋯]    │
│ ✓ Terrain             80%        [⋯]    │
│ ✓ Floor               100%       [⋯]    │
│ + Add layer                              │
└─────────────────────────────────────────┘
```

Common practice:

- Keep layer order visible.
- Let users toggle visibility quickly.
- Avoid full layer complexity in MVP; opacity and visibility are enough at first.

## Empty Studio State

```text
┌──────────────────────────────────────────────────────────┐
│ No studio map yet                                        │
│                                                          │
│ Start from a blank grid or generate a draft structure.    │
│                                                          │
│ [Blank dungeon grid] [Generate dungeon] [Generate cave]   │
│                                                          │
│ Templates                                                │
│ Dungeon • Cave • Castle/Keep • Sewer/Crypt               │
└──────────────────────────────────────────────────────────┘
```

This should use the same style as existing dashed empty panels and primary/secondary actions.

## Narrow Layout / Tablet Mockup

Dungeon Studio is primarily a desktop DM-prep tool, but it should not break on narrow screens.

```text
┌────────────────────────────────────┐
│ Dungeon Studio        [Save] [⋯]   │
├────────────────────────────────────┤
│ Mode tabs                           │
│ [Structure] [Terrain] [Rooms] [NPC] │
├────────────────────────────────────┤
│ Canvas toolbar                      │
│ [−] 100% [+] [Fit] [Grid]           │
├────────────────────────────────────┤
│                                    │
│              Canvas                │
│                                    │
├────────────────────────────────────┤
│ [Tools] [Inspector] [Layers]        │ bottom drawer tabs
└────────────────────────────────────┘
```

Narrow behavior:

- Left tools collapse into top mode tabs.
- Inspector and layers move into a bottom drawer.
- Canvas remains full-width.
- Advanced generator settings can be modal/drawer-based.

## Future General Map Studio Adaptation

The interface should eventually work beyond dungeons.

| Scope            | Tool Defaults                               | Extra Layers                       |
| ---------------- | ------------------------------------------- | ---------------------------------- |
| Dungeon/Floor    | floors, walls, doors, rooms, terrain        | chasms, water, NPCs, encounters    |
| Cave             | cavern floor, rough walls, water, cliffs    | elevation, hazards                 |
| Shop/Home/Tavern | walls, doors, room zones, furniture markers | counters, beds, tables, staff/NPCs |
| Castle/Keep      | walls, gates, rooms, courtyards             | stairs, battlements, guards        |
| Town/Street      | roads, buildings, districts                 | stalls, NPCs, landmarks            |

UI should remain the same shell. Only tool presets, tilesets, and generator options change.

## Implementation Target For First Visual Slice

The first UI slice should aim for this minimal but recognizable layout:

```text
Header + save state
Left mode palette: Structure / Rooms / Generator
Canvas: blank grid with pan/zoom controls
Right inspector: selected tool settings
Bottom status: layers + unassigned room count
```

Do not implement all modes in the first slice. Build the shell so future modes have a clear home.
