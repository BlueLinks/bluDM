# Item And Equipment Catalog UI Spec

## Summary

This spec defines the next UI pass for the item and equipment catalog. The catalog should become a dense, scan-friendly workspace for SRD and custom items, while preserving enough structure for future inventories, loot rewards, shops, rationing, and spell component automation.

The first implementation should improve how cards and previews communicate item-specific details. It should not require backend persistence changes unless a field must be editable for custom items.

Visual mockups are available in [items-equipment-catalog-mockups.html](./items-equipment-catalog-mockups.html) and in the [Figma mockup file](https://www.figma.com/design/HdN1fwQGGCLm7lFUIdLpbX).

## Design Goals

- Make item cards useful at a glance: name, category, weight, value, and the most important type-specific stat.
- Keep deeper rules text in the preview modal so the catalog remains easy to scan.
- Use existing project damage type icons before adding new damage visuals.
- Use curated Game-icons.net SVGs for item and equipment category glyphs where they add clarity.
- Preserve accessibility: icons supplement text and never replace essential labels.
- Keep SRD items read-only and custom items editable, with clone-to-custom as the bridge.

## Catalog Card Anatomy

Every card should include:

- Name.
- Category and subcategory when available.
- Source badge, such as SRD or Custom.
- Weight, including a clear empty state for weightless or unknown values.
- Value, including amount and currency unit when available.

Cards can include optional chips when data exists:

- Damage dice and damage type.
- Armor Class or AC bonus.
- Weapon properties.
- Weapon mastery.
- Focus family.
- Tool ability.
- Tool use summary.
- Pack contents count.
- Quantity or unit, such as ammunition bundle size.
- Rarity.
- Attunement.

Cards should use a compact layout:

- Header row: category icon, name, source badge.
- Metadata row: category/subcategory, value, weight.
- Detail chip row: type-specific chips, wrapping to a maximum of two visual rows.
- Action row: preview as the primary action; edit/delete only for custom items; clone for standard items.

Long names and long property lists must wrap without increasing card width or overlapping action controls.

## Preview Modal Anatomy

The item preview modal should be the canonical read view for an item.

Header:

- Name.
- Category and subcategory.
- Source badge.
- Read-only or custom state.
- Actions: clone, edit, delete, and close as applicable.

Primary stats:

- Value.
- Weight.
- Rarity.
- Attunement.
- Item type.
- Quantity or unit when applicable.

Rules and details:

- Description.
- Parsed subtype details, grouped by item type.
- Any special rules or notes.
- Future inventory hooks, such as consumable, equippable, carried, or stackable, when those fields exist.

Debug/source details:

- Raw source metadata should be collapsed by default.
- Raw metadata is for import validation and developer troubleshooting, not normal catalog browsing.

## Search And Filters

Catalog search should match:

- Name.
- Category and subcategory.
- Description.
- Source.
- Damage dice and damage type.
- Weapon properties.
- Weapon mastery.
- Armor category.
- Tool category.
- Tool ability.
- Tool use text.
- Crafting output.
- Focus family and variant.
- Pack contents.
- Vehicle or mount traits.

Filters should include:

- Source: all, SRD, custom.
- Category.
- Weapon range: melee, ranged.
- Weapon category: simple, martial.
- Armor category: light, medium, heavy, shield.
- Tool category.
- Focus family: arcane, druidic, holy symbol.
- Consumable.
- Equipment pack.
- Has value.
- Has weight.

Filters should be additive and visible in the catalog state. Clearing all filters should return to the full catalog.

## Category Display Rules

### Weapons

Weapon cards should show:

- Damage dice.
- Damage type icon and label.
- Weapon category, such as simple or martial.
- Weapon range, such as melee or ranged.
- Properties.
- Mastery when present.
- Weight and value.

Weapon previews should also show:

- Normal range and long range.
- Thrown range when present.
- Versatile or two-handed damage.
- Ammunition requirements.
- Reload or special notes.
- Mastery description when available.

Damage type icons should reuse the existing damage type mapping in the frontend. If a weapon damage type is unknown, show a neutral weapon icon and the text label.

Example card content:

```text
Longsword                         SRD
Weapon / Martial Melee            15 gp · 3 lb
1d8 Slashing · Versatile · Mastery: Sap
```

### Armor And Shields

Armor cards should show:

- Armor category.
- AC value or AC bonus.
- Strength minimum when present.
- Stealth disadvantage when true.
- Weight and value.

Armor previews should also show:

- Shield-specific AC behavior.
- Dexterity modifier behavior when available.
- Don and doff notes when source data supports them.
- Special armor rules.

Example card content:

```text
Shield                            SRD
Armor / Shield                    10 gp · 6 lb
AC +2
```

### Tools

Tool cards should show:

- Tool category.
- Ability when present.
- A concise use or `Utilize` summary when present.
- Weight and value.

Tool previews should also show:

- `Utilize` action details.
- Crafting outputs.
- Variants.
- Proficiency use cases.
- Fallback SRD description text.

Current SRD 2014 equipment data may not include ability, `Utilize`, crafting, or variant fields. The UI should omit missing chips rather than rendering placeholders. SRD 5.2.1 enrichment should fill these fields later when lawful source data is available.

Example card content:

```text
Thieves' Tools                    SRD
Tool / Other Tools                25 gp · 1 lb
Dexterity · Utilize: Pick a lock
```

### Arcane Foci, Druidic Foci, And Holy Symbols

Focus cards should show:

- Focus family: arcane focus, druidic focus, or holy symbol.
- Item name.
- Spellcasting-focus badge.
- Weight and value.

Focus previews should group variants when source data supports them:

- Arcane foci: crystal, orb, rod, staff, wand.
- Druidic foci: sprig, totem, wooden staff, yew wand.
- Holy symbols: amulet, emblem, reliquary.

The preview should include held, worn, displayed, or object-interaction usage notes when available.

Example card content:

```text
Wand                              SRD
Arcane Focus                      10 gp · 1 lb
Spellcasting focus
```

### Adventuring Gear

Adventuring gear cards should show:

- Gear subcategory.
- Value and weight.
- A concise use chip when available.
- Stack or quantity when applicable.

Previews should include the description, usage notes, and any item-specific behavior needed by future inventory automation.

Example card content:

```text
Rations                           SRD
Adventuring Gear                  5 sp · 2 lb
Consumable · 1 day
```

### Ammunition

Ammunition cards should show:

- Ammunition type.
- Bundle quantity.
- Compatible weapon hints when available.
- Weight and value.

Previews should include recovery or consumption behavior if source data supports it.

Example card content:

```text
Arrows                            SRD
Ammunition                        1 gp · 1 lb
20 pieces · Bow
```

### Kits And Equipment Packs

Kit and pack cards should show:

- Kit or pack category.
- Value and total weight when available.
- Contents count when available.

Previews should show:

- Full included contents.
- Quantity per included item.
- Whether the entry is a container, bundle, or usable kit.

Example card content:

```text
Explorer's Pack                   SRD
Equipment Pack                    10 gp · varies
Includes 11 item types
```

### Consumables

Consumable cards should show:

- Consumable type.
- Uses, charges, dose count, or quantity when present.
- Value and weight.
- Effect summary when available.

Previews should include:

- Consumption behavior.
- Restoration or effect text.
- Whether consuming removes the item, reduces quantity, or expends a charge.

Example card content:

```text
Potion of Healing                 SRD
Potion / Consumable               50 gp · 0.5 lb
Restores 2d4 + 2 HP
```

### Mounts And Vehicles

Mount and vehicle cards should show:

- Mount, tack, drawn vehicle, waterborne vehicle, or other vehicle type.
- Speed when present.
- Carrying capacity when present.
- Value and weight or cargo capacity when relevant.

Previews should include:

- Crew.
- Passengers.
- Cargo.
- AC and HP when available.
- Speed and travel notes.
- Special handling or upkeep rules.

Example card content:

```text
Riding Horse                      SRD
Mount                             75 gp
Speed 60 ft · Carry 480 lb
```

## Icon Spec

Use a typed item icon registry for category and subtype icons. Do not scatter raw icon keys through card JSX.

Registry entries should include:

- Stable key.
- Label.
- Icon source.
- Icon path or Game-icons.net slug.
- Author.
- Source URL.
- License.
- Optional preferred category.

Preferred icon strategy:

- Damage types: use the existing frontend damage type icon mapping.
- General UI actions: use existing Lucide icons.
- Item categories: use curated Game-icons.net SVGs where an icon improves scanning.
- Unknown categories: use a neutral package or tag icon.

Suggested curated category concepts:

- Sword.
- Bow.
- Shield.
- Armor.
- Backpack.
- Potion.
- Scroll.
- Coins.
- Tools.
- Anvil.
- Wand.
- Staff.
- Holy symbol.
- Horse.
- Cart.
- Ship.
- Ration.
- Gem.
- Key.

Game-icons.net assets are under CC BY 3.0 or public domain depending on the icon. Any Game-icons.net icon used in the app must keep attribution metadata. If the app has a credits or about surface, put attribution there. If not, add a small attribution note in the item catalog footer or keep attribution in this spec until a global credits surface exists.

Reference:

- [Game-icons.net About](https://game-icons.net/about.html)
- [Game-icons.net FAQ](https://game-icons.net/faq.html)

## Data Availability Matrix

| Display field                 | Current SRD 2014 source         | Future SRD 5.2.1 source  | Custom item editable |
| ----------------------------- | ------------------------------- | ------------------------ | -------------------- |
| Name                          | Available                       | Expected                 | Yes                  |
| Category                      | Available                       | Expected                 | Yes                  |
| Subcategory                   | Partially available             | Expected                 | Yes                  |
| Source                        | Available                       | Expected                 | No, derived          |
| Value                         | Available for equipment         | Expected                 | Yes                  |
| Weight                        | Available for equipment         | Expected                 | Yes                  |
| Description                   | Available                       | Expected                 | Yes                  |
| Weapon damage                 | Available for weapons           | Expected                 | Yes                  |
| Damage type                   | Available for weapons           | Expected                 | Yes                  |
| Weapon range                  | Available for weapons           | Expected                 | Yes                  |
| Weapon properties             | Available for weapons           | Expected                 | Yes                  |
| Weapon mastery                | Not available                   | Expected                 | Yes                  |
| Armor class                   | Available for armor             | Expected                 | Yes                  |
| Strength minimum              | Available for armor             | Expected                 | Yes                  |
| Stealth disadvantage          | Available for armor             | Expected                 | Yes                  |
| Tool ability                  | Not available                   | Expected                 | Yes                  |
| Tool `Utilize`                | Not available                   | Expected                 | Yes                  |
| Crafting outputs              | Not available                   | Expected                 | Yes                  |
| Tool variants                 | Not available                   | Expected                 | Yes                  |
| Focus family                  | Available through gear category | Expected                 | Yes                  |
| Focus usage                   | Limited description only        | Expected                 | Yes                  |
| Pack contents                 | Partially available             | Expected                 | Yes                  |
| Consumable behavior           | Limited description only        | Expected                 | Yes                  |
| Mount speed                   | Partially available             | Expected                 | Yes                  |
| Carrying capacity             | Partially available             | Expected                 | Yes                  |
| Vehicle crew/passengers/cargo | Partially available             | Expected                 | Yes                  |
| Rarity                        | Not typical for basic equipment | Expected for magic items | Yes                  |
| Attunement                    | Not typical for basic equipment | Expected for magic items | Yes                  |

## Implementation Sequence

### PR 1: Spec Only

- Add this UI spec.
- Link it from future item catalog implementation issues or PR descriptions.
- Do not change runtime UI behavior.

### PR 2: Catalog Display Refinement

- Add subtype display helpers that derive card and preview fields from existing item data.
- Refactor catalog cards into reusable presentational components.
- Add the typed item icon registry and attribution metadata.
- Add compact card chips and richer preview sections.
- Keep backend persistence unchanged unless custom item editing requires a field that cannot be stored today.

### PR 3: SRD Enrichment

- Add lawful SRD 5.2.1 equipment metadata when available in the repo or import pipeline.
- Populate mastery, tool ability, `Utilize`, crafting, variants, and focus usage.
- Create a follow-up issue instead of hardcoding incomplete rules if source data is unavailable.

## Test Plan

Frontend tests should verify:

- Weapon cards show name, category, value, weight, damage, properties, and mastery when present.
- Armor cards show AC, value, weight, strength minimum, and stealth disadvantage.
- Tool cards show ability, `Utilize`, crafting, and variants when fields exist.
- Tool cards gracefully omit missing SRD 2014-only fields.
- Focus cards group arcane foci, druidic foci, and holy symbols.
- Search matches subtype fields such as damage type, weapon property, mastery, tool ability, and focus type.
- Standard items remain clone-only and custom items remain editable.

Browser checks should verify:

- Catalog cards at desktop and mobile widths.
- Long names and many chips wrap cleanly.
- Missing optional fields do not leave awkward empty space.
- Icons render, align with labels, and do not crowd controls.
- The preview modal remains readable on small screens.

## Assumptions

- The item catalog remains the foundation for inventory, loot rewards, shops, rationing, and spell component automation.
- Cards should be dense and operational, not large marketing-style cards.
- SRD 2014 data is the immediate source of truth.
- SRD 5.2.1-only fields are optional until lawful source data is confirmed.
- Standard items stay read-only and use clone-to-custom for editing.
