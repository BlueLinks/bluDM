import { describe, expect, it } from "vitest";
import type { ActionRollPart } from "../../types";
import { adjustDamageTotal, adjustRollsForCritical } from "./actionHitResult";

describe("action damage resolution", () => {
  it("doubles critical dice without doubling the flat modifier", () => {
    const [critical] = adjustRollsForCritical(
      [roll({ rolledValue: 5, criticalRolledValue: 7, fixedValue: 3, total: 8 })],
      true,
    );
    expect(critical.total).toBe(15);
  });

  it("mitigates each damage component before summing", () => {
    const total = adjustDamageTotal(
      [
        roll({ damageType: "fire", total: 10 }),
        roll({ damageType: "cold", total: 7 }),
        roll({ damageType: "poison", total: 5 }),
      ],
      ["cold"],
      ["fire"],
      ["poison"],
    );
    expect(total).toBe(19);
  });
});

function roll(overrides: Partial<ActionRollPart>): ActionRollPart {
  return {
    id: "part",
    rollKind: "damage",
    damageType: "slashing",
    magical: false,
    diceCount: 1,
    dieSize: 8,
    fixedValue: 0,
    ...overrides,
  };
}
