import { describe, expect, it } from "vitest";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import type { CampaignLocation } from "./travelTypes";

describe("campaignWorldLocationUtils", () => {
  it("formats location paths with fallback names", () => {
    expect(locationPathLabel(location())).toBe("Brindleford / Copper Kettle");
    expect(locationPathLabel(location({ path: undefined }))).toBe("Copper Kettle");
  });
});

function location(overrides: Partial<CampaignLocation> = {}): CampaignLocation {
  return {
    id: "shop-1",
    campaignId: "campaign-1",
    name: "Copper Kettle",
    locationType: "shop",
    parentLocationId: "town-1",
    path: [
      { id: "town-1", name: "Brindleford", locationType: "settlement" },
      { id: "shop-1", name: "Copper Kettle", locationType: "shop" },
    ],
    notes: "Copper pots hang from the rafters.",
    publicNotes: "Copper pots hang from the rafters.",
    dmNotes: "",
    tags: [],
    sortOrder: 0,
    status: "active",
    mapAnchor: {},
    ...overrides,
  };
}
