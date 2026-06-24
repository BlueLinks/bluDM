import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../types";
import { childPrepChipsFor, childPrepIssueSummariesFor } from "./CampaignWorldChildPrepChips";
import type { CampaignLocation, CampaignLocationLink, CampaignMap } from "./travelTypes";

describe("childPrepChipsFor", () => {
  it("summarizes floor prep from descendant room data", () => {
    const chips = childPrepChipsFor({
      child: location({ id: "floor-1", locationType: "floor", parentLocationId: "dungeon-1" }),
      encounters: [encounter({ locationId: "room-1" })],
      links: [link({ sourceLocationId: "room-1", targetLocationId: "floor-1" })],
      locations: [
        location({ id: "dungeon-1", locationType: "dungeon" }),
        location({ id: "floor-1", locationType: "floor", parentLocationId: "dungeon-1" }),
        location({ id: "room-1", locationType: "room", parentLocationId: "floor-1" }),
      ],
      maps: [],
    });

    expect(chips.map((chip) => chip.label)).toEqual(["1 room", "1 encounter", "Unmapped"]);
  });

  it("summarizes incomplete child prep across child rows", () => {
    const chips = childPrepIssueSummariesFor({
      childLocations: [
        location({ id: "room-1", locationType: "room", notes: "", publicNotes: "" }),
        location({ id: "room-2", locationType: "room", notes: "Prepared." }),
      ],
      encounters: [encounter({ locationId: "room-2" })],
      links: [link({ sourceLocationId: "room-2", targetLocationId: "floor-1" })],
      locations: [
        location({ id: "room-1", locationType: "room", notes: "", publicNotes: "" }),
        location({ id: "room-2", locationType: "room", notes: "Prepared." }),
      ],
      maps: [map({ parentLocationId: "room-2" })],
    });

    expect(chips.map((chip) => chip.label)).toEqual([
      "1 room has no encounters",
      "1 room has no exits",
      "1 room needs notes",
      "1 room is unmapped",
    ]);
  });

  it("prioritizes room encounter, exit, notes, and map status", () => {
    const chips = childPrepChipsFor({
      child: location({ id: "room-1", locationType: "room", parentLocationId: "floor-1" }),
      encounters: [encounter({ locationId: "room-1" })],
      links: [link({ sourceLocationId: "room-1", targetLocationId: "floor-1" })],
      locations: [location({ id: "room-1", locationType: "room", parentLocationId: "floor-1" })],
      maps: [map({ parentLocationId: "room-1" })],
    });

    expect(chips.map((chip) => chip.label)).toEqual(["1 encounter", "1 exit", "Notes", "Mapped"]);
  });
});

function location(overrides: Partial<CampaignLocation> = {}): CampaignLocation {
  return {
    id: "location-1",
    campaignId: "campaign-1",
    name: "Location",
    locationType: "room",
    notes: "Prepared notes.",
    publicNotes: "Prepared notes.",
    dmNotes: "",
    tags: [],
    sortOrder: 0,
    status: "active",
    mapAnchor: {},
    path: [],
    ...overrides,
  };
}

function encounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: "encounter-1",
    campaignId: "campaign-1",
    name: "Shelf Ambush",
    description: "",
    status: "planned",
    location: "Location",
    locationId: "location-1",
    roomNumber: "",
    lootNotes: "",
    combatantCount: 0,
    enemyCount: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function link(overrides: Partial<CampaignLocationLink> = {}): CampaignLocationLink {
  return {
    id: "link-1",
    campaignId: "campaign-1",
    sourceLocationId: "room-1",
    targetLocationId: "floor-1",
    linkType: "stairs",
    label: "Back stair",
    direction: "bidirectional",
    visibility: "dm",
    notes: "Shortcut to the entrance.",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function map(overrides: Partial<CampaignMap> = {}): CampaignMap {
  return {
    id: "map-1",
    campaignId: "campaign-1",
    parentLocationId: "location-1",
    name: "Map",
    description: "",
    mapType: "floor",
    mode: "blank",
    width: 700,
    height: 500,
    scaleDistancePerPixel: 5,
    scaleDistanceUnit: "feet",
    calibrationPixelLength: 0,
    calibrationDistance: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}
