import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { EncounterRunCombatant } from "../../types";
import { ManualResolutionDialog } from "./ManualResolutionDialog";

afterEach(cleanup);
beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("ManualResolutionDialog", () => {
  it("previews a mixed manual resolution and applies it only on confirmation", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <ManualResolutionDialog
        actor={combatant("actor", "Fighter")}
        open
        slots={[]}
        targets={[combatant("target", "Ogre", { currentHitPoints: 18, temporaryHitPoints: 3 })]}
        onApply={onApply}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));
    fireEvent.change(screen.getByLabelText("Rolled total"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Healing"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Temporary HP"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Condition or effect"), {
      target: { value: "Prone" },
    });

    expect(screen.getByText("15 HP · 6 temp")).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply resolution" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply.mock.calls[0][0]).toMatchObject({
      actorId: "actor",
      kind: "attack",
      sourceName: "Reported action",
      targets: [
        {
          targetId: "target",
          outcome: "hit",
          healing: 2,
          temporaryHitPoints: 6,
          temporaryHitPointsMode: "max",
          damageComponents: [{ amount: 8, damageType: "untyped" }],
          conditions: [{ name: "Prone" }],
        },
      ],
    });
  });

  it("does not persist a cancelled resolution", () => {
    const onApply = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ManualResolutionDialog
        actor={combatant("actor", "Fighter")}
        open
        slots={[]}
        targets={[combatant("target", "Ogre")]}
        onApply={onApply}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Healing"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("requires confirmation before replacing higher temporary HP", async () => {
    render(
      <ManualResolutionDialog
        actor={combatant("actor", "Fighter")}
        open
        slots={[]}
        targets={[combatant("target", "Ogre", { temporaryHitPoints: 8 })]}
        onApply={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Temporary HP"), { target: { value: "3" } });
    fireEvent.click(screen.getAllByRole("combobox")[3]);
    fireEvent.click(await screen.findByRole("option", { name: "Replace current value" }));

    expect(screen.getByText("This replaces higher temporary HP.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply resolution" }).hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent.click(screen.getByLabelText("Replace higher temporary HP values"));
    expect(screen.getByRole("button", { name: "Apply resolution" }).hasAttribute("disabled")).toBe(
      false,
    );
  });
});

function combatant(
  id: string,
  displayName: string,
  overrides: Partial<EncounterRunCombatant> = {},
): EncounterRunCombatant {
  return {
    id,
    encounterRunId: "run",
    sourceType: "creature",
    side: "enemy",
    displayName,
    colorLabel: "",
    avatarUrl: "",
    armorClass: 12,
    maxHitPoints: 20,
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    maxHitPointsModifier: 0,
    armorClassBonus: 0,
    armorClassOverride: 0,
    maxHitPointsOverride: 0,
    currentHitPointsOverride: 0,
    initiative: 10,
    initiativeSet: true,
    sortOrder: 0,
    defeated: false,
    conditions: [],
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    healingReceived: 0,
    kills: 0,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    stable: false,
    snapshot: {},
    ...overrides,
  };
}
