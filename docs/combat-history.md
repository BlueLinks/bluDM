# Combat history

The encounters workspace has **Prepared encounters** and **Combat history** tabs. History lists finished combats and saved runs, with search, status filtering, test-run visibility, and pages of 20 runs. A combat awaiting XP/loot review can be inspected without resuming its clock. Saving the summary opens its report.

Reports include party/allied totals, enemy and party damage/healing meters, damage received, recorded overhealing, total and average completed-turn times, round navigation, the complete event log, and a CSV export. Undone events remain visible in the log and are excluded from the persisted meters. Temporary HP is separate from healing.

## Persistence and timing

This extends the existing run snapshots, meters, and combat log. It needs no database migration. Newly started runs snapshot the encounter name; older runs fall back to the current name. Rerunning an encounter creates a separate history record.

Timing comes from the server's complete persisted timeline. Summary pauses are excluded. Resuming or revisiting a logical turn combines its measured segments within the same round/combatant; averages use completed turns. Missing historical timing is shown as **Not recorded**. Reading a report never issues a resume command.

Manual healing now records actual restored HP and the originally requested amount. Reports correct older overcounted manual-healing meters where the stored before/after HP proves the difference. This correction changes only the response, not historical storage. Overhealing without sufficient historical detail cannot be reconstructed. Unattributed changes stay in the log rather than being assigned to a player.

## Internal session APIs

- `GET /api/campaigns/{campaignID}/combat-history?q=&status=&includeTests=false&page=1` returns `{ runs, total }`. Status is empty, `completed`, or `finished` (awaiting summary).
- `GET /api/encounter-runs/{runID}/report` returns `{ run, campaignId, encounterName }`. Unlike the tracker, its event log is complete rather than capped at the latest 80 entries.

Both endpoints require a session and enforce campaign ownership. History loads the page's rosters and clock events in batches. CSV quotes cells and neutralizes spreadsheet formulas in user-authored names.

## Limits and follow-up

Session labels, narrative outcomes such as victory/retreat, and DM report notes are not currently stored, so reports do not invent them. The mockups illustrate those possible additions.

The existing encounter deletion behavior also deletes its runs and history. The removal confirmation now says so explicitly. A future archive/retention feature should preserve reports independently of deleting a prepared encounter; that requires a separate data-lifecycle change.

The existing live tracker still uses its own elapsed-time ticker. Historical reports use persisted durations and do not depend on the viewing device's clock.

## Verification

- `make verify`: frontend lint, formatting, repository file-size checks, frontend/backend tests, Go vet, production build, and Compose configuration.
- Store and HTTP integration tests use an isolated PostgreSQL container and verify owner isolation, paging, test-run exclusion, complete logs, effective healing, name snapshots, and report reads that leave the clock stopped.
- Targeted Chromium QA covers history and report routes at desktop/mobile sizes, light/dark themes, search, test filters, metric/team controls, log filters, and CSV download. API fixtures are used for browser QA; database behavior is exercised by integration tests.
- `docker compose build api web` and local service health checks.
- `make verify-security` passes on the current main baseline: the frontend dependency audit passes, the Go 1.26.9 vulnerability scan reports no affected vulnerabilities, and Gosec reports no issues. This feature adds no dependencies.
