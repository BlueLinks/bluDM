# Encounter Run / Combat Tracker

The active encounter workspace uses the original repository layout again. The restoration source
is the committed frontend at:

- remote: `origin`
- ref: `origin/codex/issue-101-campaign-locations-foundation`
- commit: `2214a8ed9c3fe87d9c160f76809e065bd0f43cac`
- common ancestor with the working branch:
  `2214a8ed9c3fe87d9c160f76809e065bd0f43cac`

The newer Combat Tracker and resolution work was uncommitted on top of that commit. The
restoration therefore copied the historical components forward selectively instead of resetting
the branch or discarding the newer backend work.

## Restored interaction hierarchy

The desktop tracker once again follows the original order:

1. Encounter turn controls
2. Compact current-turn action strip
3. Three-column combat board
4. Combat log

The board columns are the historical components from `2214a8e`:

1. **Active Sheet** for the current combatant
2. **Initiative & Targets**
3. **Target Sheet**, or **Target Detail** before a target is selected

The permanent `Resolve` column, `Selected Sheet` tab workspace, separate target buttons, and
Initiative / Sheet / Action / Log pane switcher from the later redesign are no longer part of the
rendered tracker.

### Header

The historical compact status bar is restored. It contains round, turn, timer, previous turn,
next turn, undo, meters, and finish-combat controls. Resolution state is not displayed in the
header.

### Current-turn action strip

The original `CombatActiveTurnPanel` is rendered above the three-column board. It shows:

- current combatant and initiative;
- one selected target summary;
- immediate amount, damage, and healing controls;
- damage type;
- modelled actions;
- spells;
- spell-slot management where applicable.

`Request save` and `Manual result` are the only additions to the historical strip. They appear
compactly after a target is selected and open the hardened resolution dialogs. They do not create
a permanent resolution workspace.

### Initiative and targeting

The historical `TargetRow` is restored. A row click selects that combatant as the current target
and opens the target sheet, matching the original interaction. Rows show:

- initiative;
- portrait or initials;
- name;
- AC;
- current and maximum HP;
- HP bar;
- current-turn and target markers;
- conditions and active effects;
- death-save state where relevant.

The data layer still keeps actor, target IDs, current turn, and resolution drafts distinct. The
visible row interaction intentionally couples target selection and target-sheet inspection because
that is how the original tracker worked.

### Sheets

`CombatSheet.tsx` is restored byte-for-byte from `2214a8e`. The active and target sheets use the
original compact presentation:

- identity and descriptor;
- AC, HP, and speed;
- ability scores, modifiers, and saving throws;
- skills;
- direct check and save rolls.

The later Overview / Defenses / Conditions / Notes tab workspace, temporary-HP stat tile, passive
perception tile, and `Use actions` control are not rendered.

## Saving throws

Saving throws remain an occasional overlay. Selecting a target and choosing `Request save` opens
the hardened save dialog with:

- source, save ability, and DC;
- pending, automatic, physical, manual, and excluded target states;
- `Roll remaining`;
- concise unresolved-result guidance;
- Apply disabled until every included target is resolved;
- physical normal rolls requiring one die;
- physical advantage and disadvantage requiring both dice;
- explicit success and failure outcomes;
- advanced damage, mitigation, condition, and note fields only when expanded.

Closing the dialog returns to the original action strip and three-column board. Pending results are
never persisted when the dialog is cancelled.

## Preserved correctness work

The restoration does not alter or weaken the newer backend and transactional hardening:

- unresolved included saves are rejected;
- target results remain unresolved until rolled, physically entered, manually resolved, or
  excluded;
- spell-slot commits detect stale concurrent updates;
- target, actor, metric, event, and optional resource writes are atomic;
- failed resource commits roll back the entire resolution;
- undo restores target, actor, condition, and committed spell-slot state;
- temporary HP is consumed before normal HP;
- healing does not restore temporary HP;
- temporary HP, healing, recovery, and final-damage metrics retain backend coverage;
- durable combat events and persistence/resume behavior remain intact.

The newer spell dialog resource checks, captured actor/target IDs for pending attacks, save
resolution model, manual-resolution model, combat log, API endpoint, store transaction, and
regression tests remain in place.

## Design-system treatment

The historical component structure is used with the current shared bluDM primitives and semantic
tokens already present at `2214a8e`:

- theme-backed primary, secondary, and tertiary roles;
- semantic success, warning, and destructive states;
- shared buttons, inputs, selects, badges, panels, and stat cards;
- compact spacing and moderate radii;
- restrained borders and shadows;
- light/dark and accent-theme compatibility.

No new page-specific palette, gradient, dashboard metric, or replacement layout was introduced.

## Responsive behavior

- Desktop and wide laptop: Active Sheet / Initiative & Targets / Target Sheet.
- With meters enabled: the historical optional fourth metrics column.
- Narrow screens: the historical grid stacks naturally in document order.
- Resolution dialogs retain their responsive modal/drawer behavior.
- No page-level horizontal overflow should be introduced by the restored board.

## Docker deployment

Rebuild the local frontend without deleting volumes or resetting encounter data:

```bash
docker compose up -d --build web
```

The deployment is served at `http://localhost:3080`. Health endpoints:

```text
http://localhost:3080/health
http://localhost:3080/api/health
```

The verified production tracker chunk is `assets/trackerPage-Cb8pnPph.js`. It contains the
historical `Active Sheet`, `Initiative & Targets`, `Target Detail`, and `Target Sheet` labels and
does not contain the discarded `Selected Sheet`, `Turn actions`, or `Quick damage and healing`
workspace labels.

## Browser references

The committed frontend implementation at `2214a8e` is the source of truth for this restoration.
Images under this directory include both historical references and captures from the discarded
redesign; they should not be treated as interchangeable.

The most important visual acceptance check is that Roadside Trouble renders:

- the compact current-turn strip above the board;
- Active Sheet on the left;
- Initiative & Targets in the centre;
- Target Sheet or Target Detail on the right;
- no permanent Resolve column;
- no Selected Sheet tab workspace.

The final browser smoke test used a newly started Roadside Trouble run and confirmed:

- the three historical board columns at the desktop viewport;
- row selection opens `Target Sheet`;
- `Request save` opens an overlay rather than replacing a board column;
- unresolved saves disable `Apply 1 result` and show the pending-results explanation;
- no browser console errors;
- no page-level horizontal overflow at 390 px;
- the historical stacked mobile order remains usable.

## Remaining scope

- Capture replacement committed QA images if a durable visual record is wanted.
- Consider whether multi-target selection should return in a future pass; it is intentionally not
  part of this historical UI restoration.
