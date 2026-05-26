import type { SpellEffectCategory } from "../../lib/domain/spellEffectOptions";

export function categoryAccent(category: SpellEffectCategory) {
  const accents: Record<SpellEffectCategory, { border: string; badge: string }> = {
    hp: { border: "border-l-rose-400", badge: "bg-rose-500/15 text-rose-700 dark:text-rose-200" },
    damage: { border: "border-l-red-400", badge: "bg-red-500/15 text-red-700 dark:text-red-200" },
    movement: {
      border: "border-l-emerald-400",
      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
    },
    defense: {
      border: "border-l-sky-400",
      badge: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
    },
    rolls: {
      border: "border-l-violet-400",
      badge: "bg-violet-500/15 text-violet-700 dark:text-violet-200",
    },
    conditions: {
      border: "border-l-amber-400",
      badge: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
    },
    action: {
      border: "border-l-orange-400",
      badge: "bg-orange-500/15 text-orange-700 dark:text-orange-200",
    },
    senses: {
      border: "border-l-cyan-400",
      badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200",
    },
    area: {
      border: "border-l-lime-400",
      badge: "bg-lime-500/15 text-lime-700 dark:text-lime-200",
    },
    utility: {
      border: "border-l-slate-400",
      badge: "bg-slate-500/15 text-slate-700 dark:text-slate-200",
    },
  };
  return accents[category];
}
