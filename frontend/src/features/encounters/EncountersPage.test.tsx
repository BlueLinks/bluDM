import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import type { CampaignDetail } from "../../types";
import { EncountersPage } from "./EncountersPage";

vi.mock("../../lib/api", () => ({
  api: {
    campaign: vi.fn(),
    campaignJourneys: vi.fn(),
    campaignLocations: vi.fn(),
    campaigns: vi.fn(),
  },
}));

describe("EncountersPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.campaigns).mockResolvedValue({ campaigns: [detail().campaign] });
    vi.mocked(api.campaign).mockResolvedValue(detail());
    vi.mocked(api.campaignJourneys).mockResolvedValue({ journeys: [] });
    vi.mocked(api.campaignLocations).mockResolvedValue({ locations: [] });
  });

  it("renders the campaign-scoped full encounter workspace", async () => {
    render(
      <MemoryRouter initialEntries={["/campaigns/campaign-1/encounters"]}>
        <Routes>
          <Route path="/campaigns/:campaignID/encounters" element={<EncountersPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "The Verdant March" })).toBeTruthy();
    expect(screen.getByText("Bridge Ambush")).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search encounters" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Filter by difficulty" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Encounters" }).getAttribute("href")).toBe(
      "/campaigns/campaign-1/encounters",
    );
  });
});

function detail(): CampaignDetail {
  return {
    campaign: {
      id: "campaign-1",
      name: "The Verdant March",
      description: "Campaign encounters.",
      allowedStandardSources: ["srd-2014"],
      createdAt: "",
      updatedAt: "",
    },
    encounters: [
      {
        id: "encounter-1",
        campaignId: "campaign-1",
        name: "Bridge Ambush",
        description: "Bandits wait beyond the bridge.",
        status: "planned",
        location: "Old Road",
        roomNumber: "",
        lootNotes: "",
        difficulty: "Hard",
        combatantCount: 5,
        enemyCount: 4,
        createdAt: "",
        updatedAt: "",
      },
    ],
    encounterCount: 1,
    locationCount: 0,
    npcs: [],
    playerCount: 0,
    players: [],
  };
}
