import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Creature, Player } from "../../types";
import { PartyAlliesStep } from "./CampaignEncounterBuilderSteps";
import { CustomEncounterSetup } from "./CampaignEncounterRandomSetup";
import type { EncounterBuilderCreatureDraft } from "./encounterBuilderGenerator";

afterEach(() => cleanup());

describe("encounter builder selection controls", () => {
  it("searches available allies and offers a clear action for the included roster", () => {
    const onClearIncluded = vi.fn();
    render(
      <PartyAlliesStep
        allies={[]}
        availableAllies={[creature()]}
        availablePlayers={[]}
        players={[player()]}
        onAddAllPlayers={vi.fn()}
        onAddAlly={vi.fn()}
        onAddAvailableAlly={vi.fn()}
        onAddPlayer={vi.fn()}
        onClearIncluded={onClearIncluded}
        onRemoveAlly={vi.fn()}
        onRemovePlayer={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add Kara Ironshield as ally" }).textContent,
    ).toContain("CR 1/4");
    fireEvent.change(screen.getByLabelText("Search available allies"), {
      target: { value: "missing" },
    });
    expect(screen.queryByRole("button", { name: "Add Kara Ironshield as ally" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Search available allies"), {
      target: { value: "Kara" },
    });
    expect(screen.getByRole("button", { name: "Add Kara Ironshield as ally" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove all" }));
    expect(onClearIncluded).toHaveBeenCalledOnce();
  });

  it("offers a clear action for custom enemies", () => {
    const onClearEnemies = vi.fn();
    const draft: EncounterBuilderCreatureDraft = {
      id: "enemy-1",
      creature: creature(),
      quantity: 1,
      rolledHp: false,
      side: "enemy",
    };
    render(
      <CustomEncounterSetup
        enemies={[draft]}
        onAddEnemy={vi.fn()}
        onClearEnemies={onClearEnemies}
        onRemoveEnemy={vi.fn()}
        onUpdateEnemy={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove all enemies" }));
    expect(onClearEnemies).toHaveBeenCalledOnce();
  });
});

function player(): Player {
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
    characterSheet: { className: "Cleric", level: 4 },
    createdAt: "",
    updatedAt: "",
  };
}

function creature(): Creature {
  return {
    id: "npc-1",
    name: "Kara Ironshield",
    description: "A campaign ally.",
    size: "Medium",
    creatureType: "humanoid",
    alignment: "neutral good",
    armorClass: 15,
    hitPoints: 7,
    hitDice: "2d6",
    challengeRating: "1/4",
    xp: 50,
    avatarUrl: "",
    librarySource: "user",
    readOnly: false,
    sourceKey: "",
    sourceLabel: "",
    statBlock: {},
    createdAt: "",
    updatedAt: "",
  };
}
