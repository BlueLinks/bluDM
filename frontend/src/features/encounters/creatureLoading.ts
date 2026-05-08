import { api } from "../../lib/api";
import type { Creature } from "../../types";

const fallbackCreatureSource = "srd-2014";

export async function loadEncounterCreatures(sourceKeys: string[]) {
  const primary = await api.creatures({ includeStandard: true, source: sourceKeys });
  const hasStandardCreatures = primary.creatures.some(
    (creature) => creature.librarySource === "standard",
  );
  const needsFallback = !hasStandardCreatures && !sourceKeys.includes(fallbackCreatureSource);

  if (!needsFallback) {
    return { creatures: primary.creatures, usingFallbackCreatures: false };
  }

  const fallback = await api.creatures({
    includeUser: false,
    includeStandard: true,
    source: [fallbackCreatureSource],
  });

  return {
    creatures: mergeCreatures(primary.creatures, fallback.creatures),
    usingFallbackCreatures: fallback.creatures.length > 0,
  };
}

function mergeCreatures(primary: Creature[], fallback: Creature[]) {
  const seen = new Set(primary.map((creature) => creature.id));
  return [...primary, ...fallback.filter((creature) => !seen.has(creature.id))];
}
