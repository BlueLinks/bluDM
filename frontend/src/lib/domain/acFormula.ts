import { diceSizes } from "./options";
import type { SpellFormState } from "../../types";

const shortAbilities = ["str", "dex", "con", "int", "wis", "cha"] as const;
const fullAbilityNames: Record<string, (typeof shortAbilities)[number]> = {
  charisma: "cha",
  constitution: "con",
  dexterity: "dex",
  intelligence: "int",
  strength: "str",
  wisdom: "wis",
};

export type ACFormulaValidation = {
  ok: boolean;
  error?: string;
  normalized?: string;
};

export function validateACFormula(formula: string): ACFormulaValidation {
  const trimmed = formula.trim();
  if (!trimmed) return { ok: false, error: "Enter an AC formula." };
  if (/^[+-]/.test(trimmed)) {
    return { ok: false, error: "Start with a number, dice term, or ability." };
  }

  const parts = trimmed.match(/[^+-]+|[+-]/g) ?? [];
  if (parts.length === 0) return { ok: false, error: "Enter an AC formula." };

  const normalizedTerms: string[] = [];
  let expectTerm = true;
  let pendingOperator = "";

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;
    if (part === "+" || part === "-") {
      if (expectTerm) return { ok: false, error: "Add a value after each operator." };
      pendingOperator = part;
      expectTerm = true;
      continue;
    }
    if (!expectTerm) {
      return { ok: false, error: "Separate each formula value with + or -." };
    }

    const term = normalizeACFormulaTerm(part);
    if (!term.ok) return term;
    normalizedTerms.push(`${pendingOperator ? `${pendingOperator} ` : ""}${term.normalized}`);
    pendingOperator = "";
    expectTerm = false;
  }

  if (expectTerm) return { ok: false, error: "Add a value after the final operator." };
  return { ok: true, normalized: normalizedTerms.join(" ") };
}

export function validateSpellACFormulas(form: SpellFormState) {
  const errors: string[] = [];
  for (const action of form.actions) {
    for (const roll of action.rolls) {
      if (roll.rollKind !== "base_ac" || roll.effectConfig?.calculationMode === "dice") {
        continue;
      }
      const result = validateACFormula(
        typeof roll.effectConfig?.formula === "string" ? roll.effectConfig.formula : "",
      );
      if (!result.ok) {
        errors.push(`${action.name || "Spell action"} base AC formula: ${result.error}`);
      }
    }
  }
  return errors;
}

export function normalizeSpellACFormulas(form: SpellFormState): SpellFormState {
  return {
    ...form,
    actions: form.actions.map((action) => ({
      ...action,
      rolls: action.rolls.map((roll) => {
        if (roll.rollKind !== "base_ac" || roll.effectConfig?.calculationMode === "dice") {
          return roll;
        }
        const result = validateACFormula(
          typeof roll.effectConfig?.formula === "string" ? roll.effectConfig.formula : "",
        );
        return result.ok && result.normalized
          ? { ...roll, effectConfig: { ...roll.effectConfig, formula: result.normalized } }
          : roll;
      }),
    })),
  };
}

export function displayACFormula(formula: unknown, fallback = "Base AC formula") {
  if (typeof formula !== "string") return fallback;
  const result = validateACFormula(formula);
  return result.ok ? (result.normalized ?? formula) : formula || fallback;
}

function normalizeACFormulaTerm(term: string): ACFormulaValidation {
  const normalized = term.toLowerCase().replace(/\s+/g, " ").trim();
  if (/^\d+$/.test(normalized)) return { ok: true, normalized: String(Number(normalized)) };

  const diceMatch = normalized.match(/^(\d*)d(\d+)$/);
  if (diceMatch) {
    const count = diceMatch[1] ? Number(diceMatch[1]) : 1;
    const die = Number(diceMatch[2]);
    if (count < 1) return { ok: false, error: "Dice count must be at least 1." };
    if (!diceSizes.includes(die)) {
      return { ok: false, error: "Use a standard die: d4, d6, d8, d10, d12, or d20." };
    }
    return { ok: true, normalized: `${count === 1 ? "" : count}d${die}` };
  }

  const ability = abilityTerm(normalized);
  if (ability) return { ok: true, normalized: ability };

  return {
    ok: false,
    error: "Use numbers, dice, or abilities such as Dex modifier or Dexterity Score.",
  };
}

function abilityTerm(value: string) {
  const words = value.split(" ");
  const ability = shortAbilities.includes(words[0] as (typeof shortAbilities)[number])
    ? words[0]
    : fullAbilityNames[words[0]];
  if (!ability) return "";
  const suffix = words.slice(1).join(" ");
  if (!suffix || suffix === "mod" || suffix === "modifier") return `${ability} modifier`;
  if (suffix === "score") return `${ability} score`;
  return "";
}
