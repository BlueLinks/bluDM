import { describe, expect, it } from "vitest";
import { validateACFormula } from "./acFormula";

describe("AC formula validation", () => {
  it.each([
    ["13+dex mod", "13 + dex modifier"],
    ["13+Dexterity Score", "13 + dex score"],
    ["13+dex modifier", "13 + dex modifier"],
    ["d12+dex", "d12 + dex modifier"],
    ["dex+d12", "dex modifier + d12"],
  ])("accepts %s", (formula, normalized) => {
    expect(validateACFormula(formula)).toEqual({ ok: true, normalized });
  });

  it.each(["dex+d-41", "dejsdj+-d12"])("rejects %s", (formula) => {
    expect(validateACFormula(formula).ok).toBe(false);
  });

  it("rejects non-standard dice", () => {
    expect(validateACFormula("13 + d7")).toMatchObject({
      ok: false,
      error: "Use a standard die: d4, d6, d8, d10, d12, or d20.",
    });
  });

  it("rejects dangling operators", () => {
    expect(validateACFormula("13 + ")).toMatchObject({
      ok: false,
      error: "Add a value after the final operator.",
    });
  });
});
