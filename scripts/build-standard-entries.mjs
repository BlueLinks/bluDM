const API_BASE = "https://www.dnd5eapi.co";
const API_VERSION = "/api/2014";

const categories = [
  ["equipment", "equipment"],
  ["classes", "classes"],
  ["species", "races"],
  ["backgrounds", "backgrounds"],
  ["feats", "feats"],
  ["features", "features"],
  ["traits", "traits"],
  ["conditions", "conditions"],
  ["skills", "skills"],
  ["rules", "rules"],
  ["rule-sections", "rule-sections"],
  ["languages", "languages"],
  ["damage-types", "damage-types"],
  ["magic-schools", "magic-schools"],
  ["weapon-properties", "weapon-properties"],
  ["ability-scores", "ability-scores"],
];

const entries = [...srd521Entries()];

for (const [category, endpoint] of categories) {
  const list = await getJSON(`${API_BASE}${API_VERSION}/${endpoint}`);
  for (const [index, summary] of list.results.entries()) {
    const detail = await getJSON(`${API_BASE}${summary.url}`);
    entries.push(toEntry(category, summary.index, detail));
    if ((index + 1) % 50 === 0) {
      console.error(`Fetched ${category}: ${index + 1}/${list.results.length}`);
    }
  }
}

entries.sort(
  (a, b) =>
    a.sourceKey.localeCompare(b.sourceKey) ||
    a.category.localeCompare(b.category) ||
    a.name.localeCompare(b.name),
);

