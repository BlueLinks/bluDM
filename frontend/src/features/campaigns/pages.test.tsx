import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import type { CampaignDetail } from "../../types";
import type { Journey, JourneyCalculation } from "./journeyTypes";
import { CampaignDetailPage } from "./pages";

vi.mock("../../lib/api", () => ({
  api: {
    campaign: vi.fn(),
    campaignJourneys: vi.fn(),
    calculateJourney: vi.fn(),
    createEncounter: vi.fn(),
    createJourney: vi.fn(),
    creatures: vi.fn(),
    deleteEncounter: vi.fn(),
    deleteJourney: vi.fn(),
    deletePlayer: vi.fn(),
    linkCampaignNpc: vi.fn(),
    longRestCampaign: vi.fn(),
    cloneEncounter: vi.fn(),
    standardSources: vi.fn(),
    startEncounter: vi.fn(),
    undoLongRestCampaign: vi.fn(),
    unlinkCampaignNpc: vi.fn(),
    updateCampaign: vi.fn(),
    updateJourney: vi.fn(),
  },
}));

describe("CampaignDetailPage journeys", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.campaign).mockResolvedValue(campaignDetail());
    vi.mocked(api.campaignJourneys).mockResolvedValue({ journeys: [journey()] });
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
    vi.mocked(api.calculateJourney).mockResolvedValue({ calculation: calculation() });
    vi.mocked(api.createJourney).mockResolvedValue({ journey: journey({ id: "journey-2" }) });
    vi.mocked(api.updateJourney).mockResolvedValue({
      journey: journey({ notes: "Updated road notes" }),
    });
    vi.mocked(api.deleteJourney).mockResolvedValue(undefined);
  });

  it("renders journey count and saved journey cards", async () => {
    renderCampaign();

    expect(await screen.findByText("North Road To Ironford")).toBeTruthy();
    expect(screen.getAllByText("Journeys").length).toBeGreaterThan(0);
    expect(screen.getByText("2.6 days")).toBeTruthy();
    expect(screen.getByText("Cool Rain")).toBeTruthy();
    expect(screen.getByText("Waterdeep -> Ironford · 63 miles")).toBeTruthy();
  });

  it("calculates weather and saves a new journey", async () => {
    vi.mocked(api.campaignJourneys)
      .mockResolvedValueOnce({ journeys: [] })
      .mockResolvedValueOnce({ journeys: [journey({ id: "journey-2" })] });
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Add journey" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Journey name"), {
      target: { value: "Mistfen Crossing" },
    });
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "18" } });
    fireEvent.change(within(dialog).getByLabelText("DM notes"), {
      target: { value: "Watch the lower ferry." },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Calculate" }));
    expect(await within(dialog).findByText("Cool Rain")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Editable weather text"), {
      target: { value: "Edited rain for this table." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save journey" }));

    await waitFor(() => expect(api.createJourney).toHaveBeenCalled());
    expect(vi.mocked(api.createJourney).mock.calls[0][1]).toMatchObject({
      name: "Mistfen Crossing",
      distance: "18",
      notes: "Watch the lower ferry.",
      weather: { text: "Edited rain for this table." },
    });
  });

  it("rerolls weather without losing route inputs or notes", async () => {
    renderCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Add journey" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Journey name"), {
      target: { value: "Old Road" },
    });
    fireEvent.change(within(dialog).getByLabelText("Distance"), { target: { value: "12" } });
    fireEvent.change(within(dialog).getByLabelText("DM notes"), {
      target: { value: "Keep this note." },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Reroll weather" }));

    await waitFor(() =>
      expect(api.calculateJourney).toHaveBeenCalledWith("campaign-1", expect.anything(), true),
    );
    expect(vi.mocked(api.calculateJourney).mock.calls[0][1]).toMatchObject({
      name: "Old Road",
      distance: "12",
      notes: "Keep this note.",
    });
  });

  it("edits and deletes saved journeys", async () => {
    vi.mocked(api.campaignJourneys)
      .mockResolvedValueOnce({ journeys: [journey()] })
      .mockResolvedValueOnce({ journeys: [journey({ notes: "Updated road notes" })] })
      .mockResolvedValueOnce({ journeys: [] });
    renderCampaign();

    const card = await screen.findByText("North Road To Ironford");
    const journeyCard = card.closest("article");
    if (!journeyCard) throw new Error("journey card not found");
    fireEvent.click(within(journeyCard).getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("DM notes"), {
      target: { value: "Updated road notes" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save journey" }));

    await waitFor(() =>
      expect(api.updateJourney).toHaveBeenCalledWith("campaign-1", "journey-1", expect.anything()),
    );

    const updatedCard = await screen.findByText("North Road To Ironford");
    const updatedJourneyCard = updatedCard.closest("article");
    if (!updatedJourneyCard) throw new Error("updated journey card not found");
    fireEvent.click(within(updatedJourneyCard).getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete journey" }));

    await waitFor(() => expect(api.deleteJourney).toHaveBeenCalledWith("campaign-1", "journey-1"));
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
    journeyCount: 1,
    npcs: [],
    playerCount: 0,
    players: [],
  };
}

function journey(overrides: Partial<Journey> = {}): Journey {
  return {
    id: "journey-1",
    campaignId: "campaign-1",
    name: "North Road To Ironford",
    origin: "Waterdeep",
    destination: "Ironford",
    distance: 63,
    distanceUnit: "miles",
    terrain: "forest",
    pace: "normal",
    routeCondition: "road-or-trail",
    climate: "temperate",
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
    notes: "Bandit toll bridge near mile 40.",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function calculation(): JourneyCalculation {
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
