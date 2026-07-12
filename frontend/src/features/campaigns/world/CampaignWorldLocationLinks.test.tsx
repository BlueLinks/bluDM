import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CampaignWorldLocationLinks } from "./CampaignWorldLocationLinks";
import type { CampaignLocation } from "./travelTypes";

describe("CampaignWorldLocationLinks", () => {
  afterEach(() => cleanup());

  it("renders inferred connected rooms without showing an empty exits state", () => {
    const onSelectLocation = vi.fn();
    render(
      <CampaignWorldLocationLinks
        actionLabel="Link room"
        emptyCopy="No connected rooms found on the map or in manual links yet."
        inferredConnections={[
          {
            connectionType: "door",
            id: "map-1-entry-hall",
            targetLocation: hallRoom,
          },
        ]}
        links={[]}
        loading={false}
        location={entryRoom}
        locations={[entryRoom, hallRoom]}
        title="Connected rooms"
        onCreate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onSelectLocation={onSelectLocation}
      />,
    );

    expect(screen.getByText("Connected rooms")).toBeTruthy();
    expect(screen.getByText("1 connected")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Door to Hall/i })).toBeTruthy();
    expect(screen.queryByText("door")).toBeNull();
    expect(screen.queryByText(/No connected rooms/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Door to Hall/i }));
    expect(onSelectLocation).toHaveBeenCalledWith(hallRoom.id);
  });

  it("uses readable connected-room fallbacks instead of UUIDs", () => {
    const uuid = "9f66e57e-1111-4111-8111-111111111111";
    render(
      <CampaignWorldLocationLinks
        actionLabel="Link room"
        inferredConnections={[
          {
            connectionType: "stairs",
            id: `map-1-${uuid}`,
            targetLocation: location({ id: uuid, name: uuid }),
          },
        ]}
        links={[
          {
            id: "manual-link-1",
            campaignId: "campaign-1",
            sourceLocationId: entryRoom.id,
            targetLocationId: "room-4",
            linkType: "door",
            label: "",
            direction: "bidirectional",
            visibility: "dm",
            notes: "Stuck from the far side.",
            createdAt: "",
            updatedAt: "",
          },
        ]}
        loading={false}
        location={entryRoom}
        locations={[entryRoom]}
        title="Connected rooms"
        onCreate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onSelectLocation={vi.fn()}
      />,
    );

    expect(screen.getByText("Stairs to Unnamed room")).toBeTruthy();
    expect(screen.getByText("Door to Room 4")).toBeTruthy();
    expect(document.body.textContent).not.toContain(uuid);
  });
});

const entryRoom = location({ id: "room-1", name: "Entry" });
const hallRoom = location({ id: "room-2", name: "Hall" });

function location(overrides: Partial<CampaignLocation>): CampaignLocation {
  return {
    id: "room-1",
    campaignId: "campaign-1",
    name: "Room",
    locationType: "room",
    notes: "",
    ...overrides,
  };
}
