import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("keeps compact cards focused on management actions", () => {
    const onCloneEncounter = vi.fn();
    const onDeleteEncounter = vi.fn();
    const onStartEncounter = vi.fn();
    const shelfAmbush = encounter({
      description: "A short burst of trouble between stacked crates.",
      roomNumber: "front",
    });

    render(
      <MemoryRouter>
        <CampaignWorldLocationEncounters
          campaignId="campaign-1"
          encounters={[shelfAmbush]}
          onCloneEncounter={onCloneEncounter}
          onDeleteEncounter={onDeleteEncounter}
          onStartEncounter={onStartEncounter}
        />
      </MemoryRouter>,
    );

    const card = screen.getByText("Shelf Ambush").closest("article") as HTMLElement;
    expect(within(card).getByText("Planned")).toBeTruthy();
    expect(within(card).getByText("Room front")).toBeTruthy();
    expect(within(card).getByText("A short burst of trouble between stacked crates.")).toBeTruthy();
    expect(within(card).queryByText(/Initiative/i)).toBeNull();
    expect(within(card).queryByRole("button", { name: "Test" })).toBeNull();

    fireEvent.click(within(card).getByRole("button", { name: "Run" }));
    expect(onStartEncounter).toHaveBeenCalledWith(shelfAmbush, false);

    fireEvent.click(within(card).getByText("More"));
    fireEvent.click(within(card).getByRole("button", { name: "Clone" }));
    expect(onCloneEncounter).toHaveBeenCalledWith(shelfAmbush);
    expect(within(card).getByRole("link", { name: "Edit" }).getAttribute("href")).toBe(
      "/campaigns/campaign-1/encounters/encounter-1/edit",
    );
    fireEvent.click(within(card).getByRole("button", { name: "Delete" }));
    expect(onDeleteEncounter).toHaveBeenCalledWith(shelfAmbush);
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
