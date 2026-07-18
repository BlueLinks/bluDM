import { ListChecks, ShieldCheck } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { Button } from "../../components/ui";
import type {
  CreatureAction,
  CreatureSpell,
  EncounterRun,
  EncounterRunAlert,
  EncounterRunCombatant,
} from "../../types";
import { CombatActiveTurnPanel } from "./CombatActiveTurnPanel";
import { CombatBoard } from "./CombatBoard";
import type { HpMultiplier } from "./CombatContextPanel";
import { CombatLog } from "./CombatLog";
import { ConcentrationAlerts } from "./ConcentrationAlerts";
import { ManualResolutionDialog } from "./ManualResolutionDialog";
import { SaveResolutionDialog } from "./SaveResolutionDialog";
import type { CombatRollFlash } from "./combatTypes";
import type { applyResolutionPayload } from "./resolutionModel";

type DeathSaveAction = "success" | "failure" | "undo-success" | "undo-failure" | "stabilize";

export function CombatWorkspace({
  actions,
  active,
  acting,
  actorNeedsDeathSaves,
  combatStartedAt,
  damageType,
  downEnemies,
  hpAmount,
  orderedCombatants,
  run,
  showMeters,
  spells,
  spellSlotsTracked,
  targetIDs,
  onAction,
  onAddTarget,
  onAmountChange,
  onClearTargets,
  onConcentrationResolve,
  onDamageTypeChange,
  onDeathSave,
  onEdit,
  onManual,
  onOpenManualSlots,
  onOpenSpells,
  onApplyResolution,
  onRoll,
  onSelectSheet,
  onToggleTarget,
}: {
  actions: CreatureAction[];
  active: EncounterRunCombatant;
  acting: EncounterRunCombatant;
  actorNeedsDeathSaves: boolean;
  combatStartedAt: string;
  damageType: string;
  downEnemies: EncounterRunCombatant[];
  hpAmount: string;
  hpMultiplier: HpMultiplier;
  orderedCombatants: EncounterRunCombatant[];
  run: EncounterRun;
  selectedSheet: EncounterRunCombatant;
  selectedSheetID: string;
  showMeters: boolean;
  spells: CreatureSpell[];
  spellSlotsTracked: boolean;
  targetIDs: string[];
  onAction: (action: CreatureAction, event?: MouseEvent) => void;
  onApplyResolution: (resolution: ReturnType<typeof applyResolutionPayload>) => Promise<void>;
  onActorChange: (id: string) => void;
  onAddTarget: () => void;
  onAmountChange: (value: string) => void;
  onClearTargets: () => void;
  onConcentrationResolve: (alert: EncounterRunAlert, action: string) => Promise<void> | void;
  onDamageTypeChange: (value: string) => void;
  onDeathSave: (combatant: EncounterRunCombatant, action: DeathSaveAction) => void;
  onEdit: (combatant: EncounterRunCombatant) => void;
  onHpMultiplierChange: (value: HpMultiplier) => void;
  onManual: (mode: "damage" | "healing" | "temporary") => void;
  onOpenManualSlots: () => void;
  onOpenSpells: (spell?: CreatureSpell) => void;
  onRemoveTarget: (id: string) => void;
  onRoll: (message: string, flash: CombatRollFlash) => void;
  onSelectSheet: (id: string) => void;
  onToggleTarget: (id: string) => void;
}) {
  const combatants = run.combatants ?? [];
  const selected = combatants.find((combatant) => targetIDs.includes(combatant.id)) ?? null;
  const selectedTargets = selected ? [selected] : [];
  const [saveRequest, setSaveRequest] = useState<{
    actor: EncounterRunCombatant | null;
    targets: EncounterRunCombatant[];
    ability: string;
    dc?: number;
    sourceName: string;
    concentrationAlert?: EncounterRunAlert;
  } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <>
      <ConcentrationAlerts
        alerts={run.alerts ?? []}
        combatants={combatants}
        onRequestSave={(alert) => {
          const combatant = combatants.find((item) => item.id === alert.actorId);
          if (!combatant) return;
          setSaveRequest({
            actor: null,
            targets: [combatant],
            ability: "con",
            dc: alert.dc,
            sourceName: "Concentration check",
            concentrationAlert: alert,
          });
        }}
        onResolve={onConcentrationResolve}
      />
      <div
        aria-label="Current turn controls"
        className="combat-panel rounded-lg border border-border bg-card p-2 sm:p-3"
      >
        <CombatActiveTurnPanel
          actions={actions}
          active={acting}
          activeNeedsDeathSaves={actorNeedsDeathSaves}
          damageType={damageType}
          hpAmount={hpAmount}
          selected={selected}
          spellSlotsTracked={spellSlotsTracked}
          spells={spells}
          onAction={onAction}
          onAmountChange={onAmountChange}
          onDamageTypeChange={onDamageTypeChange}
          onDeathSave={(action) => onDeathSave(acting, action)}
          onManual={(mode) => onManual(mode)}
          onOpenManualSlots={onOpenManualSlots}
          onOpenSpells={() => onOpenSpells()}
        />
        {selected && !actorNeedsDeathSaves && (
          <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-border pt-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={ShieldCheck}
              onClick={() =>
                setSaveRequest({
                  actor: acting,
                  targets: selectedTargets,
                  ability: "dex",
                  sourceName: "Manual save",
                })
              }
            >
              Request save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={ListChecks}
              onClick={() => setManualOpen(true)}
            >
              Manual result
            </Button>
          </div>
        )}
      </div>
      <CombatBoard
        active={active}
        activeEffects={run.activeEffects ?? []}
        combatants={combatants}
        downEnemies={downEnemies}
        orderedCombatants={orderedCombatants}
        runID={run.id}
        selected={selected}
        selectedID={selected?.id ?? ""}
        showMeters={showMeters}
        onAddTarget={onAddTarget}
        onDeathSave={onDeathSave}
        onEdit={onEdit}
        onRoll={onRoll}
        onSelect={(id) => {
          onSelectSheet(id);
          if (targetIDs.length === 1 && targetIDs[0] === id) return;
          onClearTargets();
          onToggleTarget(id);
        }}
      />
      <CombatLog combatants={combatants} events={run.events ?? []} startedAt={combatStartedAt} />
      <SaveResolutionDialog
        actor={saveRequest?.actor ?? null}
        initialAbility={saveRequest?.ability}
        initialDC={saveRequest?.dc}
        open={Boolean(saveRequest)}
        sourceName={saveRequest?.sourceName}
        targets={saveRequest?.targets ?? []}
        onApply={async (resolution) => {
          await onApplyResolution(resolution);
          const alert = saveRequest?.concentrationAlert;
          const outcome = resolution.targets[0]?.outcome;
          if (alert) await onConcentrationResolve(alert, outcome === "success" ? "pass" : "fail");
        }}
        onOpenChange={(open) => !open && setSaveRequest(null)}
      />
      <ManualResolutionDialog
        actor={acting}
        open={manualOpen}
        slots={run.spellSlots ?? []}
        targets={selectedTargets}
        onApply={onApplyResolution}
        onOpenChange={setManualOpen}
      />
    </>
  );
}
