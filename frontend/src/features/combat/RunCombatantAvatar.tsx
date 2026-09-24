import { InitialsAvatar } from "../../components/shared/displayPrimitives";
import { combatantFrameColor } from "../../lib/domain/combat";
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
  const frameColor = combatantFrameColor(combatant);
  return (
    <span
      className="inline-flex shrink-0 rounded-md border-2 border-transparent"
      style={frameColor ? { borderColor: frameColor } : undefined}
    >
      <InitialsAvatar
        className="xl:h-10 xl:w-10 xl:text-sm"
        name={combatant.displayName}
        src={src}
        size="sm"
        tone={tone}
      />
    </span>
  );
}
