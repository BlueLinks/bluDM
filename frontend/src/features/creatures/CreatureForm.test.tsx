import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import { CreatureForm } from "./CreatureForm";
import { CreatureLibraryList } from "./CreatureLibraryList";
import { actionFixture, creatureFixture, spellcastingFixture } from "./creatureTestFixtures";

vi.mock("../../lib/api", () => ({
  api: {
    actionTemplates: vi.fn(),
    spells: vi.fn(),
    createCreature: vi.fn(),
    updateCreature: vi.fn(),
    replaceCreatureActions: vi.fn(),
    saveCreatureSpellcasting: vi.fn(),
    creatureActions: vi.fn(),
    creatureSpellcasting: vi.fn(),
    standardSources: vi.fn(),
  },
}));

afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.actionTemplates).mockResolvedValue({ actionTemplates: [] });
  vi.mocked(api.spells).mockResolvedValue({ spells: [] });
  vi.mocked(api.standardSources).mockResolvedValue({ sources: [] });
  vi.mocked(api.createCreature).mockResolvedValue({ creature: creatureFixture() });
  vi.mocked(api.updateCreature).mockResolvedValue({ creature: creatureFixture() });
  vi.mocked(api.replaceCreatureActions).mockResolvedValue({ actions: [actionFixture()] });
  vi.mocked(api.saveCreatureSpellcasting).mockResolvedValue({
    spellcasting: spellcastingFixture(),
  });
  vi.mocked(api.creatureActions).mockResolvedValue({ actions: [actionFixture()] });
  vi.mocked(api.creatureSpellcasting).mockResolvedValue({
    spellcasting: spellcastingFixture(),
  });
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

function mountForm(mode: "create" | "edit" = "edit") {
  const saved = vi.fn();
  const router = createMemoryRouter(
    [
      {
        path: "/npcs/new",
        element: (
          <CreatureForm
            mode={mode}
            creature={mode === "edit" ? creatureFixture() : undefined}
            existingActions={mode === "edit" ? [actionFixture()] : []}
            spellcasting={mode === "edit" ? spellcastingFixture() : undefined}
            notify={vi.fn()}
            onSaved={saved}
          />
        ),
      },
      { path: "/npcs", element: <p>Library destination</p> },
    ],
    { initialEntries: ["/npcs/new"] },
  );
  render(<RouterProvider router={router} />);
  return { saved, router };
}

describe("sectioned creature editor", () => {
  it("keeps steppers, proficiency checkboxes, defenses, and spell flags through save", async () => {
    const { saved } = mountForm();
    await screen.findByRole("button", { name: "Save changes" });
    fireEvent.click(screen.getByRole("button", { name: /Abilities & skills/ }));
    fireEvent.click(screen.getByRole("button", { name: "Increase STR" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase Perception bonus" }));
    fireEvent.click(screen.getByLabelText("Perception expertise"));
    fireEvent.click(screen.getByRole("button", { name: /Senses & defenses/ }));
    fireEvent.click(screen.getByRole("button", { name: "Increase Passive Perception" }));
    fireEvent.click(screen.getByLabelText("Fire immune"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    const updated = vi.mocked(api.updateCreature).mock.calls[0]?.[1];
    expect(updated?.abilityScores.str).toBe("18");
    expect(updated?.skillAdjustments).toEqual({ Perception: 3 });
    expect(updated?.skillExpertise).toEqual(["Perception"]);
    expect(updated?.damageImmunities).toEqual(["fire"]);
    expect(updated?.passivePerception).toBe("11");
    expect(updated?.spellRefs[0]).toMatchObject({ innate: true, prepared: false });
    const savedActions = vi.mocked(api.replaceCreatureActions).mock.calls[0]?.[1];
    expect(savedActions?.[0].rolls[0]).toMatchObject({
      diceCount: "0",
      dieSize: "0",
      fixedValue: "7",
    });
  });

  it("prompts before leaving a dirty form", async () => {
    const { router } = mountForm();
    fireEvent.click(screen.getByRole("button", { name: "Increase AC" }));
    await screen.findByText("Unsaved changes");
    void router.navigate("/npcs");
    expect(await screen.findByText("Discard unsaved changes?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText("Discard unsaved changes?")).toBeNull());
    expect(screen.queryByText("Library destination")).toBeNull();
    void router.navigate("/npcs");
    fireEvent.click(await screen.findByRole("button", { name: "Discard and leave" }));
    expect(await screen.findByText("Library destination")).toBeTruthy();
  });

  it("retries a partial create against the same creature", async () => {
    vi.mocked(api.replaceCreatureActions).mockRejectedValueOnce(new Error("temporary failure"));
    const { saved } = mountForm("create");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ashen Wolf" } });
    fireEvent.click(screen.getByRole("button", { name: "Create creature" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create creature" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(api.createCreature).toHaveBeenCalledOnce();
    expect(api.updateCreature).toHaveBeenCalledWith(
      "wolf",
      expect.objectContaining({ name: "Ashen Wolf" }),
    );
  });
});

describe("custom creature library", () => {
  it("previews custom combat data and separates SRD content", async () => {
    const router = createMemoryRouter([
      {
        path: "/",
        element: (
          <CreatureLibraryList
            creatures={[
              creatureFixture(),
              creatureFixture({
                id: "srd",
                name: "Dire Wolf",
                librarySource: "standard",
                readOnly: true,
                sourceLabel: "SRD 2014",
                sourceKey: "srd-2014",
              }),
            ]}
            onRemove={vi.fn()}
          />
        ),
      },
    ]);
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("button", { name: "View Ashen Wolf, my creation" })).toBeTruthy();
    expect(await screen.findByText("Ember Bite.")).toBeTruthy();
    expect(screen.getByText(/Faerie Fire/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /SRD library/ }));
    expect(screen.getByRole("button", { name: "View Dire Wolf, SRD 2014" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit creature" })).toBeNull();
    expect(screen.getByRole("button", { name: "Copy to my creations" })).toBeTruthy();
  });
});
