import { isRollableCreatureAction } from "../../lib/domain/combat";
import type { ActionDisplaySection } from "../../types/actions";
import type { CreatureAction, EncounterRunCombatant } from "../../types";
import { standardAction } from "../creatures/creatureCopy";
import { list, record } from "../creatures/creatureProfileData";

const sections: Array<[string, ActionDisplaySection]> = [
  ["actions", "action"],
  ["bonusActions", "bonus_action"],
  ["reactions", "reaction"],
  ["legendaryActions", "legendary_action"],
  ["mythicActions", "mythic_action"],
  ["lairActions", "lair_action"],
];

export function standardRunActions(combatant: EncounterRunCombatant | undefined): CreatureAction[] {
  if (combatant?.sourceType !== "creature") return [];
  const standardCreatureId = combatant.snapshot.standardCreatureId;
  if (typeof standardCreatureId !== "string" || !standardCreatureId) return [];
  const statBlock = record(record(combatant.snapshot.creature).statBlock);
  return sections.flatMap(([key, section]) =>
    list(statBlock[key]).flatMap((raw, index) => {
      const feature = record(raw);
      if (!feature.name) return [];
      const action = standardAction(feature, section, index);
      action.id = `standard:${key}:${index}`;
      action.creatureId = standardCreatureId;
      return isRollableCreatureAction(action) ? [action] : [];
    }),
  );
}
