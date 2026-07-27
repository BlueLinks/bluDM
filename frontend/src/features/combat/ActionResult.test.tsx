import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RollLogProvider } from "../../components/RollLogProvider";
import type { CreatureAction, EncounterRunCombatant } from "../../types";
import { ActionResult } from "./actionResult";

afterEach(cleanup);

describe("ActionResult", () => {
  it("restores calculated damage when a calculated miss is overridden to hit", () => {
    const onResolve = vi.fn();
    render(
      <RollLogProvider>
        <ActionResult
          result={{
            action: action(),
            actorName: "Goblin",
            adjustedDamage: 0,
            attackTotal: 9,
            d20: 5,
            d20Rolls: [5],
            hit: false,
            rollMode: "normal",
            rolls: [
              {
                id: "damage",
                rollKind: "damage",
                damageType: "slashing",
                magical: false,
                diceCount: 1,
                dieSize: 6,
                fixedValue: 2,
                rolledValue: 3,
                total: 5,
              },
            ],
            targetAC: 16,
          }}
          target={combatant()}
          onCancel={vi.fn()}
          onResolve={onResolve}
        />
      </RollLogProvider>,
    );

    expect(screen.getByText("Calculated miss")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hit" }));
    expect(screen.getByText("Total Damage").parentElement?.textContent).toContain("5");

    fireEvent.click(screen.getByRole("button", { name: "Full" }));
    expect(onResolve).toHaveBeenCalledWith("full", 5);
  });
});

function action(): CreatureAction {
  return {
    actionType: "Melee Attack",
    aoeSize: 0,
    aoeType: "",
    attackModifier: 4,
    createdAt: "",
    creatureId: "goblin",
    description: "",
    hitSpecialEvent: "",
    iconAttribution: "",
    iconKey: "",
    iconSource: "none",
    iconUrl: "",
    id: "scimitar",
    limitedUses: 0,
    limitType: "",
    missEffect: "",
    name: "Scimitar",
    range: 0,
    reach: 5,
    recharge: "",
    rolls: [],
    sortOrder: 0,
    updatedAt: "",
  };
}

function combatant(): EncounterRunCombatant {
  return {
    armorClass: 16,
    armorClassBonus: 0,
    armorClassOverride: 0,
    avatarUrl: "",
    colorLabel: "",
    conditions: [],
    currentHitPoints: 38,
    currentHitPointsOverride: 0,
    damageDealt: 0,
    damageTaken: 0,
    deathSaveFailures: 0,
    deathSaveSuccesses: 0,
    defeated: false,
    displayName: "Mira",
    encounterRunId: "run",
    healingDone: 0,
    healingReceived: 0,
    id: "target",
    initiative: 12,
    initiativeSet: true,
    kills: 0,
    maxHitPoints: 38,
    maxHitPointsModifier: 0,
    maxHitPointsOverride: 0,
    side: "player",
    snapshot: {},
    sourceType: "player",
    stable: false,
    sortOrder: 0,
    temporaryHitPoints: 0,
  };
}
