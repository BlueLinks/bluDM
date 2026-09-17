import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import type { Campaign, EncounterRunCombatant, Player } from "../../types";
import { PartyAdjustmentDialog } from "./PartyAdjustmentDialog";

vi.mock("../../lib/api", () => ({
  api: {
    adjustCampaignParty: vi.fn(),
    campaigns: vi.fn(),
    encounterRun: vi.fn(),
    players: vi.fn(),
  },
}));

describe("PartyAdjustmentDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    vi.mocked(api.campaigns).mockResolvedValue({
      campaigns: [campaign("campaign-a", "Campaign A"), campaign("campaign-b", "Campaign B")],
    });
    vi.mocked(api.players).mockResolvedValue({
      players: [
        player({ id: "party-a", campaignId: "campaign-a", characterName: "Aster" }),
        player({ id: "party-b", campaignId: "campaign-b", characterName: "Bram" }),
      ],
    });
    vi.mocked(api.adjustCampaignParty).mockResolvedValue({ players: [] });
  });

  afterEach(cleanup);

  it("only offers the selected campaign party and submits those player IDs", async () => {
    render(
      <MemoryRouter initialEntries={["/campaigns/campaign-a"]}>
        <PartyAdjustmentDialog />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adjust party hit points" }));
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("Aster")).toBeTruthy();
    expect(within(dialog).queryByText("Bram")).toBeNull();
    expect(within(dialog).getByText(/Only player characters in this party/i)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Select party" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply damage" }));

    await waitFor(() =>
      expect(api.adjustCampaignParty).toHaveBeenCalledWith(
        "campaign-a",
        expect.objectContaining({
          amount: 5,
          kind: "damage",
          targetIds: ["party-a"],
        }),
      ),
    );
  });

  it("uses player combatants during initiative setup and excludes creatures", async () => {
    vi.mocked(api.encounterRun).mockResolvedValue({
      run: {
        id: "run-a",
        encounterId: "encounter-a",
        status: "setup",
        isTest: false,
        currentRound: 0,
        currentTurnIndex: 0,
        startedAt: "",
        summary: {},
        spellSlots: [],
        combatants: [
          runCombatant({
            id: "hero",
            playerId: "party-a",
            sourceType: "player",
            side: "player",
            displayName: "Aster",
          }),
          runCombatant({
            id: "goblin",
            sourceType: "creature",
            side: "enemy",
            displayName: "Goblin",
          }),
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={["/encounter-runs/run-a/initiative"]}>
        <PartyAdjustmentDialog />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adjust party hit points" }));
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("Aster")).toBeTruthy();
    expect(within(dialog).queryByText("Goblin")).toBeNull();
    expect(api.encounterRun).toHaveBeenCalledWith("run-a");
    expect(api.campaigns).not.toHaveBeenCalled();
  });

  it("reduces a broad selection to Aid's three-target limit", async () => {
    vi.mocked(api.players).mockResolvedValue({
      players: Array.from({ length: 7 }, (_, index) =>
        player({
          id: `party-${index + 1}`,
          campaignId: "campaign-a",
          characterName: `Hero ${index + 1}`,
        }),
      ),
    });

    render(
      <MemoryRouter initialEntries={["/campaigns/campaign-a"]}>
        <PartyAdjustmentDialog />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adjust party hit points" }));
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("Hero 7")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Select party" }));
    expect(within(dialog).getByText("7 selected")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("tab", { name: /Cast or use feature/i }));

    expect(within(dialog).getByText("3/3 selected")).toBeTruthy();
    expect(within(dialog).getByRole("checkbox", { name: /Hero 1/i })).toHaveProperty(
      "checked",
      true,
    );
    expect(within(dialog).getByRole("checkbox", { name: /Hero 4/i })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("allows choosing an Aid cast level without tracked spell slots", async () => {
    render(
      <MemoryRouter initialEntries={["/campaigns/campaign-a"]}>
        <PartyAdjustmentDialog />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adjust party hit points" }));
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("Aster")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("tab", { name: /Cast or use feature/i }));

    fireEvent.pointerDown(within(dialog).getByRole("combobox", { name: "Used by" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.click(await screen.findByRole("option", { name: /Aster/i }));

    expect(
      within(dialog).getByRole("checkbox", { name: "No spell slot available" }),
    ).toHaveProperty("checked", false);
    expect(
      within(dialog).getByRole("checkbox", { name: "No spell slot available" }),
    ).toHaveProperty("disabled", true);

    fireEvent.pointerDown(within(dialog).getByRole("combobox", { name: "Cast at" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.click(await screen.findByRole("option", { name: "3rd-level · not tracked" }));

    expect(within(dialog).getByRole("combobox", { name: "Cast at" }).textContent).toContain(
      "3rd-level",
    );
  });
});

function campaign(id: string, name: string): Campaign {
  return {
    id,
    name,
    description: "",
    allowedStandardSources: [],
    createdAt: "",
    updatedAt: "",
  };
}

function player(overrides: Partial<Player>): Player {
  return {
    id: "player",
    campaignId: "campaign-a",
    characterName: "Aster",
    playerName: "Blue",
    avatarUrl: "",
    armorClass: 15,
    maxHitPoints: 20,
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    temporaryMaxHitPoints: 0,
    experiencePoints: 0,
    characterSheet: {},
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function runCombatant(overrides: Partial<EncounterRunCombatant>): EncounterRunCombatant {
  return {
    id: "combatant",
    encounterRunId: "run-a",
    sourceType: "creature",
    side: "enemy",
    displayName: "Creature",
    colorLabel: "",
    avatarUrl: "",
    armorClass: 10,
    maxHitPoints: 10,
    currentHitPoints: 10,
    temporaryHitPoints: 0,
    maxHitPointsModifier: 0,
    armorClassBonus: 0,
    armorClassOverride: 0,
    maxHitPointsOverride: 0,
    currentHitPointsOverride: 0,
    initiative: 0,
    initiativeSet: false,
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
