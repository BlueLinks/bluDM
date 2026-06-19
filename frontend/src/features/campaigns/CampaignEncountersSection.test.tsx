import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CampaignEncountersSection } from "./CampaignEncountersSection";
import type { CampaignLocation } from "./world/travelTypes";

describe("CampaignEncountersSection", () => {
  it("selects a structured world location while preserving readable location text", () => {
    const onLocationChange = vi.fn();
    const onLocationIDChange = vi.fn();
    renderSection({ onLocationChange, onLocationIDChange });

    fireEvent.change(screen.getByLabelText("World location"), { target: { value: "shop-1" } });

    expect(onLocationIDChange).toHaveBeenCalledWith("shop-1");
    expect(onLocationChange).toHaveBeenCalledWith("Brindleford / Copper Kettle");
  });
});

function renderSection({
  onLocationChange = vi.fn(),
  onLocationIDChange = vi.fn(),
}: {
  onLocationChange?: (location: string) => void;
  onLocationIDChange?: (locationID: string) => void;
} = {}) {
  render(
    <MemoryRouter>
      <CampaignEncountersSection
        campaignID="campaign-1"
        description=""
        encounterOpen
        encounters={[]}
        location=""
        locationID=""
        locations={[location()]}
        name="Shop Brawl"
        roomNumber=""
        status="planned"
        onClone={vi.fn()}
        onCreate={vi.fn()}
        onDescriptionChange={vi.fn()}
        onLocationChange={onLocationChange}
        onLocationIDChange={onLocationIDChange}
        onNameChange={vi.fn()}
        onOpenChange={vi.fn()}
        onRemove={vi.fn()}
        onRoomNumberChange={vi.fn()}
        onStart={vi.fn()}
        onStatusChange={vi.fn()}
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
    notes: "",
    path: [
      { id: "town-1", name: "Brindleford", locationType: "settlement" },
      { id: "shop-1", name: "Copper Kettle", locationType: "shop" },
    ],
    ...overrides,
  };
}
