import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EncounterRunCombatant } from "../../types";
import { RequestSaveDialog } from "./RequestSaveDialog";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("RequestSaveDialog", () => {
  it("rolls and records immediately, reusing ability and DC for the turn across targets and remounts", async () => {
    window.localStorage.setItem(
      "bludm-save-request:run:actor",
      JSON.stringify({ ability: "con", dc: 14 }),
    );
    const props = dialogProps();
    const { unmount } = render(<RequestSaveDialog {...props} />);
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(screen.getByRole("combobox", { name: "Save ability" }).textContent).toContain("CON");
    expect(screen.getByLabelText<HTMLInputElement>("DC").value).toBe("14");
    expect(screen.queryByLabelText("Source or action")).toBeNull();
    expect(screen.queryByLabelText("Target result method")).toBeNull();
    fireEvent.change(screen.getByLabelText("DC"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    await screen.findByRole("button", { name: "Reroll" });
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status", { name: "Saving throw results" }).textContent).toContain(
      "Target: 20 · Success",
    );
    expect(screen.getByRole("status", { name: "Saving throw results" }).textContent).toContain(
      "CON save vs DC 15 · d20 20 + 0",
    );
    expect(props.onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "actor",
        kind: "save",
        targets: [
          expect.objectContaining({
            targetId: "target",
            saveAbility: "con",
            dc: 15,
            rollSource: "automatic",
            d20Rolls: [expect.any(Number)],
          }),
        ],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(props.onApply).toHaveBeenCalledTimes(1);
    unmount();
    render(<RequestSaveDialog {...props} targets={[combatant("other-target")]} />);
    expect(screen.getByLabelText<HTMLInputElement>("DC").value).toBe("15");
    expect(screen.getByRole("combobox", { name: "Save ability" }).textContent).toContain("CON");
  });

  it("keeps the recorded result visible while changing settings and replaces it after a reroll", async () => {
    const props = dialogProps();
    props.targets[0].snapshot = { creature: { statBlock: { abilities: { dex: 14 } } } };
    render(<RequestSaveDialog {...props} />);
    vi.spyOn(Math, "random").mockReturnValueOnce(0.99).mockReturnValueOnce(0);
    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    await screen.findByText("Target: 22 · Success");
    fireEvent.change(screen.getByLabelText("DC"), { target: { value: "18" } });
    expect(screen.getByRole("status", { name: "Saving throw results" }).textContent).toContain(
      "DEX save vs DC 13 · d20 20 + 2",
    );
    fireEvent.click(screen.getByRole("button", { name: "Reroll" }));
    await screen.findByText("Target: 3 · Failure");
    expect(screen.queryByText("Target: 22 · Success")).toBeNull();
    expect(screen.getByRole("status", { name: "Saving throw results" }).textContent).toContain(
      "DEX save vs DC 18 · d20 1 + 2",
    );
    expect(props.onApply).toHaveBeenCalledTimes(2);
    expect(props.onOpenChange).not.toHaveBeenCalled();
  });

  it("keeps different turns and runs independent, even with the same target and acting character", () => {
    window.localStorage.setItem(
      "bludm-save-request:run:actor",
      JSON.stringify({ ability: "con", dc: 14 }),
    );
    const props = dialogProps();
    const { unmount } = render(<RequestSaveDialog {...props} currentTurnID="other-actor" />);
    expect(screen.getByLabelText<HTMLInputElement>("DC").value).toBe("13");
    unmount();
    render(<RequestSaveDialog {...props} runID="other-run" />);
    expect(screen.getByLabelText<HTMLInputElement>("DC").value).toBe("13");
  });

  it("retains the request and reports failures without saving failed defaults", async () => {
    const props = dialogProps();
    props.onApply.mockRejectedValue(new Error("Connection lost"));
    render(<RequestSaveDialog {...props} />);
    fireEvent.change(screen.getByLabelText("DC"), { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    await screen.findByText("Connection lost");
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("bludm-save-request:run:actor")).toBeNull();
  });

  it("opens physical dice and effects only on request, and cancellation leaves defaults intact", () => {
    const props = dialogProps();
    render(<RequestSaveDialog {...props} />);
    fireEvent.change(screen.getByLabelText("DC"), { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    expect(screen.getByRole("heading", { name: "Resolve saving throws" })).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>("Shared DC").value).toBe("14");
    expect(screen.getByLabelText("Target result method")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onApply).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("bludm-save-request:run:actor")).toBeNull();
  });
});

function dialogProps() {
  return {
    actor: combatant("actor"),
    currentTurnID: "actor",
    runID: "run",
    targets: [combatant("target")],
    onApply: vi.fn().mockResolvedValue(undefined),
    onOpenChange: vi.fn(),
  };
}

function combatant(id: string): EncounterRunCombatant {
  return {
    id,
    encounterRunId: "run",
    sourceType: "creature",
    side: "enemy",
    displayName: "Target",
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
  };
}