console.log(JSON.stringify(entries, null, 2));

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not fetch ${url}: ${response.status}`);
  return response.json();
}

function toEntry(category, index, detail) {
  const description = descriptionFor(detail);
  return {
    sourceKey: "srd-2014",
    category,
    slug: `srd-2014-${category}-${index}`,
    name: detail.full_name || detail.name || titleCase(index),
    summary: summaryFor(detail, description),
    description,
    data: {
      source: {
        provider: "5e-bits D&D 5e SRD API",
        apiVersion: "2014",
        apiUrl: `${API_BASE}${detail.url ?? `${API_VERSION}/${category}/${index}`}`,
        sourceUrl: "https://www.dnd5eapi.co/",
      },
      index,
      apiUrl: detail.url ?? "",
      category,
      raw: detail,
    },
  };
}

function descriptionFor(detail) {
  return [
    paragraphs(detail.desc),
    paragraphs(detail.description),
    paragraphs(detail.higher_level),
    paragraphs(
      detail.equipment_category?.name ? [`Category: ${detail.equipment_category.name}.`] : [],
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function summaryFor(detail, description) {
  const parts = [
    detail.equipment_category?.name,
    detail.gear_category?.name,
    detail.weapon_category,
    detail.armor_category,
    detail.school?.name,
    detail.type,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return firstSentence(description);
}

function paragraphs(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join("\n\n");
  return typeof value === "string" ? value : "";
}

function firstSentence(value) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const match = cleaned.match(/^(.{1,180}?)(?:\.|$)/);
  return match ? match[1] : cleaned.slice(0, 180);
}

function titleCase(value = "") {
  return String(value)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function srd521Entries() {
  const source = {
    provider: "Wizards of the Coast",
    sourceUrl: "https://www.dndbeyond.com/srd",
    pdfUrl: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    licenseName: "Creative Commons Attribution 4.0 International",
  };
  return [
    {
      sourceKey: "srd-5-2-1",
      category: "rules",
      slug: "srd-5-2-1-source-overview",
      name: "System Reference Document 5.2.1",
      summary: "Official 2024-rules SRD source",
      description:
        "The SRD 5.2.1 is the official Creative Commons rules reference for the 2024 version of the fifth edition rules. bluDM tracks it separately from SRD 2014 so campaigns can choose which standard source versions are visible.",
      data: { source },
    },
    ...srd521CharacterOptions(source),
    ...srd521EquipmentEntries(source),
    {
      sourceKey: "srd-5-2-1",
      category: "glossary",
      slug: "srd-5-2-1-read-only-content",
      name: "Read-only Standard Content",
      summary: "Why standard content cannot be edited",
      description:
        "Standard library records are shared across bluDM and cite their source. Create a private copy when you need table-specific edits, renamed entries, or homebrew mechanics.",
      data: { source },
    },
  ];
}

function srd521EquipmentEntries(source) {
  return [
    ...srd521WeaponEntries(source),
    ...srd521ArmorEntries(source),
    ...srd521ToolEntries(source),
    ...srd521AdventuringGearEntries(source),
    ...srd521MountVehicleEntries(source),
    ...srd521ServiceEntries(source),
  ];
}

function srd521WeaponEntries(source) {
  const weapons = [
    weaponEntry("Club", "Simple", "Melee", "1d4", "Bludgeoning", ["Light"], "Slow", 2, 1, "sp"),
    weaponEntry(
      "Dagger",
      "Simple",
      "Melee",
      "1d4",
      "Piercing",
      ["Finesse", "Light", "Thrown"],
      "Nick",
      1,
      2,
      "gp",
      { throwRange: [20, 60] },
    ),
    weaponEntry(
      "Greatclub",
      "Simple",
      "Melee",
      "1d8",
      "Bludgeoning",
      ["Two-Handed"],
      "Push",
      10,
      2,
      "sp",
    ),
    weaponEntry(
      "Handaxe",
      "Simple",
      "Melee",
      "1d6",
      "Slashing",
      ["Light", "Thrown"],
      "Vex",
      2,
      5,
      "gp",
      { throwRange: [20, 60] },
    ),
    weaponEntry("Javelin", "Simple", "Melee", "1d6", "Piercing", ["Thrown"], "Slow", 2, 5, "sp", {
      throwRange: [30, 120],
    }),
    weaponEntry(
      "Light Hammer",
      "Simple",
      "Melee",
      "1d4",
      "Bludgeoning",
      ["Light", "Thrown"],
      "Nick",
      2,
      2,
      "gp",
      { throwRange: [20, 60] },
    ),
    weaponEntry("Mace", "Simple", "Melee", "1d6", "Bludgeoning", [], "Sap", 4, 5, "gp"),
    weaponEntry(
      "Quarterstaff",
      "Simple",
      "Melee",
      "1d6",
      "Bludgeoning",
      ["Versatile"],
      "Topple",
      4,
      2,
      "sp",
      { versatile: "1d8" },
    ),
    weaponEntry("Sickle", "Simple", "Melee", "1d4", "Slashing", ["Light"], "Nick", 2, 1, "gp"),
    weaponEntry(
      "Spear",
      "Simple",
      "Melee",
      "1d6",
      "Piercing",
      ["Thrown", "Versatile"],
      "Sap",
      3,
      1,
      "gp",
      { throwRange: [20, 60], versatile: "1d8" },
    ),
    weaponEntry(
      "Dart",
      "Simple",
      "Ranged",
      "1d4",
      "Piercing",
      ["Finesse", "Thrown"],
      "Vex",
      0.25,
      5,
      "cp",
      { throwRange: [20, 60] },
    ),
    weaponEntry(
      "Light Crossbow",
      "Simple",
      "Ranged",
      "1d8",
      "Piercing",
      ["Ammunition", "Loading", "Two-Handed"],
      "Slow",
      5,
      25,
      "gp",
      { range: [80, 320], ammunition: "Bolt" },
    ),
    weaponEntry(
      "Shortbow",
      "Simple",
      "Ranged",
      "1d6",
      "Piercing",
      ["Ammunition", "Two-Handed"],
      "Vex",
      2,
      25,
      "gp",
      { range: [80, 320], ammunition: "Arrow" },
    ),
    weaponEntry(
      "Sling",
      "Simple",
      "Ranged",
      "1d4",
      "Bludgeoning",
      ["Ammunition"],
      "Slow",
      0,
      1,
      "sp",
      { range: [30, 120], ammunition: "Bullet" },
    ),
    weaponEntry(
      "Battleaxe",
      "Martial",
      "Melee",
      "1d8",
      "Slashing",
      ["Versatile"],
      "Topple",
      4,
      10,
      "gp",
      { versatile: "1d10" },
    ),
    weaponEntry("Flail", "Martial", "Melee", "1d8", "Bludgeoning", [], "Sap", 2, 10, "gp"),
    weaponEntry(
      "Glaive",
      "Martial",
      "Melee",
      "1d10",
      "Slashing",
      ["Heavy", "Reach", "Two-Handed"],
      "Graze",
      6,
      20,
      "gp",
    ),
    weaponEntry(
      "Greataxe",
      "Martial",
      "Melee",
      "1d12",
      "Slashing",
      ["Heavy", "Two-Handed"],
      "Cleave",
      7,
      30,
      "gp",
    ),
    weaponEntry(
      "Greatsword",
      "Martial",
      "Melee",
      "2d6",
      "Slashing",
      ["Heavy", "Two-Handed"],
      "Graze",
      6,
      50,
      "gp",
    ),
    weaponEntry(
      "Halberd",
      "Martial",
      "Melee",
      "1d10",
      "Slashing",
      ["Heavy", "Reach", "Two-Handed"],
      "Cleave",
      6,
      20,
      "gp",
    ),
    weaponEntry(
      "Lance",
      "Martial",
      "Melee",
      "1d10",
      "Piercing",
      ["Heavy", "Reach", "Two-Handed"],
      "Topple",
      6,
      10,
      "gp",
      { note: "Two-Handed unless mounted." },
    ),
    weaponEntry(
      "Longsword",
      "Martial",
      "Melee",
      "1d8",
      "Slashing",
      ["Versatile"],
      "Sap",
      3,
      15,
      "gp",
      { versatile: "1d10" },
    ),
    weaponEntry(
      "Maul",
      "Martial",
      "Melee",
      "2d6",
      "Bludgeoning",
      ["Heavy", "Two-Handed"],
      "Topple",
      10,
      10,
      "gp",
    ),
    weaponEntry("Morningstar", "Martial", "Melee", "1d8", "Piercing", [], "Sap", 4, 15, "gp"),
    weaponEntry(
      "Pike",
      "Martial",
      "Melee",
      "1d10",
      "Piercing",
      ["Heavy", "Reach", "Two-Handed"],
      "Push",
      18,
      5,
      "gp",
    ),
    weaponEntry("Rapier", "Martial", "Melee", "1d8", "Piercing", ["Finesse"], "Vex", 2, 25, "gp"),
    weaponEntry(
      "Scimitar",
      "Martial",
      "Melee",
      "1d6",
      "Slashing",
      ["Finesse", "Light"],
      "Nick",
      3,
      25,
      "gp",
    ),
    weaponEntry(
      "Shortsword",
      "Martial",
      "Melee",
      "1d6",
      "Piercing",
      ["Finesse", "Light"],
      "Vex",
      2,
      10,
      "gp",
    ),
    weaponEntry(
      "Trident",
      "Martial",
      "Melee",
      "1d8",
      "Piercing",
      ["Thrown", "Versatile"],
      "Topple",
      4,
      5,
      "gp",
      { throwRange: [20, 60], versatile: "1d10" },
    ),
    weaponEntry(
      "Warhammer",
      "Martial",
      "Melee",
      "1d8",
      "Bludgeoning",
      ["Versatile"],
      "Push",
      5,
      15,
      "gp",
      { versatile: "1d10" },
    ),
    weaponEntry(
      "War Pick",
      "Martial",
      "Melee",
      "1d8",
      "Piercing",
      ["Versatile"],
      "Sap",
      2,
      5,
      "gp",
      { versatile: "1d10" },
    ),
    weaponEntry(
      "Whip",
      "Martial",
      "Melee",
      "1d4",
      "Slashing",
      ["Finesse", "Reach"],
      "Slow",
      3,
      2,
      "gp",
    ),
    weaponEntry(
      "Blowgun",
      "Martial",
      "Ranged",
      "1",
      "Piercing",
      ["Ammunition", "Loading"],
      "Vex",
      1,
      10,
      "gp",
      { range: [25, 100], ammunition: "Needle" },
    ),
    weaponEntry(
      "Hand Crossbow",
      "Martial",
      "Ranged",
      "1d6",
      "Piercing",
      ["Ammunition", "Light", "Loading"],
      "Vex",
      3,
      75,
      "gp",
      { range: [30, 120], ammunition: "Bolt" },
    ),
    weaponEntry(
      "Heavy Crossbow",
      "Martial",
      "Ranged",
      "1d10",
      "Piercing",
      ["Ammunition", "Heavy", "Loading", "Two-Handed"],
      "Push",
      18,
      50,
      "gp",
      { range: [100, 400], ammunition: "Bolt" },
    ),
    weaponEntry(
      "Longbow",
      "Martial",
      "Ranged",
      "1d8",
      "Piercing",
      ["Ammunition", "Heavy", "Two-Handed"],
      "Slow",
      2,
      50,
      "gp",
      { range: [150, 600], ammunition: "Arrow" },
    ),
    weaponEntry(
      "Musket",
      "Martial",
      "Ranged",
      "1d12",
      "Piercing",
      ["Ammunition", "Loading", "Two-Handed"],
      "Slow",
      10,
      500,
      "gp",
      { range: [40, 120], ammunition: "Bullet" },
    ),
    weaponEntry(
      "Pistol",
      "Martial",
      "Ranged",
      "1d10",
      "Piercing",
      ["Ammunition", "Loading"],
      "Vex",
      3,
      250,
      "gp",
      { range: [30, 90], ammunition: "Bullet" },
    ),
  ];
  return weapons.map((entry) => toSrd521EquipmentEntry(entry, source));
}

function weaponEntry(
  name,
  weaponCategory,
  weaponRange,
  damageDice,
  damageType,
  properties,
  mastery,
  weight,
  costQuantity,
  costUnit,
  options = {},
) {
  return {
    name,
    equipmentCategory: "Weapon",
    weaponCategory,
    weaponRange,
    damageDice,
    damageType,
    properties,
    mastery,
    weight,
    cost: { quantity: costQuantity, unit: costUnit },
    ...options,
  };
}

function srd521ArmorEntries(source) {
  const armor = [
    armorEntry("Padded Armor", "Light", 11, "dex", null, true, 8, 5),
    armorEntry("Leather Armor", "Light", 11, "dex", null, false, 10, 10),
    armorEntry("Studded Leather Armor", "Light", 12, "dex", null, false, 13, 45),
    armorEntry("Hide Armor", "Medium", 12, "dexMax2", null, false, 12, 10),
    armorEntry("Chain Shirt", "Medium", 13, "dexMax2", null, false, 20, 50),
    armorEntry("Scale Mail", "Medium", 14, "dexMax2", null, true, 45, 50),
    armorEntry("Breastplate", "Medium", 14, "dexMax2", null, false, 20, 400),
    armorEntry("Half Plate Armor", "Medium", 15, "dexMax2", null, true, 40, 750),
    armorEntry("Ring Mail", "Heavy", 14, "none", null, true, 40, 30),
    armorEntry("Chain Mail", "Heavy", 16, "none", 13, true, 55, 75),
    armorEntry("Splint Armor", "Heavy", 17, "none", 15, true, 60, 200),
    armorEntry("Plate Armor", "Heavy", 18, "none", 15, true, 65, 1500),
    shieldEntry("Shield", 2, 6, 10),
  ];
  return armor.map((entry) => toSrd521EquipmentEntry(entry, source));
}

function armorEntry(
  name,
  armorCategory,
  base,
  dexMode,
  strengthMinimum,
  stealthDisadvantage,
  weight,
  cost,
) {
  const armorClass = { base };
  if (dexMode !== "none") armorClass.dex_bonus = true;
  if (dexMode === "dexMax2") armorClass.max_bonus = 2;
  return {
    name,
    armorCategory,
    armorClass,
    strengthMinimum,
    stealthDisadvantage,
    weight,
    cost,
  };
}

function shieldEntry(name, bonus, weight, cost) {
  return {
    name,
    armorCategory: "Shield",
    armorClass: { base: bonus },
    strengthMinimum: null,
    stealthDisadvantage: false,
    weight,
    cost,
  };
}

function srd521ToolEntries(source) {
  const tools = [
    toolEntry("Alchemist's Supplies", "Artisan's Tools", "Intelligence", 8, 50),
    toolEntry("Brewer's Supplies", "Artisan's Tools", "Intelligence", 9, 20),
    toolEntry("Calligrapher's Supplies", "Artisan's Tools", "Dexterity", 5, 10),
    toolEntry("Carpenter's Tools", "Artisan's Tools", "Strength", 6, 8),
    toolEntry("Cartographer's Tools", "Artisan's Tools", "Wisdom", 6, 15),
    toolEntry("Cobbler's Tools", "Artisan's Tools", "Dexterity", 5, 5),
    toolEntry("Cook's Utensils", "Artisan's Tools", "Wisdom", 8, 1),
    toolEntry("Glassblower's Tools", "Artisan's Tools", "Intelligence", 5, 30),
    toolEntry("Jeweler's Tools", "Artisan's Tools", "Intelligence", 2, 25),
    toolEntry("Leatherworker's Tools", "Artisan's Tools", "Dexterity", 5, 5),
    toolEntry("Mason's Tools", "Artisan's Tools", "Strength", 8, 10),
    toolEntry("Painter's Supplies", "Artisan's Tools", "Wisdom", 5, 10),
    toolEntry("Potter's Tools", "Artisan's Tools", "Intelligence", 3, 10),
    toolEntry("Smith's Tools", "Artisan's Tools", "Strength", 8, 20),
    toolEntry("Tinker's Tools", "Artisan's Tools", "Dexterity", 10, 50),
    toolEntry("Weaver's Tools", "Artisan's Tools", "Dexterity", 5, 1),
    toolEntry("Woodcarver's Tools", "Artisan's Tools", "Dexterity", 5, 1),
    toolEntry("Disguise Kit", "Other Tools", "Charisma", 3, 25),
    toolEntry("Forgery Kit", "Other Tools", "Dexterity", 5, 15),
    toolEntry("Herbalism Kit", "Other Tools", "Intelligence", 3, 5),
    toolEntry("Navigator's Tools", "Other Tools", "Wisdom", 2, 25),
    toolEntry("Poisoner's Kit", "Other Tools", "Intelligence", 2, 50),
    toolEntry("Thieves' Tools", "Other Tools", "Dexterity", 1, 25),
    toolEntry("Dice", "Gaming Sets", "Wisdom", 0, 1, "sp"),
    toolEntry("Dragonchess", "Gaming Sets", "Wisdom", 0, 1),
    toolEntry("Playing Cards", "Gaming Sets", "Wisdom", 0, 5, "sp"),
    toolEntry("Three-Dragon Ante", "Gaming Sets", "Wisdom", 0, 1),
    toolEntry("Bagpipes", "Musical Instruments", "Charisma", 6, 30),
    toolEntry("Drum", "Musical Instruments", "Charisma", 3, 6),
    toolEntry("Dulcimer", "Musical Instruments", "Charisma", 10, 25),
    toolEntry("Flute", "Musical Instruments", "Charisma", 1, 2),
    toolEntry("Horn", "Musical Instruments", "Charisma", 2, 3),
    toolEntry("Lute", "Musical Instruments", "Charisma", 2, 35),
    toolEntry("Lyre", "Musical Instruments", "Charisma", 2, 30),
    toolEntry("Pan Flute", "Musical Instruments", "Charisma", 2, 12),
    toolEntry("Shawm", "Musical Instruments", "Charisma", 1, 2),
    toolEntry("Viol", "Musical Instruments", "Charisma", 1, 30),
  ];
  return tools.map((entry) => toSrd521EquipmentEntry(entry, source));
}

function toolEntry(name, toolCategory, ability, weight, costQuantity, costUnit = "gp") {
  return {
    name,
    equipmentCategory: "Tools",
    toolCategory,
    ability,
    weight,
    cost: { quantity: costQuantity, unit: costUnit },
  };
}

function srd521AdventuringGearEntries(source) {
  const gear = [
    gearEntry("Acid", 1, 25),
    gearEntry("Alchemist's Fire", 1, 50),
    gearEntry("Antitoxin", 0, 50),
    gearEntry("Backpack", 5, 2),
    gearEntry("Ball Bearings", 2, 1),
    gearEntry("Barrel", 70, 2),
    gearEntry("Basket", 2, 4, "sp"),
    gearEntry("Bedroll", 7, 1),
    gearEntry("Bell", 0, 1),
    gearEntry("Blanket", 3, 5, "sp"),
    gearEntry("Block and Tackle", 5, 1),
    gearEntry("Book", 5, 25),
    gearEntry("Bottle, Glass", 2, 2),
    gearEntry("Bucket", 2, 5, "cp"),
    gearEntry("Burglar's Pack", 42, 16, "gp", "Equipment Packs"),
    gearEntry("Caltrops", 2, 1),
    gearEntry("Candle", 0, 1, "cp"),
    gearEntry("Case, Crossbow Bolt", 1, 1),
    gearEntry("Case, Map or Scroll", 1, 1),
    gearEntry("Chain", 10, 5),
    gearEntry("Chest", 25, 5),
    gearEntry("Climber's Kit", 12, 25),
    gearEntry("Clothes, Fine", 6, 15),
    gearEntry("Clothes, Traveler's", 4, 2),
    gearEntry("Component Pouch", 2, 25),
    gearEntry("Costume", 4, 5),
    gearEntry("Crowbar", 5, 2),
    gearEntry("Diplomat's Pack", 39, 39, "gp", "Equipment Packs"),
    gearEntry("Dungeoneer's Pack", 55, 12, "gp", "Equipment Packs"),
    gearEntry("Entertainer's Pack", 58.5, 40, "gp", "Equipment Packs"),
    gearEntry("Explorer's Pack", 55, 10, "gp", "Equipment Packs"),
    gearEntry("Flask", 1, 2, "cp"),
    gearEntry("Grappling Hook", 4, 2),
    gearEntry("Healer's Kit", 3, 5),
    gearEntry("Holy Water", 1, 25),
    gearEntry("Hunting Trap", 25, 5),
    gearEntry("Ink", 0, 10),
    gearEntry("Ink Pen", 0, 2, "cp"),
    gearEntry("Jug", 4, 2, "cp"),
    gearEntry("Ladder", 25, 1, "sp"),
    gearEntry("Lamp", 1, 5, "sp"),
    gearEntry("Lantern, Bullseye", 2, 10),
    gearEntry("Lantern, Hooded", 2, 5),
    gearEntry("Lock", 1, 10),
    gearEntry("Magnifying Glass", 0, 100),
    gearEntry("Manacles", 6, 2),
    gearEntry("Map", 0, 1),
    gearEntry("Mirror", 0.5, 5),
    gearEntry("Net", 3, 1),
    gearEntry("Oil", 1, 1, "sp"),
    gearEntry("Paper", 0, 2, "sp"),
    gearEntry("Parchment", 0, 1, "sp"),
    gearEntry("Perfume", 0, 5),
    gearEntry("Poison, Basic", 0, 100),
    gearEntry("Pole", 7, 5, "cp"),
    gearEntry("Pot, Iron", 10, 2),
    gearEntry("Potion of Healing", 0.5, 50),
    gearEntry("Pouch", 1, 5, "sp"),
    gearEntry("Priest's Pack", 29, 33, "gp", "Equipment Packs"),
    gearEntry("Quiver", 1, 1),
    gearEntry("Ram, Portable", 35, 4),
    gearEntry("Rations", 2, 5, "sp"),
    gearEntry("Robe", 4, 1),
    gearEntry("Rope", 5, 1),
    gearEntry("Sack", 0.5, 1, "cp"),
    gearEntry("Scholar's Pack", 22, 40, "gp", "Equipment Packs"),
    gearEntry("Shovel", 5, 2),
    gearEntry("Signal Whistle", 0, 5, "cp"),
    gearEntry("Spell Scroll (Cantrip)", 0, 30),
    gearEntry("Spell Scroll (Level 1)", 0, 50),
    gearEntry("Spikes, Iron", 5, 1),
    gearEntry("Spyglass", 1, 1000),
    gearEntry("String", 0, 1, "sp"),
    gearEntry("Tent", 20, 2),
    gearEntry("Tinderbox", 1, 5, "sp"),
    gearEntry("Torch", 1, 1, "cp"),
    gearEntry("Vial", 0, 1),
    gearEntry("Waterskin", 5, 2, "sp"),
    gearEntry("Arrows", 1, 1, "gp", "Ammunition", { quantity: 20 }),
    gearEntry("Crossbow Bolts", 1.5, 1, "gp", "Ammunition", { quantity: 20 }),
    gearEntry("Firearm Bullets", 2, 1, "gp", "Ammunition", { quantity: 10 }),
    gearEntry("Needles", 1, 1, "gp", "Ammunition", { quantity: 50 }),
    gearEntry("Sling Bullets", 1.5, 4, "cp", "Ammunition", { quantity: 20 }),
    gearEntry("Crystal", 1, 10, "gp", "Arcane Foci"),
    gearEntry("Orb", 3, 20, "gp", "Arcane Foci"),
    gearEntry("Rod", 2, 10, "gp", "Arcane Foci"),
    gearEntry("Staff", 4, 5, "gp", "Arcane Foci"),
    gearEntry("Wand", 1, 10, "gp", "Arcane Foci"),
    gearEntry("Sprig of Mistletoe", 0, 1, "gp", "Druidic Foci"),
    gearEntry("Totem", 0, 1, "gp", "Druidic Foci"),
    gearEntry("Wooden Staff", 4, 5, "gp", "Druidic Foci"),
    gearEntry("Yew Wand", 1, 10, "gp", "Druidic Foci"),
    gearEntry("Amulet", 1, 5, "gp", "Holy Symbols"),
    gearEntry("Emblem", 0, 5, "gp", "Holy Symbols"),
    gearEntry("Reliquary", 2, 5, "gp", "Holy Symbols"),
  ];
  return gear.map((entry) => toSrd521EquipmentEntry(entry, source));
}

function gearEntry(
  name,
  weight,
  costQuantity,
  costUnit = "gp",
  gearCategory = "Standard Gear",
  options = {},
) {
  return {
    name,
    equipmentCategory: "Adventuring Gear",
    gearCategory,
    weight,
    cost: { quantity: costQuantity, unit: costUnit },
    ...options,
  };
}

function srd521MountVehicleEntries(source) {
  const entries = [
    mountVehicleEntry("Camel", 0, 50, { capacity: "450 lb." }),
    mountVehicleEntry("Elephant", 0, 200, { capacity: "1,320 lb." }),
    mountVehicleEntry("Horse, Draft", 0, 50, { capacity: "540 lb." }),
    mountVehicleEntry("Horse, Riding", 0, 75, { capacity: "480 lb." }),
    mountVehicleEntry("Mastiff", 0, 25, { capacity: "195 lb." }),
    mountVehicleEntry("Mule", 0, 8, { capacity: "420 lb." }),
    mountVehicleEntry("Pony", 0, 30, { capacity: "225 lb." }),
    mountVehicleEntry("Warhorse", 0, 400, { capacity: "540 lb." }),
    mountVehicleEntry("Carriage", 600, 100),
    mountVehicleEntry("Cart", 200, 15),
    mountVehicleEntry("Chariot", 100, 250),
    mountVehicleEntry("Feed per Day", 10, 5, { costUnit: "cp" }),
    mountVehicleEntry("Saddle, Exotic", 40, 60),
    mountVehicleEntry("Saddle, Military", 30, 20),
    mountVehicleEntry("Saddle, Riding", 25, 10),
    mountVehicleEntry("Sled", 300, 20),
    mountVehicleEntry("Stabling per Day", 0, 5, { costUnit: "sp" }),
    mountVehicleEntry("Wagon", 400, 35),
    mountVehicleEntry("Airship", 0, 40000, {
      speed: { quantity: 8, unit: "mph" },
      capacity: "1 ton",
    }),
    mountVehicleEntry("Galley", 0, 30000, {
      speed: { quantity: 4, unit: "mph" },
      capacity: "500 tons",
    }),
    mountVehicleEntry("Keelboat", 0, 3000, {
      speed: { quantity: 1, unit: "mph" },
      capacity: "1/2 ton",
    }),
    mountVehicleEntry("Longship", 0, 10000, {
      speed: { quantity: 3, unit: "mph" },
      capacity: "10 tons",
    }),
    mountVehicleEntry("Rowboat", 100, 50, { speed: { quantity: 1.5, unit: "mph" } }),
    mountVehicleEntry("Sailing Ship", 0, 10000, {
      speed: { quantity: 2, unit: "mph" },
      capacity: "100 tons",
    }),
    mountVehicleEntry("Warship", 0, 25000, {
      speed: { quantity: 2.5, unit: "mph" },
      capacity: "200 tons",
    }),
  ];
  return entries.map((entry) => toSrd521EquipmentEntry(entry, source));
}

function mountVehicleEntry(name, weight, costQuantity, options = {}) {
  const costUnit = options.costUnit ?? "gp";
  const { costUnit: _costUnit, ...rest } = options;
  return {
    name,
    equipmentCategory: "Mounts and Vehicles",
    weight,
    cost: { quantity: costQuantity, unit: costUnit },
    ...rest,
  };
}

function srd521ServiceEntries(source) {
  const entries = [
    serviceEntry("Lifestyle, Wretched", 0, "gp", "Lifestyle Expenses"),
    serviceEntry("Lifestyle, Squalid", 1, "sp", "Lifestyle Expenses"),
    serviceEntry("Lifestyle, Poor", 2, "sp", "Lifestyle Expenses"),
    serviceEntry("Lifestyle, Modest", 1, "gp", "Lifestyle Expenses"),
    serviceEntry("Lifestyle, Comfortable", 2, "gp", "Lifestyle Expenses"),
    serviceEntry("Lifestyle, Wealthy", 4, "gp", "Lifestyle Expenses"),
    serviceEntry("Lifestyle, Aristocratic", 10, "gp", "Lifestyle Expenses"),
    serviceEntry("Ale (Mug)", 4, "cp", "Food, Drink, and Lodging"),
    serviceEntry("Bread (Loaf)", 2, "cp", "Food, Drink, and Lodging"),
    serviceEntry("Cheese (Wedge)", 1, "sp", "Food, Drink, and Lodging"),
    serviceEntry("Inn Stay, Squalid", 7, "cp", "Food, Drink, and Lodging"),
    serviceEntry("Inn Stay, Poor", 1, "sp", "Food, Drink, and Lodging"),
    serviceEntry("Inn Stay, Modest", 5, "sp", "Food, Drink, and Lodging"),
    serviceEntry("Inn Stay, Comfortable", 8, "sp", "Food, Drink, and Lodging"),
    serviceEntry("Inn Stay, Wealthy", 2, "gp", "Food, Drink, and Lodging"),
    serviceEntry("Inn Stay, Aristocratic", 4, "gp", "Food, Drink, and Lodging"),
    serviceEntry("Meal, Squalid", 1, "cp", "Food, Drink, and Lodging"),
    serviceEntry("Meal, Poor", 2, "cp", "Food, Drink, and Lodging"),
    serviceEntry("Meal, Modest", 1, "sp", "Food, Drink, and Lodging"),
    serviceEntry("Meal, Comfortable", 2, "sp", "Food, Drink, and Lodging"),
    serviceEntry("Meal, Wealthy", 3, "sp", "Food, Drink, and Lodging"),
    serviceEntry("Meal, Aristocratic", 6, "sp", "Food, Drink, and Lodging"),
    serviceEntry("Wine, Common Bottle", 2, "sp", "Food, Drink, and Lodging"),
    serviceEntry("Wine, Fine Bottle", 10, "gp", "Food, Drink, and Lodging"),
    serviceEntry("Skilled Hireling", 2, "gp", "Hirelings"),
    serviceEntry("Untrained Hireling", 2, "sp", "Hirelings"),
    serviceEntry("Messenger", 2, "cp", "Hirelings"),
    serviceEntry("Spellcasting Service, Cantrip", 30, "gp", "Spellcasting Services"),
    serviceEntry("Spellcasting Service, Level 1", 50, "gp", "Spellcasting Services"),
    serviceEntry("Spellcasting Service, Level 2", 200, "gp", "Spellcasting Services"),
    serviceEntry("Spellcasting Service, Level 3", 300, "gp", "Spellcasting Services"),
    serviceEntry("Spellcasting Service, Levels 4-5", 2000, "gp", "Spellcasting Services"),
    serviceEntry("Spellcasting Service, Levels 6-8", 20000, "gp", "Spellcasting Services"),
    serviceEntry("Spellcasting Service, Level 9", 100000, "gp", "Spellcasting Services"),
  ];
  return entries.map((entry) => toSrd521EquipmentEntry(entry, source));
}

function serviceEntry(name, costQuantity, costUnit, gearCategory) {
  return {
    name,
    equipmentCategory: "Adventuring Gear",
    gearCategory,
    weight: 0,
    cost: { quantity: costQuantity, unit: costUnit },
  };
}

function toSrd521EquipmentEntry(entry, source) {
  const equipmentCategory =
    entry.equipmentCategory ?? (entry.armorCategory ? "Armor" : "Adventuring Gear");
  const cost = typeof entry.cost === "number" ? { quantity: entry.cost, unit: "gp" } : entry.cost;
  const raw = {
    index: slugify(entry.name),
    name: entry.name,
    equipment_category: { name: equipmentCategory },
    cost,
    weight: entry.weight,
    url: `/api/2024/equipment/${slugify(entry.name)}`,
  };
  if (entry.armorCategory) raw.armor_category = { name: entry.armorCategory };
  if (entry.armorClass) raw.armor_class = entry.armorClass;
  if (typeof entry.stealthDisadvantage === "boolean")
    raw.stealth_disadvantage = entry.stealthDisadvantage;
  if (entry.strengthMinimum) raw.str_minimum = entry.strengthMinimum;
  if (entry.weaponCategory) raw.weapon_category = entry.weaponCategory;
  if (entry.weaponRange) raw.weapon_range = entry.weaponRange;
  if (entry.weaponCategory && entry.weaponRange)
    raw.category_range = `${entry.weaponCategory} ${entry.weaponRange}`;
  if (entry.damageDice) {
    raw.damage = {
      damage_dice: entry.damageDice,
      damage_type: { name: entry.damageType },
    };
  }
  if (entry.versatile) raw.two_handed_damage = { damage_dice: entry.versatile };
  if (entry.properties) raw.properties = entry.properties.map((name) => ({ name }));
  if (entry.mastery) raw.mastery = entry.mastery;
  if (entry.range) raw.range = { normal: entry.range[0], long: entry.range[1] };
  if (entry.throwRange)
    raw.throw_range = { normal: entry.throwRange[0], long: entry.throwRange[1] };
  if (entry.ammunition) raw.ammunition = entry.ammunition;
  if (entry.note) raw.special = [entry.note];
  if (entry.toolCategory) raw.tool_category = entry.toolCategory;
  if (entry.gearCategory) raw.gear_category = { name: entry.gearCategory };
  if (entry.quantity) raw.quantity = entry.quantity;
  if (entry.ability) raw.ability = entry.ability;
  if (entry.capacity) raw.capacity = entry.capacity;
  if (entry.speed) raw.speed = entry.speed;

  return {
    sourceKey: "srd-5-2-1",
    category: "equipment",
    slug: `srd-5-2-1-equipment-${slugify(entry.name)}`,
    name: entry.name,
    summary: srd521EquipmentSummary(entry, equipmentCategory),
    description: srd521EquipmentDescription({ ...entry, cost }, equipmentCategory),
    data: {
      source,
      index: raw.index,
      apiUrl: raw.url,
      category: "equipment",
      raw,
    },
  };
}

function srd521EquipmentSummary(entry, equipmentCategory) {
  if (equipmentCategory === "Weapon")
    return `Weapon · ${entry.weaponCategory} ${entry.weaponRange}`;
  if (equipmentCategory === "Armor") return `Armor · ${entry.armorCategory}`;
  if (equipmentCategory === "Tools") return `Tools · ${entry.toolCategory}`;
  if (equipmentCategory === "Adventuring Gear" && entry.gearCategory) {
    return `Adventuring Gear · ${entry.gearCategory}`;
  }
  return equipmentCategory;
}

function srd521EquipmentDescription(entry, equipmentCategory) {
  if (equipmentCategory === "Armor") return srd521ArmorDescription(entry);
  const parts = [
    `${entry.name} is ${srd521EquipmentSummary(entry, equipmentCategory).toLowerCase()} from SRD 5.2.1.`,
  ];
  if (entry.damageDice) parts.push(`Damage: ${entry.damageDice} ${entry.damageType}.`);
  if (entry.mastery) parts.push(`Mastery: ${entry.mastery}.`);
  if (entry.properties?.length) parts.push(`Properties: ${entry.properties.join(", ")}.`);
  if (entry.ability) parts.push(`Ability: ${entry.ability}.`);
  if (entry.capacity) parts.push(`Capacity: ${entry.capacity}.`);
  if (entry.speed) parts.push(`Speed: ${entry.speed.quantity} ${entry.speed.unit}.`);
  parts.push(`Weight: ${formatWeight(entry.weight)}.`);
  parts.push(`Cost: ${formatCost(entry.cost)}.`);
  return parts.join(" ");
}

function srd521ArmorDescription(entry) {
  const parts = [
    `${entry.name} is ${entry.armorCategory.toLowerCase()} armor from SRD 5.2.1.`,
    `Armor Class: ${armorClassLabel(entry)}.`,
    entry.strengthMinimum ? `Strength: Str ${entry.strengthMinimum}.` : "",
    entry.stealthDisadvantage ? "Stealth: Disadvantage." : "",
    `Weight: ${entry.weight} lb.`,
    `Cost: ${formatCost(entry.cost)}.`,
  ].filter(Boolean);
  return parts.join(" ");
}

function formatWeight(weight) {
  if (!weight) return "-";
  return `${weight.toLocaleString("en-US")} lb`;
}

function formatCost(cost) {
  if (!cost) return "-";
  const quantity =
    typeof cost.quantity === "number"
      ? cost.quantity.toLocaleString("en-US")
      : String(cost.quantity);
  return `${quantity} ${String(cost.unit || "gp").toUpperCase()}`;
}

function armorClassLabel(entry) {
  if (entry.armorCategory === "Shield") return "+2";
  const base = entry.armorClass.base;
  if (!entry.armorClass.dex_bonus) return String(base);
  if (entry.armorClass.max_bonus) return `${base} + Dex modifier (max 2)`;
  return `${base} + Dex modifier`;
}

function srd521CharacterOptions(source) {
  const classes = [
    "Barbarian",
    "Bard",
    "Cleric",
    "Druid",
    "Fighter",
    "Monk",
    "Paladin",
    "Ranger",
    "Rogue",
    "Sorcerer",
    "Warlock",
    "Wizard",
  ];
  const species = [
    "Dragonborn",
    "Dwarf",
    "Elf",
    "Gnome",
    "Goliath",
    "Halfling",
    "Human",
    "Orc",
    "Tiefling",
  ];
  const backgrounds = ["Acolyte", "Criminal", "Sage", "Soldier"];
  const feats = [
    "Ability Score Improvement",
    "Alert",
    "Archery",
    "Boon of Combat Prowess",
    "Boon of Dimensional Travel",
    "Boon of Fate",
    "Boon of Irresistible Offense",
    "Boon of the Night Spirit",
    "Boon of Spell Recall",
    "Boon of Truesight",
    "Defense",
    "Grappler",
    "Great Weapon Fighting",
    "Magic Initiate",
    "Savage Attacker",
    "Two-Weapon Fighting",
  ];
  return [
    ...characterOptionEntries("classes", classes, "SRD 5.2.1 class option", source),
    ...characterOptionEntries("species", species, "SRD 5.2.1 species option", source),
    ...characterOptionEntries("backgrounds", backgrounds, "SRD 5.2.1 background option", source),
    ...characterOptionEntries("feats", feats, "SRD 5.2.1 feat option", source),
  ];
}

function characterOptionEntries(category, names, summary, source) {
  return names.map((name) => ({
    sourceKey: "srd-5-2-1",
    category,
    slug: `srd-5-2-1-${category}-${slugify(name)}`,
    name,
    summary,
    description:
      "This lightweight picker entry identifies a character option present in SRD 5.2.1. Full rules text will be added when the SRD 5.2.1 parser is expanded.",
    data: { source, category },
  }));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
