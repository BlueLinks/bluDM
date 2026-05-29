import type { Item } from "../../types";
import {
  arrayValue,
  booleanValue,
  boolValue,
  compactSubtype,
  derivedSubtype,
  formatNumber,
  healingFromDescription,
  isPresent,
  numberAt,
  numberValue,
  objectValue,
  packContentLabel,
  rangeText,
  speedLabel,
  stringAt,
  stringList,
  stringValue,
  truncate,
} from "./itemCatalogDisplayUtils";

export type ItemChipTone = "default" | "strong" | "warn" | "blue" | "purple";

export type ItemChip = {
  label: string;
  tone?: ItemChipTone;
};

export type ItemStat = {
  label: string;
  value: string;
};

export type ItemDisplay = {
  subtitle: string;
  sourceLabel: string;
  sourceState: string;
  value: string;
  weight: string;
  chips: ItemChip[];
  primaryStats: ItemStat[];
  detailSections: Array<{ title: string; lines: string[] }>;
  inventoryHooks: string[];
  sourceMetadata: Array<{ label: string; value: string }>;
};

export function buildItemDisplay(item: Item): ItemDisplay {
  const raw = objectValue(item.data.raw);
  const category = item.category || stringAt(raw, "equipment_category", "name") || "Equipment";
  const subcategory = item.itemType || derivedSubtype(raw);
  const subtitle = [category, compactSubtype(subcategory)].filter(Boolean).join(" / ");
  const value = formatValue(item);
  const weight = formatWeight(item);
  const sourceLabel = item.librarySource === "user" ? "Custom" : item.sourceLabel || "SRD";
  const sourceState = item.readOnly
    ? "Read-only standard item. Clone it to customize it for your table."
    : "Custom item in your catalog.";
  const detail = itemDetail(item, raw);
  const primaryStats = [
    { label: "Value", value },
    { label: "Weight", value: weight },
    ...detail.primaryStats,
    ...(item.rarity ? [{ label: "Rarity", value: item.rarity }] : []),
    ...(item.attunement ? [{ label: "Attunement", value: "Required" }] : []),
  ].slice(0, 8);

  return {
    subtitle,
    sourceLabel,
    sourceState,
    value,
    weight,
    chips: [
      ...detail.chips,
      ...(item.rarity ? [{ label: item.rarity, tone: "purple" as const }] : []),
      ...(item.attunement ? [{ label: "Attunement", tone: "purple" as const }] : []),
    ].slice(0, 8),
    primaryStats,
    detailSections: detail.detailSections,
    inventoryHooks: inventoryHooks(item, raw),
    sourceMetadata: [
      { label: "Library", value: item.librarySource },
      ...(item.sourceKey ? [{ label: "Source key", value: item.sourceKey }] : []),
      ...(item.sourceLabel ? [{ label: "Source", value: item.sourceLabel }] : []),
      { label: "Item id", value: item.id },
    ],
  };
}

