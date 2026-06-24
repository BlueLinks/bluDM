import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "../../../types";
import { PrepOverviewCard } from "./CampaignWorldPrepOverviewCard";
import type { CampaignLocation, CampaignLocationLink } from "./travelTypes";

describe("PrepOverviewCard", () => {
  afterEach(() => cleanup());

  it("shows actionable next steps for underprepared rooms", () => {
    const onAddEncounter = vi.fn();
    const onEditNotes = vi.fn();
    const onLinkExit = vi.fn();
    const onOpenMaps = vi.fn();

    render(
      <PrepOverviewCard
        childLocations={[]}
        encounters={[]}
        links={[]}
        location={location({ notes: "", publicNotes: "" })}
        maps={[]}
        showRoomNextSteps
        onAddEncounter={onAddEncounter}
        onEditNotes={onEditNotes}
        onLinkExit={onLinkExit}
        onOpenMaps={onOpenMaps}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add an encounter" }));
    fireEvent.click(screen.getByRole("button", { name: "Link an exit" }));
    fireEvent.click(screen.getByRole("button", { name: "Add room notes" }));
    fireEvent.click(screen.getByRole("button", { name: "Place on map" }));

    expect(onAddEncounter).toHaveBeenCalled();
    expect(onLinkExit).toHaveBeenCalled();
    expect(onEditNotes).toHaveBeenCalled();
    expect(onOpenMaps).toHaveBeenCalled();
  });

  it("does not show unnecessary next steps for prepared rooms", () => {
    render(
      <PrepOverviewCard
        childLocations={[]}
        encounters={[encounter()]}
        links={[link()]}
        location={location({ mapAnchor: { marker: "A1" } })}
        maps={[]}
        showRoomNextSteps
        onAddEncounter={vi.fn()}
        onEditNotes={vi.fn()}
        onLinkExit={vi.fn()}
        onOpenMaps={vi.fn()}
      />,
    );

    expect(screen.queryByText("Next prep steps")).toBeNull();
  });

  it("does not show room next steps for non-room profiles", () => {
    render(
      <PrepOverviewCard
        childLocations={[]}
        encounters={[]}
        links={[]}
        location={location({ notes: "", publicNotes: "" })}
        maps={[]}
        onAddEncounter={vi.fn()}
      />,
    );

    expect(screen.queryByText("Next prep steps")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add an encounter" })).toBeNull();
  });
});

function location(overrides: Partial<CampaignLocation> = {}): CampaignLocation {
  return {
    id: "room-1",
    campaignId: "campaign-1",
    name: "Room 1",
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
    location: "Room 1",
    locationId: "room-1",
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
