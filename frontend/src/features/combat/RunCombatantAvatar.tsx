import { InitialsAvatar } from "../../components/shared/displayPrimitives";
import { runCombatantAvatarSrc } from "./domain";
import type { EncounterRunCombatant } from "../../types";

export function RunCombatantAvatar({
  combatant,
  tone = "primary",
}: {
  combatant: EncounterRunCombatant;
  tone?: "personal" | "primary";
}) {
  const src = runCombatantAvatarSrc(combatant);
  return (
    <InitialsAvatar
      className="xl:h-10 xl:w-10 xl:text-sm"
      name={combatant.displayName}
      src={src}
      size="sm"
      tone={tone}
    />
  );
}