export function itemSearchText(item: Item): string {
  const display = buildItemDisplay(item);
  return [
    item.name,
    item.category,
    item.itemType,
    item.description,
    item.sourceKey,
    item.sourceLabel,
    item.properties.join(" "),
    display.chips.map((chip) => chip.label).join(" "),
    display.detailSections.flatMap((section) => [section.title, ...section.lines]).join(" "),
    JSON.stringify(item.damage),
    JSON.stringify(item.armorClass),
    JSON.stringify(item.data),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function formatValue(item: Item): string {
  if (!Number.isFinite(item.valueAmount) || item.valueAmount <= 0) return "n/a";
  return `${formatNumber(item.valueAmount)} ${item.valueUnit || "gp"}`;
}

export function formatWeight(item: Item): string {
  if (!Number.isFinite(item.weight) || item.weight <= 0) return "n/a";
  return `${formatNumber(item.weight)} lb`;
}

function itemDetail(item: Item, raw: Record<string, unknown>) {
  const categoryText = [item.category, item.itemType, item.name].join(" ").toLowerCase();
  if (categoryText.includes("weapon")) return weaponDetail(item, raw);
  if (categoryText.includes("armor") || categoryText.includes("shield"))
    return armorDetail(item, raw);
  if (categoryText.includes("tool")) return toolDetail(item, raw);
  if (
    categoryText.includes("arcane focus") ||
    categoryText.includes("druidic focus") ||
    categoryText.includes("holy symbol")
  ) {
    return focusDetail(item, raw);
  }
  if (categoryText.includes("pack")) return packDetail(item, raw);
  if (
    categoryText.includes("ammunition") ||
    categoryText.includes("arrow") ||
    categoryText.includes("bolt")
  ) {
    return ammunitionDetail(item, raw);
  }
  if (
    categoryText.includes("potion") ||
    categoryText.includes("wondrous") ||
    categoryText.includes("consumable") ||
    categoryText.includes("rations") ||
    categoryText.includes("ration")
  ) {
    return consumableDetail(item, raw);
  }
  if (categoryText.includes("food") || categoryText.includes("lodging"))
    return foodLodgingDetail(item);
  if (categoryText.includes("mount") || categoryText.includes("vehicle"))
    return mountVehicleDetail(item, raw);
  return genericDetail(item, raw);
}

function weaponDetail(item: Item, raw: Record<string, unknown>) {
  const damage = objectValue(item.damage.damage) || objectValue(raw.damage);
  const twoHanded =
    objectValue(item.damage.two_handed_damage) || objectValue(raw.two_handed_damage);
  const range = objectValue(item.damage.range) || objectValue(raw.range);
  const throwRange = objectValue(item.damage.throw_range) || objectValue(raw.throw_range);
  const dice = stringValue(damage.damage_dice);
  const type = stringAt(damage, "damage_type", "name");
  const mastery = stringValue(item.data.mastery) || stringValue(raw.mastery);
  const category =
    stringValue(item.data.weaponCategory) ||
    stringAt(raw, "weapon_category", "name") ||
    item.itemType;
  const rangeKind = stringValue(item.data.weaponRange) || stringAt(raw, "weapon_range", "name");
  const chips = [
    dice ? { label: [dice, type].filter(Boolean).join(" "), tone: "warn" as const } : null,
    category ? { label: compactSubtype(category) } : null,
    rangeKind ? { label: rangeKind, tone: "blue" as const } : null,
    ...item.properties.map((property) => ({ label: property })),
    mastery ? { label: `Mastery: ${mastery}`, tone: "purple" as const } : null,
  ].filter(isPresent);
  const rangeLabel = rangeText(range) || rangeText(throwRange);
  const detailLines = [
    category ? `${category}.` : "",
    rangeLabel ? `Range ${rangeLabel}.` : "",
    twoHanded.damage_dice
      ? `Two-handed damage: ${stringValue(twoHanded.damage_dice)}${type ? ` ${type}` : ""}.`
      : "",
    mastery ? `Mastery: ${mastery}.` : "",
  ].filter(Boolean);
  return {
    chips,
    primaryStats: [
      ...(dice ? [{ label: "Damage", value: dice }] : []),
      ...(type ? [{ label: "Type", value: type }] : []),
      ...(rangeLabel ? [{ label: "Range", value: rangeLabel }] : []),
    ],
    detailSections: detailLines.length ? [{ title: "Weapon Details", lines: detailLines }] : [],
  };
}

function armorDetail(item: Item, raw: Record<string, unknown>) {
  const armorClass = item.armorClass || {};
  const base = numberValue(armorClass.base) || numberAt(raw, "armor_class", "base");
  const bonus = numberValue(armorClass.bonus) || numberAt(raw, "armor_class", "bonus");
  const strengthMinimum = numberValue(armorClass.str_minimum) || numberValue(raw.str_minimum);
  const stealthDisadvantage =
    booleanValue(armorClass.stealth_disadvantage) || booleanValue(raw.stealth_disadvantage);
  const acLabel = bonus ? `AC +${bonus}` : base ? `AC ${base}` : "";
  const category =
    stringValue(item.data.armorCategory) ||
    stringAt(raw, "armor_category", "name") ||
    item.itemType;
  const chips = [
    acLabel ? { label: acLabel, tone: "strong" as const } : null,
    category ? { label: compactSubtype(category) } : null,
    strengthMinimum ? { label: `Str ${strengthMinimum}`, tone: "blue" as const } : null,
    stealthDisadvantage ? { label: "Stealth disadvantage", tone: "warn" as const } : null,
  ].filter(isPresent);
  return {
    chips,
    primaryStats: [
      ...(acLabel ? [{ label: "Armor Class", value: acLabel.replace("AC ", "") }] : []),
      ...(strengthMinimum ? [{ label: "Strength", value: String(strengthMinimum) }] : []),
    ],
    detailSections: chips.length
      ? [{ title: "Armor Details", lines: chips.map((chip) => chip.label) }]
      : [],
  };
}

function toolDetail(item: Item, raw: Record<string, unknown>) {
  const ability = stringValue(item.data.ability) || stringValue(raw.ability);
  const utilize = stringValue(item.data.utilize) || stringValue(raw.utilize);
  const craft = stringList(item.data.craft_outputs || raw.craft_outputs || raw.craft);
  const variants = stringList(item.data.variants || raw.variants);
  const category =
    stringValue(item.data.toolCategory) || stringAt(raw, "tool_category", "name") || item.itemType;
  const chips = [
    category ? { label: compactSubtype(category) } : null,
    ability ? { label: ability, tone: "blue" as const } : null,
    utilize ? { label: `Utilize: ${utilize}` } : null,
    craft.length ? { label: `Craft: ${craft.join(", ")}`, tone: "strong" as const } : null,
    variants.length ? { label: `${variants.length} variants`, tone: "purple" as const } : null,
  ].filter(isPresent);
  return {
    chips,
    primaryStats: [
      ...(ability ? [{ label: "Ability", value: ability }] : []),
      ...(utilize ? [{ label: "Use", value: truncate(utilize, 18) }] : []),
    ],
    detailSections: [
      {
        title: "Tool Details",
        lines: [
          category,
          utilize ? `Utilize: ${utilize}` : "",
          craft.length ? `Craft outputs: ${craft.join(", ")}` : "",
          variants.length ? `Variants: ${variants.join(", ")}` : "",
        ].filter(Boolean),
      },
    ].filter((section) => section.lines.length),
  };
}

function focusDetail(item: Item, raw: Record<string, unknown>) {
  const family = stringValue(item.data.focusFamily) || focusFamily(item, raw);
  const variant = stringValue(item.data.variant) || item.name;
  const usage = stringValue(item.data.focus_usage) || stringValue(raw.focus_usage);
  return {
    chips: [
      { label: "Spellcasting focus", tone: "purple" as const },
      family ? { label: family, tone: "blue" as const } : null,
      variant ? { label: variant } : null,
    ].filter(isPresent),
    primaryStats: family ? [{ label: "Focus", value: family }] : [],
    detailSections: [
      {
        title: "Focus Details",
        lines: [family ? `${family} spellcasting focus.` : "", usage].filter(Boolean),
      },
    ].filter((section) => section.lines.length),
  };
}

function packDetail(item: Item, raw: Record<string, unknown>) {
  const contents = arrayValue(raw.contents || item.data.contents);
  const count = contents.length;
  return {
    chips: [
      count ? { label: `Includes ${count} item types`, tone: "strong" as const } : null,
    ].filter(isPresent),
    primaryStats: count ? [{ label: "Contents", value: String(count) }] : [],
    detailSections: count
      ? [
          {
            title: "Pack Contents",
            lines: contents.map((entry) => packContentLabel(entry)).filter(Boolean),
          },
        ]
      : [],
  };
}

function ammunitionDetail(item: Item, raw: Record<string, unknown>) {
  const quantity = numberValue(raw.quantity) || numberValue(item.data.quantity);
  const compatible = stringValue(item.data.compatible_weapon) || stringValue(raw.compatible_weapon);
  return {
    chips: [
      quantity ? { label: `${quantity} pieces`, tone: "strong" as const } : null,
      compatible ? { label: compatible, tone: "blue" as const } : null,
      { label: "Ammunition" },
    ].filter(isPresent),
    primaryStats: quantity ? [{ label: "Quantity", value: String(quantity) }] : [],
    detailSections: [],
  };
}

function consumableDetail(item: Item, raw: Record<string, unknown>) {
  const effect = stringValue(item.data.effect) || healingFromDescription(item.description);
  const quantity = stringValue(item.data.quantity) || stringValue(raw.quantity);
  const behavior = stringValue(item.data.consumeBehavior);
  return {
    chips: [
      { label: "Consumable", tone: "warn" as const },
      quantity ? { label: quantity } : null,
      behavior ? { label: behavior, tone: "blue" as const } : null,
      effect ? { label: effect, tone: "strong" as const } : null,
    ].filter(isPresent),
    primaryStats: effect ? [{ label: "Effect", value: truncate(effect, 18) }] : [],
    detailSections: effect ? [{ title: "Consumable Details", lines: [effect] }] : [],
  };
}

function foodLodgingDetail(item: Item) {
  const duration = stringValue(item.data.serviceDuration);
  const quality = stringValue(item.data.quality);
  const behavior = stringValue(item.data.consumeBehavior);
  const effect = stringValue(item.data.effect);
  return {
    chips: [
      { label: item.itemType || "Food and Lodging", tone: "blue" as const },
      duration ? { label: duration } : null,
      quality ? { label: quality, tone: "purple" as const } : null,
      behavior ? { label: behavior, tone: "warn" as const } : null,
    ].filter(isPresent),
    primaryStats: [
      ...(duration ? [{ label: "Duration", value: duration }] : []),
      ...(quality ? [{ label: "Quality", value: quality }] : []),
    ],
    detailSections: [
      {
        title: "Food And Lodging Details",
        lines: [
          duration ? `Duration or unit: ${duration}` : "",
          quality ? `Quality: ${quality}` : "",
          effect,
        ].filter(Boolean),
      },
    ].filter((section) => section.lines.length),
  };
}

function mountVehicleDetail(item: Item, raw: Record<string, unknown>) {
  const speed = stringValue(item.data.speed) || speedLabel(raw.speed);
  const carry = stringValue(item.data.carrying_capacity) || stringValue(raw.carrying_capacity);
  const crew = stringValue(item.data.crew) || stringValue(raw.crew);
  const cargo = stringValue(item.data.cargo) || stringValue(raw.cargo);
  const passengers = stringValue(item.data.passengers);
  const ac = stringValue(item.data.vehicleArmorClass);
  const hp = stringValue(item.data.vehicleHitPoints);
  return {
    chips: [
      speed ? { label: `Speed ${speed}`, tone: "blue" as const } : null,
      carry ? { label: `Carry ${carry} lb` } : null,
      crew ? { label: `Crew ${crew}` } : null,
      passengers ? { label: `Passengers ${passengers}` } : null,
      cargo ? { label: `Cargo ${cargo}` } : null,
      ac ? { label: `AC ${ac}`, tone: "strong" as const } : null,
      hp ? { label: `HP ${hp}`, tone: "strong" as const } : null,
    ].filter(isPresent),
    primaryStats: [
      ...(speed ? [{ label: "Speed", value: speed }] : []),
      ...(carry ? [{ label: "Carry", value: `${carry} lb` }] : []),
    ],
    detailSections: [],
  };
}

function genericDetail(item: Item, raw: Record<string, unknown>) {
  const gearCategory = stringAt(raw, "gear_category", "name");
  return {
    chips: [
      gearCategory ? { label: gearCategory } : null,
      ...item.properties.map((property) => ({ label: property })),
    ].filter(isPresent),
    primaryStats: [],
    detailSections: [],
  };
}

function inventoryHooks(item: Item, raw: Record<string, unknown>): string[] {
  const text = [item.category, item.itemType, item.name].join(" ").toLowerCase();
  const inventory = objectValue(item.data.inventory);
  return [
    boolValue(inventory.carried, true) ? "Carried" : "",
    boolValue(
      inventory.equippable,
      text.includes("weapon") || text.includes("armor") || text.includes("shield"),
    )
      ? "Equippable"
      : "",
    boolValue(
      inventory.consumable,
      text.includes("potion") || text.includes("rations") || text.includes("consumable"),
    )
      ? "Consumable"
      : "",
    boolValue(
      inventory.stackable,
      text.includes("ammunition") || text.includes("pack") || arrayValue(raw.contents).length > 0,
    )
      ? "Stackable"
      : "",
    item.readOnly ? "Clone to customize" : "Editable custom item",
  ].filter(Boolean);
}

function focusFamily(item: Item, raw: Record<string, unknown>): string {
  const text = [item.category, item.itemType, stringAt(raw, "gear_category", "name")]
    .join(" ")
    .toLowerCase();
  if (text.includes("arcane")) return "Arcane";
  if (text.includes("druidic")) return "Druidic";
  if (text.includes("holy")) return "Holy symbol";
  return "";
}
