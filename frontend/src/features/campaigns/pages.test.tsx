import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  });

  beforeEach(() => {
    vi.clearAllMocks();
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

    fireEvent.click(await screen.findByRole("button", { name: "Calculator" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Origin"), { target: { value: "Waterdeep" } });
    fireEvent.change(within(dialog).getByLabelText("Destination"), {
      target: { value: "Ironford" },
    });
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "63" } });

    expect(await within(dialog).findByText("2.6 days")).toBeTruthy();
    await waitFor(() =>
      expect(api.calculateTravel).toHaveBeenCalledWith("campaign-1", expect.anything(), false),
    );
    expect(vi.mocked(api.calculateTravel).mock.calls[0][1]).toMatchObject({
      origin: "Waterdeep",
      destination: "Ironford",
      distance: "63",
    });
  });

  it("randomizes weather without losing selected route inputs", async () => {
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Calculator" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Origin"), { target: { value: "Waterdeep" } });
    fireEvent.change(within(dialog).getByLabelText("Destination"), {
      target: { value: "Ironford" },
    });
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "12" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Random weather" }));

    await waitFor(() =>
      expect(api.calculateTravel).toHaveBeenCalledWith("campaign-1", expect.anything(), true),
    );
    expect(vi.mocked(api.calculateTravel).mock.calls.at(-1)?.[1]).toMatchObject({
      origin: "Waterdeep",
      destination: "Ironford",
      distance: "12",
    });
  });
});

function renderCampaign() {
  render(
    <MemoryRouter initialEntries={["/campaigns/campaign-1"]}>
      <Routes>
        <Route path="/campaigns/:campaignID" element={<CampaignDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
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
    weather: {
      severity: "notable",
      title: "Cool Rain",
      text: "A steady rain follows the road.",
      prompt: "Offer advantage to tracking checks.",
    },
    assumptions: ["63 miles converted to 63 miles."],
  };
}
