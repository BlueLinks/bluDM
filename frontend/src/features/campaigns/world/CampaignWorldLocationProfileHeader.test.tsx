import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocationProfileHeader } from "./CampaignWorldLocationProfileHeader";
import { locationProfile } from "./locationProfiles";
import type { CampaignLocation } from "./travelTypes";

describe("LocationProfileHeader", () => {
  it("uses the shared hero treatment without repeating shop metadata", () => {
    const location: CampaignLocation = {
      id: "shop-1",
      campaignId: "campaign-1",
      name: "Anvil & Ash",
      locationType: "blacksmith",
      notes: "",
      summary: "A practical smithy.",
      tags: ["shop", "weapons"],
      mapAnchor: { x: 20, y: 30 },
      path: [
        { id: "town-1", name: "Bellwick", locationType: "town" },
        { id: "shop-1", name: "Anvil & Ash", locationType: "blacksmith" },
      ],
    };

    render(
      <LocationProfileHeader
        childCount={0}
        location={location}
        profile={locationProfile(location)}
        onAddChild={vi.fn()}
        onDeleteLocation={vi.fn()}
        onEdit={vi.fn()}
        onOpenMaps={vi.fn()}
        onSelectLocation={vi.fn()}
      />,
    );

    const header = screen.getByRole("heading", { name: "Anvil & Ash" }).closest("section");
    expect(header).toBeTruthy();
    expect(header?.className).toContain("depth-hero");
    expect(within(header as HTMLElement).getAllByText(/^shop$/i)).toHaveLength(1);
    expect(within(header as HTMLElement).getByText("weapons")).toBeTruthy();
    expect(within(header as HTMLElement).queryByText("Pinned on map")).toBeNull();
    expect(within(header as HTMLElement).queryByRole("button", { name: "Add item" })).toBeNull();
  });
});
