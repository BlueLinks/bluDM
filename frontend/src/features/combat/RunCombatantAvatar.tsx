import { runCombatantAvatarSrc } from "./domain";
import type { EncounterRunCombatant } from "../../types";

export function RunCombatantAvatar({ combatant }: { combatant: EncounterRunCombatant }) {
  const src = runCombatantAvatarSrc(combatant);
  if (src) {
    return (
      <img className="h-11 w-11 rounded-md border border-border object-cover" src={src} alt="" />
    );
  }
  return (
    <div className="grid h-11 w-11 place-items-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
      {combatant.displayName.slice(0, 2).toUpperCase()}
    </div>
  );
}
