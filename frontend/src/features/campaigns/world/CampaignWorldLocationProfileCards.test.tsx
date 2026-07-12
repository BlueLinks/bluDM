import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  ChildLocationsCard,
  LocationMapCard,
  LocationNotesCard,
} from "./CampaignWorldLocationProfileCards";
import { dungeonStudioMapInput, createDungeonStudioDocument } from "./dungeonStudioDocument";
import type { CampaignLocation, CampaignMap } from "./travelTypes";

const dungeon = location({ id: "dungeon-1", name: "Sunken Keep", locationType: "dungeon" });
const floor = location({
  id: "floor-1",
  name: "Lower Halls",
  locationType: "floor",
  parentLocationId: "dungeon-1",
});
const room = location({
  id: "room-1",
  name: "Guard Room",
  locationType: "room",
  parentLocationId: "floor-1",
});

describe("Campaign World dungeon presentation", () => {
  it("replaces map tools with Dungeon Studio entry when studio metadata exists", () => {
    render(
      <MemoryRouter>
        <LocationMapCard
          compact={false}
          location={dungeon}
          maps={[studioMap(dungeon)]}
          toolsOpen={false}
          studioPath="/studio"
          onCloseMaps={vi.fn()}
          onOpenMaps={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Open Dungeon Studio/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Show map tools/i })).toBeNull();
    expect(screen.getByRole("img", { name: /Sunken Keep dungeon map preview/i })).toBeTruthy();
  });

  it("uses a polished map placeholder when no map exists", () => {
    const onOpenMaps = vi.fn();
    render(
      <MemoryRouter>
        <LocationMapCard
          compact={false}
          location={dungeon}
          maps={[]}
          toolsOpen={false}
          onCloseMaps={vi.fn()}
          onOpenMaps={onOpenMaps}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("No map attached yet")).toBeTruthy();
    screen.getByRole("button", { name: "Add map" }).click();
    expect(onOpenMaps).toHaveBeenCalled();
  });

  it("groups child places by useful location type", () => {
    render(
      <ChildLocationsCard
        childLocations={[
          location({ id: "shop-1", name: "General Store", locationType: "shop" }),
          location({ id: "tavern-1", name: "Rusty Plough", locationType: "tavern" }),
          location({ id: "ruin-1", name: "Old Watchtower", locationType: "landmark" }),
        ]}
        emptyCopy="No places yet."
        title="Places in town"
        onSelectLocation={vi.fn()}
      />,
    );

    expect(screen.getByText("Shops and businesses · 2")).toBeTruthy();
    expect(screen.getByText("Points of interest · 1")).toBeTruthy();
  });

  it("presents floors and rooms once inside one navigation component", () => {
    const onSelectLocation = vi.fn();
    render(
      <ChildLocationsCard
        childLocations={[floor]}
        emptyCopy="No floors yet."
        nestedLocationsByParentId={{ [floor.id]: [room] }}
        title="Floors and rooms"
        onSelectLocation={onSelectLocation}
      />,
    );

    expect(screen.queryByText("Dungeon structure")).toBeNull();
    expect(screen.getByText("Floors and rooms")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Lower Halls/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Guard Room/i })).toBeTruthy();
  });

  it("does not display generated cell-count summaries on room cards", () => {
    render(
      <ChildLocationsCard
        childLocations={[
          location({
            id: "room-2",
            name: "Sunken Vault",
            locationType: "room",
            summary: "12 mapped Dungeon Studio cells.",
          }),
        ]}
        emptyCopy="No rooms yet."
        title="Rooms"
        onSelectLocation={vi.fn()}
      />,
    );

    expect(screen.getByText("Sunken Vault")).toBeTruthy();
    expect(screen.queryByText(/mapped Dungeon Studio cells/i)).toBeNull();
  });

  it("navigates from a dungeon overview map room to the matching location", () => {
    const onSelectLocation = vi.fn();

    render(
      <MemoryRouter>
        <LocationMapCard
          compact={false}
          location={dungeon}
          locations={[dungeon, floor, room]}
          maps={[studioMapWithRooms(floor)]}
          toolsOpen={false}
          studioPath="/studio"
          onCloseMaps={vi.fn()}
          onOpenMaps={vi.fn()}
          onSelectLocation={onSelectLocation}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Guard Room" }));

    expect(onSelectLocation).toHaveBeenCalledWith("room-1");
  });

  it("treats room studio previews as the primary room map", () => {
    render(
      <MemoryRouter>
        <LocationMapCard
          compact
          location={room}
          locations={[dungeon, floor, room]}
          maps={[studioMapWithRooms(floor)]}
          toolsOpen={false}
          studioPath="/studio"
          onCloseMaps={vi.fn()}
          onOpenMaps={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Room map")).toBeTruthy();
    expect(screen.queryByText("Map position")).toBeNull();
  });

  it("offers contextual note actions", () => {
    const onEditNotes = vi.fn();
    const onClearNotes = vi.fn().mockResolvedValue(undefined);

    render(
      <LocationNotesCard
        location={location({
          id: "settlement-1",
          name: "Bellwick",
          locationType: "settlement",
          publicNotes: "Busy market square.",
          dmNotes: "The reeve hides a ledger.",
        })}
        title="Town notes"
        onClearNotes={onClearNotes}
        onEditNotes={onEditNotes}
      />,
    );

    screen.getByRole("button", { name: "Edit notes" }).click();
    screen.getByRole("button", { name: "Delete notes" }).click();

    expect(onEditNotes).toHaveBeenCalled();
    expect(onClearNotes).toHaveBeenCalled();
  });

  it("offers an add note action for empty notes", () => {
    const onEditNotes = vi.fn();

    render(<LocationNotesCard location={room} title="Room notes" onEditNotes={onEditNotes} />);

    screen.getByRole("button", { name: "Add note" }).click();

    expect(onEditNotes).toHaveBeenCalled();
  });
});

function studioMap(parent: CampaignLocation): CampaignMap {
  const input = dungeonStudioMapInput(
    parent,
    paintSample(createDungeonStudioDocument({ scope: "dungeon" })),
  );
  return {
    ...input,
    id: "map-1",
    campaignId: "campaign-1",
    description: input.description ?? "",
    calibrationPixelLength: input.calibrationPixelLength ?? 20,
    calibrationDistance: input.calibrationDistance ?? 5,
    imageUrl: undefined,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function studioMapWithRooms(parent: CampaignLocation): CampaignMap {
  const document = paintSample(createDungeonStudioDocument({ scope: "floor" }));
  const input = dungeonStudioMapInput(parent, {
    ...document,
    rooms: [
      {
        id: "studio-room-1",
        locationId: room.id,
        label: room.name,
        color: "#14b8a6",
        cells: [{ x: 2, y: 2 }],
      },
    ],
  });
  return {
    ...input,
    id: "map-rooms",
    campaignId: "campaign-1",
    description: input.description ?? "",
    calibrationPixelLength: input.calibrationPixelLength ?? 20,
    calibrationDistance: input.calibrationDistance ?? 5,
    imageUrl: undefined,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function paintSample(document: ReturnType<typeof createDungeonStudioDocument>) {
  return {
    ...document,
    layers: [{ ...document.layers[0], cells: [{ x: 2, y: 2 }] }],
  };
}

function location(overrides: Partial<CampaignLocation>): CampaignLocation {
  return {
    id: "loc-1",
    campaignId: "campaign-1",
    name: "Location",
    locationType: "custom",
    notes: "",
    ...overrides,
  };
}
