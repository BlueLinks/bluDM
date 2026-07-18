import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CreatureAction, CreatureSpell } from "../../types";
import { CombatActionPicker } from "./CombatActionPicker";

afterEach(() => {
  cleanup();
});

describe("CombatActionPicker", () => {
  it("shows only populated categories, searches, and opens a selected spell", () => {
    const onSpell = vi.fn();
    render(
      <CombatActionPicker
        actions={[action("bite", "Bite", "Melee Attack"), action("parry", "Parry", "Reaction")]}
        spells={[spell("fireball", "Fireball")]}
        onAction={vi.fn()}
        onSpell={onSpell}
      />,
    );
    fireEvent.click(screen.getByText("Choose attack or spell"));
    expect(screen.getByRole("heading", { name: "Attacks" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Reactions" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Spells" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Features" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Search actions and spells"), {
      target: { value: "fire" },
    });
    expect(screen.queryByRole("button", { name: /^Bite/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Fireball/ }));
    expect(onSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "fireball" }));
  });

  it("explains unavailable actions and supports arrow-key navigation", () => {
    render(
      <CombatActionPicker
        actions={[action("bite", "Bite", "Melee Attack"), action("claw", "Claw", "Melee Attack")]}
        actionDisabledReason="Choose exactly one target."
        spells={[]}
        onAction={vi.fn()}
        onSpell={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Choose attack or spell"));
    fireEvent.click(screen.getByLabelText("Show unavailable actions"));
    const bite = screen.getByRole("button", { name: /^Bite/ });
    expect(bite.getAttribute("title")).toBe("Choose exactly one target.");
    expect(bite.hasAttribute("disabled")).toBe(true);
  });

  it("moves through usable choices with the arrow keys", () => {
    render(
      <CombatActionPicker
        actions={[action("bite", "Bite", "Melee Attack"), action("claw", "Claw", "Melee Attack")]}
        spells={[]}
        onAction={vi.fn()}
        onSpell={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Choose attack or spell"));
    const bite = screen.getByRole("button", { name: /^Bite/ });
    const claw = screen.getByRole("button", { name: /^Claw/ });
    bite.focus();
    fireEvent.keyDown(bite, { key: "ArrowDown" });
    expect(document.activeElement).toBe(claw);
  });
});

function action(id: string, name: string, actionType: string) {
  return {
    id,
    name,
    actionType,
    attackModifier: 5,
    description: "",
    rolls: [
      { rollKind: "damage", damageType: "piercing", diceCount: 1, dieSize: 6, fixedValue: 3 },
    ],
  } as CreatureAction;
}

function spell(id: string, spellName: string) {
  return {
    id,
    spellId: id,
    spellName,
    spellLevel: 3,
    librarySource: "user",
    prepared: true,
    innate: false,
  } as CreatureSpell;
}
