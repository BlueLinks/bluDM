import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateEncounterDifficulty } from "../../lib/domain/combat";
import { encounterRuleset2024 } from "../../lib/domain/encounterRulesets";
import type { Creature, DraftCombatant, Player } from "../../types";
import { EncounterAddCombatantDialog } from "./EncounterAddCombatantDialog";
import { EncounterDifficultyPanel } from "./EncounterDifficultyPanel";
import {
  EncounterDetailsSection,
  EncounterNotesSection,
  EncounterRosterSections,
  EncounterRunningSection,
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

  it("presents 2024 difficulty as XP budget and spend", () => {
    const difficulty = calculateEncounterDifficulty(
      Array.from({ length: 5 }, () => player()),
      [combatant()],
      encounterRuleset2024,
    );

    render(<EncounterDifficultyPanel difficulty={difficulty} />);

    expect(screen.getAllByText("Low").length).toBeGreaterThan(0);
    expect(screen.getAllByText("XP Budget").length).toBeGreaterThan(0);
    expect(screen.getByText("XP Spent")).toBeTruthy();
    expect(screen.queryByText("Adjusted XP")).toBeNull();
    expect(screen.queryByText("Multiplier")).toBeNull();
  });

  it("renders compact combatant rows with identity, stats, and contextual actions", () => {
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
    expect(screen.getByText("HP 7 / 7")).toBeTruthy();
    expect(screen.getByText(/Small.*goblinoid.*CR 1\/4/)).toBeTruthy();

    fireEvent.click(container.querySelector("summary") as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Goblin Captain" }));
    expect(onRemove).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "Goblin Captain" }),
    );
  });

  it("keeps the roster in one workspace and run actions in one review location", () => {
    const onAddAllPlayers = vi.fn();
    const onAddAlly = vi.fn();
    const onAddEnemy = vi.fn();
    const onSaveAndRun = vi.fn();
    const onSaveAndTest = vi.fn();
    const meta = {
      name: "Ambush at the Ford",
      description: "Bandits wait below the bridge.",
      status: "planned",
      location: "Old Ford",
      locationId: "loc-1",
      roomNumber: "2",
    };

    render(
      <>
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
        <aside aria-label="Encounter review">
          <EncounterDetailsSection meta={meta} onChange={vi.fn()} />
          <EncounterNotesSection meta={meta} onChange={vi.fn()} />
          <EncounterRunningSection
            allyCount={0}
            enemyCount={1}
            partyCount={1}
            saving={false}
            onSaveAndRun={onSaveAndRun}
            onSaveAndTest={onSaveAndTest}
          />
        </aside>
      </>,
    );

    expect(screen.queryByRole("navigation", { name: "Encounter sections" })).toBeNull();
    expect(screen.getByText("Party (0)")).toBeTruthy();
    expect(screen.getByText("Allies (0)")).toBeTruthy();
    expect(screen.getByText("Enemies (1)")).toBeTruthy();
    expect(screen.getByDisplayValue("Old Ford")).toBeTruthy();
    expect(screen.getByText("Ready to run")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Run encounter/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Test run" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Add player" }));
    fireEvent.click(screen.getByRole("button", { name: "Add ally" }));
    fireEvent.click(screen.getByRole("button", { name: "Add enemy" }));
    fireEvent.click(screen.getByRole("button", { name: /^Run encounter/ }));
    fireEvent.click(screen.getByRole("button", { name: "Test run" }));
    expect(onAddAllPlayers).toHaveBeenCalled();
    expect(onAddAlly).toHaveBeenCalled();
    expect(onAddEnemy).toHaveBeenCalled();
    expect(onSaveAndRun).toHaveBeenCalled();
    expect(onSaveAndTest).toHaveBeenCalled();
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
