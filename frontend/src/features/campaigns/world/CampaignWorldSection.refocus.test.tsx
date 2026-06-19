import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../lib/api";
import type { Creature, Encounter, Item } from "../../../types";
import { CampaignWorldSection } from "./CampaignWorldSection";
import type { CampaignLocation } from "./travelTypes";

vi.mock("../../../lib/api", () => ({
  api: {
    deleteCampaignLocation: vi.fn(),
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

describe("CampaignWorldSection refocus", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.campaignLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.campaignLocationStock).mockResolvedValue({ stock: [] });
    vi.mocked(api.campaignNpcLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.items).mockResolvedValue({ items: [item()] });
    vi.mocked(api.deleteCampaignLocation).mockResolvedValue(undefined);
  });

  it("deletes a world location from the detail panel", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    renderWorld({ onChanged });

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Delete location",
      }),
    );

    await waitFor(() =>
      expect(api.deleteCampaignLocation).toHaveBeenCalledWith("campaign-1", "shop-1"),
    );
    expect(onChanged).toHaveBeenCalled();
  });

  it("only shows shop stock for shop locations", async () => {
    renderWorld({
      locations: [
        location({
          id: "house-1",
          name: "Mara's Loft",
          locationType: "house",
          path: [{ id: "house-1", name: "Mara's Loft", locationType: "house" }],
        }),
      ],
    });

    expect(await screen.findByRole("heading", { name: "Mara's Loft" })).toBeTruthy();
    expect(screen.queryByText("Shop stock")).toBeNull();
  });

  it("offers NPC management help when no campaign NPCs are available", async () => {
    renderWorld({ npcs: [] });

    expect(await screen.findByText(/No unlinked campaign NPCs are available/i)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Manage NPCs" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Create NPC" })).toBeTruthy();
  });
});

function renderWorld({
  encounters = [],
  npcs = [],
  onChanged = vi.fn().mockResolvedValue(undefined),
  onGenerateEncounter = vi.fn(),
  onManageNpcs = vi.fn(),
  locations = [location()],
}: {
  encounters?: Encounter[];
  npcs?: Creature[];
  onChanged?: () => Promise<void>;
  onGenerateEncounter?: (location: CampaignLocation) => void;
  onManageNpcs?: () => void;
  locations?: CampaignLocation[];
} = {}) {
  render(
    <MemoryRouter>
      <CampaignWorldSection
        campaignId="campaign-1"
        encounters={encounters}
        locations={locations}
        npcs={npcs}
        onManageNpcs={onManageNpcs}
        onChanged={onChanged}
        onGenerateEncounter={onGenerateEncounter}
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
    ...overrides,
  };
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    name: "Healing Draught",
    category: "Potion",
    itemType: "Consumable",
    rarity: "common",
    attunement: false,
    valueAmount: 50,
    valueUnit: "gp",
    weight: 0,
    description: "A bitter red tonic.",
    properties: [],
    damage: {},
    armorClass: {},
    data: {},
    librarySource: "user",
    readOnly: false,
    sourceKey: "",
    sourceLabel: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}
