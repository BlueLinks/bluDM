import { DiceFormulaInput } from "../../components/shared/CharacterFormControls";
import { Swords } from "lucide-react";
import { damageTypes } from "../../components/shared/damageTypes";
import { Checkbox, Field, Select } from "../../components/ui";
import {
  abilityOverrideOptions,
  damageTypeChoices,
  weaponAttackSources,
} from "../../lib/domain/options";
import type { SpellActionFormState } from "../../types";
import { SpellNotice, SpellSubsection } from "./SpellFormLayout";

export function WeaponAttackFields({
  action,
  onChange,
}: {
  action: SpellActionFormState;
  onChange: (action: SpellActionFormState) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-2">
      <Field label="Weapon source">
        <Select
          options={weaponAttackSources}
          placeholder="Weapon"
          value={action.weaponSource}
          onValueChange={(weaponSource) => onChange({ ...action, weaponSource })}
        />
      </Field>
      <Field
        label="Attack ability"
        help="Use this when the spell tells the caster to use their spellcasting ability for the weapon attack."
      >
        <Select
          options={abilityOverrideOptions}
          placeholder="Ability"
          value={action.attackAbilityOverride}
          onValueChange={(attackAbilityOverride) => onChange({ ...action, attackAbilityOverride })}
        />
      </Field>
      <Field label="Damage ability">
        <Select
          options={abilityOverrideOptions}
          placeholder="Ability"
          value={action.damageAbilityOverride}
          onValueChange={(damageAbilityOverride) => onChange({ ...action, damageAbilityOverride })}
        />
      </Field>
      <Field label="Damage type choice">
        <Select
          options={damageTypeChoices}
          placeholder="Damage type"
          value={action.damageTypeChoice}
          onValueChange={(damageTypeChoice) =>
            onChange({
              ...action,
              damageTypeChoice,
              damageTypeOptions:
                damageTypeChoice === "weapon"
                  ? action.damageTypeOptions
                  : action.damageTypeOptions.length > 0
                    ? action.damageTypeOptions
                    : ["radiant"],
            })
          }
        />
      </Field>
      {action.damageTypeChoice === "specific" && (
        <Field
          label="Specific damage type"
          help="Use this when the spell changes the weapon damage to one fixed type."
          className="md:col-span-2"
        >
          <DamageTypePicker
            selected={action.damageTypeOptions.slice(0, 1)}
            mode="single"
            onChange={(damageTypeOptions) => onChange({ ...action, damageTypeOptions })}
          />
        </Field>
      )}
      {action.damageTypeChoice === "choice" && (
        <Field
          label="Damage options"
          help="Choose the damage types the caster can pick from when this spell is cast."
          className="md:col-span-2"
        >
          <DamageTypePicker
            selected={action.damageTypeOptions}
            mode="multiple"
            onChange={(damageTypeOptions) => onChange({ ...action, damageTypeOptions })}
          />
        </Field>
      )}
    </div>
  );
}

