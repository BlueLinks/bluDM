import { Dice5 } from "lucide-react";
import { useState } from "react";
import { ActionRow, ResponsiveGrid } from "../../components/layout";
import { Button, Callout, Field, Input, Modal, Select } from "../../components/ui";
import { abilities } from "../../lib/domain/options";
import type { EncounterRunCombatant } from "../../types";
import { applyResolutionPayload, blankResolutionTarget, rollSavingThrow } from "./resolutionModel";
import { SaveResolutionDialog } from "./SaveResolutionDialog";

type SavePreference = { ability: string; dc: number };
type SavePayload = ReturnType<typeof applyResolutionPayload>;

export function RequestSaveDialog({
  actor,
  currentTurnID,
  runID,
  targets,
  onApply,
  onOpenChange,
}: {
  actor: EncounterRunCombatant;
  currentTurnID: string;
  runID: string;
  targets: EncounterRunCombatant[];
  onApply: (resolution: SavePayload) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [storageKey] = useState(() => `bludm-save-request:${runID}:${currentTurnID}`);
  const [preference, setPreference] = useState(() => readPreference(storageKey));
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastResults, setLastResults] = useState<SavePayload["targets"]>([]);

  async function apply(resolution: SavePayload) {
    await onApply(resolution);
    const first = resolution.targets[0];
    if (first) {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ ability: first.saveAbility, dc: first.dc }),
        );
      } catch {
        /* Saving throws still work when browser storage is unavailable. */
      }
    }
  }

  async function roll() {
    if (busy || targets.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const results = targets.map((target) => {
        const rolled = rollSavingThrow(target, preference.ability, "normal");
        return {
          ...blankResolutionTarget(target.id),
          saveAbility: preference.ability,
          dc: preference.dc,
          d20Rolls: rolled.d20Rolls,
          rollTotal: rolled.total,
          outcome: rolled.total >= preference.dc ? ("success" as const) : ("failure" as const),
        };
      });
      const resolution = applyResolutionPayload({
        actorId: actor.id,
        kind: "save",
        sourceName: "Manual save",
        notes: "",
        targets: results,
      });
      await apply(resolution);
      setLastResults(resolution.targets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not roll saving throw");
    } finally {
      setBusy(false);
    }
  }

  if (advanced) {
    return (
      <SaveResolutionDialog
        actor={actor}
        initialAbility={preference.ability}
        initialDC={preference.dc}
        open
        targets={targets}
        onApply={apply}
        onOpenChange={onOpenChange}
      />
    );
  }

  return (
    <Modal
      open
      title="Request saving throw"
      onOpenChange={(open) => {
        if (!busy) onOpenChange(open);
      }}
    >
      <div className="grid min-w-0 gap-4">
        <p className="break-words text-sm text-muted-foreground">
          {targets.map((target) => target.displayName).join(", ")}
        </p>
        {error ? <Callout tone="danger">{error}</Callout> : null}
        <ResponsiveGrid variant="form2">
          <Field label="Save ability">
            <Select
              ariaLabel="Save ability"
              value={preference.ability}
              placeholder="Ability"
              options={abilities.map((ability) => ({ value: ability.key, label: ability.label }))}
              onValueChange={(ability) => setPreference((current) => ({ ...current, ability }))}
            />
          </Field>
          <Field label="DC">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={preference.dc}
              onChange={(event) =>
                setPreference((current) => ({
                  ...current,
                  dc: Math.max(0, Math.trunc(Number(event.target.value) || 0)),
                }))
              }
            />
          </Field>
        </ResponsiveGrid>
        {lastResults.length > 0 ? (
          <div role="status" aria-label="Saving throw results" className="grid gap-2">
            {lastResults.map((result) => {
              const target = targets.find(({ id }) => id === result.targetId);
              const modifier = result.rollTotal - result.d20Rolls[0];
              return (
                <Callout
                  key={result.targetId}
                  tone={result.outcome === "success" ? "success" : "danger"}
                >
                  <strong className="break-words text-base tabular-nums">
                    {target?.displayName}: {result.rollTotal} ·{" "}
                    {result.outcome === "success" ? "Success" : "Failure"}
                  </strong>
                  <p className="mt-1">
                    {result.saveAbility.toUpperCase()} save vs DC {result.dc} · d20{" "}
                    {result.d20Rolls[0]} {modifier < 0 ? "−" : "+"} {Math.abs(modifier)}
                  </p>
                </Callout>
              );
            })}
          </div>
        ) : null}
        <ActionRow justify="between">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setAdvanced(true)}>
            More options
          </Button>
          <ActionRow>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {lastResults.length > 0 ? "Done" : "Cancel"}
            </Button>
            <Button
              type="button"
              icon={Dice5}
              disabled={busy || targets.length === 0}
              onClick={() => void roll()}
            >
              {busy ? "Rolling…" : lastResults.length > 0 ? "Reroll" : "Roll"}
            </Button>
          </ActionRow>
        </ActionRow>
      </div>
    </Modal>
  );
}

function readPreference(key: string): SavePreference {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (
      value &&
      typeof value === "object" &&
      "ability" in value &&
      "dc" in value &&
      typeof value.ability === "string" &&
      abilities.some((ability) => ability.key === value.ability) &&
      typeof value.dc === "number" &&
      Number.isInteger(value.dc) &&
      value.dc >= 0
    ) {
      return { ability: value.ability, dc: value.dc };
    }
  } catch {
    /* Ignore unavailable storage and stale preferences. */
  }
  return { ability: "dex", dc: 13 };
}
