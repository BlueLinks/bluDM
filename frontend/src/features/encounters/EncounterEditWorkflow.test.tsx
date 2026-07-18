import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateEncounterDifficulty } from "../../lib/domain/combat";
import type { Creature, DraftCombatant, Player } from "../../types";
import { EncounterAddCombatantDialog } from "./EncounterAddCombatantDialog";
import { EncounterDifficultyPanel } from "./EncounterDifficultyPanel";
import {
  EncounterEditNav,
  EncounterRosterSections,
  EncounterSummaryPanel,
} from "./EncounterEditorSections";
import { CombatantList } from "./editorComponents";

describe("Encounter edit workflow polish", () => {
  afterEach(() => cleanup());

  it("presents difficulty as a primary summary with the active threshold", () => {
    const difficulty = calculateEncounterDifficulty([player()], [combatant()]);

    render(<EncounterDifficultyPanel difficulty={difficulty} />);

    expect(screen.getAllByText("Over Deadly").length).toBeGreaterThan(0);
    expect(screen.getByText("Enemy XP")).toBeTruthy();
    expect(screen.getByText("Adjusted XP")).toBeTruthy();
    expect(screen.getByText("Multiplier")).toBeTruthy();
    expect(screen.getByText("Threshold")).toBeTruthy();
    expect(screen.getByText("Crossed")).toBeTruthy();
  });

  it("renders richer combatant rows with portraits, stats, role, and contextual actions", () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    const { container } = render(
      <CombatantList
        combatants={[combatant({ displayName: "Goblin Captain" })]}
        empty="No enemies yet."
        sideTone="enemy"
        onEdit={onEdit}
        onRemove={onRemove}
      />,
    );

    expect(container.querySelector("img")).toBeTruthy();
    expect(screen.getByText("Goblin Captain")).toBeTruthy();
    expect(screen.getByText("AC 15")).toBeTruthy();
    expect(screen.getByText("HP 7/7")).toBeTruthy();
    expect(screen.getByText("CR 1/4")).toBeTruthy();
    expect(screen.getByText("Qty 1")).toBeTruthy();
    expect(screen.getByText("Leader")).toBeTruthy();

    fireEvent.click(container.querySelector("summary") as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Goblin Captain" }));
    expect(onRemove).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "Goblin Captain" }),
    );
  });

  it("shows the edit workflow sections in the same order as the mockup", () => {
    const onAddAllPlayers = vi.fn();
    const onAddAlly = vi.fn();
    const onAddEnemy = vi.fn();

    render(
      <>
        <EncounterEditNav />
        <EncounterSummaryPanel
          createdAt="2026-07-03T10:00:00Z"
          enemyCount={1}
          meta={{
            name: "Ambush at the Ford",
            description: "",
            status: "planned",
            location: "Old Ford",
            locationId: "loc-1",
            roomNumber: "2",
          }}
          partyCount={1}
        />
        <EncounterRosterSections
          availablePlayers={[player()]}
          enemyCombatants={[combatant()]}
          friendlyCombatants={[]}
          playerCombatants={[]}
          onAddAllPlayers={onAddAllPlayers}
          onAddAlly={onAddAlly}
          onAddEnemy={onAddEnemy}
          onAddPlayer={vi.fn()}
          onEdit={vi.fn()}
          onRemove={vi.fn()}
        />
      </>,
    );

    for (const label of ["Overview", "Party", "Allies", "Enemies", "Details", "Notes", "Running"]) {
      expect(screen.getByRole("link", { name: new RegExp(label, "i") })).toBeTruthy();
    }
    expect(screen.getByText("Encounter summary")).toBeTruthy();
    expect(screen.getByText("Old Ford")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add all players" }));
    fireEvent.click(screen.getByRole("button", { name: "Add ally" }));
    fireEvent.click(screen.getByRole("button", { name: "Add enemy" }));
    expect(onAddAllPlayers).toHaveBeenCalled();
    expect(onAddAlly).toHaveBeenCalled();
    expect(onAddEnemy).toHaveBeenCalled();
  });

  it("supports searchable add enemy flow with preview and quantity stepper", () => {
    const onAddCreature = vi.fn();
    render(
      <EncounterAddCombatantDialog
        campaignCreatureIds={new Set()}
        creatures={[creature(), creature({ id: "wolf", name: "Wolf", creatureType: "beast" })]}
        mode="enemy"
        npcs={[]}
        open
        onAddCreature={onAddCreature}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Add enemy" })).toBeTruthy();
    expect(screen.getByLabelText("Search monsters")).toBeTruthy();
    expect(screen.getAllByText("Goblin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AC 15").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HP 7").length).toBeGreaterThan(0);

    const quantityField = screen.getByDisplayValue<HTMLInputElement>("1");
    fireEvent.change(quantityField, { target: { value: "2" } });
    expect(quantityField.value).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: "Add enemy" }));

    expect(onAddCreature).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Goblin" }),
      "enemy",
      2,
      false,
    );
  });

  it("supports add ally tabs for NPCs, creatures, summons, and custom allies", () => {
    const onAddCreature = vi.fn();
    render(
      <EncounterAddCombatantDialog
        campaignCreatureIds={new Set(["npc-1"])}
        creatures={[creature({ id: "wolf", name: "Wolf", creatureType: "beast" })]}
        mode="ally"
        npcs={[creature({ id: "npc-1", name: "Kara Ironshield", librarySource: "user" })]}
        open
        onAddCreature={onAddCreature}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "NPCs" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Creatures" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Summons" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Custom" })).toBeTruthy();
    expect(screen.getAllByText("Kara Ironshield").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Campaign NPC").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Creatures" }));
    expect(screen.getAllByText("Wolf").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Summons" }));
    expect(screen.getByRole("heading", { name: "Summons" })).toBeTruthy();
    expect(screen.getByText(/backend support/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(screen.getByText("Custom allies")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Creatures" }));
    fireEvent.click(screen.getByRole("button", { name: "Add ally" }));
    expect(onAddCreature).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Wolf" }),
      "friendly",
      1,
      false,
    );
  });
});

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-1",
    campaignId: "campaign-1",
    characterName: "Borin Ashmantle",
    playerName: "Alex",
    avatarUrl: "",
    armorClass: 16,
    maxHitPoints: 24,
    currentHitPoints: 24,
    temporaryHitPoints: 0,
    temporaryMaxHitPoints: 0,
    experiencePoints: 0,
    characterSheet: { className: "Cleric", level: 1 },
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function creature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: "goblin",
    name: "Goblin",
    description: "A small monster.",
    size: "Small",
    creatureType: "goblinoid",
    alignment: "neutral evil",
    armorClass: 15,
    hitPoints: 7,
    hitDice: "2d6",
    challengeRating: "1/4",
    xp: 200,
    avatarUrl: "/goblin.png",
    librarySource: "standard",
    readOnly: true,
    sourceKey: "srd-2014",
    sourceLabel: "SRD 2014",
    statBlock: {},
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function combatant(overrides: Partial<DraftCombatant> = {}): DraftCombatant {
  const source = creature();
  return {
    id: "combatant-1",
    encounterId: "encounter-1",
    sourceType: "creature",
    playerId: "",
    creatureId: source.id,
    side: "enemy",
    displayName: source.name,
    colorLabel: "",
    avatarUrl: source.avatarUrl,
    armorClass: source.armorClass,
    maxHitPoints: source.hitPoints,
    currentHitPoints: source.hitPoints,
    rolledHp: false,
    sortOrder: 0,
    snapshot: { creature: source },
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}
