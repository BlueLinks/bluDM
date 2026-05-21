import { Input } from "../ui";
import { abilityModifier, modifierTone } from "../../lib/domain/forms";
import { abilities, skillDefinitions } from "../../lib/domain/options";
import type { AbilityKey } from "../../types";

export function CompactAbilityTable({
  abilityScores,
  savingThrowProficiencies,
  onScoreChange,
  onSaveProficiencyChange,
}: {
  abilityScores: Record<AbilityKey, string>;
  savingThrowProficiencies: string[];
  onScoreChange: (ability: AbilityKey, value: string) => void;
  onSaveProficiencyChange: (ability: AbilityKey, checked: boolean) => void;
}) {
  function stepScore(ability: AbilityKey, delta: number) {
    const current = Number(abilityScores[ability]) || 10;
    onScoreChange(ability, String(current + delta));
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {abilities.map((ability) => {
        const score = Number(abilityScores[ability.key]) || 10;
        const modifier = abilityModifier(score);
        return (
          <div
            className="grid min-w-0 grid-cols-[3rem_minmax(5.5rem,1fr)_2.75rem] overflow-hidden rounded-lg border border-border bg-background text-sm"
            key={ability.key}
          >
            <span className="row-span-2 grid items-center border-r border-border bg-muted/40 px-2 font-black uppercase text-muted-foreground">
              {ability.label}
            </span>
            <span className="grid place-items-center border-r border-border bg-primary/5 px-1.5 py-1.5">
              <span className="grid w-full max-w-24 grid-cols-[1.55rem_1fr_1.55rem] overflow-hidden rounded-md border border-border bg-card">
                <button
                  className="grid h-9 place-items-center border-r border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  type="button"
                  onClick={() => stepScore(ability.key, -1)}
                  aria-label={`Decrease ${ability.label}`}
                >
                  -
                </button>
                <Input
                  className="h-9 min-h-0 rounded-none border-0 px-0 text-center font-semibold focus:ring-0"
                  type="number"
                  value={abilityScores[ability.key]}
                  onChange={(event) => onScoreChange(ability.key, event.target.value)}
                />
                <button
                  className="grid h-9 place-items-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  type="button"
                  onClick={() => stepScore(ability.key, 1)}
                  aria-label={`Increase ${ability.label}`}
                >
                  +
                </button>
              </span>
            </span>
            <span
              className={[
                "grid place-items-center px-2 font-black tabular-nums",
                modifierTone(modifier),
              ].join(" ")}
              title="Modifier"
            >
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <label
              className="col-span-2 flex items-center justify-center gap-2 border-t border-border bg-muted/30 px-2 py-1.5 text-[0.62rem] font-bold uppercase text-muted-foreground"
              title={`${ability.label} saving throw proficiency`}
            >
              <span>Save prof</span>
              <input
                className="h-4 w-4 accent-primary"
                checked={savingThrowProficiencies.includes(ability.key)}
                type="checkbox"
                onChange={(event) => onSaveProficiencyChange(ability.key, event.target.checked)}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}

export function SkillsTable({
  abilityScores,
  proficiencies,
  expertise,
  proficiencyBonus,
  onProficiencyChange,
  onExpertiseChange,
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
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
      {skillDefinitions.map((skill) => {
        const score = Number(abilityScores[skill.ability]) || 10;
        const base = abilityModifier(score);
        const isProficient = proficiencies.includes(skill.name);
        const isExpert = expertise.includes(skill.name);
        const total = base + (isExpert ? bonus * 2 : isProficient ? bonus : 0);
        return (
          <div
            className="grid min-w-0 grid-cols-[1.8rem_minmax(4.25rem,1fr)_2rem_2.85rem_2.4rem] items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1.5 text-sm"
            key={skill.name}
          >
            <span className="rounded bg-muted px-1 py-1 text-center text-[0.62rem] font-bold uppercase">
              {skill.ability}
            </span>
            <span className="min-w-0 truncate font-medium">{skill.name}</span>
            <span className={["text-right font-bold", modifierTone(total)].join(" ")}>
              {total >= 0 ? `+${total}` : total}
            </span>
            <label
              className="flex min-w-0 items-center justify-center gap-1 rounded bg-muted/60 px-1 py-1 text-[0.58rem] font-semibold uppercase text-muted-foreground"
              title={`${skill.name} proficiency`}
            >
              <span className="whitespace-nowrap">Prof</span>
              <input
                className="h-4 w-4 shrink-0 accent-primary"
                checked={isProficient}
                type="checkbox"
                onChange={(event) => onProficiencyChange(skill.name, event.target.checked)}
              />
            </label>
            <label
              className="flex min-w-0 items-center justify-center gap-1 rounded bg-muted/60 px-1 py-1 text-[0.58rem] font-semibold uppercase text-muted-foreground"
              title={`${skill.name} expertise`}
            >
              <span className="whitespace-nowrap">Exp</span>
              <input
                className="h-4 w-4 shrink-0 accent-primary"
                checked={isExpert}
                type="checkbox"
                onChange={(event) => onExpertiseChange(skill.name, event.target.checked)}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
