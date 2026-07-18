import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CombatLogEvent, EncounterRunCombatant } from "../../types";
import { CombatLog } from "./CombatLog";

afterEach(cleanup);

describe("CombatLog", () => {
  it("filters persisted history without flattening resolution details", () => {
    render(
      <CombatLog
        combatants={[combatant("actor", "Mage"), combatant("target", "Ogre")]}
        startedAt="2026-07-13T10:00:00Z"
        events={[resolutionEvent(), noteEvent()]}
      />,
    );
    expect(screen.getByText("Mage resolved Burning Hands for Ogre")).toBeTruthy();
    fireEvent.click(screen.getByText("Mage resolved Burning Hands for Ogre"));
    expect(screen.getByText("8 raw · 4 applied")).toBeTruthy();
    expect(screen.getByText("dice 5 · modifier +3")).toBeTruthy();
    expect(screen.getByText("Level 1 slot · 2 → 1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Damage" }));
    expect(screen.queryByText("Manual note")).toBeNull();
    expect(screen.getByText("Mage resolved Burning Hands for Ogre")).toBeTruthy();
  });
});

function resolutionEvent(): CombatLogEvent {
  return {
    id: "resolution",
    encounterRunId: "run",
    sequence: 2,
    eventType: "resolution_applied",
    actorId: "actor",
    createdAt: "2026-07-13T10:00:04Z",
    payload: {
      sourceName: "Burning Hands",
      results: [
        {
          targetId: "target",
          targetName: "Ogre",
          outcome: "success",
          rawDamage: 8,
          finalDamage: 4,
          damageComponents: [
            {
              id: "fire",
              formula: "3d6",
              amount: 8,
              rolledValue: 5,
              modifier: 3,
              finalAmount: 4,
              damageType: "fire",
              defense: "resistant",
            },
          ],
        },
      ],
      resource: { kind: "spell_slot", spellLevel: 1, before: 2, after: 1 },
    },
  };
}

function noteEvent(): CombatLogEvent {
  return {
    id: "note",
    encounterRunId: "run",
    sequence: 1,
    eventType: "manual_note",
    createdAt: "2026-07-13T10:00:02Z",
    payload: { notes: "Manual note" },
  };
}

function combatant(id: string, displayName: string) {
  return { id, displayName } as EncounterRunCombatant;
}
