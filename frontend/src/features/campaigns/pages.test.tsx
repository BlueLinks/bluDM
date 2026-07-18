import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "../../app/shell";
import { api } from "../../lib/api";
import type { CampaignDetail } from "../../types";
import type { CampaignJourney, CampaignLocation, TravelCalculation } from "./world/travelTypes";
import { CampaignDetailPage } from "./pages";

vi.mock("../../lib/api", () => ({
  api: {
    campaign: vi.fn(),
    campaignJourneys: vi.fn(),
    campaignLocationLinks: vi.fn(),
    campaignLocationStock: vi.fn(),
    campaignLocations: vi.fn(),
    campaignNpcLocationLinks: vi.fn(),
    calculateTravel: vi.fn(),
    cloneCampaignJourney: vi.fn(),
    createCampaignLocation: vi.fn(),
    createCampaignJourney: vi.fn(),
    createEncounter: vi.fn(),
    creatures: vi.fn(),
    deleteCampaignJourney: vi.fn(),
    deleteCampaignLocation: vi.fn(),
    deleteEncounter: vi.fn(),
    items: vi.fn(),
    linkCampaignNpc: vi.fn(),
    longRestCampaign: vi.fn(),
    standardSources: vi.fn(),
    startEncounter: vi.fn(),
    undoLongRestCampaign: vi.fn(),
    unlinkCampaignNpc: vi.fn(),
    updateCampaign: vi.fn(),
    updateCampaignJourney: vi.fn(),
    updateCampaignLocation: vi.fn(),
  },
}));

