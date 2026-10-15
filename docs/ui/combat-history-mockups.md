# Combat history mockups

Open [the HTML prototype](combat-history-mockups.html) in a browser. All records are fictional sample data. No campaign API calls or application changes are involved.

The proposed **Combat history** tab sits beside **Prepared encounters** on the encounters page. The mockups cover three connected views and an empty state:

- **History:** Search saved runs, filter by outcome, and optionally include test runs. Multiple runs of an encounter remain separate records.
- **Fight report:** Switch between damage, healing, and turn times; inspect party, enemies, or all combatants. Each round links to its log.
- **Round log:** Filter by round and event type, inspect applied results, and see manual attribution and undo history.
- **Empty state:** Explain what will be recorded and return to prepared encounters.

The prototype includes light/dark mode, all four existing accent palettes, responsive layouts, and a working sample CSV export. The palette values come from `frontend/src/themeVariables.scss` and `frontend/src/app/theme.tsx`. Navigation outside the encounters workflow is shown only as application context.

## Proposed recording rules

- Save each finished run automatically, including runs stopped early. Preserve the roster as it existed during the run.
- Keep test runs separate and exclude them from default history and totals.
- Count applied damage after defenses. Keep DM-entered damage attributable to its source, including physical dice rolls.
- Count actual HP restored as healing; show overhealing separately. Keep temporary HP separate from healing.
- Preserve undone events in the log while excluding them from reported totals.
- Show completed-turn time and average turn duration. Exclude pauses; retain pause duration separately. Missing timing or attribution should remain explicitly unknown rather than become zero.
- Keep reports descriptive. Turn time measures table pace and should not rank players by a performance score.

## Existing foundation and later implementation

`CombatPerformanceSummary.tsx` already displays per-run damage, healing, and turn times, while `CombatLog.tsx` displays recent combat events. A production implementation should extend those foundations and the existing layout primitives.

Before implementation, check run retention, history queries, pause handling, manual attribution, undo reconciliation, and what historic events can reliably reconstruct. Overhealing, persisted session labels/DM notes, filtering, and export in this prototype are proposed capabilities, not a claim that they are already stored. The scope here is HTML mockups only.