function DamageTypePicker({
  selected,
  mode,
  onChange,
}: {
  selected: string[];
  mode: "single" | "multiple";
  onChange: (damageTypes: string[]) => void;
}) {
  const options =
    mode === "multiple"
      ? [
          {
            id: "weapon_original",
            label: "Weapon's original damage",
            icon: Swords,
            tone: "text-companion-metadata",
          },
          ...damageTypes,
        ]
      : damageTypes;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2">
      {options.map((type) => {
        const active = selected.includes(type.id);
        const Icon = type.icon;
        return (
          <button
            key={type.id}
            type="button"
            className={[
              "inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-primary/30",
              active
                ? "border-primary bg-primary/10 text-foreground shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            ].join(" ")}
            onClick={() => {
              if (mode === "single") {
                onChange([type.id]);
                return;
              }
              onChange(active ? selected.filter((id) => id !== type.id) : [...selected, type.id]);
            }}
          >
            <Icon className={["h-4 w-4 shrink-0", type.tone].join(" ")} />
            <span className="min-w-0 leading-tight">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CantripBreakpointFields({
  roll,
  onChange,
}: {
  roll: SpellActionFormState["rolls"][number];
  onChange: (roll: SpellActionFormState["rolls"][number]) => void;
}) {
  const enabled = hasCantripUpgrades(roll);
  return (
    <SpellSubsection
      title="Cantrip Upgrades"
      description="Enable only for cantrips with level-based damage or effect increases."
    >
      <Checkbox
        label="Cantrip upgrades"
        checked={enabled}
        onChange={(checked) =>
          onChange(checked ? enableCantripUpgrades(roll) : clearCantripUpgrades(roll))
        }
      />
      {enabled ? (
        <>
          <Field
            label="Upgrade dice"
            help="Use exact 5th, 11th, and 17th character-level breakpoints for cantrip upgrades."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <CantripUpgradeField
                label="5th level"
                diceCount={roll.cantrip5DiceCount}
                dieSize={roll.cantrip5DieSize}
                onChange={(diceCount, dieSize) =>
                  onChange({ ...roll, cantrip5DiceCount: diceCount, cantrip5DieSize: dieSize })
                }
              />
              <CantripUpgradeField
                label="11th level"
                diceCount={roll.cantrip11DiceCount}
                dieSize={roll.cantrip11DieSize}
                onChange={(diceCount, dieSize) =>
                  onChange({ ...roll, cantrip11DiceCount: diceCount, cantrip11DieSize: dieSize })
                }
              />
              <CantripUpgradeField
                label="17th level"
                diceCount={roll.cantrip17DiceCount}
                dieSize={roll.cantrip17DieSize}
                onChange={(diceCount, dieSize) =>
                  onChange({ ...roll, cantrip17DiceCount: diceCount, cantrip17DieSize: dieSize })
                }
              />
            </div>
          </Field>
          <SpellNotice>{cantripUpgradeDescription(roll)}</SpellNotice>
        </>
      ) : (
        <p className="text-xs font-medium text-muted-foreground">
          Enable only for cantrips with level-based damage or effect increases.
        </p>
      )}
    </SpellSubsection>
  );
}

function hasCantripUpgrades(roll: SpellActionFormState["rolls"][number]) {
  return (
    Number(roll.cantrip5DiceCount) > 0 ||
    Number(roll.cantrip11DiceCount) > 0 ||
    Number(roll.cantrip17DiceCount) > 0
  );
}

function clearCantripUpgrades(roll: SpellActionFormState["rolls"][number]) {
  return {
    ...roll,
    cantrip5DiceCount: "0",
    cantrip5DieSize: "6",
    cantrip11DiceCount: "0",
    cantrip11DieSize: "6",
    cantrip17DiceCount: "0",
    cantrip17DieSize: "6",
  };
}

function enableCantripUpgrades(roll: SpellActionFormState["rolls"][number]) {
  if (hasCantripUpgrades(roll)) return roll;
  return { ...roll, cantrip5DiceCount: "1", cantrip5DieSize: roll.dieSize || "6" };
}

function CantripUpgradeField({
  label,
  diceCount,
  dieSize,
  onChange,
}: {
  label: string;
  diceCount: string;
  dieSize: string;
  onChange: (diceCount: string, dieSize: string) => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border p-2">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <DiceFormulaInput
        allowEmpty
        value={{ diceCount, dieSize, fixedValue: "0" }}
        onChange={(next) => onChange(next.diceCount, next.dieSize)}
      />
    </div>
  );
}

function cantripUpgradeDescription(roll: SpellActionFormState["rolls"][number]) {
  const upgrades = [
    cantripUpgradePart("5th", roll.cantrip5DiceCount, roll.cantrip5DieSize),
    cantripUpgradePart("11th", roll.cantrip11DiceCount, roll.cantrip11DieSize),
    cantripUpgradePart("17th", roll.cantrip17DiceCount, roll.cantrip17DieSize),
  ].filter(Boolean);
  if (upgrades.length === 0) {
    return "No exact cantrip breakpoints configured for this effect.";
  }
  return `This effect adds ${upgrades.join(", ")}.`;
}

function cantripUpgradePart(label: string, diceCount: string, dieSize: string) {
  const count = Number(diceCount) || 0;
  const die = Number(dieSize) || 6;
  return count > 0 ? `${count}d${die} at ${label} level` : "";
}
