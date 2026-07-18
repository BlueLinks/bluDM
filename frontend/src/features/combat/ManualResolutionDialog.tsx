import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Field, Modal, Textarea } from "../../components/ui";
import type { EncounterRunCombatant, EncounterRunSpellSlot, RollMode } from "../../types";
import { DamageComponentEditor, ResolutionContextHeader } from "./resolutionPrimitives";
import { ConditionFields, ManualResolutionFields } from "./ManualResolutionFields";
import { ManualTargetPreview } from "./ManualTargetPreview";
import {
  applyResolutionPayload,
  blankResolutionTarget,
  type CombatResolutionDraft,
  type ResolutionCondition,
  type ResolutionDamageComponent,
  type ResolutionKind,
  type ResolutionOutcome,
  type ResolutionTarget,
} from "./resolutionModel";

export function ManualResolutionDialog({
  actor,
  open,
  slots,
  targets,
  onApply,
  onOpenChange,
}: {
  actor: EncounterRunCombatant;
  open: boolean;
  slots: EncounterRunSpellSlot[];
  targets: EncounterRunCombatant[];
  onApply: (resolution: ReturnType<typeof applyResolutionPayload>) => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
}) {
  const [kind, setKind] = useState<ResolutionKind>("attack");
  const [attributeActor, setAttributeActor] = useState(true);
  const [sourceName, setSourceName] = useState("Reported action");
  const [outcome, setOutcome] = useState<ResolutionOutcome>("hit");
  const [rollTotal, setRollTotal] = useState("");
  const [rollMode, setRollMode] = useState<RollMode>("normal");
  const [components, setComponents] = useState<ResolutionDamageComponent[]>([]);
  const [healing, setHealing] = useState("");
  const [temporaryHP, setTemporaryHP] = useState("");
  const [temporaryHPMode, setTemporaryHPMode] = useState<"max" | "replace">("max");
  const [directHP, setDirectHP] = useState("");
  const [conditionName, setConditionName] = useState("");
  const [conditionDuration, setConditionDuration] = useState("");
  const [conditionExpiry, setConditionExpiry] = useState("manual");
  const [notes, setNotes] = useState("");
  const [consumeSlot, setConsumeSlot] = useState(false);
  const [spellLevel, setSpellLevel] = useState("1");
  const [results, setResults] = useState<ResolutionTarget[]>([]);
  const [confirmLowerTemporaryHP, setConfirmLowerTemporaryHP] = useState(false);
  const [applying, setApplying] = useState(false);

  const actorSlots = useMemo(
    () => slots.filter((slot) => slot.combatantId === actor.id && slot.remainingSlots > 0),
    [actor.id, slots],
  );

  useEffect(() => {
    if (!open) return;
    setKind("attack");
    setAttributeActor(true);
    setSourceName("Reported action");
    setOutcome("hit");
    setRollTotal("");
    setRollMode("normal");
    setComponents([]);
    setHealing("");
    setTemporaryHP("");
    setTemporaryHPMode("max");
    setDirectHP("");
    setConditionName("");
    setConditionDuration("");
    setConditionExpiry("manual");
    setNotes("");
    setConsumeSlot(false);
    setSpellLevel("1");
    setResults(targets.map((target) => blankResolutionTarget(target.id)));
    setConfirmLowerTemporaryHP(false);
  }, [open, targets]);

  const targetResults = results.map((result) =>
    manualTarget(result, {
      components,
      condition: conditionName
        ? condition(conditionName, conditionDuration, conditionExpiry)
        : undefined,
      directHP,
      healing,
      outcome,
      rollMode,
      rollTotal,
      temporaryHP,
      temporaryHPMode,
    }),
  );
  const lowersTemporaryHP =
    temporaryHP !== "" &&
    temporaryHPMode === "replace" &&
    targets.some((target) => target.temporaryHitPoints > Number(temporaryHP));

  async function apply() {
    if (targetResults.every((result) => !result.included)) return;
    if (lowersTemporaryHP && !confirmLowerTemporaryHP) return;
    setApplying(true);
    try {
      const draft: CombatResolutionDraft = {
        actorId: attributeActor ? actor.id : undefined,
        kind,
        sourceName: sourceName || "Manual resolution",
        notes,
        targets: targetResults,
        resource:
          kind === "spell" && consumeSlot
            ? { kind: "spell_slot", spellLevel: Number(spellLevel) || 1 }
            : undefined,
      };
      await onApply(applyResolutionPayload(draft));
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Manual resolution" className="max-w-5xl">
      <div className="grid gap-4">
        <ResolutionContextHeader
          actor={attributeActor ? actor : null}
          sourceName={sourceName}
          targets={targets}
        />
        <ManualResolutionFields
          actorSlots={actorSlots}
          attributeActor={attributeActor}
          consumeSlot={consumeSlot}
          directHP={directHP}
          healing={healing}
          kind={kind}
          outcome={outcome}
          rollMode={rollMode}
          rollTotal={rollTotal}
          sourceName={sourceName}
          spellLevel={spellLevel}
          temporaryHP={temporaryHP}
          temporaryHPMode={temporaryHPMode}
          onAttributeActorChange={setAttributeActor}
          onConsumeSlotChange={setConsumeSlot}
          onDirectHPChange={setDirectHP}
          onHealingChange={setHealing}
          onKindChange={setKind}
          onOutcomeChange={setOutcome}
          onRollModeChange={setRollMode}
          onRollTotalChange={setRollTotal}
          onSourceNameChange={setSourceName}
          onSpellLevelChange={setSpellLevel}
          onTemporaryHPChange={setTemporaryHP}
          onTemporaryHPModeChange={setTemporaryHPMode}
        />
        <DamageComponentEditor
          components={components}
          critical={outcome === "critical"}
          onChange={setComponents}
        />
        <ConditionFields
          duration={conditionDuration}
          expiry={conditionExpiry}
          name={conditionName}
          onDurationChange={setConditionDuration}
          onExpiryChange={setConditionExpiry}
          onNameChange={setConditionName}
        />
        <ManualTargetPreview
          combatants={targets}
          results={targetResults}
          onChange={(next) =>
            setResults((current) =>
              current.map((result) =>
                result.targetId === next.targetId
                  ? { ...result, included: next.included, damageMultiplier: next.damageMultiplier }
                  : result,
              ),
            )
          }
        />
        {lowersTemporaryHP && (
          <div className="grid gap-2 border border-warning/50 bg-warning/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-warning">
              <AlertTriangle className="h-4 w-4" /> This replaces higher temporary HP.
            </div>
            <Checkbox
              checked={confirmLowerTemporaryHP}
              label="Replace higher temporary HP values"
              onChange={setConfirmLowerTemporaryHP}
            />
          </div>
        )}
        <Field label="Resolution note">
          <Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              applying ||
              targetResults.every((result) => !result.included) ||
              (lowersTemporaryHP && !confirmLowerTemporaryHP)
            }
            onClick={() => void apply()}
          >
            {applying ? "Applying…" : "Apply resolution"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function manualTarget(
  base: ResolutionTarget,
  values: {
    components: ResolutionDamageComponent[];
    condition?: ResolutionCondition;
    directHP: string;
    healing: string;
    outcome: ResolutionOutcome;
    rollMode: RollMode;
    rollTotal: string;
    temporaryHP: string;
    temporaryHPMode: "max" | "replace";
  },
) {
  const rollTotal = Number(values.rollTotal) || 0;
  return {
    ...base,
    outcome: values.outcome,
    rollMode: values.rollMode,
    rollSource: rollTotal > 0 ? ("physical" as const) : ("outcome" as const),
    d20Rolls: rollTotal > 0 ? [rollTotal] : [],
    rollTotal,
    damageMultiplier: values.outcome === "miss" ? 0 : base.damageMultiplier,
    damageComponents: values.components,
    healing: Math.max(0, Number(values.healing) || 0),
    temporaryHitPoints:
      values.temporaryHP === "" ? undefined : Math.max(0, Number(values.temporaryHP) || 0),
    temporaryHitPointsMode: values.temporaryHPMode,
    directHitPoints: values.directHP === "" ? undefined : Math.max(0, Number(values.directHP) || 0),
    conditions: values.condition ? [values.condition] : [],
  };
}

function condition(name: string, duration: string, expiry: string): ResolutionCondition {
  return { name, duration, expiry, saveAbility: "", saveDC: 0, note: "" };
}
