import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorldLocationList } from "./CampaignWorldLocationList";
import type { CampaignLocation } from "./travelTypes";

describe("WorldLocationList", () => {
  afterEach(() => cleanup());

  it("keeps rooms out of the global overview unless selected or searched", () => {
    const locations = [
      location({ id: "dungeon", name: "Dungeon", locationType: "dungeon" }),
      location({ id: "floor", name: "Floor", locationType: "floor", parentLocationId: "dungeon" }),
      location({
        id: "room",
        name: "Hidden Room",
        locationType: "room",
        parentLocationId: "floor",
      }),
    ];
    const { rerender } = renderList(locations, "");

    expect(screen.queryByRole("button", { name: /Hidden Room/i })).toBeNull();

    rerender(listElement(locations, "room", ""));
    expect(screen.getByRole("button", { name: /Hidden Room/i })).toBeTruthy();

    rerender(listElement(locations, "dungeon", "hidden"));
    expect(screen.getByRole("button", { name: /Hidden Room/i })).toBeTruthy();
  });

  it("keeps the location browser as one clipped rounded shell", () => {
    renderList([location({ id: "town", name: "Bellwick" })], "town");

    const sidebar = screen.getByRole("complementary");
    expect(sidebar.className).toContain("rounded-lg");
    expect(sidebar.className).toContain("overflow-hidden");
    expect(sidebar.className).toContain("border");
  });
});

function renderList(locations: CampaignLocation[], selectedID: string) {
  return render(listElement(locations, selectedID, ""));
}

function listElement(locations: CampaignLocation[], selectedID: string, query: string) {
  return (
    <WorldLocationList
      locations={locations}
      query={query}
      selectedID={selectedID}
      totalCount={locations.length}
      onCreate={vi.fn()}
      onQueryChange={vi.fn()}
      onSelect={vi.fn()}
    />
  );
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
