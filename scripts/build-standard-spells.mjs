const API_BASE = "https://www.dnd5eapi.co";
const API_VERSION = "/api/2014";

const response = await fetch(`${API_BASE}${API_VERSION}/spells`);
if (!response.ok) throw new Error(`Could not list spells: ${response.status}`);
const list = await response.json();
const spells = [];

for (const [index, summary] of list.results.entries()) {
  const detailResponse = await fetch(`${API_BASE}${summary.url}`);
  if (!detailResponse.ok)
    throw new Error(`Could not fetch ${summary.index}: ${detailResponse.status}`);
  const spell = await detailResponse.json();
  spells.push(toSeed(spell));
  if ((index + 1) % 50 === 0) console.error(`Fetched ${index + 1}/${list.results.length}`);
}

spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
console.log(JSON.stringify(spells, null, 2));

function toSeed(spell) {
  return {
    slug: `srd-${spell.index}`,
    name: spell.name,
    level: spell.level ?? 0,
    school: spell.school?.name ?? "",
    castingTime: spell.casting_time ?? "",
    range: spell.range ?? "",
    components: {
      verbal: spell.components?.includes("V") ?? false,
      somatic: spell.components?.includes("S") ?? false,
      material: spell.components?.includes("M") ? spell.material || "Material component" : "",
      raw: spell.components ?? [],
    },
    duration: spell.duration ?? "",
    ritual: Boolean(spell.ritual),
    concentration: Boolean(spell.concentration),
    description: joinParagraphs(spell.desc),
    higherLevel: joinParagraphs(spell.higher_level),
    sourceNote: "SRD 2014",
    sourceLabel: "SRD 2014",
    sourceUrl: `${API_BASE}${spell.url}`,
    licenseName: "OGL 1.0a / 5e SRD API data",
    mechanics: {
      source: {
        provider: "5e-bits D&D 5e SRD API",
        apiVersion: "2014",
        apiUrl: `${API_BASE}${spell.url}`,
        sourceUrl: "https://www.dnd5eapi.co/",
      },
      damage: normalizeDamage(spell.damage),
      dc: spell.dc ?? null,
      healAtSlotLevel: spell.heal_at_slot_level ?? null,
      areaOfEffect: spell.area_of_effect ?? null,
      attackType: spell.attack_type ?? "",
      classes: (spell.classes ?? []).map((item) => item.name),
      subclasses: (spell.subclasses ?? []).map((item) => item.name),
    },
  };
}

function joinParagraphs(value) {
  return Array.isArray(value) ? value.join("\n\n") : "";
}

function normalizeDamage(damage) {
  if (!damage) return null;
  return {
    damageType: damage.damage_type?.name ?? "",
    damageAtCharacterLevel: damage.damage_at_character_level ?? null,
    damageAtSlotLevel: damage.damage_at_slot_level ?? null,
  };
}
