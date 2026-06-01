import { damageTypes } from "../../components/shared/damageTypes";

export type SelectOption = { value: string; label: string };

export const itemCategoryOptions: SelectOption[] = [
  { value: "Adventuring Gear", label: "Adventuring Gear" },
  { value: "Ammunition", label: "Ammunition" },
  { value: "Armor", label: "Armor" },
  { value: "Equipment Pack", label: "Equipment Pack" },
  { value: "Food and Lodging", label: "Food and Lodging" },
  { value: "Focus", label: "Focus" },
  { value: "Mount", label: "Mount" },
  { value: "Tool", label: "Tool" },
  { value: "Vehicle", label: "Vehicle" },
  { value: "Weapon", label: "Weapon" },
  { value: "Wondrous Item", label: "Wondrous Item" },
  { value: "Treasure", label: "Treasure" },
];

export const itemTypeOptionsByCategory: Record<string, SelectOption[]> = {
  "Adventuring Gear": [
    { value: "Standard Gear", label: "Standard Gear" },
    { value: "Container", label: "Container" },
    { value: "Light Source", label: "Light Source" },
    { value: "Kit", label: "Kit" },
  ],
  Ammunition: [
    { value: "Arrows", label: "Arrows" },
    { value: "Blowgun Needles", label: "Blowgun Needles" },
    { value: "Crossbow Bolts", label: "Crossbow Bolts" },
    { value: "Sling Bullets", label: "Sling Bullets" },
  ],
  Armor: [
    { value: "Light Armor", label: "Light Armor" },
    { value: "Medium Armor", label: "Medium Armor" },
    { value: "Heavy Armor", label: "Heavy Armor" },
    { value: "Shield", label: "Shield" },
  ],
  "Equipment Pack": [
    { value: "Equipment Pack", label: "Equipment Pack" },
    { value: "Kit", label: "Kit" },
  ],
  "Food and Lodging": [
    { value: "Meal", label: "Meal" },
    { value: "Ration", label: "Ration" },
    { value: "Drink", label: "Drink" },
    { value: "Inn Stay", label: "Inn Stay" },
    { value: "Service", label: "Service" },
  ],
  Focus: [
    { value: "Arcane Focus", label: "Arcane Focus" },
    { value: "Druidic Focus", label: "Druidic Focus" },
    { value: "Holy Symbol", label: "Holy Symbol" },
  ],
  Mount: [
    { value: "Mount", label: "Mount" },
    { value: "Tack and Harness", label: "Tack and Harness" },
    { value: "Drawn Vehicle", label: "Drawn Vehicle" },
  ],
  Tool: [
    { value: "Artisan's Tools", label: "Artisan's Tools" },
    { value: "Gaming Set", label: "Gaming Set" },
    { value: "Musical Instrument", label: "Musical Instrument" },
    { value: "Other Tools", label: "Other Tools" },
  ],
  Vehicle: [
    { value: "Land Vehicle", label: "Land Vehicle" },
    { value: "Waterborne Vehicle", label: "Waterborne Vehicle" },
    { value: "Airborne Vehicle", label: "Airborne Vehicle" },
  ],
  Weapon: [
    { value: "Simple Melee Weapons", label: "Simple Melee Weapons" },
    { value: "Simple Ranged Weapons", label: "Simple Ranged Weapons" },
    { value: "Martial Melee Weapons", label: "Martial Melee Weapons" },
    { value: "Martial Ranged Weapons", label: "Martial Ranged Weapons" },
  ],
  "Wondrous Item": [
    { value: "Wondrous Item", label: "Wondrous Item" },
    { value: "Potion", label: "Potion" },
    { value: "Scroll", label: "Scroll" },
  ],
  Treasure: [
    { value: "Gemstone", label: "Gemstone" },
    { value: "Art Object", label: "Art Object" },
    { value: "Currency", label: "Currency" },
  ],
};

export const rarityOptions: SelectOption[] = [
  { value: "", label: "None" },
  { value: "Common", label: "Common" },
  { value: "Uncommon", label: "Uncommon" },
  { value: "Rare", label: "Rare" },
  { value: "Very Rare", label: "Very Rare" },
  { value: "Legendary", label: "Legendary" },
  { value: "Artifact", label: "Artifact" },
];

export const valueUnitOptions = ["cp", "sp", "ep", "gp", "pp"].map((unit) => ({
  value: unit,
  label: unit,
}));

export const weaponPropertyOptions = [
  "Ammunition",
  "Finesse",
  "Heavy",
  "Light",
  "Loading",
  "Range",
  "Reach",
  "Special",
  "Thrown",
  "Two-Handed",
  "Versatile",
].map((property) => ({ value: property, label: property }));

export const damageTypeOptions = damageTypes.map((type) => ({
  value: type.label,
  label: type.label,
}));

export const weaponCategoryOptions = [
  { value: "Simple", label: "Simple" },
  { value: "Martial", label: "Martial" },
];

export const weaponRangeOptions = [
  { value: "Melee", label: "Melee" },
  { value: "Ranged", label: "Ranged" },
];

export const masteryOptions = [
  "",
  "Cleave",
  "Graze",
  "Nick",
  "Push",
  "Sap",
  "Slow",
  "Topple",
  "Vex",
].map((mastery) => ({ value: mastery, label: mastery || "None" }));

export const armorCategoryOptions = [
  { value: "Light Armor", label: "Light Armor" },
  { value: "Medium Armor", label: "Medium Armor" },
  { value: "Heavy Armor", label: "Heavy Armor" },
  { value: "Shield", label: "Shield" },
];

export const acModeOptions = [
  { value: "base", label: "Base AC" },
  { value: "bonus", label: "AC Bonus" },
];

export const dexModifierOptions = [
  { value: "none", label: "None" },
  { value: "full", label: "Full Dexterity modifier" },
  { value: "max2", label: "Dexterity modifier, max +2" },
];

export const abilityOptions = [
  "",
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
].map((ability) => ({ value: ability, label: ability || "None" }));

export const toolCategoryOptions = itemTypeOptionsByCategory.Tool;

export const focusFamilyOptions = [
  { value: "Arcane", label: "Arcane" },
  { value: "Druidic", label: "Druidic" },
  { value: "Holy symbol", label: "Holy Symbol" },
];

export const consumableTypeOptions = [
  { value: "Potion", label: "Potion" },
  { value: "Poison", label: "Poison" },
  { value: "Food", label: "Food" },
  { value: "Drink", label: "Drink" },
  { value: "Charge Item", label: "Charge Item" },
];

export const foodLodgingQualityOptions = [
  { value: "Squalid", label: "Squalid" },
  { value: "Poor", label: "Poor" },
  { value: "Modest", label: "Modest" },
  { value: "Comfortable", label: "Comfortable" },
  { value: "Wealthy", label: "Wealthy" },
  { value: "Aristocratic", label: "Aristocratic" },
];

export const consumeBehaviorOptions = [
  { value: "Consumed on use", label: "Consumed on use" },
  { value: "Reduce quantity", label: "Reduce quantity" },
  { value: "Expend charge", label: "Expend charge" },
  { value: "Service", label: "Service" },
  { value: "Reusable", label: "Reusable" },
];

export const vehicleTypeOptions = itemTypeOptionsByCategory.Vehicle;
export const mountTypeOptions = itemTypeOptionsByCategory.Mount;

export function typeOptionsForCategory(category: string) {
  return (
    itemTypeOptionsByCategory[category] ?? [{ value: category, label: category || "Equipment" }]
  );
}

export function defaultTypeForCategory(category: string) {
  return typeOptionsForCategory(category)[0]?.value ?? "";
}
