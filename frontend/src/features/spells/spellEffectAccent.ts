import type { SpellEffectCategory } from "../../lib/domain/spellEffectOptions";

export function categoryAccent(category: SpellEffectCategory) {
  const accents: Record<SpellEffectCategory, { border: string; badge: string }> = {
    hp: { border: "border-l-success", badge: "bg-success/15 text-success" },
    damage: { border: "border-l-destructive", badge: "bg-destructive/15 text-destructive" },
    movement: {
      border: "border-l-info",
      badge: "bg-info/15 text-info",
    },
    defense: {
      border: "border-l-companion-official",
      badge: "bg-companion-official/15 text-companion-official",
    },
    rolls: {
      border: "border-l-companion-custom",
      badge: "bg-companion-custom/15 text-companion-custom",
    },
    conditions: {
      border: "border-l-warning",
      badge: "bg-warning/15 text-warning",
    },
    action: {
      border: "border-l-companion-imported",
      badge: "bg-companion-imported/15 text-companion-imported",
    },
    senses: {
      border: "border-l-companion-metadata",
      badge: "bg-companion-metadata/15 text-companion-metadata",
    },
    area: {
      border: "border-l-companion-shared",
      badge: "bg-companion-shared/15 text-companion-shared",
    },
    utility: {
      border: "border-l-companion-metadata",
      badge: "bg-companion-metadata/15 text-companion-metadata",
    },
  };
  return accents[category];
}
