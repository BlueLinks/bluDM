import { useState, type MouseEvent } from "react";
import { Modal } from "../../components/ui";
import type {
  CreatureAction,
  CreatureSpell,
  EncounterRun,
  EncounterRunAlert,
  EncounterRunCombatant,
} from "../../types";
import { CombatBoard } from "./CombatBoard";
import { CombatContextPanel, type HpMultiplier } from "./CombatContextPanel";
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
  hpMultiplier,
  orderedCombatants,
  run,
  showMeters,
  spells,
  spellSlotsTracked,
  targetIDs,
  onAction,
  onActorChange,
  onAddTarget,
  onAmountChange,
  onClearTargets,
  onConcentrationResolve,
  onDamageTypeChange,
  onDeathSave,
  onEdit,
  onHpMultiplierChange,
  onManual,
  onOpenManualSlots,
  onOpenSpells,
  onRemoveTarget,
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
  const [combatLogOpen, setCombatLogOpen] = useState(false);

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
      <CombatContextPanel
        actions={actions}
        actor={acting}
        actorNeedsDeathSaves={actorNeedsDeathSaves}
        combatants={combatants}
        currentTurn={active}
        damageType={damageType}
        hpAmount={hpAmount}
        hpMultiplier={hpMultiplier}
        spellSlotsTracked={spellSlotsTracked}
        spells={spells}
        targetIDs={targetIDs}
        onAction={onAction}
        onActorChange={onActorChange}
        onAmountChange={onAmountChange}
        onClearTargets={onClearTargets}
        onDamageTypeChange={onDamageTypeChange}
        onDeathSave={(action) => onDeathSave(acting, action)}
        onHpMultiplierChange={onHpMultiplierChange}
        onManual={onManual}
        onManualResolution={() => setManualOpen(true)}
        onOpenManualSlots={onOpenManualSlots}
        onOpenCombatLog={() => setCombatLogOpen(true)}
        onOpenSpells={onOpenSpells}
        onRemoveTarget={onRemoveTarget}
        onRequestSave={() =>
          setSaveRequest({
            actor: acting,
            targets: selectedTargets,
            ability: "dex",
            sourceName: "Manual save",
          })
        }
      />
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
        onRemoveTarget={onRemoveTarget}
        onRoll={onRoll}
        onSelect={(id) => {
          onSelectSheet(id);
          if (targetIDs.length === 1 && targetIDs[0] === id) return;
          onClearTargets();
          onToggleTarget(id);
        }}
      />
      <Modal
        className="max-w-5xl"
        open={combatLogOpen}
        title="Combat log"
        onOpenChange={setCombatLogOpen}
      >
        <CombatLog combatants={combatants} events={run.events ?? []} startedAt={combatStartedAt} />
      </Modal>
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
