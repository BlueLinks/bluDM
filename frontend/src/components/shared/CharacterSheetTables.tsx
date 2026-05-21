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
  const groups = [abilities.slice(0, 3), abilities.slice(3, 6)];
  function stepScore(ability: AbilityKey, delta: number) {
    const current = Number(abilityScores[ability]) || 10;
    onScoreChange(ability, String(current + delta));
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2 max-[1133px]:grid-cols-1">
      {groups.map((group) => (
        <div
          className="min-w-0 overflow-hidden rounded-lg border border-border bg-background text-sm"
          key={group.map((ability) => ability.key).join("-")}
        >
          <div className="grid grid-cols-[4rem_7rem_3rem_3.25rem] border-b border-border bg-muted/60 text-center text-[0.62rem] font-black uppercase leading-none text-muted-foreground">
            <span className="border-r border-border px-2 py-2 text-left">Ability</span>
            <span className="border-r border-border bg-primary/10 px-2 py-2 text-primary">
              Score
            </span>
            <span className="border-r border-border px-2 py-2">Mod</span>
            <span className="px-1 py-2">Save</span>
          </div>
          {group.map((ability) => {
            const score = Number(abilityScores[ability.key]) || 10;
            const modifier = abilityModifier(score);
            return (
              <div
                className="grid grid-cols-[4rem_7rem_3rem_3.25rem] items-stretch border-b border-border last:border-b-0"
                key={ability.key}
              >
                <span className="grid items-center border-r border-border bg-muted/30 px-2 font-black uppercase text-muted-foreground">
                  {ability.label}
                </span>
                <span className="grid place-items-center border-r border-border bg-primary/5 px-1.5">
                  <span className="grid grid-cols-[1.75rem_2.5rem_1.75rem] overflow-hidden rounded-md border border-border bg-card">
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
                    "grid place-items-center border-r border-border px-2 font-black tabular-nums",
                    modifierTone(modifier),
                  ].join(" ")}
                >
                  {modifier >= 0 ? `+${modifier}` : modifier}
                </span>
                <label className="grid place-items-center px-2">
                  <span className="sr-only">{ability.label} saving throw proficiency</span>
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
      ))}
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
    <div className="grid gap-2 2xl:grid-cols-2 max-[1133px]:grid-cols-1">
      {skillDefinitions.map((skill) => {
        const score = Number(abilityScores[skill.ability]) || 10;
        const base = abilityModifier(score);
        const isProficient = proficiencies.includes(skill.name);
        const isExpert = expertise.includes(skill.name);
        const total = base + (isExpert ? bonus * 2 : isProficient ? bonus : 0);
        return (
          <div
            className="grid min-w-0 grid-cols-[1.7rem_2rem_minmax(6rem,8.75rem)_2.25rem_3.1rem_3.4rem] items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            key={skill.name}
          >
            <span className="text-xs font-semibold text-muted-foreground">+{bonus}</span>
            <span className="rounded bg-muted px-1.5 py-1 text-center text-xs font-semibold uppercase">
              {skill.ability}
            </span>
            <span className="min-w-0 truncate font-medium">{skill.name}</span>
            <span className={["text-right font-bold", modifierTone(total)].join(" ")}>
              {total >= 0 ? `+${total}` : total}
            </span>
            <label className="flex min-w-0 items-center justify-between gap-1 rounded bg-muted/60 px-1.5 py-1 text-[0.58rem] font-semibold uppercase text-muted-foreground">
              Prof
              <input
                className="h-4 w-4 shrink-0 accent-primary"
                checked={isProficient}
                type="checkbox"
                onChange={(event) => onProficiencyChange(skill.name, event.target.checked)}
              />
            </label>
            <label className="flex min-w-0 items-center justify-between gap-1 rounded bg-muted/60 px-1.5 py-1 text-[0.58rem] font-semibold uppercase text-muted-foreground">
              Expert
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
