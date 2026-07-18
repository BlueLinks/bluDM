import { ChevronDown, Dice5 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "../../components/ui";
import { abilities } from "../../lib/domain/options";
import type { EncounterRunCombatant } from "../../types";
import { DamageComponentEditor } from "./resolutionPrimitives";
import {
  applyResolutionPayload,
  blankResolutionTarget,
  isSaveTargetResolved,
  outcomeDamageMultiplier,
  rollSavingThrow,
  type CombatResolutionDraft,
  type ResolutionCondition,
  type ResolutionDamageComponent,
  type ResolutionTarget,
} from "./resolutionModel";
import { SaveConditionFields } from "./SaveConditionFields";
import { SaveResultList } from "./SaveResultList";

type SaveSuccessRule = "half" | "none" | "full";

export function SaveResolutionDialog({
  actor,
  initialAbility = "dex",
  initialDC = 13,
  open,
  sourceName = "Manual save",
  targets,
  onApply,
  onOpenChange,
}: {
  actor: EncounterRunCombatant | null;
  initialAbility?: string;
  initialDC?: number;
  open: boolean;
  sourceName?: string;
  targets: EncounterRunCombatant[];
  onApply: (resolution: ReturnType<typeof applyResolutionPayload>) => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(sourceName);
  const [ability, setAbility] = useState("dex");
  const [dc, setDC] = useState(13);
  const [successRule, setSuccessRule] = useState<SaveSuccessRule>("half");
  const [components, setComponents] = useState<ResolutionDamageComponent[]>([]);
  const [failureCondition, setFailureCondition] = useState<ResolutionCondition>(emptyCondition());
  const [successCondition, setSuccessCondition] = useState<ResolutionCondition>(emptyCondition());
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState<ResolutionTarget[]>([]);
  const [applying, setApplying] = useState(false);
  const includedResults = results.filter((result) => result.included);
  const unresolvedResults = includedResults.filter((result) => !isSaveTargetResolved(result));
  const resolvedResults = includedResults.length - unresolvedResults.length;
  const hasDamageOrEffects =
    components.length > 0 || Boolean(failureCondition.name || successCondition.name || notes);

  useEffect(() => {
    if (!open) return;
    setName(sourceName);
    setAbility(initialAbility);
    setDC(initialDC);
    setSuccessRule("half");
    setComponents([]);
    setFailureCondition(emptyCondition());
    setSuccessCondition(emptyCondition());
    setNotes("");
    setResults(targets.map((target) => saveTarget(target.id, initialAbility, initialDC)));
  }, [initialAbility, initialDC, open, sourceName, targets]);

  function updateSharedSave(nextAbility: string, nextDC: number) {
    const abilityChanged = nextAbility !== ability;
    setAbility(nextAbility);
    setDC(nextDC);
    setResults((current) =>
      current.map((result) => {
        if (result.rollSource === "outcome") {
          return { ...result, saveAbility: nextAbility, dc: nextDC };
        }
        if (abilityChanged) {
          return {
            ...result,
            saveAbility: nextAbility,
            dc: nextDC,
            rollSource: "automatic",
            d20Rolls: [],
            rollTotal: 0,
            outcome: "pending",
          };
        }
        return {
          ...result,
          saveAbility: nextAbility,
          dc: nextDC,
          outcome: isSaveTargetResolved(result)
            ? result.rollTotal >= nextDC
              ? "success"
              : "failure"
            : "pending",
        };
      }),
    );
  }

  function updateResult(next: ResolutionTarget) {
    const normalized = withSaveOutcome(
      next,
      components,
      successRule,
      successCondition,
      failureCondition,
    );
    setResults((current) =>
      current.map((result) => (result.targetId === next.targetId ? normalized : result)),
    );
  }

  function rollTarget(target: ResolutionTarget) {
    const combatant = targets.find((item) => item.id === target.targetId);
    if (!combatant) return;
    const roll = rollSavingThrow(combatant, target.saveAbility, target.rollMode);
    updateResult({
      ...target,
      rollSource: "automatic",
      d20Rolls: roll.d20Rolls,
      rollTotal: roll.total,
      outcome: roll.total >= target.dc ? "success" : "failure",
    });
  }

  function setAll(outcome: "success" | "failure") {
    setResults((current) =>
      current.map((result) =>
        result.included
          ? withSaveOutcome(
              { ...result, outcome, rollSource: "outcome", d20Rolls: [], rollTotal: 0 },
              components,
              successRule,
              successCondition,
              failureCondition,
            )
          : result,
      ),
    );
  }

  function updateComponents(next: ResolutionDamageComponent[]) {
    setComponents(next);
    setResults((current) =>
      current.map((result) =>
        withSaveOutcome(result, next, successRule, successCondition, failureCondition),
      ),
    );
  }

  async function apply() {
    if (includedResults.length === 0 || unresolvedResults.length > 0) return;
    setApplying(true);
    try {
      const draft: CombatResolutionDraft = {
        actorId: actor?.id,
        kind: "save",
        sourceName: name || "Manual save",
        notes,
        targets: results.map((result) =>
          withSaveOutcome(result, components, successRule, successCondition, failureCondition),
        ),
      };
      await onApply(applyResolutionPayload(draft));
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Resolve saving throws"
      className="max-w-3xl"
    >
      <div className="grid gap-3">
        <SaveContext actor={actor} sourceName={name} targetCount={targets.length} />
        <SaveSetup
          ability={ability}
          dc={dc}
          name={name}
          onAbilityChange={(value) => updateSharedSave(value, dc)}
          onDCChange={(value) => updateSharedSave(ability, value)}
          onNameChange={setName}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div>
            <div className="font-semibold">Target results</div>
            <div className="text-xs text-muted-foreground">
              {resolvedResults} of {includedResults.length} included target
              {includedResults.length === 1 ? "" : "s"} resolved
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            icon={Dice5}
            disabled={unresolvedResults.length === 0}
            onClick={() => unresolvedResults.forEach(rollTarget)}
          >
            Roll remaining
          </Button>
        </div>
        <SaveResultList
          combatants={targets}
          results={results}
          showDamage={components.length > 0}
          onChange={updateResult}
          onRoll={rollTarget}
        />
        {unresolvedResults.length > 0 && (
          <div className="border-l-2 border-primary bg-surface px-3 py-2 text-sm text-surface-foreground">
            {unresolvedResults.length} target{unresolvedResults.length === 1 ? "" : "s"} still need
            results. Roll or enter results before applying.
          </div>
        )}
        <SaveAdvancedOptions
          components={components}
          failureCondition={failureCondition}
          hasContent={hasDamageOrEffects}
          notes={notes}
          successCondition={successCondition}
          successRule={successRule}
          onComponentsChange={updateComponents}
          onFailureConditionChange={setFailureCondition}
          onNotesChange={setNotes}
          onSuccessConditionChange={setSuccessCondition}
          onSuccessRuleChange={(rule) => {
            setSuccessRule(rule);
            setResults((current) =>
              current.map((result) =>
                withSaveOutcome(result, components, rule, successCondition, failureCondition),
              ),
            );
          }}
        />
        <SaveBulkOptions
          onFailure={() => setAll("failure")}
          onRerollFailed={() =>
            results
              .filter((result) => result.included && result.outcome === "failure")
              .forEach(rollTarget)
          }
          onSuccess={() => setAll("success")}
        />
        <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-1 pt-3">
          <div className="text-xs text-muted-foreground">
            {unresolvedResults.length > 0
              ? `${unresolvedResults.length} unresolved`
              : `${includedResults.length} ready to apply`}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={applying || includedResults.length === 0 || unresolvedResults.length > 0}
              onClick={() => void apply()}
            >
              {applying
                ? "Applying…"
                : `Apply ${includedResults.length} result${includedResults.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SaveSetup({
  ability,
  dc,
  name,
  onAbilityChange,
  onDCChange,
  onNameChange,
}: {
  ability: string;
  dc: number;
  name: string;
  onAbilityChange: (value: string) => void;
  onDCChange: (value: number) => void;
  onNameChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_7rem]">
      <Field label="Source or action">
        <Input value={name} onChange={(event) => onNameChange(event.target.value)} />
      </Field>
      <Field label="Save ability">
        <Select
          value={ability}
          placeholder="Ability"
          options={abilities.map((item) => ({ value: item.key, label: item.label }))}
          onValueChange={onAbilityChange}
        />
      </Field>
      <Field label="Shared DC">
        <Input
          inputMode="numeric"
          min={0}
          type="number"
          value={dc}
          onChange={(event) => onDCChange(Number(event.target.value) || 0)}
        />
      </Field>
    </div>
  );
}

function SaveContext({
  actor,
  sourceName,
  targetCount,
}: {
  actor: EncounterRunCombatant | null;
  sourceName: string;
  targetCount: number;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border pb-3 text-sm">
      <div className="min-w-0">
        <div className="truncate font-semibold">{sourceName || "Manual save"}</div>
        <div className="truncate text-muted-foreground">
          {actor?.displayName ?? "Unspecified source"}
        </div>
      </div>
      <div className="shrink-0 text-muted-foreground">
        {targetCount} target{targetCount === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function SaveAdvancedOptions({
  components,
  failureCondition,
  hasContent,
  notes,
  successCondition,
  successRule,
  onComponentsChange,
  onFailureConditionChange,
  onNotesChange,
  onSuccessConditionChange,
  onSuccessRuleChange,
}: {
  components: ResolutionDamageComponent[];
  failureCondition: ResolutionCondition;
  hasContent: boolean;
  notes: string;
  successCondition: ResolutionCondition;
  successRule: SaveSuccessRule;
  onComponentsChange: (components: ResolutionDamageComponent[]) => void;
  onFailureConditionChange: (condition: ResolutionCondition) => void;
  onNotesChange: (notes: string) => void;
  onSuccessConditionChange: (condition: ResolutionCondition) => void;
  onSuccessRuleChange: (rule: SaveSuccessRule) => void;
}) {
  return (
    <details className="group border-t border-border pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
        <span>
          Damage and effects
          <span className="ml-2 font-normal text-muted-foreground">
            {hasContent ? "Configured" : "Optional"}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid gap-4">
        <div className="max-w-xs">
          <Field label="On a successful save">
            <Select
              value={successRule}
              placeholder="Success outcome"
              options={[
                { value: "half", label: "Half damage" },
                { value: "none", label: "No damage" },
                { value: "full", label: "Full damage" },
              ]}
              onValueChange={(value) => onSuccessRuleChange(value as SaveSuccessRule)}
            />
          </Field>
        </div>
        <DamageComponentEditor components={components} onChange={onComponentsChange} />
        <SaveConditionFields
          failure={failureCondition}
          success={successCondition}
          onFailureChange={onFailureConditionChange}
          onSuccessChange={onSuccessConditionChange}
        />
        <Field label="Resolution note">
          <Textarea
            rows={2}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
          />
        </Field>
      </div>
    </details>
  );
}

function SaveBulkOptions({
  onFailure,
  onRerollFailed,
  onSuccess,
}: {
  onFailure: () => void;
  onRerollFailed: () => void;
  onSuccess: () => void;
}) {
  return (
    <details className="group border-t border-border pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
        Bulk options
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onRerollFailed}>
          Reroll failures
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onSuccess}>
          Mark all success
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onFailure}>
          Mark all failure
        </Button>
      </div>
    </details>
  );
}

function saveTarget(targetId: string, ability: string, dc: number) {
  return {
    ...blankResolutionTarget(targetId),
    outcome: "pending" as const,
    saveAbility: ability,
    dc,
  };
}

function withSaveOutcome(
  target: ResolutionTarget,
  components: ResolutionDamageComponent[],
  successRule: SaveSuccessRule,
  successCondition: ResolutionCondition,
  failureCondition: ResolutionCondition,
) {
  const condition =
    target.outcome === "success"
      ? successCondition
      : target.outcome === "failure"
        ? failureCondition
        : emptyCondition();
  return {
    ...target,
    damageComponents: components,
    damageMultiplier: outcomeDamageMultiplier(target.outcome, successRule),
    conditions: condition.name
      ? [{ ...condition, saveAbility: target.saveAbility, saveDC: target.dc }]
      : [],
  };
}

function emptyCondition(): ResolutionCondition {
  return { name: "", duration: "", expiry: "manual", saveAbility: "", saveDC: 0, note: "" };
}
