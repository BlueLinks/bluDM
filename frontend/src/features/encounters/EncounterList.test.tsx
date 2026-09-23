import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "../../types";
import { EncounterList } from "./EncounterList";

describe("EncounterList", () => {
  afterEach(cleanup);

  it("searches and paginates the compact encounter list", () => {
    renderList(encounters(6));

    expect(screen.getByText("Ambush 1")).toBeTruthy();
    expect(screen.queryByText("Ambush 6")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Ambush 6")).toBeTruthy();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search encounters" }), {
      target: { value: "Ambush 2" },
    });
    expect(screen.getByText("Ambush 2")).toBeTruthy();
    expect(screen.queryByText("Ambush 6")).toBeNull();
  });

  it("keeps edit and remove in the compact action menu", () => {
    const onRemove = vi.fn();
    renderList(encounters(1), onRemove);

    fireEvent.click(screen.getByLabelText("Actions for Ambush 1"));
    expect(screen.getByRole("link", { name: "Edit" }).getAttribute("href")).toBe(
      "/campaigns/campaign-1/encounters/encounter-1/edit",
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: "encounter-1" }));
  });

  it("groups equivalent 2014 and 2024 difficulty bands", () => {
    const values = encounters(2);
    values[0].difficulty = "Easy";
    values[1].difficulty = "Low";
    renderList(values);

    fireEvent.click(screen.getByRole("combobox", { name: "Filter by difficulty" }));
    fireEvent.click(screen.getByRole("option", { name: "Easy / Low" }));
    expect(screen.getByText("Ambush 1")).toBeTruthy();
    expect(screen.getByText("Ambush 2")).toBeTruthy();
  });
});

function renderList(values: Encounter[], onRemove = vi.fn()) {
  render(
    <MemoryRouter>
      <EncounterList
        campaignId="campaign-1"
        encounters={values}
        onRemove={onRemove}
        onStart={vi.fn()}
      />
    </MemoryRouter>,
  );
}

function encounters(count: number): Encounter[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `encounter-${index + 1}`,
    campaignId: "campaign-1",
    name: `Ambush ${index + 1}`,
    description: `Encounter ${index + 1}`,
    status: "planned",
    location: "Old Road",
    roomNumber: "",
    lootNotes: "",
    difficulty: index % 2 ? "Hard" : "Medium",
    combatantCount: index + 3,
    enemyCount: index + 1,
    createdAt: "",
    updatedAt: "",
  }));
}
