import { InitialsAvatar } from "../../components/shared/displayPrimitives";
import { runCombatantAvatarSrc } from "./domain";
import type { EncounterRunCombatant } from "../../types";

export function RunCombatantAvatar({ combatant }: { combatant: EncounterRunCombatant }) {
  const src = runCombatantAvatarSrc(combatant);
  return (
    <InitialsAvatar
      className="xl:h-11 xl:w-11 xl:text-sm"
      name={combatant.displayName}
      src={src}
      size="sm"
    />
  );
}
