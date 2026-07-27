import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import type { Encounter, EncounterRun, EncounterRunCombatant } from "../../types";
import {
  EncounterInitiativePage,
  orderInitiativePreview,
  reorderTiedInitiative,
} from "./initiativePage";

vi.mock("../../lib/api", () => ({
  api: {
    beginEncounterRun: vi.fn(),
    clearInitiative: vi.fn(),
    encounter: vi.fn(),
    encounterRun: vi.fn(),
    reorderInitiative: vi.fn(),
    rollInitiative: vi.fn(),
    setInitiative: vi.fn(),
  },
}));

let serverRun: EncounterRun;

beforeEach(() => {
  vi.clearAllMocks();
  serverRun = runFixture();
  vi.mocked(api.encounterRun).mockImplementation(() =>
    Promise.resolve({ run: structuredClone(serverRun) }),
  );
  vi.mocked(api.encounter).mockResolvedValue({ encounter: encounterFixture() });
  vi.mocked(api.setInitiative).mockImplementation((_runID, combatantID, initiative) => {
    serverRun = {
      ...serverRun,
      combatants: (serverRun.combatants ?? []).map((combatant) =>
        combatant.id === combatantID
          ? {
              ...combatant,
              initiative: initiative ?? 0,
              initiativeSet: initiative !== null,
            }
          : combatant,
      ),
    };
    return Promise.resolve({ run: structuredClone(serverRun) });
  });
  vi.mocked(api.rollInitiative).mockImplementation((_runID, sides) => {
    serverRun = {
      ...serverRun,
      combatants: (serverRun.combatants ?? []).map((combatant, index) =>
        sides.includes(combatant.side)
          ? { ...combatant, initiative: 14 - index, initiativeSet: true }
          : combatant,
      ),
    };
    return Promise.resolve({ run: structuredClone(serverRun) });
  });
  vi.mocked(api.clearInitiative).mockImplementation(() => {
    serverRun = {
      ...serverRun,
      combatants: (serverRun.combatants ?? []).map((combatant) => ({
        ...combatant,
        initiative: 0,
        initiativeSet: false,
      })),
    };
    return Promise.resolve({ run: structuredClone(serverRun) });
  });
  vi.mocked(api.reorderInitiative).mockImplementation((_runID, combatantIDs) => {
    const positions = new Map(combatantIDs.map((id, index) => [id, index]));
    serverRun = {
      ...serverRun,
      combatants: (serverRun.combatants ?? []).map((combatant) => ({
        ...combatant,
        sortOrder: positions.get(combatant.id) ?? combatant.sortOrder,
      })),
    };
    return Promise.resolve({ run: structuredClone(serverRun) });
  });
  vi.mocked(api.beginEncounterRun).mockImplementation(() =>
    Promise.resolve({
      run: { ...structuredClone(serverRun), status: "active", currentRound: 1 },
    }),
  );
});

afterEach(cleanup);

