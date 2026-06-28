import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../lib/api";
import type { Creature, Encounter } from "../../../types";
import { CampaignWorldSection } from "./CampaignWorldSection";
import { creature, item, location } from "./CampaignWorldSectionTestFixtures";
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

describe("CampaignWorldSection", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.campaignLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.campaignLocationStock).mockResolvedValue({ stock: [] });
    vi.mocked(api.campaignNpcLocationLinks).mockResolvedValue({ links: [] });
    vi.mocked(api.items).mockResolvedValue({ items: [item()] });
    vi.mocked(api.createCampaignLocation).mockResolvedValue({
      location: location({ id: "room-1", name: "Cellar" }),
    });
    vi.mocked(api.createCampaignLocationLink).mockResolvedValue({
      link: {
        id: "link-1",
        campaignId: "campaign-1",
        sourceLocationId: "shop-1",
        targetLocationId: "dungeon-1",
        linkType: "secret",
        label: "Trapdoor",
        direction: "bidirectional",
        visibility: "dm",
        notes: "Hidden below the rug.",
        createdAt: "",
        updatedAt: "",
      },
    });
    vi.mocked(api.deleteCampaignLocationLink).mockResolvedValue(undefined);
    vi.mocked(api.deleteCampaignLocation).mockResolvedValue(undefined);
    vi.mocked(api.upsertCampaignLocationStock).mockResolvedValue({
      stock: {
        id: "stock-1",
        campaignId: "campaign-1",
        locationId: "shop-1",
        itemId: "item-1",
        librarySource: "user",
        quantity: 4,
        priceAmount: 75,
        priceUnit: "sp",
        availability: "limited",
        notes: "Behind the counter.",
        sortOrder: 0,
        createdAt: "",
        updatedAt: "",
      },
    });
    vi.mocked(api.deleteCampaignLocationStock).mockResolvedValue(undefined);
    vi.mocked(api.createCampaignNpcLocationLink).mockResolvedValue({
      link: {
        id: "npc-location-link-1",
        campaignId: "campaign-1",
        creatureId: "npc-1",
        locationId: "shop-1",
        linkType: "works-here",
        visibility: "dm",
        notes: "Keeps a ledger of strange customers.",
        createdAt: "",
        updatedAt: "",
      },
    });
    vi.mocked(api.deleteCampaignNpcLocationLink).mockResolvedValue(undefined);
  });

  it("creates a nested child location with worldbuilding fields", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    renderWorld({
      onChanged,
      locations: [
        location({
          id: "town-1",
          name: "Brindleford",
          locationType: "settlement",
          path: [{ id: "town-1", name: "Brindleford", locationType: "settlement" }],
        }),
      ],
    });

    fireEvent.click(await screen.findByRole("button", { name: "Add Building" }));
    fireEvent.change(screen.getByLabelText("Location name"), { target: { value: "Cellar" } });
    fireEvent.change(screen.getByLabelText("Summary"), {
      target: { value: "Crates and a locked trapdoor." },
    });
    fireEvent.change(screen.getByLabelText("Public notes"), {
      target: { value: "Smells like flour and copper." },
    });
    fireEvent.change(screen.getByLabelText("DM-only notes"), {
      target: { value: "Secret shrine passage below." },
    });
    fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "hidden, cellar" } });
    fireEvent.change(screen.getByLabelText("Map marker"), { target: { value: "cellar-room" } });
    fireEvent.click(screen.getByRole("button", { name: "Create location" }));

    await waitFor(() =>
      expect(api.createCampaignLocation).toHaveBeenCalledWith("campaign-1", {
        parentLocationId: "town-1",
        name: "Cellar",
        locationType: "building",
        summary: "Crates and a locked trapdoor.",
        notes: "Smells like flour and copper.",
        publicNotes: "Smells like flour and copper.",
        dmNotes: "Secret shrine passage below.",
        tags: ["hidden", "cellar"],
        mapAnchor: { marker: "cellar-room" },
      }),
    );
    expect(onChanged).toHaveBeenCalled();
  });

  it("passes the selected location to encounter generation", async () => {
    const onGenerateEncounter = vi.fn();
    renderWorld({
      onGenerateEncounter,
      locations: [
        location({
          id: "room-1",
          name: "Copper Kettle Cellar",
          locationType: "room",
          path: [
            { id: "shop-1", name: "Copper Kettle", locationType: "shop" },
            { id: "room-1", name: "Copper Kettle Cellar", locationType: "room" },
          ],
        }),
      ],
    });

    expect((await screen.findAllByText("Copper Kettle Cellar")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Add an encounter" }));

    expect(onGenerateEncounter).toHaveBeenCalledWith(
      expect.objectContaining({ id: "room-1", name: "Copper Kettle Cellar" }),
    );
  });

  it("creates and removes linked locations from the detail panel", async () => {
    vi.mocked(api.createCampaignLocationLink).mockResolvedValue({
      link: {
        id: "link-1",
        campaignId: "campaign-1",
        sourceLocationId: "room-1",
        targetLocationId: "dungeon-1",
        linkType: "secret",
        label: "Trapdoor",
        direction: "bidirectional",
        visibility: "dm",
        notes: "Hidden below the rug.",
        createdAt: "",
        updatedAt: "",
      },
    });
    renderWorld({
      locations: [
        location({
          id: "room-1",
          name: "Copper Kettle Cellar",
          locationType: "room",
          path: [
            { id: "shop-1", name: "Copper Kettle", locationType: "shop" },
            { id: "room-1", name: "Copper Kettle Cellar", locationType: "room" },
          ],
        }),
        location({
          id: "dungeon-1",
          name: "Old Well",
          locationType: "dungeon",
          path: [{ id: "dungeon-1", name: "Old Well", locationType: "dungeon" }],
        }),
      ],
    });

    fireEvent.click(await screen.findByRole("button", { name: "Link exit" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Connect to"), {
      target: { value: "dungeon-1" },
    });
    fireEvent.change(within(dialog).getByLabelText("Link type"), { target: { value: "secret" } });
    fireEvent.change(within(dialog).getByLabelText("Label"), { target: { value: "Trapdoor" } });
    fireEvent.change(within(dialog).getByLabelText("Connection notes"), {
      target: { value: "Hidden below the rug." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Connect" }));

    await waitFor(() =>
      expect(api.createCampaignLocationLink).toHaveBeenCalledWith("campaign-1", {
        sourceLocationId: "room-1",
        targetLocationId: "dungeon-1",
        linkType: "secret",
        label: "Trapdoor",
        notes: "Hidden below the rug.",
        direction: "bidirectional",
        visibility: "dm",
      }),
    );
    expect(await screen.findByText("Trapdoor - Hidden below the rug.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(api.deleteCampaignLocationLink).toHaveBeenCalledWith("campaign-1", "link-1"),
    );
  });

  it("reuses campaign encounter actions for encounters attached to the selected location", async () => {
    const onCloneEncounter = vi.fn();
    const onStartEncounter = vi.fn();
    const encounter: Encounter = {
      id: "encounter-1",
      campaignId: "campaign-1",
      name: "Shop Brawl",
      description: "",
      status: "planned",
      location: "Brindleford / Copper Kettle",
      locationId: "shop-1",
      roomNumber: "front",
      lootNotes: "",
      combatantCount: 0,
      enemyCount: 0,
      createdAt: "",
      updatedAt: "",
    };
    renderWorld({ encounters: [encounter], onCloneEncounter, onStartEncounter });

    const encounterCard = (await screen.findByText("Shop Brawl")).closest("div.rounded-md");
    expect(encounterCard).not.toBeNull();
    const card = encounterCard as HTMLElement;
    expect(within(card).getByText("Planned")).toBeTruthy();
    expect(within(card).getByText("Brindleford / Copper Kettle")).toBeTruthy();
    expect(within(card).getByText("Room front")).toBeTruthy();

    fireEvent.click(within(card).getByRole("button", { name: "Run" }));
    expect(onStartEncounter).toHaveBeenCalledWith(encounter, false);
    fireEvent.click(within(card).getByRole("button", { name: "Test" }));
    expect(onStartEncounter).toHaveBeenCalledWith(encounter, true);
    expect(within(card).getByRole("link", { name: "Edit" }).getAttribute("href")).toBe(
      "/campaigns/campaign-1/encounters/encounter-1/edit",
    );
    fireEvent.click(within(card).getByRole("button", { name: "Clone" }));
    expect(onCloneEncounter).toHaveBeenCalledWith(encounter);
    expect(within(card).queryByRole("button", { name: "Remove" })).toBeNull();
  });

  it("creates and removes NPC links from a dialog without relationship clutter", async () => {
    renderWorld({ npcs: [creature()] });

    expect(screen.queryByLabelText("NPC relationship")).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Add merchant" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("option", { name: /Mara Vell/i }));
    expect(within(dialog).queryByLabelText("NPC relationship")).toBeNull();
    fireEvent.change(within(dialog).getByLabelText("Merchant notes"), {
      target: { value: "Keeps a ledger of strange customers." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add merchant" }));

    await waitFor(() =>
      expect(api.createCampaignNpcLocationLink).toHaveBeenCalledWith("campaign-1", {
        creatureId: "npc-1",
        locationId: "shop-1",
        linkType: "merchant",
        visibility: "dm",
        notes: "Keeps a ledger of strange customers.",
      }),
    );
    expect(await screen.findByText("Mara Vell")).toBeTruthy();
    expect(screen.getByText("Keeps a ledger of strange customers.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("dialog", { name: "Mara Vell" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(api.deleteCampaignNpcLocationLink).toHaveBeenCalledWith(
        "campaign-1",
        "npc-location-link-1",
      ),
    );
  });

  it("creates and removes shop stock from a dialog", async () => {
    renderWorld();

    expect(screen.queryByLabelText("Item")).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Add stock" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Search items"), {
      target: { value: "healing" },
    });
    const stockItem = within(dialog).getByText("Healing Draught").closest("article");
    expect(stockItem).not.toBeNull();
    fireEvent.click(within(stockItem as HTMLElement).getByRole("button", { name: "Add" }));
    fireEvent.change(within(dialog).getByLabelText("Qty"), { target: { value: "4" } });
    fireEvent.change(within(dialog).getByLabelText("Price"), { target: { value: "75" } });
    fireEvent.change(within(dialog).getByLabelText("Currency"), { target: { value: "sp" } });
    fireEvent.change(within(dialog).getByLabelText("Availability"), {
      target: { value: "limited" },
    });
    fireEvent.change(within(dialog).getByLabelText("Stock notes"), {
      target: { value: "Behind the counter." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add 1 stock item" }));

    await waitFor(() =>
      expect(api.upsertCampaignLocationStock).toHaveBeenCalledWith("campaign-1", {
        locationId: "shop-1",
        itemId: "item-1",
        librarySource: "user",
        quantity: 4,
        priceAmount: 75,
        priceUnit: "sp",
        availability: "limited",
        notes: "Behind the counter.",
      }),
    );
    expect(await screen.findByText("Healing Draught")).toBeTruthy();
    expect(screen.getByText("75 sp")).toBeTruthy();
    expect(screen.getByText("Qty 4")).toBeTruthy();
    expect(screen.getByText("Behind the counter.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pricing" }));
    const pricingDialog = await screen.findByRole("dialog", { name: "Shop pricing" });
    expect(within(pricingDialog).getByText("75 sp")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(api.deleteCampaignLocationStock).toHaveBeenCalledWith("campaign-1", "stock-1"),
    );
  });

  it("searches by NPCs, stock, encounters, type, and tag", async () => {
    vi.mocked(api.campaignNpcLocationLinks).mockResolvedValue({
      links: [
        {
          id: "npc-link-1",
          campaignId: "campaign-1",
          creatureId: "npc-1",
          locationId: "shop-1",
          linkType: "works-here",
          visibility: "dm",
          notes: "",
          createdAt: "",
          updatedAt: "",
        },
      ],
    });
    vi.mocked(api.campaignLocationStock).mockResolvedValue({
      stock: [
        {
          id: "stock-1",
          campaignId: "campaign-1",
          locationId: "shop-1",
          itemId: "item-1",
          librarySource: "user",
          quantity: 2,
          priceAmount: 50,
          priceUnit: "gp",
          availability: "limited",
          notes: "",
          sortOrder: 0,
          createdAt: "",
          updatedAt: "",
        },
      ],
    });
    renderWorld({
      encounters: [
        {
          id: "encounter-1",
          campaignId: "campaign-1",
          name: "Shop Brawl",
          description: "",
          status: "planned",
          location: "Brindleford / Copper Kettle",
          locationId: "shop-1",
          roomNumber: "",
          lootNotes: "",
          combatantCount: 0,
          enemyCount: 0,
          createdAt: "",
          updatedAt: "",
        },
      ],
      locations: [
        location(),
        location({
          id: "dungeon-1",
          name: "Old Well",
          locationType: "dungeon",
          tags: ["ruin"],
          path: [{ id: "dungeon-1", name: "Old Well", locationType: "dungeon" }],
        }),
      ],
      npcs: [creature()],
    });

    fireEvent.change(await screen.findByLabelText("Search locations"), {
      target: { value: "mara" },
    });
    let results = screen.getByLabelText("Location results");
    expect(within(results).getByText("Copper Kettle")).toBeTruthy();
    expect(within(results).queryByText("Old Well")).toBeNull();
    expect(screen.getByText(/Showing\s+1\s+of\s+2\./)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear location search" }));
    fireEvent.change(screen.getByLabelText("Search locations"), {
      target: { value: "Healing Draught" },
    });
    results = screen.getByLabelText("Location results");
    expect(within(results).getByText("Copper Kettle")).toBeTruthy();
    expect(within(results).queryByText("Old Well")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear location search" }));
    fireEvent.change(screen.getByLabelText("Search locations"), {
      target: { value: "Shop Brawl" },
    });
    expect(
      within(screen.getByLabelText("Location results")).getByText("Copper Kettle"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear location search" }));
    fireEvent.change(screen.getByLabelText("Search locations"), { target: { value: "ruin" } });
    results = screen.getByLabelText("Location results");
    expect(within(results).getAllByText("Old Well").length).toBeGreaterThan(0);
    expect(within(results).queryByText("Copper Kettle")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear location search" }));
    fireEvent.change(screen.getByLabelText("Search locations"), { target: { value: "dungeon" } });
    results = screen.getByLabelText("Location results");
    expect(within(results).getAllByText("Old Well").length).toBeGreaterThan(0);
    expect(within(results).queryByText("Copper Kettle")).toBeNull();
  });
});
function renderWorld({
  encounters = [],
  npcs = [],
  onChanged = vi.fn().mockResolvedValue(undefined),
  onCloneEncounter = vi.fn(),
  onGenerateEncounter = vi.fn(),
  onManageNpcs = vi.fn(),
  onStartEncounter = vi.fn(),
  locations = [location()],
}: {
  encounters?: Encounter[];
  npcs?: Creature[];
  onChanged?: () => Promise<void>;
  onCloneEncounter?: (encounter: Encounter) => void;
  onGenerateEncounter?: (location: CampaignLocation) => void;
  onManageNpcs?: () => void;
  onStartEncounter?: (encounter: Encounter, test: boolean) => void;
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
        onCloneEncounter={onCloneEncounter}
        onGenerateEncounter={onGenerateEncounter}
        onStartEncounter={onStartEncounter}
      />
    </MemoryRouter>,
  );
}
