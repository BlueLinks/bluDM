import { Checkbox, Input, Select } from "../ui";
import { damageTypes } from "./damageTypes";
import { abilities, conditionImmunities, diceSizes, skillDefinitions } from "../../lib/domain/options";
import { abilityModifier, modifierTone, signedModifier } from "../../lib/domain/forms";
import type { AbilityKey, SenseName } from "../../types";

export function DiceFormulaInput({
  value,
  onChange,
  allowEmpty = false
}: {
  value: { diceCount: string; dieSize: string; fixedValue: string };
  onChange: (value: { diceCount: string; dieSize: string; fixedValue: string }) => void;
  allowEmpty?: boolean;
}) {
  function setNumber(field: "diceCount" | "fixedValue", delta: number) {
    const min = field === "diceCount" ? (allowEmpty ? 0 : 1) : -99;
    const current = Number(value[field]);
    onChange({ ...value, [field]: String(Math.max(min, Number.isFinite(current) ? current + delta : delta)) });
  }
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(110px,1fr)_110px_minmax(110px,1fr)]">
      <StepperNumber label="Dice" value={value.diceCount} min={allowEmpty ? 0 : 1} onChange={(diceCount) => onChange({ ...value, diceCount })} onStep={(delta) => setNumber("diceCount", delta)} />
      <FieldlessSelect label="Die" value={value.dieSize} onChange={(dieSize) => onChange({ ...value, dieSize })} />
      <StepperNumber label="Modifier" value={value.fixedValue} min={-99} onChange={(fixedValue) => onChange({ ...value, fixedValue })} onStep={(delta) => setNumber("fixedValue", delta)} />
    </div>
  );
}

export function parseDiceFormula(formula: string, fallback = { diceCount: "1", dieSize: "6", fixedValue: "0" }) {
  const match = formula.trim().toLowerCase().match(/^(\d+)d(4|6|8|10|12|20)([+-]\d+)?$/);
  if (!match) return fallback;
  return { diceCount: match[1], dieSize: match[2], fixedValue: match[3] ?? "0" };
}

export function formatDiceFormula(value: { diceCount: string; dieSize: string; fixedValue: string }) {
  const count = Math.max(1, Number(value.diceCount) || 1);
  const die = diceSizes.includes(Number(value.dieSize)) ? Number(value.dieSize) : 6;
  const modifier = Number(value.fixedValue) || 0;
  return `${count}d${die}${modifier > 0 ? `+${modifier}` : modifier < 0 ? String(modifier) : ""}`;
}

function StepperNumber({
  label,
  value,
  min,
  onChange,
  onStep
}: {
  label: string;
  value: string;
  min: number;
  onChange: (value: string) => void;
  onStep: (delta: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
      {label}
      <div className="inline-flex overflow-hidden rounded-md border border-border bg-card">
        <button className="grid h-10 w-9 place-items-center border-r border-border text-base text-muted-foreground hover:bg-muted hover:text-foreground" type="button" onClick={() => onStep(-1)}>-</button>
        <Input className="h-10 min-h-0 w-full rounded-none border-0 text-center font-semibold focus:ring-0" inputMode="numeric" type="number" min={min} value={value} onChange={(event) => onChange(sanitizeInteger(event.target.value, min < 0))} />
        <button className="grid h-10 w-9 place-items-center border-l border-border text-base text-muted-foreground hover:bg-muted hover:text-foreground" type="button" onClick={() => onStep(1)}>+</button>
      </div>
    </label>
  );
}

function sanitizeInteger(value: string, allowNegative: boolean) {
  const digits = value.replace(/\D/g, "");
  if (!allowNegative) return digits;
  return value.trim().startsWith("-") ? `-${digits}` : digits;
}

function FieldlessSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
      {label}
      <Select options={diceSizes.map((die) => ({ value: String(die), label: `d${die}` }))} placeholder="Die" value={value} onValueChange={onChange} />
    </label>
  );
}

export function AbilityInput({
  label,
  value,
  saveProficient = false,
  onChange,
  onSaveProficiencyChange
}: {
  label: string;
  value: number;
  saveProficient?: boolean;
  onChange: (value: number) => void;
  onSaveProficiencyChange?: (checked: boolean) => void;
}) {
  const modifier = abilityModifier(value);
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <label className="flex items-center gap-2">
          <span className="sr-only">{label} score</span>
          <Input className="w-16 text-center font-semibold" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
          <span className={["grid h-10 min-w-12 place-items-center rounded-md border border-border bg-muted px-2 text-sm font-bold", modifierTone(modifier)].join(" ")}>{signedModifier(value)}</span>
        </label>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-2 py-2 text-xs text-muted-foreground">
        Saving throw proficiency
        <input className="h-4 w-4 accent-primary" checked={saveProficient} type="checkbox" onChange={(event) => onSaveProficiencyChange?.(event.target.checked)} />
      </label>
    </div>
  );
}

