import { CloudSnow, Flame, Moon, Sparkles, Sun, Swords, Zap } from "lucide-react";

export const damageTypes = [
  { id: "acid", label: "Acid", icon: Zap, tone: "text-success" },
  { id: "bludgeoning", label: "Bludgeoning", icon: Swords, tone: "text-muted-foreground" },
  { id: "cold", label: "Cold", icon: CloudSnow, tone: "text-accent" },
  { id: "fire", label: "Fire", icon: Flame, tone: "text-destructive" },
  { id: "force", label: "Force", icon: Sparkles, tone: "text-accent" },
  { id: "lightning", label: "Lightning", icon: Zap, tone: "text-warning" },
  { id: "necrotic", label: "Necrotic", icon: Moon, tone: "text-muted-foreground" },
  { id: "piercing", label: "Piercing", icon: Swords, tone: "text-muted-foreground" },
  { id: "poison", label: "Poison", icon: Zap, tone: "text-success" },
  { id: "psychic", label: "Psychic", icon: Sparkles, tone: "text-accent" },
  { id: "thunder", label: "Thunder", icon: Zap, tone: "text-warning" },
  { id: "slashing", label: "Slashing", icon: Swords, tone: "text-muted-foreground" },
  { id: "radiant", label: "Radiant", icon: Sun, tone: "text-warning" },
];

export function damageTypeOptions() {
  return damageTypes.map((type) => ({
    label: type.label,
    value: type.id,
    icon: type.icon,
    iconClassName: type.tone,
  }));
}
