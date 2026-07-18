import { ClipboardList, Plus, Skull, Swords } from "lucide-react";
import React from "react";
import { Button, Callout, MutedPanel, SectionPanel } from "../../components/ui";
import type { EncounterRunCombatant, EncounterRunEffect } from "../../types";
import { CombatSheet } from "./CombatSheet";
import { DamageMeters, TopOfRoundMarker } from "./combatWidgets";
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
  onSelect: (id: string) => void;
}) {
  return (
    <div className="min-h-0 min-w-0 overflow-hidden pb-2">
      <div
        className={
          showMeters
            ? "combat-board-grid grid min-h-0 min-w-0 gap-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.7fr)] xl:grid-cols-[minmax(260px,0.8fr)_minmax(340px,1fr)_minmax(300px,0.9fr)_minmax(240px,0.7fr)]"
            : "combat-board-grid grid min-h-0 min-w-0 gap-2 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.85fr)] xl:grid-cols-[minmax(260px,0.85fr)_minmax(360px,1fr)_minmax(300px,0.9fr)]"
        }
      >
        <CombatSheet
          activeEffects={effectsForCombatant(activeEffects, active.id)}
          combatant={active}
          runID={runID}
          onRoll={onRoll}
        />
        <SectionPanel
          title="Initiative & Targets"
          icon={Swords}
          className="combat-panel combat-section-panel max-h-[calc(100svh-15.5rem)] min-h-0 overflow-hidden p-2 xl:p-3"
          bodyClassName="max-h-[calc(100svh-20rem)] min-h-0 overflow-y-auto"
          action={
            <Button size="sm" icon={Plus} onClick={onAddTarget}>
              Add target
            </Button>
          }
        >
          <div className="grid gap-2">
            {orderedCombatants.map((combatant) => (
              <React.Fragment key={combatant.id}>
                {combatant.originalIndex === 0 && <TopOfRoundMarker />}
                <TargetRow
                  active={combatant.id === active.id}
                  activeEffects={effectsForCombatant(activeEffects, combatant.id)}
                  combatant={combatant}
                  selected={selectedID === combatant.id}
                  onSelect={() => onSelect(combatant.id)}
                  onEdit={() => onEdit(combatant)}
                  onDeathSave={onDeathSave}
                />
              </React.Fragment>
            ))}
            {downEnemies.length > 0 && (
              <div className="mt-3 grid gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-destructive">
                  <Skull className="h-4 w-4" /> Down ({downEnemies.length})
                </div>
                {downEnemies.map((combatant) => (
                  <TargetRow
                    key={combatant.id}
                    activeEffects={effectsForCombatant(activeEffects, combatant.id)}
                    down
                    combatant={combatant}
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
            onRoll={onRoll}
          />
        ) : (
          <SectionPanel
            title="Target Detail"
            icon={ClipboardList}
            className="combat-panel combat-section-panel max-h-[calc(100svh-15.5rem)] min-h-0 overflow-hidden p-2 xl:p-3"
            bodyClassName="max-h-[calc(100svh-20rem)] min-h-0 overflow-y-auto"
          >
            {active.currentHitPoints <= 0 || active.defeated ? (
              <MutedPanel>Entity is dead</MutedPanel>
            ) : (
              <Callout>Select a target to enable damage, healing, and action controls.</Callout>
            )}
            <div className="mt-4">
              <MutedPanel>
                Click a target to inspect its sheet. Combat controls live beside the active
                combatant at the top left.
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
