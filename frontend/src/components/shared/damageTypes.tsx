import { CloudSnow, Flame, Moon, Sparkles, Sun, Swords, Zap } from "lucide-react";

export const damageTypes = [
  { id: "acid", label: "Acid", icon: Zap, tone: "text-lime-600 dark:text-lime-300" },
  {
    id: "bludgeoning",
    label: "Bludgeoning",
    icon: Swords,
    tone: "text-stone-600 dark:text-stone-300",
  },
  { id: "cold", label: "Cold", icon: CloudSnow, tone: "text-sky-600 dark:text-sky-300" },
  { id: "fire", label: "Fire", icon: Flame, tone: "text-red-600 dark:text-red-300" },
  { id: "force", label: "Force", icon: Sparkles, tone: "text-violet-600 dark:text-violet-300" },
  { id: "lightning", label: "Lightning", icon: Zap, tone: "text-yellow-600 dark:text-yellow-300" },
  { id: "necrotic", label: "Necrotic", icon: Moon, tone: "text-purple-700 dark:text-purple-300" },
  { id: "piercing", label: "Piercing", icon: Swords, tone: "text-slate-600 dark:text-slate-300" },
  { id: "poison", label: "Poison", icon: Zap, tone: "text-emerald-700 dark:text-emerald-300" },
  {
    id: "psychic",
    label: "Psychic",
    icon: Sparkles,
    tone: "text-fuchsia-600 dark:text-fuchsia-300",
  },
  { id: "thunder", label: "Thunder", icon: Zap, tone: "text-indigo-600 dark:text-indigo-300" },
  { id: "slashing", label: "Slashing", icon: Swords, tone: "text-zinc-600 dark:text-zinc-300" },
  { id: "radiant", label: "Radiant", icon: Sun, tone: "text-amber-600 dark:text-amber-300" },
];

export function damageTypeOptions() {
  return damageTypes.map((type) => ({
    label: type.label,
    value: type.id,
    icon: type.icon,
    iconClassName: type.tone,
  }));
}
