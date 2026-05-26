import { Field, Select } from "../../components/ui";
import type { RollTableResolutionPayload } from "../../lib/api/encounterRuns";
import { configText } from "../../lib/domain/effectConfig";
import { friendlyOption } from "../../lib/domain/spellMessaging";
import type { EncounterRunCombatant, Spell, SpellActionRollPart } from "../../types";

export type TableResolutionState = {
  mode: "auto" | "entered";
  roll: string;
  followUpA: string;
  followUpB: string;
  saveResult: "manual" | "failed" | "success";
};

export function RollTableCastPanel({
  onChange,
  resolutions,
  rollTables,
  targets,
}: {
  onChange: (resolutions: Record<string, TableResolutionState>) => void;
  resolutions: Record<string, TableResolutionState>;
  rollTables: SpellActionRollPart[];
  targets: EncounterRunCombatant[];
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-sm font-bold">Roll table outcomes</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Auto-roll rays in the tracker, or enter a result rolled at the table.
      </div>
      <div className="mt-3 grid gap-3">
        {rollTables.map((rollTable) =>
          targets.map((target) => (
            <RollTableTargetResolution
              key={resolutionKey(target.id, rollTable.id)}
              rollTable={rollTable}
              target={target}
              resolution={resolutions[resolutionKey(target.id, rollTable.id)] ?? blankResolution()}
              resolutions={resolutions}
              onChange={onChange}
            />
          )),
        )}
      </div>
    </div>
  );
}

function RollTableTargetResolution({
  onChange,
  resolution,
  resolutions,
  rollTable,
  target,
}: {
  onChange: (resolutions: Record<string, TableResolutionState>) => void;
  resolution: TableResolutionState;
  resolutions: Record<string, TableResolutionState>;
  rollTable: SpellActionRollPart;
  target: EncounterRunCombatant;
}) {
  const key = resolutionKey(target.id, rollTable.id);
  const dieSize = tableDieSize(rollTable.effectConfig?.dice);
  const rows = objectRows(rollTable.effectConfig?.rows);
  const selectedRoll = resolution.roll || "1";
  const selectedRow = rowForRoll(rows, selectedRoll);
  const needsFollowUps = selectedRow && rowRequiresFollowUps(selectedRow);
  return (
    <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{target.displayName}</div>
          <div className="text-xs text-muted-foreground">
            {configText(rollTable.effectConfig?.name, "Roll table")}
          </div>
        </div>
        <Field label="Mode" className="min-w-36">
          <Select
            value={resolution.mode}
            placeholder="Mode"
            options={[
              { value: "auto", label: "Auto roll" },
              { value: "entered", label: "Enter result" },
            ]}
            onValueChange={(mode) =>
              updateResolution(onChange, resolutions, key, {
                ...resolution,
                mode: mode as "auto" | "entered",
              })
            }
          />
        </Field>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        {resolution.mode === "entered" && (
          <Field label={`d${dieSize} result`}>
            <Select
              value={selectedRoll}
              placeholder="Result"
              options={tableFaceOptions(dieSize, rows)}
              onValueChange={(roll) =>
                updateResolution(onChange, resolutions, key, {
                  ...resolution,
                  followUpA: "",
                  followUpB: "",
                  roll,
                })
              }
            />
          </Field>
        )}
        <Field label="Save">
          <Select
            value={resolution.saveResult}
            placeholder="Save"
            options={[
              { value: "manual", label: "Resolve manually" },
              { value: "failed", label: "Failed save" },
              { value: "success", label: "Successful save" },
            ]}
            onValueChange={(saveResult) =>
              updateResolution(onChange, resolutions, key, {
                ...resolution,
                saveResult: saveResult as "manual" | "failed" | "success",
              })
            }
          />
        </Field>
        {resolution.mode === "entered" && needsFollowUps && (
          <>
            <FollowUpSelect
              label="Follow-up 1"
              rows={rows}
              dieSize={dieSize}
              selectedRoll={selectedRoll}
              value={resolution.followUpA}
              onChange={(followUpA) =>
                updateResolution(onChange, resolutions, key, { ...resolution, followUpA })
              }
            />
            <FollowUpSelect
              label="Follow-up 2"
              rows={rows}
              dieSize={dieSize}
              selectedRoll={selectedRoll}
              value={resolution.followUpB}
              onChange={(followUpB) =>
                updateResolution(onChange, resolutions, key, { ...resolution, followUpB })
              }
            />
          </>
        )}
      </div>
      {resolution.mode === "entered" && selectedRow && <OutcomePreview row={selectedRow} />}
    </div>
  );
}