describe("EncounterInitiativePage", () => {
  it("keeps player rolls manual and rolls NPCs and allies only", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Set initiative" });

    expect(screen.queryByRole("button", { name: /roll players/i })).toBeNull();
    expect(screen.getAllByText(/physical roll/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Roll NPCs & allies" }));
    await waitFor(() =>
      expect(api.rollInitiative).toHaveBeenCalledWith("run-1", ["friendly", "enemy"]),
    );

    fireEvent.click(screen.getByRole("button", { name: "Re-roll allies" }));
    await waitFor(() => expect(api.rollInitiative).toHaveBeenCalledWith("run-1", ["friendly"]));
    fireEvent.click(screen.getByRole("button", { name: "Re-roll enemies" }));
    await waitFor(() => expect(api.rollInitiative).toHaveBeenCalledWith("run-1", ["enemy"]));

    expect(api.rollInitiative).not.toHaveBeenCalledWith("run-1", ["player"]);
  });

  it("commits manual zero and negative values without persisting intermediate keystrokes", async () => {
    renderPage();
    const hero = await screen.findByLabelText<HTMLInputElement>("Borin initiative");

    fireEvent.change(hero, { target: { value: "0" } });
    expect(api.setInitiative).not.toHaveBeenCalled();
    fireEvent.blur(hero);
    await waitFor(() => expect(api.setInitiative).toHaveBeenCalledWith("run-1", "player-1", 0));
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>("Borin initiative").value).toBe("0"),
    );

    const scout = screen.getByLabelText<HTMLInputElement>("Mira initiative");
    fireEvent.focus(scout);
    fireEvent.change(scout, { target: { value: "-3" } });
    expect(scout.value).toBe("-3");
    fireEvent.keyDown(scout, { key: "Enter" });
    await waitFor(() => expect(api.setInitiative).toHaveBeenCalledWith("run-1", "player-2", -3));
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>("Mira initiative").value).toBe("-3"),
    );

    const generated = screen.getByLabelText<HTMLInputElement>("Goblin initiative");
    fireEvent.change(generated, { target: { value: "-1" } });
    fireEvent.blur(generated);
    await waitFor(() => expect(api.setInitiative).toHaveBeenCalledWith("run-1", "enemy-1", -1));
  });

  it("leaves empty input unresolved and disables begin until every value is ready", async () => {
    renderPage();
    const hero = await screen.findByLabelText<HTMLInputElement>("Borin initiative");
    const begin = screen.getByRole<HTMLButtonElement>("button", { name: "Begin Combat" });

    fireEvent.change(hero, { target: { value: "" } });
    fireEvent.blur(hero);
    expect(api.setInitiative).not.toHaveBeenCalledWith("run-1", "player-1", 0);
    expect(begin.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Roll NPCs & allies" }));
    await waitFor(() => expect(api.rollInitiative).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>("Tamsin initiative").value).not.toBe(""),
    );
    for (const [label, value] of [
      ["Borin initiative", "0"],
      ["Mira initiative", "-2"],
    ]) {
      const input = screen.getByLabelText<HTMLInputElement>(label);
      fireEvent.change(input, { target: { value } });
      fireEvent.blur(input);
      await waitFor(() =>
        expect(api.setInitiative).toHaveBeenCalledWith(
          "run-1",
          label === "Borin initiative" ? "player-1" : "player-2",
          Number(value),
        ),
      );
      await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>(label).value).toBe(value));
    }
    await waitFor(() =>
      expect(screen.getByRole<HTMLButtonElement>("button", { name: "Begin Combat" }).disabled).toBe(
        false,
      ),
    );
  });

  it("clears initiative through the bulk operation", async () => {
    serverRun = {
      ...serverRun,
      combatants: (serverRun.combatants ?? []).map((combatant, index) => ({
        ...combatant,
        initiative: index,
        initiativeSet: true,
      })),
    };
    renderPage();
    await screen.findByRole("heading", { name: "Set initiative" });

    fireEvent.click(screen.getByRole("button", { name: "Clear values" }));
    await waitFor(() => expect(api.clearInitiative).toHaveBeenCalledWith("run-1"));
    expect(screen.getByText("4 values still unresolved")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Begin Combat" }).disabled).toBe(
      true,
    );
  });

  it("orders the single preview by initiative and preserves explicit tie moves", () => {
    const combatants = [
      combatant("low", "Low", "player", 2, true, 0),
      combatant("tie-a", "Tie A", "enemy", 18, true, 1),
      combatant("tie-b", "Tie B", "friendly", 18, true, 2),
      combatant("unset", "Unset", "enemy", 0, false, 3),
    ];
    const ordered = orderInitiativePreview(combatants);
    expect(ordered.map((item) => item.id)).toEqual(["tie-a", "tie-b", "low", "unset"]);
    expect(reorderTiedInitiative(ordered, "tie-b", "tie-a")?.map((item) => item.id)).toEqual([
      "tie-b",
      "tie-a",
      "low",
      "unset",
    ]);
    expect(reorderTiedInitiative(ordered, "low", "tie-a")).toBeNull();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/encounter-runs/run-1/initiative"]}>
      <Routes>
        <Route path="/encounter-runs/:runID/initiative" element={<EncounterInitiativePage />} />
        <Route path="/encounter-runs/:runID" element={<div>Combat tracker</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function runFixture(): EncounterRun {
  return {
    id: "run-1",
    encounterId: "encounter-1",
    status: "setup",
    isTest: false,
    currentRound: 0,
    currentTurnIndex: 0,
    startedAt: "2026-07-19T10:00:00Z",
    summary: {},
    combatants: [
      combatant("player-1", "Borin", "player", 0, false, 0),
      combatant("player-2", "Mira", "player", 0, false, 1),
      combatant("friendly-1", "Tamsin", "friendly", 0, false, 2),
      combatant("enemy-1", "Goblin", "enemy", 12, true, 3),
    ],
    events: [],
    spellSlots: [],
    activeEffects: [],
    alerts: [],
  };
}

function combatant(
  id: string,
  displayName: string,
  side: EncounterRunCombatant["side"],
  initiative: number,
  initiativeSet: boolean,
  sortOrder: number,
): EncounterRunCombatant {
  return {
    id,
    encounterRunId: "run-1",
    sourceType: side === "player" ? "player" : "creature",
    side,
    displayName,
    colorLabel: "",
    avatarUrl: "",
    armorClass: 14,
    maxHitPoints: 20,
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    maxHitPointsModifier: 0,
    armorClassBonus: 0,
    armorClassOverride: 0,
    maxHitPointsOverride: 0,
    currentHitPointsOverride: 0,
    initiative,
    initiativeSet,
    sortOrder,
    defeated: false,
    conditions: [],
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    healingReceived: 0,
    kills: 0,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    stable: false,
    snapshot: {},
  };
}

function encounterFixture(): Encounter {
  return {
    id: "encounter-1",
    campaignId: "campaign-1",
    name: "Roadside Trouble",
    description: "",
    status: "planned",
    location: "North Road",
    roomNumber: "",
    lootNotes: "",
    combatantCount: 0,
    enemyCount: 0,
    createdAt: "",
    updatedAt: "",
    combatants: [],
  };
}
