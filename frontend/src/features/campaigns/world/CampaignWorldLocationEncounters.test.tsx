import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { Encounter } from "../../../types";
import { CampaignWorldLocationEncounters } from "./CampaignWorldLocationEncounters";

describe("CampaignWorldLocationEncounters", () => {
  afterEach(() => cleanup());

  it("shows encounter status summary chips", () => {
    render(
      <MemoryRouter>
        <CampaignWorldLocationEncounters
          campaignId="campaign-1"
          encounters={[
            encounter({ id: "encounter-1", status: "planned" }),
            encounter({ id: "encounter-2", status: "completed" }),
            encounter({ id: "encounter-3", status: "planned" }),
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("2 planned")).toBeTruthy();
    expect(screen.getByText("1 completed")).toBeTruthy();
  });
});

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
