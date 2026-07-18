import { ToastViewport, type ToastItem } from "../../components/ui";
import type {
  CreatureSpellcastingProfile,
  EncounterRun,
  EncounterRunCombatant,
  RollMode,
} from "../../types";
import type { CombatRollFlash } from "./combatTypes";
import { AddRunTargetDialog } from "./AddRunTargetDialog";
import { ActionResolutionDialog, LeaveCombatDialog, VictoryDialog } from "./CombatTrackerDialogs";
import { ManualSpellSlotDialog } from "./ManualSpellSlotDialog";
import { RollFlash } from "./combatWidgets";
import { RunCombatantEditSheet } from "./RunCombatantEditSheet";
import { SpellCastDialog } from "./SpellCastDialog";

export function CombatTrackerOverlays({
  active,
  addingTarget,
  editing,
  leaveWarningOpen,
  manualSlotsOpen,
  pendingAction,
  pendingNavigation,
  rollFlash,
  run,
  selected,
  selectedIDs,
  selectedSpellID,
  spellDialogOpen,
  spellcasting,
  toasts,
  victoryOpen,
  onAddedTarget,
  onApplyNavigation,
  onCastSpell,
  onCloseAddingTarget,
  onCloseEditing,
  onDismissToast,
  onManualSpellSlot,
  onResolveAction,
  onRollFlashDone,
  onSaveSummary,
  onSaveEditing,
  onSetLeaveWarningOpen,
  onSetManualSlotsOpen,
  onSetPendingAction,
  onSetPendingNavigation,
  onSetRun,
  onSetSpellDialogOpen,
  onSetVictoryOpen,
}: {
  active: EncounterRunCombatant;
  addingTarget: boolean;
  editing: EncounterRunCombatant | null;
  leaveWarningOpen: boolean;
  manualSlotsOpen: boolean;
  pendingAction: Record<string, unknown> | null;
  pendingNavigation: string;
  rollFlash: CombatRollFlash | null;
  run: EncounterRun;
  selected: EncounterRunCombatant | null;
  selectedIDs: string[];
  selectedSpellID: string;
  spellDialogOpen: boolean;
  spellcasting: CreatureSpellcastingProfile | null;
  toasts: ToastItem[];
  victoryOpen: boolean;
  onAddedTarget: () => void;
  onApplyNavigation: (next: string) => void;
  onCastSpell: (payload: {
    spellId: string;
    librarySource: "user" | "standard";
    targetIds: string[];
    castLevel: number;
    rollMode: RollMode;
  }) => void;
  onCloseAddingTarget: () => void;
  onCloseEditing: () => void;
  onDismissToast: (id: string) => void;
  onManualSpellSlot: (spellLevel: number, mode: "consume" | "restore") => void;
  onResolveAction: (override: string, damage?: number) => void;
  onRollFlashDone: () => void;
  onSaveSummary: () => void;
  onSaveEditing: (combatant: EncounterRunCombatant) => void;
  onSetLeaveWarningOpen: (open: boolean) => void;
  onSetManualSlotsOpen: (open: boolean) => void;
  onSetPendingAction: (action: Record<string, unknown> | null) => void;
  onSetPendingNavigation: (path: string) => void;
  onSetRun: (run: EncounterRun) => void;
  onSetSpellDialogOpen: (open: boolean) => void;
  onSetVictoryOpen: (open: boolean) => void;
}) {
  return (
    <>
      <RunCombatantEditSheet combatant={editing} onClose={onCloseEditing} onSave={onSaveEditing} />
      <AddRunTargetDialog
        open={addingTarget}
        runID={run.id}
        onClose={onCloseAddingTarget}
        onAdded={(nextRun) => {
          onSetRun(nextRun);
          onAddedTarget();
        }}
      />
      <SpellCastDialog
        actor={active}
        combatants={run.combatants ?? []}
        currentConcentration={
          run.activeEffects?.find((effect) => effect.casterId === active.id && effect.concentration)
            ?.spellName
        }
        open={spellDialogOpen}
        initialSpellID={selectedSpellID}
        selectedIDs={selectedIDs}
        slots={run.spellSlots ?? []}
        spells={spellcasting?.spells ?? []}
        onCast={(payload) =>
          onCastSpell({
            spellId: payload.spell.spellId,
            librarySource: payload.spell.librarySource,
            targetIds: payload.targetIds,
            castLevel: payload.castLevel,
            rollMode: payload.rollMode,
          })
        }
        onOpenChange={onSetSpellDialogOpen}
      />
      <ManualSpellSlotDialog
        actor={active}
        open={manualSlotsOpen}
        slots={run.spellSlots ?? []}
        onOpenChange={onSetManualSlotsOpen}
        onUpdate={onManualSpellSlot}
      />
      <ActionResolutionDialog
        action={pendingAction}
        target={selected}
        onCancel={() => onSetPendingAction(null)}
        onResolve={onResolveAction}
      />
      <VictoryDialog
        open={victoryOpen}
        onCancel={() => onSetVictoryOpen(false)}
        onConfirm={onSaveSummary}
      />
      <LeaveCombatDialog
        open={leaveWarningOpen}
        onCancel={() => {
          onSetLeaveWarningOpen(false);
          onSetPendingNavigation("");
        }}
        onConfirm={() => {
          const next = pendingNavigation || "/campaigns";
          onSetLeaveWarningOpen(false);
          onSetPendingNavigation("");
          onApplyNavigation(next);
        }}
        onSave={onSaveSummary}
      />
      <RollFlash flash={rollFlash} onDone={onRollFlashDone} />
      <ToastViewport toasts={toasts} onDismiss={onDismissToast} />
    </>
  );
}
