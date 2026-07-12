import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "../../../types";
import { PrepOverviewCard } from "./CampaignWorldPrepOverviewCard";
import type { CampaignLocation, CampaignLocationLink } from "./travelTypes";

describe("PrepOverviewCard", () => {
  afterEach(() => cleanup());

  it("shows actionable next steps for underprepared rooms", () => {
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
        onEditNotes={onEditNotes}
        onLinkExit={onLinkExit}
        onOpenMaps={onOpenMaps}
      />,
    );

    expect(
      screen.getByText("Where can the party go next, and what door, stair, or passage shows it?"),
    ).toBeTruthy();
    expect(
      screen.getByText("What should players notice first, and what can they discover with care?"),
    ).toBeTruthy();
    expect(
      screen.getByText("Where does this room sit relative to the floor and connected rooms?"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Link a room" }));
    fireEvent.click(screen.getByRole("button", { name: "Add room notes" }));
    fireEvent.click(screen.getByRole("button", { name: "Place on map" }));

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
        onEditNotes={vi.fn()}
        onLinkExit={vi.fn()}
        onOpenMaps={vi.fn()}
      />,
    );

    expect(screen.queryByText("Next prep steps")).toBeNull();
  });

  it("keeps encounter creation out of prep overview", () => {
    render(
      <PrepOverviewCard
        childLocations={[]}
        encounters={[]}
        links={[]}
        location={location({ notes: "", publicNotes: "" })}
        maps={[]}
        showRoomNextSteps
      />,
    );

    expect(screen.queryByRole("button", { name: "Add encounter" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add an encounter" })).toBeNull();
  });

  it("summarizes running cues for prepared exploration spaces", () => {
    render(
      <PrepOverviewCard
        childLocations={[location({ id: "room-2", name: "Collapsed Hall" })]}
        encounters={[encounter({ status: "planned" }), encounter({ id: "encounter-2" })]}
        links={[link()]}
        location={location({ summary: "A flooded archive with a whispering shelf." })}
        maps={[]}
      />,
    );

    expect(screen.getByText("Running cues")).toBeTruthy();
    expect(screen.getByText("A flooded archive with a whispering shelf.")).toBeTruthy();
    expect(screen.getByText("2 of 2 encounters planned to run.")).toBeTruthy();
    expect(screen.getByText("1 connected room can move players onward.")).toBeTruthy();
    expect(screen.getByText("Notes are ready; map context is missing.")).toBeTruthy();
  });

  it("does not show room next steps for non-room profiles", () => {
    render(
      <PrepOverviewCard
        childLocations={[]}
        encounters={[]}
        links={[]}
        location={location({ notes: "", publicNotes: "" })}
        maps={[]}
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
