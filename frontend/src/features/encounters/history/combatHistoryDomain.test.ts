import { describe, expect, it } from "vitest";
import {
  activeTime,
  averageTurn,
  duration,
  eventAmounts,
  overhealing,
  reportCSV,
  reportEvents,
} from "./combatHistoryDomain";
import { historyEvent, historyRun } from "./combatHistoryFixtures";
import { matchesCombatLogFilter } from "../../combat/combatLogFilters";

describe("combat report calculations", () => {
  it("uses server-recorded durations rather than the viewing device clock", () => {
    const run = historyRun();
    expect(activeTime(run)).toBe(120000);
    expect(averageTurn(run.combatants![0], run)).toBe(90000);
    expect(duration(activeTime(run))).toBe("2:00");
    run.timing = undefined;
    expect(activeTime(run)).toBeNull();
    expect(duration(activeTime(run))).toBe("Not recorded");
  });
  it("separates effective healing, overheal, and blocked healing", () => {
    const event = historyEvent("heal", 1, "manual_hp", {
      mode: "healing",
      amount: 10,
      targetBefore: { currentHitPoints: 18 },
      targetAfter: { currentHitPoints: 20 },
    });
    expect(eventAmounts(event)).toEqual({ damage: 0, healing: 2, overheal: 8 });
    expect(
      eventAmounts(
        historyEvent("resolution", 2, "resolution_applied", {
          results: [
            { healing: 2, healingRequested: 10, finalDamage: 4 },
            { healing: 0, healingRequested: 10, healingBlocked: true },
          ],
        }),
      ),
    ).toEqual({ damage: 4, healing: 2, overheal: 8 });
  });
  it("keeps zero-restoration attempts and manual damage in their log filters", () => {
    expect(
      matchesCombatLogFilter(
        historyEvent("heal", 1, "manual_hp", { mode: "healing", amount: 0, requestedAmount: 10 }),
        "healing",
      ),
    ).toBe(true);
    expect(
      matchesCombatLogFilter(
        historyEvent("damage", 2, "manual_hp", { mode: "damage", amount: 8 }),
        "damage",
      ),
    ).toBe(true);
    expect(
      matchesCombatLogFilter(
        historyEvent("blocked", 3, "resolution_applied", {
          results: [{ healing: 0, healingRequested: 10, healingBlocked: true }],
        }),
        "healing",
      ),
    ).toBe(true);
  });
  it("keeps full chronological round history and marks undone results", () => {
    const run = historyRun();
    const turn = historyEvent("turn", 3, "turn_changed", {
      before: { round: 1 },
      after: { round: 2 },
    });
    run.events = [historyEvent("undo", 4, "undo", { undoneEventId: "turn" }), turn, ...run.events!];
    const mapped = reportEvents(run);
    expect(mapped.map(({ event }) => event.sequence)).toEqual([0, 1, 2, 3, 4]);
    expect(mapped[3]).toMatchObject({ round: 2, undone: true });
    expect(mapped[4].round).toBe(1);
    expect(overhealing(run.combatants![0], run)).toBe(8);
    run.events.push(historyEvent("undo-heal", 5, "undo", { undoneEventId: "heal" }));
    expect(overhealing(run.combatants![0], run)).toBe(0);
  });
  it("exports CSV with units, quoting, unknown timing, and formula protection", () => {
    const run = historyRun();
    run.combatants![0].displayName = '=HYPERLINK("unsafe")';
    const csv = reportCSV(run, "Bridge, north\nroad");
    expect(csv).toContain('"Bridge, north\nroad"');
    expect(csv).toContain('"\'=HYPERLINK(""unsafe"")"');
    expect(csv).toContain('"90","1","90"');
    run.timing = undefined;
    expect(reportCSV(run, "Bridge")).toContain('"Not recorded","Not recorded","Not recorded"');
  });
});
