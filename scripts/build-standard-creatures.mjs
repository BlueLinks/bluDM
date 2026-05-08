const API_BASE = "https://www.dnd5eapi.co";
const API_VERSION = "/api/2014";

const response = await fetch(`${API_BASE}${API_VERSION}/monsters`);
if (!response.ok) throw new Error(`Could not list monsters: ${response.status}`);
const list = await response.json();
const creatures = [];

for (const [index, summary] of list.results.entries()) {
  const detailResponse = await fetch(`${API_BASE}${summary.url}`);
  if (!detailResponse.ok) {
    throw new Error(`Could not fetch ${summary.index}: ${detailResponse.status}`);
  }
  const monster = await detailResponse.json();
  creatures.push(toSeed(monster));
  if ((index + 1) % 50 === 0) console.error(`Fetched ${index + 1}/${list.results.length}`);
}

creatures.sort((a, b) => a.name.localeCompare(b.name));
console.log(JSON.stringify(creatures, null, 2));

function toSeed(monster) {
  const statBlock = {
    source: {
      provider: "5e-bits D&D 5e SRD API",
      apiVersion: "2014",
      apiUrl: `${API_BASE}${monster.url}`,
      sourceUrl: "https://www.dnd5eapi.co/",
    },
    abilities: {
      str: monster.strength ?? 10,
      dex: monster.dexterity ?? 10,
      con: monster.constitution ?? 10,
      int: monster.intelligence ?? 10,
      wis: monster.wisdom ?? 10,
      cha: monster.charisma ?? 10,
    },
    abilitySaveProficiencies: proficiencies(monster.proficiencies, "Saving Throw"),
    skills: proficiencies(monster.proficiencies, "Skill"),
    speed: normalizeRecord(monster.speed),
    senses: normalizeRecord(monster.senses),
    languages: monster.languages || "",
    proficiencyBonus: monster.proficiency_bonus ?? 0,
    defenses: {
      vulnerabilities: monster.damage_vulnerabilities ?? [],
      resistances: monster.damage_resistances ?? [],
      immunities: monster.damage_immunities ?? [],
      conditionImmunities: (monster.condition_immunities ?? []).map(
        (condition) => condition.name ?? condition.index ?? String(condition),
      ),
    },
    specialAbilities: normalizeFeatureList(monster.special_abilities),
    actions: normalizeActionList(monster.actions),
    legendaryActions: normalizeActionList(monster.legendary_actions),
    reactions: normalizeActionList(monster.reactions),
    spellcasting: spellcasting(monster.special_abilities),
    defaultDisposition: "enemy",
  };

  if (monster.subtype) statBlock.creatureSubtype = titleCase(monster.subtype);

  return {
    slug: `srd-${monster.index}`,
    name: monster.name,
    description: descriptionFor(monster),
    size: titleCase(monster.size),
    creatureType: titleCase(monster.type),
    alignment: monster.alignment || "",
    armorClass: firstArmorClass(monster.armor_class),
    hitPoints: monster.hit_points ?? 1,
    hitDice: monster.hit_dice || monster.hit_points_roll || "",
    challengeRating: challengeRating(monster.challenge_rating),
    xp: monster.xp ?? 0,
    avatarUrl: monster.image ? `${API_BASE}${monster.image}` : "",
    sourceLabel: "SRD 2014",
    sourceUrl: `${API_BASE}${monster.url}`,
    licenseName: "OGL 1.0a / 5e SRD API data",
    statBlock,
  };
}

function firstArmorClass(armorClass) {
  if (Array.isArray(armorClass) && armorClass.length > 0) return Number(armorClass[0].value) || 10;
  return Number(armorClass) || 10;
}

function challengeRating(value) {
  if (value === 0.125) return "1/8";
  if (value === 0.25) return "1/4";
  if (value === 0.5) return "1/2";
  return String(value ?? "");
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") return {};
  return Object.fromEntries(
    Object.entries(record).filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    ),
  );
}

function proficiencies(proficiencies = [], prefix) {
  const entries = {};
  for (const item of proficiencies) {
    const name = item?.proficiency?.name ?? "";
    if (!name.startsWith(`${prefix}: `)) continue;
    const key = name
      .slice(prefix.length + 2)
      .toLowerCase()
      .replaceAll(" ", "");
    entries[key] = item.value;
  }
  return entries;
}

function normalizeFeatureList(features = []) {
  return features.map((feature) => ({
    name: feature.name || "",
    description: feature.desc || "",
    usage: feature.usage || null,
    dc: feature.dc || null,
    damage: normalizeDamage(feature.damage),
  }));
}

function normalizeActionList(actions = []) {
  return actions.map((action) => ({
    name: action.name || "",
    description: action.desc || "",
    attackBonus: action.attack_bonus ?? 0,
    damage: normalizeDamage(action.damage),
    dc: action.dc || null,
    usage: action.usage || null,
    options: action.options || null,
  }));
}

function normalizeDamage(damage = []) {
  return damage.map((part) => ({
    damageType: part?.damage_type?.name ?? "",
    damageDice: part?.damage_dice ?? "",
  }));
}

function spellcasting(features = []) {
  const spellcastingFeature = features.find((feature) => /spellcasting/i.test(feature?.name ?? ""));
  if (!spellcastingFeature) return {};
  return {
    name: spellcastingFeature.name || "Spellcasting",
    description: spellcastingFeature.desc || "",
    usage: spellcastingFeature.usage || null,
  };
}

function descriptionFor(monster) {
  const parts = [];
  const type = [monster.size, monster.type, monster.subtype ? `(${monster.subtype})` : ""]
    .filter(Boolean)
    .join(" ");
  if (type) parts.push(`${titleCase(type)}.`);
  if (monster.languages) parts.push(`Languages: ${monster.languages}.`);
  if (monster.senses?.passive_perception) {
    parts.push(`Passive Perception ${monster.senses.passive_perception}.`);
  }
  return parts.join(" ");
}

function titleCase(value = "") {
  return String(value)
    .split(/([\s()]+)/)
    .map((part) => (/^[a-z]/.test(part) ? part[0].toUpperCase() + part.slice(1) : part))
    .join("");
}
