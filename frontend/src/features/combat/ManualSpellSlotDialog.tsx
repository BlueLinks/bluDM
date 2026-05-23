import { Minus, Plus, WandSparkles } from "lucide-react";
import { Button, Modal, MutedPanel } from "../../components/ui";
import type { EncounterRunCombatant, EncounterRunSpellSlot } from "../../types";

export function ManualSpellSlotDialog({
  actor,
  open,
  slots,
  onOpenChange,
  onUpdate,
}: {
  actor: EncounterRunCombatant;
  open: boolean;
  slots: EncounterRunSpellSlot[];
  onOpenChange: (open: boolean) => void;
  onUpdate: (spellLevel: number, mode: "consume" | "restore") => void;
}) {
  const actorSlots = slots
    .filter((slot) => slot.combatantId === actor.id)
    .sort((a, b) => a.spellLevel - b.spellLevel);
  return (
    <Modal
      title="Manual spell slot"
      open={open}
      onOpenChange={onOpenChange}
      trigger={<span />}
      className="max-w-xl"
    >
      <div className="grid gap-4">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-xs font-bold uppercase text-muted-foreground">Caster</div>
          <div className="font-semibold">{actor.displayName}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Consume a slot for spells handled outside bluDM, or restore one after a misclick.
          </div>
        </div>
        {actorSlots.length === 0 ? (
          <MutedPanel>No spell slots are tracked for this combatant.</MutedPanel>
        ) : (
          <div className="grid gap-2">
            {actorSlots.map((slot) => (
              <div
                key={slot.id}
                className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="font-semibold">{spellLevelLabel(slot.spellLevel)} slots</div>
                  <div className="text-sm text-muted-foreground">
                    {slot.remainingSlots} / {slot.maxSlots} remaining
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    disabled={slot.remainingSlots >= slot.maxSlots}
                    onClick={() => onUpdate(slot.spellLevel, "restore")}
                  >
                    Restore
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    icon={Minus}
                    disabled={slot.remainingSlots <= 0}
                    onClick={() => onUpdate(slot.spellLevel, "consume")}
                  >
                    Consume
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            icon={WandSparkles}
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function spellLevelLabel(level: number) {
  if (level === 1) return "1st level";
  if (level === 2) return "2nd level";
  if (level === 3) return "3rd level";
  return `${level}th level`;
}
