import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "../../app/shell";
import { api } from "../../lib/api";
import type { CampaignDetail } from "../../types";
import { CampaignWorldPage } from "./world/CampaignWorldPage";
import { CampaignDetailPage, CampaignsPage } from "./pages";

vi.mock("../../lib/api", () => ({
  api: {
    campaign: vi.fn(),
    campaignJourneys: vi.fn(),
    campaignLocationLinks: vi.fn(),
    campaignLocationStock: vi.fn(),
    campaignLocations: vi.fn(),
    campaignNpcLocationLinks: vi.fn(),
    campaigns: vi.fn(),
    creatures: vi.fn(),
    items: vi.fn(),
    standardSources: vi.fn(),
  },
}));

describe("Campaign page world navigation", () => {
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
    vi.mocked(api.campaigns).mockResolvedValue({
      campaigns: [
        {
          id: "campaign-1",
          name: "The Verdant March",
          description: "Travel prep campaign.",
          allowedStandardSources: ["srd-2014"],
          createdAt: "",
          updatedAt: "2026-06-18T10:00:00Z",
        },
      ],
    });
    vi.mocked(api.campaign).mockResolvedValue(campaignDetail());
    vi.mocked(api.campaignJourneys).mockResolvedValue({ journeys: [] });
    vi.mocked(api.campaignLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.campaignLocationStock).mockResolvedValue({ stock: [] });
    vi.mocked(api.campaignLocations).mockResolvedValue({ locations: [] });
    vi.mocked(api.campaignNpcLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.items).mockResolvedValue({ items: [] });
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
  });

  it("shows an open world link on the campaigns list", async () => {
    renderWithShell(
      <Routes>
        <Route path="/campaigns" element={<CampaignsPage />} />
      </Routes>,
      "/campaigns",
    );

    const link = await screen.findByRole("link", { name: /Open world/i });
    expect(link.getAttribute("href")).toBe("/campaigns/campaign-1/world");
  });

  it("links to the world workspace from the campaign overview", async () => {
    renderWithShell(
      <Routes>
        <Route path="/campaigns/:campaignID" element={<CampaignDetailPage />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    const links = await screen.findAllByRole("link", { name: "Open world" });
    expect(links.some((link) => link.getAttribute("href") === "/campaigns/campaign-1/world")).toBe(
      true,
    );
  });

  it("renders the dedicated world route", async () => {
    renderWithShell(
      <Routes>
        <Route path="/campaigns/:campaignID/world" element={<CampaignWorldPage />} />
      </Routes>,
      "/campaigns/campaign-1/world",
    );

    expect(await screen.findByRole("heading", { name: "The Verdant March World" })).toBeTruthy();
    expect(screen.getByText("World summary")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Campaign workspace sections" })).toBeTruthy();
  });
});

function renderWithShell(children: ReactNode, initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <WorkspaceShell
        resolvedTheme="light"
        theme="light"
        onLoadAccount={() => Promise.resolve(accountInfo())}
        onLogout={() => Promise.resolve()}
        onSetPassword={() => Promise.resolve(accountInfo())}
        onThemeChange={() => undefined}
      >
        {children}
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
    locationCount: 0,
    npcs: [],
    playerCount: 0,
    players: [],
  };
}
