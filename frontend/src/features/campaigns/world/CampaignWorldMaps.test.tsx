import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../lib/api";
import { CampaignWorldMaps } from "./CampaignWorldMaps";
import type { CampaignLocation, CampaignMap, CampaignMapPin } from "./travelTypes";

vi.mock("../../../lib/api", () => ({
  api: {
    campaignMapDistance: vi.fn(),
    campaignMapPins: vi.fn(),
    createCampaignMapPin: vi.fn(),
    deleteCampaignMapPin: vi.fn(),
    updateCampaignMapPin: vi.fn(),
  },
}));

describe("CampaignWorldMaps", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.campaignMapPins).mockImplementation((_campaignId, mapId) =>
      Promise.resolve({
        pins: pinsByMap[mapId] ?? [],
      }),
    );
  });

  it("summarizes pin coverage per map and keeps unplaced locations scannable", async () => {
    renderMaps();

    expect(await screen.findByText("2 maps available")).toBeTruthy();
    expect(await screen.findByText("1/2 placed · 1 pin")).toBeTruthy();
    expect(screen.getByLabelText(/Selected map: Upper Floor/i)).toBeTruthy();
    expect(screen.getByLabelText(/Select map: Lower Floor/i)).toBeTruthy();

    expect(screen.getByText("East Room")).toBeTruthy();
    expect(screen.getAllByText("North Room").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Place pin for East Room" })).toBeTruthy();
    expect(screen.queryByText("Already placed")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show map pin actions for North Room" }));

    expect(screen.getByRole("button", { name: "Move" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  it("supports explicit placement cancel and keyboard map view controls", async () => {
    renderMaps();

    fireEvent.click(await screen.findByRole("button", { name: "Place pin for East Room" }));
    expect(screen.getByText(/Click or tap the map to place this pin/i)).toBeTruthy();

    const canvas = screen.getByRole("region", { name: /Interactive map canvas for Upper Floor/i });
    fireEvent.keyDown(canvas, { key: "+" });
    expect(screen.getByText(/125% zoom/i)).toBeTruthy();
    fireEvent.keyDown(canvas, { key: "0" });
    expect(screen.getByText(/100% zoom/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset map view" })).toBeTruthy();
    fireEvent.keyDown(canvas, { key: "Escape" });

    await waitFor(() => expect(screen.queryByText(/Click or tap the map/i)).toBeNull());
  });
});

function renderMaps() {
  render(
    <CampaignWorldMaps
      campaignId="campaign-1"
      childLocations={[
        room({ id: "room-1", name: "North Room" }),
        room({ id: "room-2", name: "East Room" }),
      ]}
      currentLocation={town()}
      focusedLocationID=""
      focusedMapID=""
      locations={[
        town(),
        room({ id: "room-1", name: "North Room" }),
        room({ id: "room-2", name: "East Room" }),
      ]}
      maps={[map({ id: "map-a", name: "Upper Floor" }), map({ id: "map-b", name: "Lower Floor" })]}
      onMapsChanged={vi.fn().mockResolvedValue(undefined)}
      onNavigateFromPin={vi.fn()}
      onSelectLocation={vi.fn()}
    />,
  );
}

const pinsByMap: Record<string, CampaignMapPin[]> = {
  "map-a": [pin({ id: "pin-1", locationId: "room-1", x: 120, y: 80 })],
  "map-b": [],
};

function town(): CampaignLocation {
  return {
    id: "town-1",
    campaignId: "campaign-1",
    name: "Brindleford",
    locationType: "settlement",
    notes: "Market town.",
    publicNotes: "Market town.",
    dmNotes: "",
    tags: [],
    sortOrder: 0,
    status: "active",
    mapAnchor: {},
    path: [{ id: "town-1", name: "Brindleford", locationType: "settlement" }],
  };
}

function room(overrides: Partial<CampaignLocation> = {}): CampaignLocation {
  return {
    ...town(),
    id: "room-1",
    name: "North Room",
    locationType: "room",
    parentLocationId: "town-1",
    path: [
      { id: "town-1", name: "Brindleford", locationType: "settlement" },
      { id: "room-1", name: "North Room", locationType: "room" },
    ],
    ...overrides,
  };
}

function map(overrides: Partial<CampaignMap> = {}): CampaignMap {
  return {
    id: "map-a",
    campaignId: "campaign-1",
    parentLocationId: "town-1",
    name: "Upper Floor",
    mapType: "floor",
    description: "Room placement map.",
    mode: "blank",
    imageUrl: "",
    width: 1000,
    height: 800,
    scaleDistancePerPixel: 5,
    scaleDistanceUnit: "feet",
    calibrationPixelLength: 0,
    calibrationDistance: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function pin(overrides: Partial<CampaignMapPin> = {}): CampaignMapPin {
  return {
    id: "pin-1",
    campaignId: "campaign-1",
    mapId: "map-a",
    locationId: "room-1",
    x: 100,
    y: 100,
    labelOverride: "",
    visibility: "dm",
    state: "active",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}
