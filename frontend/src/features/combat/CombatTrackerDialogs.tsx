import { Button, ConfirmDialog, Modal } from "../../components/ui";
import type { EncounterRunCombatant } from "../../types";
import { ActionResult } from "./actionResult";

export function ActionResolutionDialog({
  action,
  target,
  onCancel,
  onResolve,
}: {
  action: Record<string, unknown> | null;
  target: EncounterRunCombatant | null;
  onCancel: () => void;
  onResolve: (override: string, damage?: number) => void;
}) {
  return (
    <Modal
      open={Boolean(action)}
      onOpenChange={(open) => !open && onCancel()}
      title="Resolve action"
      trigger={<span />}
    >
      {action && target && (
        <ActionResult result={action} target={target} onCancel={onCancel} onResolve={onResolve} />
      )}
    </Modal>
  );
}

export function VictoryDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title="Enemies defeated"
      confirmLabel="End encounter"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      All enemies are at 0 HP or marked defeated. Move to XP and loot assignment?
    </ConfirmDialog>
  );
}

export function LeaveCombatDialog({
  open,
  onCancel,
  onConfirm,
  onSave,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onSave: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title="Encounter still running"
      confirmLabel="Leave without finishing"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      This encounter has not been finished. Save the encounter from the summary screen to award XP
      and mark it completed, or cancel leaving to continue combat.
      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={onSave}>
          Save encounter
        </Button>
      </div>
    </ConfirmDialog>
  );
}
