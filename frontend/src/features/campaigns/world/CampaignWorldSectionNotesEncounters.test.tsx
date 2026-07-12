import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../lib/api";
import { CampaignWorldSection } from "./CampaignWorldSection";
import { item, location } from "./CampaignWorldSectionTestFixtures";
import type { CampaignLocation } from "./travelTypes";

vi.mock("../../../lib/api", () => ({
  api: {
    campaignLocationLinks: vi.fn(),
    campaignLocationStock: vi.fn(),
    campaignNpcLocationLinks: vi.fn(),
    createCampaignLocation: vi.fn(),
    createCampaignLocationLink: vi.fn(),
    createCampaignNpcLocationLink: vi.fn(),
    deleteCampaignLocation: vi.fn(),
    deleteCampaignLocationLink: vi.fn(),
    deleteCampaignLocationStock: vi.fn(),
    deleteCampaignNpcLocationLink: vi.fn(),
    items: vi.fn(),
    updateCampaignLocation: vi.fn(),
    upsertCampaignLocationStock: vi.fn(),
  },
}));

describe("CampaignWorldSection notes and encounter actions", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.campaignLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.campaignLocationStock).mockResolvedValue({ stock: [] });
    vi.mocked(api.campaignNpcLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.items).mockResolvedValue({ items: [item()] });
  });

  it("opens top-level location creation from a labelled workspace action", async () => {
    renderWorld({ locations: [town()] });

    fireEvent.click(await screen.findByRole("button", { name: "New location" }));

    expect(await screen.findByRole("dialog", { name: "Add World Location" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create location" })).toBeTruthy();
  });

  it("offers encounter creation inside a town encounters tab", async () => {
    const onGenerateEncounter = vi.fn();
    renderWorld({
      onGenerateEncounter,
      locations: [town()],
    });

    expect((await screen.findAllByText("Brindleford")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Encounters" }));
    fireEvent.click(screen.getByRole("button", { name: "Add encounter" }));

    expect(onGenerateEncounter).toHaveBeenCalledWith(
      expect.objectContaining({ id: "town-1", name: "Brindleford" }),
    );
  });

  it("keeps shop inventory and encounter prep in their contextual tabs", async () => {
    const onGenerateEncounter = vi.fn();
    renderWorld({
      onGenerateEncounter,
      locations: [
        location({
          id: "shop-1",
          name: "Copper Kettle",
          locationType: "shop",
          path: [{ id: "shop-1", name: "Copper Kettle", locationType: "shop" }],
        }),
      ],
    });

    expect((await screen.findAllByText("Copper Kettle")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Shop stock" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Inventory" }));
    expect(screen.getByRole("heading", { name: "Shop stock" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Encounters" }));
    fireEvent.click(screen.getByRole("button", { name: "Add encounter" }));
    expect(onGenerateEncounter).toHaveBeenCalledWith(
      expect.objectContaining({ id: "shop-1", name: "Copper Kettle" }),
    );
  });

  it("exposes note edit and delete controls from the notes tab", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    vi.mocked(api.updateCampaignLocation).mockResolvedValue({
      location: location({ id: "town-1", name: "Brindleford" }),
    });
    renderWorld({
      onChanged,
      locations: [
        town({
          publicNotes: "Markets fill the bridge at noon.",
          dmNotes: "The reeve is hiding a ledger.",
        }),
      ],
    });

    expect((await screen.findAllByText("Brindleford")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Notes" }));
    expect(screen.getByRole("button", { name: "Edit notes" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete notes" }));

    await waitFor(() =>
      expect(api.updateCampaignLocation).toHaveBeenCalledWith(
        "campaign-1",
        "town-1",
        expect.objectContaining({ dmNotes: "", notes: "", publicNotes: "" }),
      ),
    );
    expect(onChanged).toHaveBeenCalled();
  });
});

function renderWorld({
  locations,
  onChanged = vi.fn().mockResolvedValue(undefined),
  onGenerateEncounter = vi.fn(),
}: {
  locations: CampaignLocation[];
  onChanged?: () => Promise<void>;
  onGenerateEncounter?: (location: CampaignLocation) => void;
}) {
  render(
    <MemoryRouter>
      <CampaignWorldSection
        campaignId="campaign-1"
        encounters={[]}
        locations={locations}
        npcs={[]}
        onChanged={onChanged}
        onCloneEncounter={vi.fn()}
        onGenerateEncounter={onGenerateEncounter}
        onManageNpcs={vi.fn()}
        onStartEncounter={vi.fn()}
      />
    </MemoryRouter>,
  );
}

function town(overrides: Partial<CampaignLocation> = {}) {
  return location({
    id: "town-1",
    name: "Brindleford",
    locationType: "settlement",
    path: [{ id: "town-1", name: "Brindleford", locationType: "settlement" }],
    ...overrides,
  });
}
