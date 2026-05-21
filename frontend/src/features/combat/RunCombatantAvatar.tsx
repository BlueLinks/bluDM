import { runCombatantAvatarSrc } from "./domain";
import type { EncounterRunCombatant } from "../../types";

export function RunCombatantAvatar({ combatant }: { combatant: EncounterRunCombatant }) {
  const src = runCombatantAvatarSrc(combatant);
  if (src) {
    return (
      <img
        className="h-9 w-9 rounded-md border border-border object-cover xl:h-11 xl:w-11"
        src={src}
        alt=""
      />
    );
  }
  return (
    <div className="grid h-9 w-9 place-items-center rounded-md bg-muted text-xs font-bold text-muted-foreground xl:h-11 xl:w-11 xl:text-sm">
      {combatant.displayName.slice(0, 2).toUpperCase()}
    </div>
  );
}
