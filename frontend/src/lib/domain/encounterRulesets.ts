export const encounterRuleset2014 = "dnd-5e-2014-xp-v1";
export const encounterRuleset2024 = "dnd-5e-2024-xp-v1";

export type EncounterRuleset = typeof encounterRuleset2014 | typeof encounterRuleset2024;

export const encounterRulesetOptions = [
  { value: encounterRuleset2014, label: "2014 encounter rules" },
  { value: encounterRuleset2024, label: "2024 encounter rules" },
];

export function campaignEncounterRuleset(campaign: {
  allowedStandardSources: string[];
  encounterRuleset?: string;
}): EncounterRuleset {
  if (campaign.encounterRuleset === encounterRuleset2024) return encounterRuleset2024;
  if (campaign.encounterRuleset === encounterRuleset2014) return encounterRuleset2014;
  if (
    campaign.allowedStandardSources.includes("srd-5-2-1") &&
    !campaign.allowedStandardSources.includes("srd-2014")
  ) {
    return encounterRuleset2024;
  }
  return encounterRuleset2014;
}

export function encounterRulesetForSources(
  sources: string[],
  current: EncounterRuleset,
): EncounterRuleset {
  const has2014 = sources.includes("srd-2014");
  const has2024 = sources.includes("srd-5-2-1");
  if (has2024 && !has2014) return encounterRuleset2024;
  if (has2014 && !has2024) return encounterRuleset2014;
  return current;
}

export function difficultyOptions(ruleset: EncounterRuleset) {
  return ruleset === encounterRuleset2024
    ? [
        { label: "Low", value: "low" },
        { label: "Moderate", value: "moderate" },
        { label: "High", value: "high" },
      ]
    : [
        { label: "Easy", value: "easy" },
        { label: "Medium", value: "medium" },
        { label: "Hard", value: "hard" },
        { label: "Deadly", value: "deadly" },
      ];
}

export function defaultDifficulty(ruleset: EncounterRuleset) {
  return ruleset === encounterRuleset2024 ? "moderate" : "medium";
}
