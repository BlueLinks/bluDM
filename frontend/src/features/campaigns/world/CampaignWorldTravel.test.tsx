import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "../../../app/shell";
import { api } from "../../../lib/api";
import type { CampaignDetail } from "../../../types";
import { CampaignWorldPage } from "./CampaignWorldPage";
import type { CampaignLocation } from "./travelTypes";

vi.mock("../../../lib/api", () => ({
  api: {
    campaign: vi.fn(),
    campaignJourneys: vi.fn(),
    campaignLocationLinks: vi.fn(),
    campaignLocationStock: vi.fn(),
    campaignLocations: vi.fn(),
    campaignNpcLocationLinks: vi.fn(),
    createEncounter: vi.fn(),
    items: vi.fn(),
  },
}));

describe("CampaignWorldPage travel context", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null), setItem: vi.fn() });
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(api.campaign).mockResolvedValue(campaignDetail());
    vi.mocked(api.campaignJourneys).mockResolvedValue({ journeys: [] });
    vi.mocked(api.campaignLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.campaignLocationStock).mockResolvedValue({ stock: [] });
    vi.mocked(api.campaignLocations).mockResolvedValue({ locations: [location()] });
    vi.mocked(api.campaignNpcLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.items).mockResolvedValue({ items: [] });
  });

  it("opens the travel calculator with the selected location as route origin", async () => {
    renderWorldCampaign();

    fireEvent.click(await screen.findByRole("button", { name: "Plan Travel From Here" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText(/Planning from Waterdeep/i)).toBeTruthy();
    expect(within(dialog).getByText("Waterdeep")).toBeTruthy();
    expect(within(dialog).getByText("No route distance computed")).toBeTruthy();
  });
});

function renderWorldCampaign() {
  render(
    <MemoryRouter initialEntries={["/campaigns/campaign-1/world"]}>
      <WorkspaceShell
        resolvedTheme="light"
        theme="light"
        onLoadAccount={() => Promise.resolve(accountInfo())}
        onLogout={() => Promise.resolve()}
        onSetPassword={() => Promise.resolve(accountInfo())}
        onThemeChange={() => undefined}
      >
        <Routes>
          <Route path="/campaigns/:campaignID/world" element={<CampaignWorldPage />} />
          <Route
            path="/campaigns/:campaignID/world/location/:locationID"
            element={<CampaignWorldPage />}
          />
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

function location(): CampaignLocation {
  return {
    id: "location-1",
    campaignId: "campaign-1",
    name: "Waterdeep",
    locationType: "settlement",
    notes: "Harbor gate and north road marker.",
    publicNotes: "Harbor gate and north road marker.",
    dmNotes: "",
    tags: [],
    sortOrder: 0,
    status: "active",
    mapAnchor: {},
    path: [{ id: "location-1", name: "Waterdeep", locationType: "settlement" }],
  };
}
