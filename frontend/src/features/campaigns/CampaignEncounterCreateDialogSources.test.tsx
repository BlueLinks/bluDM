import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import { encounterRuleset2014, encounterRuleset2024 } from "../../lib/domain/encounterRulesets";
import { CampaignEncounterCreateDialog } from "./CampaignEncounterCreateDialog";
import { creature, encounter } from "./encounterBuilderTestFixtures";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("../../lib/api", () => ({
  api: {
    createEncounter: vi.fn(),
    creatures: vi.fn(),
    previewGeneratedEncounter: vi.fn(),
  },
}));

describe("encounter builder creature sources", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.creatures).mockResolvedValue({
      creatures: [
        creature({
          id: "dire-wolf-2024",
          name: "Dire Wolf",
          sourceKey: "srd-5-2-1",
          sourceLabel: "SRD 2024",
        }),
        creature({ id: "dire-wolf-2014", name: "Dire Wolf" }),
      ],
    });
    vi.mocked(api.createEncounter).mockResolvedValue({ encounter: encounter() });
  });

  it.each([
    ["srd-2014", "dire-wolf-2014", "SRD 2014", "SRD 2024"],
    ["srd-5-2-1", "dire-wolf-2024", "SRD 2024", "SRD 2014"],
  ])(
    "only saves the %s Dire Wolf for a campaign using that source",
    async (source, id, visible, hidden) => {
      render(
        <MemoryRouter>
          <CampaignEncounterCreateDialog
            allowedStandardSources={[source]}
            campaignId="campaign-1"
            difficultyRuleset={source === "srd-2014" ? encounterRuleset2014 : encounterRuleset2024}
            locations={[]}
            open
            players={[]}
            onOpenChange={vi.fn()}
          />
        </MemoryRouter>,
      );

      await waitFor(() =>
        expect(api.creatures).toHaveBeenCalledWith({ includeStandard: true, source: [source] }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Next: Encounter Setup" }));
      fireEvent.click(screen.getByRole("button", { name: "Add enemy" }));
      const picker = await screen.findByRole("dialog", { name: "Add enemy" });
      await waitFor(() => expect(within(picker).getByText("1 creature found")).toBeTruthy());
      expect(within(picker).getAllByText(visible).length).toBeGreaterThan(0);
      expect(within(picker).queryByText(hidden)).toBeNull();
      fireEvent.click(within(picker).getByRole("button", { name: "Add enemy" }));
      fireEvent.click(screen.getByRole("button", { name: "Next: Review & Create" }));
      fireEvent.change(screen.getByLabelText("Encounter name"), {
        target: { value: "Dire Wolf encounter" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Create encounter" }));
      await waitFor(() => expect(api.createEncounter).toHaveBeenCalled());
      expect(vi.mocked(api.createEncounter).mock.calls[0]?.[1].combatants).toEqual([
        expect.objectContaining({ creatureId: id }),
      ]);
    },
  );
});
