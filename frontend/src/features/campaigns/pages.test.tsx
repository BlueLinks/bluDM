import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "../../app/shell";
import { api } from "../../lib/api";
import type { CampaignDetail } from "../../types";
import type { CampaignLocation, TravelCalculation } from "./travelTypes";
import { CampaignDetailPage } from "./pages";

vi.mock("../../lib/api", () => ({
  api: {
    campaign: vi.fn(),
    campaignLocations: vi.fn(),
    calculateTravel: vi.fn(),
    createCampaignLocation: vi.fn(),
    createEncounter: vi.fn(),
    creatures: vi.fn(),
    deleteCampaignLocation: vi.fn(),
    deleteEncounter: vi.fn(),
    deletePlayer: vi.fn(),
    linkCampaignNpc: vi.fn(),
    longRestCampaign: vi.fn(),
    cloneEncounter: vi.fn(),
    standardSources: vi.fn(),
    startEncounter: vi.fn(),
    undoLongRestCampaign: vi.fn(),
    unlinkCampaignNpc: vi.fn(),
    updateCampaign: vi.fn(),
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
  });

  it("renders travel count and saved campaign locations", async () => {
    renderCampaign();

    expect(await screen.findByText("Waterdeep")).toBeTruthy();
    expect(screen.getAllByText("Travel").length).toBeGreaterThan(0);
    expect(screen.getByText("Harbor gate and north road marker.")).toBeTruthy();
  });

  it("creates and edits campaign locations", async () => {
    vi.mocked(api.campaignLocations)
      .mockResolvedValueOnce({ locations: [location()] })
      .mockResolvedValueOnce({
        locations: [location(), location({ id: "location-2", name: "Ironford" })],
      })
      .mockResolvedValueOnce({ locations: [location({ notes: "Updated road notes" })] });
    renderCampaign();

    fireEvent.change(await screen.findByLabelText("New location"), {
      target: { value: "Ironford" },
    });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Bridge town." } });
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));

    await waitFor(() =>
      expect(api.createCampaignLocation).toHaveBeenCalledWith("campaign-1", {
        name: "Ironford",
        notes: "Bridge town.",
      }),
    );

    const waterdeep = await screen.findByText("Waterdeep");
    const card = waterdeep.closest("article");
    if (!card) throw new Error("location card not found");
    fireEvent.click(within(card).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Edit location"), { target: { value: "Waterdeep" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Updated road notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Save location" }));

    await waitFor(() =>
      expect(api.updateCampaignLocation).toHaveBeenCalledWith("campaign-1", "location-1", {
        name: "Waterdeep",
        notes: "Updated road notes",
      }),
    );
  });

  it("opens the calculator and recalculates when travel inputs change", async () => {
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Travel" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("Climate / season")).toBeNull();
    expect(within(dialog).queryByText("Route condition")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Random weather" })).toBeNull();
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
    expect(within(dialog).queryByRole("tab")).toBeNull();
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
        resolvedTheme="light"
        theme="light"
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
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
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