function FollowUpSelect({
  dieSize,
  label,
  onChange,
  rows,
  selectedRoll,
  value,
}: {
  dieSize: number;
  label: string;
  onChange: (value: string) => void;
  rows: Record<string, unknown>[];
  selectedRoll: string;
  value: string;
}) {
  return (
    <Field label={label}>
      <Select
        value={value}
        placeholder="Result"
        options={tableFaceOptions(dieSize, rows).filter((option) => option.value !== selectedRoll)}
        onValueChange={onChange}
      />
    </Field>
  );
}

function OutcomePreview({ row }: { row: Record<string, unknown> }) {
  const effects = objectRows(row.effects);
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">Selected outcome</div>
      <div className="mt-1 text-sm font-semibold">{configText(row.name, "Outcome")}</div>
      {configText(row.effectText || row.effect) && (
        <div className="mt-1 text-xs text-muted-foreground">
          {configText(row.effectText || row.effect)}
        </div>
      )}
      {effects.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {effects.map((effect, index) => (
            <span
              key={index}
              className="rounded-full border border-border bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"
            >
              {nestedEffectSummary(effect)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function tableFaceOptions(dieSize: number, rows: Record<string, unknown>[]) {
  return Array.from({ length: Math.max(2, dieSize) }, (_, index) => {
    const value = String(index + 1);
    const row = rowForRoll(rows, value);
    const name = row ? configText(row.name, "Outcome") : "Outcome";
    return { value, label: `${value}. ${name}` };
  });
}

function rowForRoll(rows: Record<string, unknown>[], roll: string) {
  return rows.find((row) => String(Number(row.roll) || "") === roll);
}

function rowRequiresFollowUps(row: Record<string, unknown>) {
  const reminder = configText(row.rerollRule || row.effectText || row.effect).toLowerCase();
  return reminder.includes("roll twice") || reminder.includes("twice more");
}

function nestedEffectSummary(effect: Record<string, unknown>) {
  const kind = configText(effect.rollKind, "custom");
  if (kind === "damage") {
    const dice = `${Number(effect.diceCount) || 0}d${Number(effect.dieSize) || 6}`;
    return `${dice} ${friendlyOption(effect.damageType, "damage")}`;
  }
  if (kind === "condition") return `Apply ${configText(effect.conditionName, "condition")}`;
  if (kind === "saving_throw_repeat") {
    const config = objectConfig(effect.effectConfig);
    return `Repeat ${friendlyOption(config.ability, "save")}`;
  }
  if (kind === "custom") return configText(effect.conditionName, "Manual reminder");
  return friendlyOption(kind, "Effect");
}

function tableDieSize(value: unknown) {
  const match = configText(value, "1d8")
    .trim()
    .toLowerCase()
    .match(/^1d(\d+)$/);
  return match ? Math.max(2, Number(match[1]) || 8) : 8;
}

function objectRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
      )
    : [];
}

function objectConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function rollTableRolls(spell: Spell) {
  return spell.actions.flatMap((action) =>
    action.rolls.filter((roll) => roll.rollKind === "roll_table"),
  );
}

export function rollTableResolutionPayloads(
  rollTables: SpellActionRollPart[],
  targets: EncounterRunCombatant[],
  resolutions: Record<string, TableResolutionState>,
): RollTableResolutionPayload[] {
  return rollTables.flatMap((rollTable) =>
    targets.map((target) => {
      const resolution = resolutions[resolutionKey(target.id, rollTable.id)] ?? blankResolution();
      const roll = resolution.mode === "entered" ? Number(resolution.roll) || 1 : 0;
      const rows = objectRows(rollTable.effectConfig?.rows);
      const selectedRow = rowForRoll(rows, String(roll));
      const followUpRolls =
        selectedRow && rowRequiresFollowUps(selectedRow)
          ? [Number(resolution.followUpA) || 0, Number(resolution.followUpB) || 0]
          : [];
      return {
        targetId: target.id,
        rollId: rollTable.id,
        mode: resolution.mode,
        roll,
        followUpRolls,
        saveResult: resolution.saveResult,
      };
    }),
  );
}

function updateResolution(
  onChange: (resolutions: Record<string, TableResolutionState>) => void,
  resolutions: Record<string, TableResolutionState>,
  key: string,
  resolution: TableResolutionState,
) {
  onChange({ ...resolutions, [key]: resolution });
}

function blankResolution(): TableResolutionState {
  return { followUpA: "", followUpB: "", mode: "auto", roll: "", saveResult: "manual" };
}

function resolutionKey(targetID: string, rollID: string) {
  return `${targetID}:${rollID}`;
}
