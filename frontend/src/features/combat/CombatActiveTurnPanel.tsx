import React from "react";
import { MutedPanel } from "../../components/ui";
import type { CreatureAction, CreatureSpell, EncounterRunCombatant } from "../../types";
import { ActiveTurnHeader, CombatControls, DeathSaveControls } from "./combatWidgets";

export function CombatActiveTurnPanel({
  actions,
  active,
  activeNeedsDeathSaves,
  damageType,
  hpAmount,
  selected,
  spellSlotsTracked,
  spells,
  onAction,
  onAmountChange,
  onDamageTypeChange,
  onDeathSave,
  onManual,
  onOpenManualSlots,
  onOpenSpells,
}: {
  actions: CreatureAction[];
  active: EncounterRunCombatant;
  activeNeedsDeathSaves: boolean;
  damageType: string;
  hpAmount: string;
  selected: EncounterRunCombatant | null;
  spellSlotsTracked: boolean;
  spells: CreatureSpell[];
  onAction: (action: CreatureAction, event?: React.MouseEvent) => void;
  onAmountChange: (value: string) => void;
  onDamageTypeChange: (value: string) => void;
  onDeathSave: (
    action: "success" | "failure" | "undo-success" | "undo-failure" | "stabilize",
  ) => void;
  onManual: (mode: "damage" | "healing") => void;
  onOpenManualSlots: () => void;
  onOpenSpells: () => void;
}) {
  return (
    <ActiveTurnHeader combatant={active} selected={selected}>
      {active.currentHitPoints <= 0 && active.sourceType !== "player" ? (
        <MutedPanel>Entity is dead</MutedPanel>
      ) : activeNeedsDeathSaves ? (
        <DeathSaveControls combatant={active} onDeathSave={onDeathSave} />
      ) : (
        <CombatControls
          actions={actions}
          damageType={damageType}
          disabled={!selected}
          hpAmount={hpAmount}
          onAction={onAction}
          onAmountChange={onAmountChange}
          onDamageTypeChange={onDamageTypeChange}
          onManual={onManual}
          onOpenManualSlots={onOpenManualSlots}
          onOpenSpells={onOpenSpells}
          spellSlotsTracked={spellSlotsTracked}
          spells={spells}
        />
      )}
    </ActiveTurnHeader>
  );
}
