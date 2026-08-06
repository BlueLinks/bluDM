import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Creature, Encounter, Player } from "../../types";
import { api } from "../../lib/api";
import { encounterRuleset2024, type EncounterRuleset } from "../../lib/domain/encounterRulesets";
import { CampaignEncounterCreateDialog } from "./CampaignEncounterCreateDialog";
import { CampaignEncountersSection } from "./CampaignEncountersSection";
import { encounterArchetypeIcons } from "./encounterArchetypeIcons";
import type { CampaignLocation } from "./world/travelTypes";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("../../lib/api", () => ({
  api: {
    addEncounterCombatants: vi.fn().mockResolvedValue({ combatants: [] }),
    createEncounter: vi.fn(),
    creatures: vi.fn(),
    previewGeneratedEncounter: vi.fn(),
  },
}));

describe("CampaignEncounterCreateDialog", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.creatures).mockResolvedValue({
      creatures: [
        creature(),
        creature({
          id: "bandit",
          name: "Bandit",
          armorClass: 12,
          hitPoints: 11,
          challengeRating: "1/8",
          creatureType: "humanoid",
          xp: 25,
        }),
        creature({
          id: "guard",
          name: "Guard",
          armorClass: 16,
          hitPoints: 11,
          challengeRating: "1/8",
          creatureType: "humanoid",
          xp: 25,
        }),
      ],
    });
    vi.mocked(api.createEncounter).mockResolvedValue({ encounter: encounter() });
    vi.mocked(api.previewGeneratedEncounter).mockResolvedValue({
      previewFingerprint: "accepted-preview-fingerprint",
      preview: {
        title: "Monsters at Copper Kettle",
        difficulty: "Medium",
        estimatedXp: 100,
        targetNotice: "",
        summary: "Monsters tuned as medium difficulty.",
        enemies: [
          {
            id: "generated-goblin-1-0",
            creature: creature(),
            quantity: 2,
            rolledHp: false,
            side: "enemy",
          },
        ],
      },
    });
  });

  it("renders only the revised three step headings", () => {
    renderBuilder({ initialLocationId: "shop-1" });

    const progress = within(screen.getByRole("navigation", { name: "Encounter builder progress" }));
    expect(progress.getByRole("button", { name: /Party & Allies/i })).toBeTruthy();
    expect(progress.getByRole("button", { name: /Encounter Setup/i })).toBeTruthy();
    expect(progress.getByRole("button", { name: /Review & Create/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Details/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Custom encounter/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Random encounter/i })).toBeNull();
  });

  it("starts on Party & Allies and preserves participant data between clickable steps", async () => {
    renderBuilder({ initialLocationId: "shop-1" });

    expect(
      screen.getByRole("button", { name: /Party & Allies/i }).getAttribute("aria-current"),
    ).toBe("step");
    expect(screen.getByText("Borin Ashmantle")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove Borin Ashmantle" }));
    expect(screen.queryByRole("button", { name: "Remove Borin Ashmantle" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next: Encounter Setup" }));
    expect(await screen.findByText("Encounter preview")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Party & Allies/i }));
    expect(screen.queryByRole("button", { name: "Remove Borin Ashmantle" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Borin Ashmantle" }));
    expect(screen.getByRole("button", { name: "Remove Borin Ashmantle" })).toBeTruthy();
  });

  it("renders difficulty cards, enemy count controls, and generated enemy stats", async () => {
    renderBuilder({ initialLocationId: "shop-1" });

    fireEvent.click(screen.getByRole("button", { name: "Next: Encounter Setup" }));
    expect(await screen.findByText("Encounter preview")).toBeTruthy();
    expect(screen.getByTestId("archetype-icon-monsters")).toBeTruthy();
    expect(screen.getByTestId("archetype-icon-humanoids")).toBeTruthy();
    expect(screen.getByTestId("archetype-icon-custom-mix")).toBeTruthy();
    expect(screen.getByText("Goblins, kobolds, orcs, gnolls, bugbears").className).toContain(
      "text-primary-foreground",
    );
    for (const label of ["Easy", "Medium", "Hard", "Deadly"]) {
      expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeTruthy();
    }

    const enemyCount = screen.getByLabelText<HTMLInputElement>("Enemy count");
    expect(enemyCount.value).toBe("3");
    fireEvent.click(screen.getByRole("button", { name: "Increase enemy count" }));
    expect(enemyCount.value).toBe("4");
    fireEvent.click(screen.getByRole("button", { name: "Decrease enemy count" }));
    expect(enemyCount.value).toBe("3");

    fireEvent.click(screen.getByRole("button", { name: /Humanoids/i }));
    fireEvent.click(screen.getByRole("button", { name: /Hard/i }));
    fireEvent.click(screen.getByLabelText<HTMLInputElement>("Include hazards"));
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));

    expect(screen.getByText("Enemy XP")).toBeTruthy();
    expect(screen.getByText("Adjusted XP")).toBeTruthy();
    expect(screen.getByText("Multiplier")).toBeTruthy();
    expect(screen.getByText("Threshold")).toBeTruthy();
    expect(screen.getAllByText(/AC \d+/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HP \d+/).length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain("CR");
    expect(document.body.textContent).toContain("Qty");
    expect(screen.getAllByLabelText("Roll HP at start").length).toBeGreaterThan(0);
  });

  it("uses 2024 difficulty names and budget evidence in previews", async () => {
    renderBuilder({ difficultyRuleset: encounterRuleset2024 });

    fireEvent.click(screen.getByRole("button", { name: "Next: Encounter Setup" }));
    await screen.findByText("Encounter preview");

    expect(screen.getByRole("button", { name: /Low/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Moderate/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /High/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Deadly/ })).toBeNull();
    expect(screen.getAllByText("XP Budget").length).toBeGreaterThan(0);
    expect(screen.getByText("XP Spent")).toBeTruthy();
    await waitFor(() => expect(api.previewGeneratedEncounter).toHaveBeenCalled());
    const request = vi.mocked(api.previewGeneratedEncounter).mock.calls.at(-1)?.[1];
    expect(request?.options.challenge).toBe("moderate");
  });

  it("opens aligned Add Ally and Add Enemy menus in the three-step flow", async () => {
    renderBuilder({ initialLocationId: "shop-1" });

    fireEvent.click(screen.getByRole("button", { name: "Add ally" }));
    expect(await screen.findByRole("heading", { name: "Add ally" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "NPCs" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Creatures" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Summons" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Custom" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add ally" }));
    expect(await screen.findByText("Kara Ironshield")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next: Encounter Setup" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add enemy" }));
    expect(await screen.findByRole("heading", { name: "Add enemy" })).toBeTruthy();
    expect(screen.getByLabelText("Search monsters")).toBeTruthy();
  });

  it("review includes naming, difficulty summary, combatant cards, and saves", async () => {
    const onCreated = vi.fn();
    renderBuilder({ initialLocationId: "shop-1", onCreated });

    fireEvent.click(screen.getByRole("button", { name: "Next: Encounter Setup" }));
    await screen.findByText("Encounter preview");
    fireEvent.click(screen.getByRole("button", { name: "Next: Review & Create" }));

    const nameField = await screen.findByLabelText<HTMLInputElement>("Encounter name");
    expect(nameField.value).toBe("Encounter at Copper Kettle");
    expect(screen.getByLabelText<HTMLSelectElement>("World location").value).toBe("shop-1");
    expect(screen.getByText("Enemy XP")).toBeTruthy();
    expect(screen.getByText("Adjusted XP")).toBeTruthy();
    expect(screen.getByText("Review Participants")).toBeTruthy();
    expect(screen.getAllByText("Borin Ashmantle").length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain("Qty");
    expect(document.body.textContent).toContain("Description");
    expect(document.body.textContent).toContain("DM notes");

    const cards = document.querySelectorAll(".combatant-row");
    expect(cards.length).toBeGreaterThan(2);
    expect(document.body.textContent).not.toMatch(/Goblin x\d/);

    fireEvent.click(screen.getByRole("button", { name: "Create encounter" }));
    await waitFor(() => expect(api.createEncounter).toHaveBeenCalled());
    const submitted = vi.mocked(api.createEncounter).mock.calls[0]?.[1];
    expect(submitted).toMatchObject({
      location: "Brindleford / Copper Kettle",
      locationId: "shop-1",
      name: "Encounter at Copper Kettle",
      previewFingerprint: "accepted-preview-fingerprint",
    });
    expect(submitted?.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: "player-1", side: "ally" }),
        expect.objectContaining({ side: "enemy" }),
      ]),
    );
    expect(typeof submitted?.idempotencyKey).toBe("string");
    expect(api.addEncounterCombatants).not.toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/campaigns/campaign-1/encounters/encounter-1/edit");
  });

  it("keeps Campaign Encounters entry on the same builder", () => {
    render(
      <MemoryRouter>
        <CampaignEncountersSection
          campaignID="campaign-1"
          encounterOpen
          encounters={[]}
          locations={[location()]}
          npcs={[]}
          players={[player()]}
          onClone={vi.fn()}
          onCreated={vi.fn()}
          onOpenChange={vi.fn()}
          onRemove={vi.fn()}
          onStart={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Create encounter" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Party & Allies/i })).toBeTruthy();
  });

  it("documents archetype icon licensing and keeps setup UI on theme tokens", async () => {
    expect(Object.values(encounterArchetypeIcons)).toHaveLength(10);
    for (const icon of Object.values(encounterArchetypeIcons)) {
      expect(icon.license).toBe("CC BY 3.0");
      expect(icon.path).toMatch(/^\/game-icons\/encounter-archetypes\/.+\.svg$/);
      expect(icon.sourceUrl).toContain("https://game-icons.net/");
    }

    renderBuilder({ initialLocationId: "shop-1" });
    fireEvent.click(screen.getByRole("button", { name: "Next: Encounter Setup" }));
    await screen.findByText("Encounter preview");
    expect(document.body.innerHTML).not.toMatch(/(?:bg|text|border)-\[#/);
    expect(document.body.innerHTML).toContain("bg-card");
  });
});

function renderBuilder({
  difficultyRuleset,
  initialLocationId = "",
  onCreated = vi.fn(),
}: {
  difficultyRuleset?: EncounterRuleset;
  initialLocationId?: string;
  onCreated?: () => void;
} = {}) {
  render(
    <MemoryRouter>
      <CampaignEncounterCreateDialog
        campaignId="campaign-1"
        difficultyRuleset={difficultyRuleset}
        initialLocationId={initialLocationId}
        locations={[location()]}
        npcs={[creature({ id: "veteran", name: "Kara Ironshield", librarySource: "user" })]}
        open
        players={[
          player({ id: "player-1", characterName: "Borin Ashmantle" }),
          player({ id: "player-2", characterName: "Mira Thornvale" }),
        ]}
        onCreated={onCreated}
        onOpenChange={vi.fn()}
      />
    </MemoryRouter>,
  );
}

function location(overrides: Partial<CampaignLocation> = {}): CampaignLocation {
  return {
    id: "shop-1",
    campaignId: "campaign-1",
    name: "Copper Kettle",
    locationType: "shop",
    notes: "A cramped shop with an old cellar.",
    path: [
      { id: "town-1", name: "Brindleford", locationType: "settlement" },
      { id: "shop-1", name: "Copper Kettle", locationType: "shop" },
    ],
    ...overrides,
  };
}

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
    characterSheet: { className: "Cleric", level: 4 },
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
    xp: 50,
    avatarUrl: "",
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

function encounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: "encounter-1",
    campaignId: "campaign-1",
    name: "Encounter at Copper Kettle",
    description: "",
    status: "planned",
    location: "Brindleford / Copper Kettle",
    locationId: "shop-1",
    roomNumber: "",
    lootNotes: "",
    combatantCount: 0,
    enemyCount: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}
