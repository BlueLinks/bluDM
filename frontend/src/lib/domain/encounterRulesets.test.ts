import { describe, expect, it } from "vitest";
import {
  campaignEncounterRuleset,
  encounterRuleset2014,
  encounterRuleset2024,
} from "./encounterRulesets";

describe("campaign encounter rulesets", () => {
  it("resolves single-source campaigns", () => {
    expect(campaignEncounterRuleset({ allowedStandardSources: ["srd-2014"] })).toBe(
      encounterRuleset2014,
    );
    expect(campaignEncounterRuleset({ allowedStandardSources: ["srd-5-2-1"] })).toBe(
      encounterRuleset2024,
    );
  });

  it("uses the explicit selection for mixed-source campaigns", () => {
    const allowedStandardSources = ["srd-2014", "srd-5-2-1"];
    expect(
      campaignEncounterRuleset({ allowedStandardSources, encounterRuleset: encounterRuleset2014 }),
    ).toBe(encounterRuleset2014);
    expect(
      campaignEncounterRuleset({ allowedStandardSources, encounterRuleset: encounterRuleset2024 }),
    ).toBe(encounterRuleset2024);
  });
});
