import { describe, expect, it } from "vitest";
import { abilityModifier, formatRolls, proficiencyBonus, signedModifier } from "./forms";

describe("character form domain helpers", () => {
  it("formats ability modifiers using 5e rules", () => {
    expect(abilityModifier(9)).toBe(-1);
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(18)).toBe(4);
    expect(signedModifier(8)).toBe("-1");
    expect(signedModifier(16)).toBe("+3");
  });

  it("calculates proficiency bonus from character level", () => {
    expect(proficiencyBonus("1")).toBe(2);
    expect(proficiencyBonus("5")).toBe(3);
    expect(proficiencyBonus("9")).toBe(4);
    expect(proficiencyBonus("17")).toBe(6);
  });

  it("formats multi-part action rolls", () => {
    expect(
      formatRolls([
        {
          rollKind: "damage",
          damageType: "bludgeoning",
          magical: false,
          diceCount: 2,
          dieSize: 6,
          fixedValue: -1,
        },
        {
          rollKind: "damage",
          damageType: "poison",
          magical: false,
          diceCount: 3,
          dieSize: 6,
          fixedValue: 0,
        },
      ]),
    ).toBe("2d6-1 bludgeoning + 3d6 poison");
  });
});
