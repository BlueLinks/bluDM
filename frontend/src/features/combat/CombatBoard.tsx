import { ClipboardList, List, Plus, Skull, Trash2 } from "lucide-react";
import { Button, Callout, MutedPanel, SectionPanel } from "../../components/ui";
import type { EncounterRunCombatant, EncounterRunEffect } from "../../types";
import { CombatSheet } from "./CombatSheet";
import { DamageMeters } from "./combatWidgets";
import { TargetRow } from "./TargetRow";

type DeathSaveAction = "success" | "failure" | "undo-success" | "undo-failure" | "stabilize";

type RollFlashPayload = {
  title: string;
  total: number;
  detail: string;
  subtitle?: string;
};

export function CombatBoard({
  active,
  activeEffects,
  combatants,
  downEnemies,
  orderedCombatants,
  runID,
  selected,
  selectedID,
  showMeters,
  onAddTarget,
  onDeathSave,
  onEdit,
  onRoll,
  onRemoveTarget,
  onSelect,
}: {
  active: EncounterRunCombatant;
  activeEffects: EncounterRunEffect[];
  combatants: EncounterRunCombatant[];
  downEnemies: EncounterRunCombatant[];
  orderedCombatants: Array<EncounterRunCombatant & { originalIndex?: number }>;
  runID: string;
  selected: EncounterRunCombatant | null;
  selectedID: string;
  showMeters: boolean;
  onAddTarget: () => void;
  onDeathSave: (combatant: EncounterRunCombatant, action: DeathSaveAction) => void;
  onEdit: (combatant: EncounterRunCombatant) => void;
  onRoll: (message: string, flash: RollFlashPayload) => void;
  onRemoveTarget: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="min-h-0 min-w-0 overflow-hidden pb-2 pt-px">
      <div
        className={
          showMeters
            ? "combat-board-grid grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.35fr)_minmax(0,0.75fr)_minmax(0,0.65fr)] xl:grid-cols-[minmax(18rem,0.82fr)_minmax(32rem,1.4fr)_minmax(20rem,1fr)_minmax(15rem,0.7fr)]"
            : "combat-board-grid grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.5fr)_minmax(0,0.75fr)] xl:grid-cols-[minmax(18rem,0.827fr)_minmax(32rem,1.385fr)_minmax(20rem,1.02fr)]"
        }
      >
        <CombatSheet
          activeEffects={effectsForCombatant(activeEffects, active.id)}
          combatant={active}
          runID={runID}
          onEdit={() => onEdit(active)}
          onRoll={onRoll}
        />
        <SectionPanel
          title="Turn order"
          icon={List}
          className="combat-panel combat-section-panel max-h-[calc(100svh-20.5625rem)] min-h-0 overflow-hidden p-2"
          bodyClassName="max-h-[calc(100svh-24.5625rem)] min-h-0 overflow-y-auto"
          action={
            <Button className="!h-7 !py-0.5" size="sm" icon={Plus} onClick={onAddTarget}>
              Add combatant
            </Button>
          }
        >
          <div className="mt-[0.4375rem] grid gap-[0.8125rem]">
            {orderedCombatants.map((combatant, index) => (
              <TargetRow
                key={combatant.id}
                active={combatant.id === active.id}
                activeEffects={effectsForCombatant(activeEffects, combatant.id)}
                combatant={combatant}
                position={index + 1}
                selected={selectedID === combatant.id}
                onSelect={() => onSelect(combatant.id)}
                onEdit={() => onEdit(combatant)}
                onDeathSave={onDeathSave}
              />
            ))}
            {downEnemies.length > 0 && (
              <div className="mt-3 grid gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-destructive">
                  <Skull className="h-4 w-4" /> Down ({downEnemies.length})
                </div>
                {downEnemies.map((combatant, index) => (
                  <TargetRow
                    key={combatant.id}
                    activeEffects={effectsForCombatant(activeEffects, combatant.id)}
                    down
                    combatant={combatant}
                    position={orderedCombatants.length + index + 1}
                    selected={selectedID === combatant.id}
                    onSelect={() => onSelect(combatant.id)}
                    onEdit={() => onEdit(combatant)}
                    onDeathSave={onDeathSave}
                  />
                ))}
              </div>
            )}
          </div>
        </SectionPanel>
        {selected ? (
          <CombatSheet
            activeEffects={effectsForCombatant(activeEffects, selected.id)}
            combatant={selected}
            runID={runID}
            compact
            footer={
              <Button
                className="min-h-[2.1875rem] w-32 gap-1 whitespace-nowrap border-destructive px-2 text-destructive hover:text-destructive"
                icon={Trash2}
                size="sm"
                variant="outline"
                onClick={() => onRemoveTarget(selected.id)}
              >
                Remove target
              </Button>
            }
            onEdit={() => onEdit(selected)}
            onRoll={onRoll}
          />
        ) : (
          <SectionPanel
            title="Target"
            icon={ClipboardList}
            className="combat-panel combat-section-panel max-h-[calc(100svh-20.5625rem)] min-h-0 overflow-hidden p-2"
            bodyClassName="max-h-[calc(100svh-24.5625rem)] min-h-0 overflow-y-auto"
          >
            {active.currentHitPoints <= 0 || active.defeated ? (
              <MutedPanel>Entity is dead</MutedPanel>
            ) : (
              <Callout>Select a target to enable damage, healing, and action controls.</Callout>
            )}
            <div className="mt-4">
              <MutedPanel>
                Choose a row in turn order to inspect it and make it the current target.
              </MutedPanel>
            </div>
          </SectionPanel>
        )}
        {showMeters && <DamageMeters combatants={combatants} />}
      </div>
    </div>
  );
}

function effectsForCombatant(effects: EncounterRunEffect[], combatantID: string) {
  return effects.filter((effect) => effect.targetId === combatantID);
}