describe("CampaignDetailPage travel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(api.campaign).mockResolvedValue(campaignDetail());
    vi.mocked(api.campaignJourneys).mockResolvedValue({ journeys: [journey()] });
    vi.mocked(api.campaignLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.campaignLocationStock).mockResolvedValue({ stock: [] });
    vi.mocked(api.campaignNpcLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.items).mockResolvedValue({ items: [] });
    vi.mocked(api.campaignLocations).mockResolvedValue({ locations: [location()] });
    vi.mocked(api.standardSources).mockResolvedValue({
      sources: [
        {
          attribution: "",
          createdAt: "",
          key: "srd-2014",
          label: "SRD 2014",
          licenseName: "CC",
          ruleset: "2014",
          sourceUrl: "",
          updatedAt: "",
        },
      ],
    });
    vi.mocked(api.calculateTravel).mockResolvedValue({ calculation: calculation() });
    vi.mocked(api.createCampaignLocation).mockResolvedValue({
      location: location({ id: "location-2", name: "Ironford" }),
    });
    vi.mocked(api.updateCampaignLocation).mockResolvedValue({
      location: location({ notes: "Updated road notes" }),
    });
    vi.mocked(api.deleteCampaignLocation).mockResolvedValue(undefined);
    vi.mocked(api.createCampaignJourney).mockResolvedValue({
      journey: journey({ id: "journey-2" }),
    });
    vi.mocked(api.updateCampaignJourney).mockResolvedValue({ journey: journey() });
    vi.mocked(api.cloneCampaignJourney).mockResolvedValue({
      journey: journey({ id: "journey-2", name: "Copy of Waterdeep to Ironford" }),
    });
    vi.mocked(api.deleteCampaignJourney).mockResolvedValue(undefined);
  });

  it("renders the campaign hub, travel guidance, and journey log", async () => {
    renderCampaign();

    expect(await screen.findByText("World workspace")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Open world" }).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Use saved journeys for routes the party may travel again/i),
    ).toBeTruthy();
    expect(screen.getByText("Waterdeep to Ironford · 63 Miles")).toBeTruthy();
    expect(screen.getByText("Use world places")).toBeTruthy();
    expect(screen.getByText("Origin: Waterdeep")).toBeTruthy();
    expect(screen.getAllByText(/^Saved /).length).toBeGreaterThan(0);
  });

  it("shows workspace shortcuts for world, encounters, party, and npcs", async () => {
    renderCampaign();

    expect((await screen.findAllByRole("link", { name: "Open world" })).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Jump to encounters" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Jump to party" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Jump to NPCs" })).toBeTruthy();
  });

  it("opens the calculator and recalculates when travel inputs change", async () => {
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Travel" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Route" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Direct distance" }));
    expect(within(dialog).queryByText("Origin")).toBeNull();
    expect(within(dialog).queryByText("Destination")).toBeNull();
    expect(within(dialog).getByLabelText("Distance")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "63" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Route" }));
    expect(within(dialog).getByText("Computed distance")).toBeTruthy();
    expect(within(dialog).queryByLabelText("Distance")).toBeNull();
    const customButtons = within(dialog).getAllByRole("button", { name: "Custom" });
    fireEvent.click(customButtons[0]);
    fireEvent.click(customButtons[1]);
    fireEvent.change(within(dialog).getByLabelText("Origin"), { target: { value: "Waterdeep" } });
    fireEvent.change(within(dialog).getByLabelText("Destination"), {
      target: { value: "Ironford" },
    });

    expect(await within(dialog).findByText("2.6 days")).toBeTruthy();
    expect(within(dialog).getAllByText("Encounter distance").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Weather")).toBeTruthy();
    await waitFor(() =>
      expect(api.calculateTravel).toHaveBeenCalledWith(
        "campaign-1",
        expect.anything(),
        {
          temperature: false,
          wind: false,
          precipitation: false,
        },
        true,
      ),
    );
    expect(vi.mocked(api.calculateTravel).mock.calls[0][1]).toMatchObject({
      origin: "Waterdeep",
      destination: "Ironford",
      distance: "63",
      goodRoads: false,
    });
  });

  it("saves a journey from calculator inputs", async () => {
    vi.mocked(api.campaignJourneys)
      .mockResolvedValueOnce({ journeys: [] })
      .mockResolvedValueOnce({ journeys: [journey({ id: "journey-2", name: "63 Miles" })] });
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Travel" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Direct distance" }));
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "63" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: "Save journey" }));

    await waitFor(() =>
      expect(api.createCampaignJourney).toHaveBeenCalledWith(
        "campaign-1",
        expect.objectContaining({
          distance: "63",
          routeInputMode: "distance",
        }),
        "",
      ),
    );
    await waitFor(() => expect(api.campaignJourneys).toHaveBeenCalledTimes(2));
  });

  it("edits, duplicates, and deletes saved journeys", async () => {
    renderCampaign();

    const journeyCard = (await screen.findByText("Waterdeep to Ironford")).closest("article");
    if (!journeyCard) throw new Error("journey card not found");
    fireEvent.click(within(journeyCard).getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByDisplayValue("Waterdeep to Ironford")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Journey name"), {
      target: { value: "Road session prep" },
    });
    fireEvent.click(await within(dialog).findByRole("button", { name: "Update journey" }));

    await waitFor(() =>
      expect(api.updateCampaignJourney).toHaveBeenCalledWith(
        "campaign-1",
        "journey-1",
        expect.objectContaining({ origin: "Waterdeep", destination: "Ironford" }),
        "Road session prep",
      ),
    );

    const refreshedCard = (await screen.findByText("Waterdeep to Ironford")).closest("article");
    if (!refreshedCard) throw new Error("journey card not found after edit");
    fireEvent.click(within(refreshedCard).getByRole("button", { name: "Duplicate" }));
    await waitFor(() =>
      expect(api.cloneCampaignJourney).toHaveBeenCalledWith("campaign-1", "journey-1"),
    );

    fireEvent.click(within(refreshedCard).getByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete journey" }));
    await waitFor(() =>
      expect(api.deleteCampaignJourney).toHaveBeenCalledWith("campaign-1", "journey-1"),
    );
  });

  it("recalculates when good roads changes effective pace", async () => {
    vi.mocked(api.calculateTravel).mockResolvedValue({
      calculation: { ...calculation(), durationLabel: "2 days", effectivePace: "fast" },
    });
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Travel" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Direct distance" }));
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "60" } });
    expect(await within(dialog).findByText("210 ft")).toBeTruthy();
    fireEvent.click(within(dialog).getByLabelText("Good roads"));

    expect(await within(dialog).findByText("2 days")).toBeTruthy();
    await waitFor(() =>
      expect(vi.mocked(api.calculateTravel).mock.calls.at(-1)?.[1]).toMatchObject({
        distance: "60",
        goodRoads: true,
        encounterDistanceFeet: 210,
      }),
    );
  });

  it("preserves encounter distance for distance edits and rerolls after terrain changes", async () => {
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Travel" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Direct distance" }));
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "12" } });
    await waitFor(() =>
      expect(api.calculateTravel).toHaveBeenCalledWith(
        "campaign-1",
        expect.anything(),
        expect.anything(),
        true,
      ),
    );
    expect(await within(dialog).findByText("210 ft")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "24" } });
    await waitFor(() =>
      expect(vi.mocked(api.calculateTravel).mock.calls.at(-1)?.[1]).toMatchObject({
        distance: "24",
        encounterDistanceFeet: 210,
      }),
    );
    expect(vi.mocked(api.calculateTravel).mock.calls.at(-1)?.[3]).toBe(false);

    const terrainButton = within(dialog).getByRole("combobox", { name: "Terrain" });
    fireEvent.click(terrainButton);
    fireEvent.click(await screen.findByRole("option", { name: "Forest" }));

    await waitFor(() => expect(vi.mocked(api.calculateTravel).mock.calls.at(-1)?.[3]).toBe(true));
  });

  it("renders encounters when manual encounter rolls have no roll detail", async () => {
    vi.mocked(api.calculateTravel).mockResolvedValue({
      calculation: {
        ...calculation(),
        encounterDistance: { ...calculation().encounterDistance, rolls: [] },
      },
    });
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Travel" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Direct distance" }));
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "12" } });

    expect(await within(dialog).findByText("Awareness distance: 210 ft")).toBeTruthy();
    expect(
      within(dialog).getByText(
        "Use this as the starting distance when the party and other creatures become aware of each other.",
      ),
    ).toBeTruthy();
    expect(within(dialog).queryByText(/possible encounters/i)).toBeNull();
    expect(within(dialog).queryByText("Rolls:")).toBeNull();
  });

  it("rolls one weather component without losing selected route inputs", async () => {
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Travel" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Direct distance" }));
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "12" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Route" }));
    const customButtons = within(dialog).getAllByRole("button", { name: "Custom" });
    fireEvent.click(customButtons[0]);
    fireEvent.click(customButtons[1]);
    fireEvent.change(within(dialog).getByLabelText("Origin"), { target: { value: "Waterdeep" } });
    fireEvent.change(within(dialog).getByLabelText("Destination"), {
      target: { value: "Ironford" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Roll wind" }));

    await waitFor(() =>
      expect(api.calculateTravel).toHaveBeenCalledWith(
        "campaign-1",
        expect.anything(),
        {
          temperature: false,
          wind: true,
          precipitation: false,
        },
        false,
      ),
    );
    expect(vi.mocked(api.calculateTravel).mock.calls.at(-1)?.[1]).toMatchObject({
      origin: "Waterdeep",
      destination: "Ironford",
      distance: "12",
    });
  });

  it("rolls all weather components", async () => {
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Travel" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Direct distance" }));
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "12" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Roll all weather" }));

    await waitFor(() =>
      expect(api.calculateTravel).toHaveBeenCalledWith(
        "campaign-1",
        expect.anything(),
        {
          temperature: true,
          wind: true,
          precipitation: true,
        },
        false,
      ),
    );
  });
});

