import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "../../types";
import { CampaignEncounterCard } from "./CampaignEncountersSection";

describe("CampaignEncounterCard", () => {
  afterEach(cleanup);

  it("keeps encounter actions visually distinct by role", () => {
    const encounter = {
      id: "encounter-1",
      name: "Bridge Ambush",
      status: "planned",
      combatantCount: 4,
      enemyCount: 3,
    } as Encounter;

    render(
      <MemoryRouter>
        <CampaignEncounterCard
          campaignID="campaign-1"
          encounter={encounter}
          onClone={vi.fn()}
          onRemove={vi.fn()}
          onStart={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Run" }).className).toContain("bg-primary");
    expect(screen.getByRole("button", { name: "Test" }).className).toContain("bg-tertiary");
    expect(screen.getByRole("button", { name: "Edit" }).className).toContain("bg-secondary");
    expect(screen.getByRole("button", { name: "Clone" }).className).toContain("bg-secondary");
    expect(screen.getByRole("button", { name: "Remove" }).className).toContain("bg-destructive");
  });
});