export function SkillsTable({
  abilityScores,
  proficiencies,
  expertise,
  proficiencyBonus,
  onProficiencyChange,
  onExpertiseChange
}: {
  abilityScores: Record<AbilityKey, string>;
  proficiencies: string[];
  expertise: string[];
  proficiencyBonus: number;
  onProficiencyChange: (skill: string, checked: boolean) => void;
  onExpertiseChange: (skill: string, checked: boolean) => void;
}) {
  const bonus = proficiencyBonus;
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {skillDefinitions.map((skill) => {
        const score = Number(abilityScores[skill.ability]) || 10;
        const base = abilityModifier(score);
        const isProficient = proficiencies.includes(skill.name);
        const isExpert = expertise.includes(skill.name);
        const total = base + (isExpert ? bonus * 2 : isProficient ? bonus : 0);
        return (
          <div className="grid grid-cols-[44px_44px_1fr_72px_72px_52px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm" key={skill.name}>
            <span className="text-xs font-semibold text-muted-foreground">+{bonus}</span>
            <span className="rounded bg-muted px-2 py-1 text-center text-xs font-semibold uppercase">{skill.ability}</span>
            <span className="min-w-0 font-medium">{skill.name}</span>
            <label className="grid justify-items-center gap-1 text-[0.68rem] font-semibold uppercase text-muted-foreground">
              Prof
              <input className="h-4 w-4 accent-primary" checked={isProficient} type="checkbox" onChange={(event) => onProficiencyChange(skill.name, event.target.checked)} />
            </label>
            <label className="grid justify-items-center gap-1 text-[0.68rem] font-semibold uppercase text-muted-foreground">
              Expert
              <input className="h-4 w-4 accent-primary" checked={isExpert} type="checkbox" onChange={(event) => onExpertiseChange(skill.name, event.target.checked)} />
            </label>
            <span className={["text-right font-bold", modifierTone(total)].join(" ")}>{total >= 0 ? `+${total}` : total}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SenseControl({
  label,
  value,
  onChange
}: {
  label: SenseName;
  value: { enabled: boolean; range: string };
  onChange: (value: { enabled: boolean; range: string }) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <Checkbox label={label} checked={value.enabled} onChange={(checked) => onChange({ ...value, enabled: checked })} />
      <label className="mt-3 grid gap-2 text-sm font-medium">
        Range ft.
        <Input type="number" value={value.range} onChange={(event) => onChange({ ...value, range: event.target.value })} disabled={!value.enabled} />
      </label>
    </div>
  );
}

export function DamageDefenseGroup({
  damageVulnerabilities,
  damageResistances,
  damageImmunities,
  onChange
}: {
  damageVulnerabilities: string[];
  damageResistances: string[];
  damageImmunities: string[];
  onChange: (field: "damageVulnerabilities" | "damageResistances" | "damageImmunities", value: string, checked: boolean) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DamageChecklist title="Damage Vulnerabilities" hint="Double damage is taken" marker="V" selected={damageVulnerabilities} field="damageVulnerabilities" onChange={onChange} />
      <DamageChecklist title="Damage Resistances" hint="Half of the damage is taken" marker="R" selected={damageResistances} field="damageResistances" onChange={onChange} />
      <DamageChecklist title="Damage Immunities" hint="No damage is taken" marker="I" selected={damageImmunities} field="damageImmunities" onChange={onChange} />
    </div>
  );
}

function DamageChecklist({
  title,
  hint,
  marker,
  selected,
  field,
  onChange
}: {
  title: string;
  hint: string;
  marker: string;
  selected: string[];
  field: "damageVulnerabilities" | "damageResistances" | "damageImmunities";
  onChange: (field: "damageVulnerabilities" | "damageResistances" | "damageImmunities", value: string, checked: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded bg-muted text-sm font-bold">{marker}</span>
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="grid gap-2">
        {damageTypes.map((damage) => (
          <label className="flex items-center justify-between rounded-md border border-border px-2 py-2 text-sm" key={damage.id}>
            <span className="flex items-center gap-2">
              <damage.icon className="h-4 w-4 text-accent" />
              {damage.label}
            </span>
            <input className="h-4 w-4 accent-primary" checked={selected.includes(damage.id)} type="checkbox" onChange={(event) => onChange(field, damage.id, event.target.checked)} />
          </label>
        ))}
      </div>
    </div>
  );
}

export function AbilitySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <Select options={abilities.map((ability) => ({ label: ability.label, value: ability.key }))} placeholder="None" value={value} onValueChange={onChange} />;
}

export function ConditionImmunityChecklist({
  selected,
  onChange
}: {
  selected: string[];
  onChange: (condition: string, checked: boolean) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {conditionImmunities.map((condition) => (
        <Checkbox
          key={condition}
          label={condition}
          checked={selected.includes(condition)}
          onChange={(checked) => onChange(condition, checked)}
        />
      ))}
    </div>
  );
}