function renderCampaign() {
  render(
    <MemoryRouter initialEntries={["/campaigns/campaign-1"]}>
      <WorkspaceShell
        accent="green"
        resolvedTheme="light"
        theme="light"
        onAccentChange={() => undefined}
        onLoadAccount={() => Promise.resolve(accountInfo())}
        onLogout={() => Promise.resolve()}
        onSetPassword={() => Promise.resolve(accountInfo())}
        onThemeChange={() => undefined}
      >
        <Routes>
          <Route path="/campaigns/:campaignID" element={<CampaignDetailPage />} />
        </Routes>
      </WorkspaceShell>
    </MemoryRouter>,
  );
}

function accountInfo() {
  return {
    avatarUrl: "",
    email: "dm@example.test",
    hasPassword: true,
    identities: [],
    stats: {
      actionTemplates: 0,
      campaigns: 0,
      creatures: 0,
      encounters: 0,
      playerCharacters: 0,
      spells: 0,
    },
  };
}

function campaignDetail(): CampaignDetail {
  return {
    campaign: {
      id: "campaign-1",
      name: "The Verdant March",
      description: "Travel prep campaign.",
      allowedStandardSources: ["srd-2014"],
      createdAt: "",
      updatedAt: "",
    },
    encounters: [],
    encounterCount: 0,
    locationCount: 1,
    npcs: [],
    playerCount: 0,
    players: [],
  };
}

function location(overrides: Partial<CampaignLocation> = {}): CampaignLocation {
  return {
    id: "location-1",
    campaignId: "campaign-1",
    name: "Waterdeep",
    notes: "Harbor gate and north road marker.",
    ...overrides,
  };
}

function journey(overrides: Partial<CampaignJourney> = {}): CampaignJourney {
  return {
    id: "journey-1",
    campaignId: "campaign-1",
    name: "Waterdeep to Ironford",
    origin: "Waterdeep",
    destination: "Ironford",
    distance: 63,
    distanceUnit: "miles",
    terrain: "grassland",
    pace: "normal",
    goodRoads: false,
    encounterDistanceFeet: 210,
    weather: {
      temperature: "normal",
      temperatureDeltaF: null,
      wind: "light",
      precipitation: "none",
    },
    routeInputMode: "route",
    createdAt: "2026-06-02T10:30:00Z",
    updatedAt: "2026-06-02T10:30:00Z",
    ...overrides,
  };
}

function calculation(): TravelCalculation {
  return {
    durationHours: 62.4,
    durationDays: 2.6,
    durationLabel: "2.6 days",
    effectivePace: "normal",
    terrainMaximumPace: "fast",
    goodRoadsMaximumPace: "fast",
    encounterDistance: {
      diceExpression: "6d6 x 10 feet",
      averageFeet: 210,
      rolledFeet: 210,
      rolls: [3, 4, 5, 2, 4, 3],
    },
    weather: {
      temperature: "normal",
      temperatureDeltaF: null,
      wind: "light",
      precipitation: "none",
    },
    assumptions: ["63 miles converted to 63 miles."],
  };
}
