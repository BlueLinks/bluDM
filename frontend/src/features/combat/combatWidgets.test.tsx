import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CreatureAction, EncounterRunCombatant } from "../../types";
import { CombatControls, DeathSaveControls } from "./combatWidgets";

describe("combat widgets", () => {
  it("emits manual HP and action commands from combat controls", () => {
    const onAction = vi.fn();
    const onAmountChange = vi.fn();
    const onDamageTypeChange = vi.fn();
    const onManual = vi.fn();
    const onOpenManualSlots = vi.fn();
    const onOpenSpells = vi.fn();

    render(
      <CombatControls
        actions={[action("Bite")]}
        damageType="fire"
        disabled={false}
        hpAmount="7"
        spells={[{ spellName: "Cure Wounds" } as never]}
        spellSlotsTracked
        onAction={onAction}
        onAmountChange={onAmountChange}
        onDamageTypeChange={onDamageTypeChange}
        onManual={onManual}
        onOpenManualSlots={onOpenManualSlots}
        onOpenSpells={onOpenSpells}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Amount"), { target: { value: "11" } });
    fireEvent.click(screen.getByRole("button", { name: "Damage" }));
    fireEvent.click(screen.getByRole("button", { name: "Heal" }));
    fireEvent.click(screen.getByRole("button", { name: "Spells" }));
    fireEvent.click(screen.getByRole("button", { name: "Slots" }));

    fireEvent.click(screen.getByText("Actions"));
    const biteCard = screen.getByText("Bite").closest(".grid");
    expect(biteCard).toBeTruthy();
    fireEvent.click(within(biteCard as HTMLElement).getByRole("button", { name: "Roll" }), {
      shiftKey: true,
    });

    expect(onAmountChange).toHaveBeenCalledWith("11");
    expect(onManual).toHaveBeenCalledWith("damage");
    expect(onManual).toHaveBeenCalledWith("healing");
    expect(onOpenSpells).toHaveBeenCalled();
    expect(onOpenManualSlots).toHaveBeenCalled();
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Bite" }),
      expect.anything(),
    );
  });

  it("renders death save state and forwards controls", () => {
    const onDeathSave = vi.fn();

    render(
      <DeathSaveControls
        combatant={combatant({ currentHitPoints: 0, deathSaveSuccesses: 2, stable: false })}
        onDeathSave={onDeathSave}
      />,
    );

    expect(screen.getByText("At 0 HP. Track run-only death saves here.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add success" }));
    fireEvent.click(screen.getByRole("button", { name: "Add failure" }));
    fireEvent.click(screen.getByRole("button", { name: "Stabilize" }));

    expect(onDeathSave).toHaveBeenCalledWith("success");
    expect(onDeathSave).toHaveBeenCalledWith("failure");
    expect(onDeathSave).toHaveBeenCalledWith("stabilize");
  });
});

function action(name: string): CreatureAction {
  return {
    actionType: "melee_weapon",
    attackModifier: 4,
    hitSpecialEvent: "none",
    id: "action-1",
    missEffect: "none",
    name,
    rolls: [{ damageType: "piercing", diceCount: 1, dieSize: 6, fixedValue: 2 }],
  } as CreatureAction;
}

function combatant(overrides: Partial<EncounterRunCombatant> = {}): EncounterRunCombatant {
  return {
    armorClass: 12,
    armorClassBonus: 0,
    armorClassOverride: 0,
    avatarUrl: "",
    colorLabel: "",
    conditions: [],
    currentHitPoints: 10,
    currentHitPointsOverride: 0,
    damageDealt: 0,
    damageTaken: 0,
    deathSaveFailures: 0,
    deathSaveSuccesses: 0,
    defeated: false,
    displayName: "Edda",
    encounterRunId: "run",
    healingDone: 0,
    healingReceived: 0,
    id: "combatant-1",
    initiative: 10,
    initiativeSet: true,
    kills: 0,
    maxHitPoints: 20,
    maxHitPointsModifier: 0,
    maxHitPointsOverride: 0,
    side: "player",
    snapshot: {},
    sourceType: "player",
    stable: false,
    sortOrder: 0,
    temporaryHitPoints: 0,
    ...overrides,
  };
}
