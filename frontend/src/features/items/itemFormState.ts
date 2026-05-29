import type { ItemFormState } from "../../types";
import { defaultTypeForCategory, focusFamilyOptions, toolCategoryOptions } from "./itemFormOptions";

export const blankItemForm: ItemFormState = {
  ability: "",
  acBase: "",
  acBonus: "",
  acMode: "base",
  armorCategory: "Light Armor",
  attunement: false,
  cargo: "",
  carryingCapacity: "",
  category: "Adventuring Gear",
  charges: "",
  compatibleWeapon: "",
  consumableType: "Potion",
  consumeBehavior: "Consumed on use",
  contents: "",
  craftOutputs: "",
  crew: "",
  damageDice: "",
  damageType: "",
  description: "",
  dexModifier: "none",
  effect: "",
  focusFamily: "Arcane",
  focusUsage: "",
  focusVariant: "",
  inventoryCarried: true,
  inventoryConsumable: false,
  inventoryEquippable: false,
  inventoryStackable: false,
  itemType: "Standard Gear",
  longRange: "",
  mastery: "",
  name: "",
  normalRange: "",
  passengers: "",
  properties: [],
  quality: "Modest",
  quantity: "",
  rarity: "",
  serviceDuration: "",
  shield: false,
  speed: "",
  stealthDisadvantage: false,
  strengthMinimum: "",
  thrownLongRange: "",
  thrownNormalRange: "",
  toolCategory: "Other Tools",
  twoHandedDamageDice: "",
  utilize: "",
  uses: "",
  valueAmount: "0",
  valueUnit: "gp",
  variants: "",
  vehicleArmorClass: "",
  vehicleHitPoints: "",
  weaponCategory: "Simple",
  weaponRange: "Melee",
  weight: "0",
};

export function normalizeFormForCategory(current: ItemFormState, category: string): ItemFormState {
  const itemType = defaultTypeForCategory(category);
  return normalizeFormForItemType({
    ...current,
    ...subtypeDefaults(),
    category,
    itemType,
    inventoryConsumable:
      category === "Ammunition" || category === "Food and Lodging" || current.inventoryConsumable,
    inventoryEquippable:
      category === "Armor" || category === "Focus" || category === "Weapon"
        ? true
        : current.inventoryEquippable,
    inventoryStackable:
      category === "Ammunition" || category === "Equipment Pack" || current.inventoryStackable,
  });
}

export function normalizeFormForItemType(current: ItemFormState): ItemFormState {
  if (current.category === "Armor") {
    return normalizeArmorSelection({ ...current, armorCategory: current.itemType });
  }
  if (current.category === "Weapon") {
    return {
      ...current,
      weaponCategory: current.itemType.toLowerCase().includes("martial") ? "Martial" : "Simple",
      weaponRange: current.itemType.toLowerCase().includes("ranged") ? "Ranged" : "Melee",
    };
  }
  if (current.category === "Tool") {
    return {
      ...current,
      toolCategory: optionValueOrDefault(toolCategoryOptions, current.itemType),
    };
  }
  if (current.category === "Focus") {
    return {
      ...current,
      focusFamily: focusFamilyFromType(current.itemType),
    };
  }
  return current;
}

function normalizeArmorSelection(current: ItemFormState): ItemFormState {
  if (current.armorCategory === "Shield" || current.itemType === "Shield") {
    return {
      ...current,
      acBonus: current.acBonus || "2",
      acMode: "bonus",
      armorCategory: "Shield",
      itemType: "Shield",
      shield: true,
    };
  }
  return {
    ...current,
    itemType: current.armorCategory,
    shield: false,
  };
}

function subtypeDefaults(): Partial<ItemFormState> {
  return {
    ability: blankItemForm.ability,
    acBase: blankItemForm.acBase,
    acBonus: blankItemForm.acBonus,
    acMode: blankItemForm.acMode,
    armorCategory: blankItemForm.armorCategory,
    cargo: blankItemForm.cargo,
    carryingCapacity: blankItemForm.carryingCapacity,
    charges: blankItemForm.charges,
    compatibleWeapon: blankItemForm.compatibleWeapon,
    consumableType: blankItemForm.consumableType,
    consumeBehavior: blankItemForm.consumeBehavior,
    contents: blankItemForm.contents,
    craftOutputs: blankItemForm.craftOutputs,
    crew: blankItemForm.crew,
    damageDice: blankItemForm.damageDice,
    damageType: blankItemForm.damageType,
    dexModifier: blankItemForm.dexModifier,
    effect: blankItemForm.effect,
    focusFamily: blankItemForm.focusFamily,
    focusUsage: blankItemForm.focusUsage,
    focusVariant: blankItemForm.focusVariant,
    longRange: blankItemForm.longRange,
    mastery: blankItemForm.mastery,
    normalRange: blankItemForm.normalRange,
    passengers: blankItemForm.passengers,
    properties: blankItemForm.properties,
    quality: blankItemForm.quality,
    quantity: blankItemForm.quantity,
    serviceDuration: blankItemForm.serviceDuration,
    shield: blankItemForm.shield,
    speed: blankItemForm.speed,
    stealthDisadvantage: blankItemForm.stealthDisadvantage,
    strengthMinimum: blankItemForm.strengthMinimum,
    thrownLongRange: blankItemForm.thrownLongRange,
    thrownNormalRange: blankItemForm.thrownNormalRange,
    toolCategory: blankItemForm.toolCategory,
    twoHandedDamageDice: blankItemForm.twoHandedDamageDice,
    uses: blankItemForm.uses,
    utilize: blankItemForm.utilize,
    variants: blankItemForm.variants,
    vehicleArmorClass: blankItemForm.vehicleArmorClass,
    vehicleHitPoints: blankItemForm.vehicleHitPoints,
    weaponCategory: blankItemForm.weaponCategory,
    weaponRange: blankItemForm.weaponRange,
  };
}

function optionValueOrDefault(options: Array<{ value: string }>, value: string) {
  return options.some((option) => option.value === value) ? value : options[0]?.value || "";
}

function focusFamilyFromType(itemType: string) {
  const normalized = itemType.toLowerCase();
  if (normalized.includes("druidic")) return "Druidic";
  if (normalized.includes("holy")) return "Holy symbol";
  return optionValueOrDefault(focusFamilyOptions, "Arcane");
}
