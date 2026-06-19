import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../lib/api";
import type { CampaignLocation } from "./travelTypes";
import { CampaignWorldSection } from "./CampaignWorldSection";

vi.mock("../../../lib/api", () => ({
  api: {
    campaignLocationLinks: vi.fn(),
    campaignLocationStock: vi.fn(),
    campaignNpcLocationLinks: vi.fn(),
    createCampaignLocation: vi.fn(),
    createCampaignLocationLink: vi.fn(),
    createCampaignNpcLocationLink: vi.fn(),
    deleteCampaignLocationLink: vi.fn(),
    deleteCampaignLocationStock: vi.fn(),
    deleteCampaignNpcLocationLink: vi.fn(),
    items: vi.fn(),
    upsertCampaignLocationStock: vi.fn(),
    updateCampaignLocation: vi.fn(),
  },
}));

describe("CampaignWorldSection navigation", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.campaignLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.campaignLocationStock).mockResolvedValue({ stock: [] });
    vi.mocked(api.campaignNpcLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.items).mockResolvedValue({ items: [] });
  });

  it("navigates with clickable path segments and clears active filters", async () => {
    renderWorld();

    fireEvent.change(await screen.findByLabelText("Search locations"), {
      target: { value: "Copper" },
    });

    const results = screen.getByLabelText("Location results");
    fireEvent.click(within(results).getByRole("button", { name: /Copper Kettle/i }));

    fireEvent.click(
      within(screen.getByLabelText("Location path")).getByRole("button", { name: "Brindleford" }),
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Brindleford" })).toBeTruthy());
    expect(readInputValue(screen.getByLabelText("Search locations"))).toBe("");
  });

  it("starts create flow from the empty search state with the query prefilled", async () => {
    renderWorld();

    fireEvent.change(await screen.findByLabelText("Search locations"), {
      target: { value: "Moon Market" },
    });

    expect(await screen.findByText(/No locations match "Moon Market"/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create location" }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(readInputValue(within(screen.getByRole("dialog")).getByLabelText("Location name"))).toBe(
      "Moon Market",
    );
  });
});

function readInputValue(element: HTMLElement) {
  if (!(element instanceof HTMLInputElement)) throw new Error("Expected input element");
  return element.value;
}

function renderWorld() {
  render(
    <MemoryRouter>
      <CampaignWorldSection
        campaignId="campaign-1"
        encounters={[]}
        locations={[townLocation(), shopLocation()]}
        npcs={[]}
        onManageNpcs={vi.fn()}
        onChanged={vi.fn().mockResolvedValue(undefined)}
        onGenerateEncounter={vi.fn()}
      />
    </MemoryRouter>,
  );
}

function townLocation(): CampaignLocation {
  return {
    id: "town-1",
    campaignId: "campaign-1",
    name: "Brindleford",
    locationType: "settlement",
    notes: "A busy river town.",
    publicNotes: "A busy river town.",
    dmNotes: "",
    tags: ["market"],
    sortOrder: 0,
    status: "active",
    mapAnchor: {},
    path: [{ id: "town-1", name: "Brindleford", locationType: "settlement" }],
  };
}

function shopLocation(): CampaignLocation {
  return {
    id: "shop-1",
    campaignId: "campaign-1",
    name: "Copper Kettle",
    locationType: "shop",
    parentLocationId: "town-1",
    notes: "Copper pots hang from the rafters.",
    publicNotes: "Copper pots hang from the rafters.",
    dmNotes: "",
    tags: ["rumor hub"],
    sortOrder: 0,
    status: "active",
    mapAnchor: {},
    path: [
      { id: "town-1", name: "Brindleford", locationType: "settlement" },
      { id: "shop-1", name: "Copper Kettle", locationType: "shop" },
    ],
  };
}
