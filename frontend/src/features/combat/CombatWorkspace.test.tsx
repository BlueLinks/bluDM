import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RollLogProvider } from "../../components/RollLogProvider";
import { api } from "../../lib/api";
import type { CombatLogEvent, EncounterRun, EncounterRunCombatant } from "../../types";
import { eventLabel } from "./CombatLog";
import { CombatSheet } from "./CombatSheet";
import { CombatWorkspace } from "./CombatWorkspace";
import { TargetRow } from "./TargetRow";

vi.mock("../../lib/api", () => ({
  api: {
    rollCheck: vi.fn(),
  },
}));

afterEach(cleanup);

describe("encounter combat workspace", () => {
  it("uses the historical initiative row to select a target and exposes AC and HP", () => {
    const onSelect = vi.fn();
    const target = combatant("target", "Goblin", {
      armorClass: 14,
      armorClassBonus: 1,
      currentHitPoints: 8,
      maxHitPoints: 20,
    });

    render(
      <TargetRow
        combatant={target}
        selected={false}
        onDeathSave={vi.fn()}
        onEdit={vi.fn()}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByTitle("Armor Class").textContent).toContain("15");
    expect(screen.getByText(/8\/20 HP/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Goblin/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("restores the historical three-column board and keeps saves in an overlay", () => {
    const actor = combatant("actor", "Mage", { side: "player", sourceType: "player" });
    const target = combatant("target", "Goblin");
    const run: EncounterRun = {
      id: "run",
      encounterId: "encounter",
      status: "active",
      isTest: false,
      currentRound: 1,
      currentTurnIndex: 0,
      startedAt: "2026-07-16T10:00:00Z",
      summary: {},
      combatants: [actor, target],
      events: [],
      spellSlots: [],
      activeEffects: [],
      alerts: [],
    };

    render(
      <RollLogProvider>
        <CombatWorkspace
          actions={[]}
          active={actor}
          acting={actor}
          actorNeedsDeathSaves={false}
          combatStartedAt={run.startedAt}
          damageType=""
          downEnemies={[]}
          hpAmount=""
          hpMultiplier="full"
          orderedCombatants={[actor, target]}
          run={run}
          selectedSheet={actor}
          selectedSheetID={actor.id}
          showMeters={false}
          spells={[]}
          spellSlotsTracked={false}
          targetIDs={[target.id]}
          onAction={vi.fn()}
          onActorChange={vi.fn()}
          onAddTarget={vi.fn()}
          onAmountChange={vi.fn()}
          onApplyResolution={vi.fn().mockResolvedValue(undefined)}
          onClearTargets={vi.fn()}
          onConcentrationResolve={vi.fn()}
          onDamageTypeChange={vi.fn()}
          onDeathSave={vi.fn()}
          onEdit={vi.fn()}
          onHpMultiplierChange={vi.fn()}
          onManual={vi.fn()}
          onOpenManualSlots={vi.fn()}
          onOpenSpells={vi.fn()}
          onRemoveTarget={vi.fn()}
          onRoll={vi.fn()}
          onSelectSheet={vi.fn()}
          onToggleTarget={vi.fn()}
        />
      </RollLogProvider>,
    );

    const actionBar = screen.getByLabelText("Current turn controls");
    const activeSheet = screen.getByRole("heading", { name: "Active Sheet" });
    const initiative = screen.getByRole("heading", { name: "Initiative & Targets" });
    const targetSheet = screen.getByRole("heading", { name: "Target Sheet" });
    expect(
      actionBar.compareDocumentPosition(activeSheet) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      activeSheet.compareDocumentPosition(initiative) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      initiative.compareDocumentPosition(targetSheet) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Request save" }));
    fireEvent.change(screen.getByLabelText("Goblin result method"), {
      target: { value: "physical" },
    });
    fireEvent.change(screen.getByLabelText("First die for Goblin"), {
      target: { value: "12" },
    });

    expect(screen.getByLabelText<HTMLInputElement>("First die for Goblin").value).toBe("12");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "Resolve saving throws" })).toBeNull();
    expect(screen.getByPlaceholderText("Amount")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Request save" })).toBeTruthy();
  });

  it("rolls a save for the sheet combatant instead of the current turn", async () => {
    vi.mocked(api.rollCheck).mockResolvedValue({
      result: { d20: 12, d20Rolls: [12], total: 16 },
    });
    const selected = combatant("selected", "Out-of-turn Scout", {
      snapshot: {
        player: {
          characterSheet: {
            abilityScores: { str: 10, dex: 12, con: 10, int: 10, wis: 14, cha: 10 },
            proficiencyBonus: 2,
            savingThrowProficiencies: ["wis"],
          },
        },
      },
      sourceType: "player",
      side: "player",
    });

    render(
      <RollLogProvider>
        <CombatSheet combatant={selected} runID="run" onRoll={vi.fn()} />
      </RollLogProvider>,
    );

    fireEvent.click(
      screen.getByTitle(
        "WIS saving throw. Shift-click for advantage, Control-click for disadvantage.",
      ),
    );
    await waitFor(() =>
      expect(api.rollCheck).toHaveBeenCalledWith(
        "run",
        expect.objectContaining({ actorId: "selected", ability: "wis", bonus: 4 }),
      ),
    );
  });

  it("renders the original compact sheet without the replacement tab workspace", () => {
    const selected = combatant("selected", "Ward Knight", {
      temporaryHitPoints: 6,
      conditions: ["Prone"],
      snapshot: {
        creature: {
          statBlock: {
            damageResistances: ["fire"],
            damageImmunities: ["poison"],
            senses: { Darkvision: { enabled: true, range: 60 } },
          },
        },
      },
    });
    render(
      <RollLogProvider>
        <CombatSheet combatant={selected} runID="run" onRoll={vi.fn()} />
      </RollLogProvider>,
    );
    expect(screen.getByRole("heading", { name: "Active Sheet" })).toBeTruthy();
    expect(screen.getByText("AC")).toBeTruthy();
    expect(screen.getByText("HP")).toBeTruthy();
    expect(screen.getByText("Speed")).toBeTruthy();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("formats durable HP log entries with source, target, type, and resulting HP", () => {
    const event: CombatLogEvent = {
      id: "event",
      encounterRunId: "run",
      sequence: 3,
      eventType: "manual_hp",
      actorId: "actor",
      targetId: "target",
      createdAt: "2026-07-13T10:00:05Z",
      payload: {
        amount: 7,
        damageType: "fire",
        mode: "damage",
        targetAfter: { currentHitPoints: 3 },
      },
    };

    expect(eventLabel(event, [combatant("actor", "Mage"), combatant("target", "Goblin")])).toBe(
      "Mage dealt 7 fire damage to Goblin (3 HP remaining)",
    );
  });
});

function combatant(
  id: string,
  displayName: string,
  overrides: Partial<EncounterRunCombatant> = {},
): EncounterRunCombatant {
  return {
    armorClass: 12,
    armorClassBonus: 0,
    armorClassOverride: 0,
    avatarUrl: "",
    colorLabel: "",
    conditions: [],
    currentHitPoints: 10,
    currentHitPointsOverride: 0,
    damageDealt: 0,
    damageTaken: 0,
    deathSaveFailures: 0,
    deathSaveSuccesses: 0,
    defeated: false,
    displayName,
    encounterRunId: "run",
    healingDone: 0,
    healingReceived: 0,
    id,
    initiative: 10,
    initiativeSet: true,
    kills: 0,
    maxHitPoints: 20,
    maxHitPointsModifier: 0,
    maxHitPointsOverride: 0,
    side: "enemy",
    snapshot: {},
    sourceType: "creature",
    stable: false,
    sortOrder: 0,
    temporaryHitPoints: 0,
    ...overrides,
  };
}
