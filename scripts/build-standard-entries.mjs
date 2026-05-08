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
