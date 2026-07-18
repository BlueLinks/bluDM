import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EncounterRunCombatant } from "../../types";
import { SaveResolutionDialog } from "./SaveResolutionDialog";
import type { applyResolutionPayload } from "./resolutionModel";

afterEach(cleanup);

describe("SaveResolutionDialog", () => {
  it("keeps physical, manual, damage, and excluded results local until confirmation", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    const targets = [combatant("one", "Goblin One"), combatant("two", "Goblin Two")];
    render(
      <SaveResolutionDialog
        actor={combatant("actor", "Mage")}
        open
        targets={targets}
        onApply={onApply}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));
    fireEvent.change(screen.getByLabelText("Rolled total"), { target: { value: "12" } });
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Goblin One result method"), {
      target: { value: "physical" },
    });
    fireEvent.change(screen.getByLabelText("First die for Goblin One"), {
      target: { value: "18" },
    });
    fireEvent.change(screen.getByLabelText("Goblin Two result method"), {
      target: { value: "outcome" },
    });
    fireEvent.change(screen.getByLabelText("Goblin Two save outcome"), {
      target: { value: "failure" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Exclude Goblin Two" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply 1 result" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const resolution = onApply.mock.calls[0][0] as ReturnType<typeof applyResolutionPayload>;
    expect(resolution).toMatchObject({
      actorId: "actor",
      kind: "save",
      sourceName: "Manual save",
    });
    expect(resolution.targets).toHaveLength(1);
    expect(resolution.targets[0]).toMatchObject({
      targetId: "one",
      outcome: "success",
      rollSource: "physical",
      damageMultiplier: 0.5,
      damageComponents: [{ amount: 12, damageType: "untyped" }],
    });
  });

  it("supports an external source and cancels without applying", () => {
    const onApply = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <SaveResolutionDialog
        actor={null}
        initialAbility="wis"
        open
        sourceName="External effect"
        targets={[combatant("one", "Hero")]}
        onApply={onApply}
        onOpenChange={onOpenChange}
      />,
    );
    expect(screen.getByLabelText<HTMLInputElement>("Source or action").value).toBe(
      "External effect",
    );
    expect(screen.getByText("External effect")).toBeTruthy();
    expect(screen.getByText("Unspecified source")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("records both reported physical dice for advantage", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <SaveResolutionDialog
        actor={combatant("actor", "Mage")}
        open
        targets={[combatant("one", "Goblin One")]}
        onApply={onApply}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Goblin One roll mode"), {
      target: { value: "advantage" },
    });
    fireEvent.change(screen.getByLabelText("Goblin One result method"), {
      target: { value: "physical" },
    });
    fireEvent.change(screen.getByLabelText("First die for Goblin One"), {
      target: { value: "4" },
    });
    expect(screen.getByRole("button", { name: "Apply 1 result" }).hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent.change(screen.getByLabelText("Second die for Goblin One"), {
      target: { value: "18" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply 1 result" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const resolution = onApply.mock.calls[0][0] as ReturnType<typeof applyResolutionPayload>;
    expect(resolution.targets[0]).toMatchObject({
      rollMode: "advantage",
      rollSource: "physical",
      d20Rolls: [4, 18],
      rollTotal: 18,
      outcome: "success",
    });
  });

  it("does not apply included targets until each save is resolved", () => {
    const onApply = vi.fn();
    render(
      <SaveResolutionDialog
        actor={null}
        open
        targets={[combatant("one", "Goblin One"), combatant("two", "Goblin Two")]}
        onApply={onApply}
        onOpenChange={vi.fn()}
      />,
    );

    const apply = screen.getByRole("button", { name: "Apply 2 results" });
    expect(apply.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByText("2 targets still need results. Roll or enter results before applying."),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Goblin One result method"), {
      target: { value: "outcome" },
    });
    fireEvent.change(screen.getByLabelText("Goblin One save outcome"), {
      target: { value: "success" },
    });
    expect(apply.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Exclude Goblin Two" }));
    expect(screen.getByRole("button", { name: "Apply 1 result" }).hasAttribute("disabled")).toBe(
      false,
    );
  });

  it("keeps a manually marked target pending until an outcome is chosen", () => {
    render(
      <SaveResolutionDialog
        actor={null}
        open
        targets={[combatant("one", "Goblin One")]}
        onApply={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Goblin One result method"), {
      target: { value: "outcome" },
    });

    expect(screen.getByLabelText<HTMLSelectElement>("Goblin One save outcome").value).toBe("");
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply 1 result" }).hasAttribute("disabled")).toBe(
      true,
    );

    fireEvent.change(screen.getByLabelText("Goblin One save outcome"), {
      target: { value: "failure" },
    });
    expect(screen.getByText("Marked · Failure")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply 1 result" }).hasAttribute("disabled")).toBe(
      false,
    );
  });

  it("resolves a physical normal save with one die", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <SaveResolutionDialog
        actor={null}
        open
        targets={[combatant("one", "Goblin One")]}
        onApply={onApply}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Goblin One result method"), {
      target: { value: "physical" },
    });
    fireEvent.change(screen.getByLabelText("First die for Goblin One"), {
      target: { value: "14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply 1 result" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const resolution = onApply.mock.calls[0][0] as ReturnType<typeof applyResolutionPayload>;
    expect(resolution.targets[0]).toMatchObject({
      rollMode: "normal",
      rollSource: "physical",
      d20Rolls: [14],
      outcome: "success",
    });
  });

  it("requires both physical dice for disadvantage and keeps the lower result", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <SaveResolutionDialog
        actor={null}
        open
        targets={[combatant("one", "Goblin One")]}
        onApply={onApply}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Goblin One roll mode"), {
      target: { value: "disadvantage" },
    });
    fireEvent.change(screen.getByLabelText("Goblin One result method"), {
      target: { value: "physical" },
    });
    fireEvent.change(screen.getByLabelText("First die for Goblin One"), {
      target: { value: "18" },
    });
    expect(screen.getByRole("button", { name: "Apply 1 result" }).hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent.change(screen.getByLabelText("Second die for Goblin One"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply 1 result" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const resolution = onApply.mock.calls[0][0] as ReturnType<typeof applyResolutionPayload>;
    expect(resolution.targets[0]).toMatchObject({
      rollMode: "disadvantage",
      d20Rolls: [18, 5],
      rollTotal: 5,
      outcome: "failure",
    });
  });

  it("rolls only unresolved targets with Roll remaining", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <SaveResolutionDialog
        actor={null}
        open
        targets={[combatant("one", "Goblin One"), combatant("two", "Goblin Two")]}
        onApply={onApply}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Goblin One result method"), {
      target: { value: "outcome" },
    });
    fireEvent.change(screen.getByLabelText("Goblin One save outcome"), {
      target: { value: "success" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Roll remaining" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply 2 results" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const resolution = onApply.mock.calls[0][0] as ReturnType<typeof applyResolutionPayload>;
    expect(resolution.targets[0]).toMatchObject({
      targetId: "one",
      rollSource: "outcome",
      outcome: "success",
    });
    expect(resolution.targets[1]).toMatchObject({
      targetId: "two",
      rollSource: "automatic",
    });
  });
});

function combatant(id: string, displayName: string): EncounterRunCombatant {
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
  };
}
