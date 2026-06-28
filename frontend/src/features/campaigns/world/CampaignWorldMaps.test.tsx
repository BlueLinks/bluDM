import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../lib/api";
import { CampaignWorldMaps } from "./CampaignWorldMaps";
import type { CampaignLocation, CampaignMap, CampaignMapPin } from "./travelTypes";

vi.mock("../../../lib/api", () => ({
  api: {
    campaignMapDistance: vi.fn(),
    campaignMapPins: vi.fn(),
    createCampaignMap: vi.fn(),
    createCampaignMapPin: vi.fn(),
    deleteCampaignMapPin: vi.fn(),
    updateCampaignMap: vi.fn(),
    updateCampaignMapPin: vi.fn(),
    uploadImage: vi.fn(),
  },
}));

describe("CampaignWorldMaps", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    pinsByMap["map-a"] = [pin({ id: "pin-1", locationId: "room-1", x: 120, y: 80 })];
    pinsByMap["map-b"] = [];
    vi.mocked(api.campaignMapPins).mockImplementation((_campaignId, mapId) =>
      Promise.resolve({
        pins: pinsByMap[mapId] ?? [],
      }),
    );
    vi.mocked(api.campaignMapDistance).mockImplementation(
      (_campaignId, mapId, originId, targetId) => {
        const origin = pinsByMap[mapId]?.find((item) => item.locationId === originId);
        const target = pinsByMap[mapId]?.find((item) => item.locationId === targetId);
        const pixelDistance =
          origin && target ? Math.hypot(origin.x - target.x, origin.y - target.y) : 0;
        return Promise.resolve({
          distance: {
            mapId,
            originLocationId: originId,
            targetLocationId: targetId,
            pixelDistance,
            distance: pixelDistance * 5,
            distanceUnit: "feet",
            travelDistance: (pixelDistance * 5) / 5280,
            travelDistanceUnit: "miles",
          },
        });
      },
    );
    vi.mocked(api.updateCampaignMap).mockImplementation((_campaignId, _mapId, payload) =>
      Promise.resolve({ map: map({ ...payload, id: "map-a" }) }),
    );
    vi.mocked(api.updateCampaignMapPin).mockImplementation((_campaignId, _mapId, _pinId, payload) =>
      Promise.resolve({ pin: pin(payload) }),
    );
  });

  it("shows one embedded map workspace and keeps unplaced locations scannable", async () => {
    renderMaps();

    expect(
      await screen.findByRole("region", { name: /Interactive map canvas for Upper Floor/i }),
    ).toBeTruthy();
    expect(screen.queryByText("Maps for this workspace")).toBeNull();
    expect(screen.queryByText("Lower Floor")).toBeNull();

    expect(screen.getByText("East Room")).toBeTruthy();
    expect(screen.getAllByText("North Room").length).toBeGreaterThan(0);
    expect(document.querySelector('[data-map-pin-type="room"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: "Place pin for East Room" })).toBeTruthy();
    expect(screen.queryByText("Already placed")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show map pin actions for North Room" }));

    expect(screen.getByRole("button", { name: "Move" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  it("resizes pins by relative position when map dimensions change", async () => {
    const onMapsChanged = vi.fn().mockResolvedValue(undefined);
    renderMaps({ onMapsChanged });

    fireEvent.click(await screen.findByRole("button", { name: "Edit map image" }));
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "2000" } });
    fireEvent.change(screen.getByLabelText("Height"), { target: { value: "1600" } });
    fireEvent.click(screen.getByRole("button", { name: "Save map" }));

    await waitFor(() =>
      expect(api.updateCampaignMap).toHaveBeenCalledWith(
        "campaign-1",
        "map-a",
        expect.objectContaining({ width: 2000, height: 1600 }),
      ),
    );
    expect(api.updateCampaignMapPin).toHaveBeenCalledWith(
      "campaign-1",
      "map-a",
      "pin-1",
      expect.objectContaining({ locationId: "room-1", x: 240, y: 160 }),
    );
    expect(onMapsChanged).toHaveBeenCalled();
  });

  it("auto-calculates distance and calibrates scale from selected pins", async () => {
    const onMapsChanged = vi.fn().mockResolvedValue(undefined);
    pinsByMap["map-a"] = [
      pin({ id: "pin-1", locationId: "room-1", x: 0, y: 0 }),
      pin({ id: "pin-2", locationId: "room-2", x: 300, y: 400 }),
    ];
    renderMaps({ onMapsChanged });

    await selectOption(0, "North Room");
    await selectOption(1, "East Room");

    expect(screen.queryByRole("button", { name: /Calculate straight-line distance/i })).toBeNull();
    await waitFor(() =>
      expect(api.campaignMapDistance).toHaveBeenCalledWith(
        "campaign-1",
        "map-a",
        "room-1",
        "room-2",
      ),
    );
    expect(await screen.findByText(/2,500 feet \(500\.0 px\)/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Known distance"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Use this distance" }));

    await waitFor(() =>
      expect(api.updateCampaignMap).toHaveBeenCalledWith(
        "campaign-1",
        "map-a",
        expect.objectContaining({
          scaleDistancePerPixel: 0.1,
          scaleDistanceUnit: "feet",
          calibrationPixelLength: 500,
          calibrationDistance: 50,
        }),
      ),
    );
    expect(onMapsChanged).toHaveBeenCalled();
  });

  it("previews image maps and keeps uploaded dimensions read-only", async () => {
    renderMaps({
      maps: [
        map({
          id: "map-a",
          name: "Upper Floor",
          mode: "image",
          imageAssetId: "asset-1",
          imageUrl: "/api/assets/asset-1",
        }),
      ],
    });

    fireEvent.click(await screen.findByRole("button", { name: "Edit map image" }));

    expect(screen.getByAltText("Map image preview")).toBeTruthy();
    expect(screen.getByText("1000×800px")).toBeTruthy();
    expect(screen.queryByLabelText("Width")).toBeNull();
    expect(screen.queryByLabelText("Height")).toBeNull();
  });

  it("supports explicit placement cancel and keyboard map view controls", async () => {
    renderMaps();

    fireEvent.click(await screen.findByRole("button", { name: "Place pin for East Room" }));
    expect(screen.getByText(/Click or tap the map to place this pin/i)).toBeTruthy();

    const canvas = screen.getByRole("region", { name: /Interactive map canvas for Upper Floor/i });
    fireEvent.keyDown(canvas, { key: "+" });
    expect(screen.getByText(/125% zoom/i)).toBeTruthy();
    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 160,
      deltaY: -120,
    });
    expect(fireEvent(canvas, wheelEvent)).toBe(false);
    await waitFor(() => expect(screen.getByText(/141% zoom/i)).toBeTruthy());
    fireEvent.keyDown(canvas, { key: "0" });
    expect(screen.getByText(/100% zoom/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset map view" })).toBeTruthy();
    fireEvent.keyDown(canvas, { key: "Escape" });

    await waitFor(() => expect(screen.queryByText(/Click or tap the map/i)).toBeNull());
  });
});

async function selectOption(index: number, name: string) {
  await waitFor(() => expect(screen.getAllByRole("combobox").length).toBeGreaterThan(index));
  fireEvent.click(screen.getAllByRole("combobox")[index]);
  fireEvent.click(await screen.findByRole("option", { name }));
}

function renderMaps({
  maps = [map({ id: "map-a", name: "Upper Floor" }), map({ id: "map-b", name: "Lower Floor" })],
  onMapsChanged = vi.fn().mockResolvedValue(undefined),
} = {}) {
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
      maps={maps}
      onMapsChanged={onMapsChanged}
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
