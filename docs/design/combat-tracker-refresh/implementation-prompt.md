# Implementation Prompt

Copy the prompt below into a new Codex task when you are ready to implement the flow.

```text
Implement the complete DM-only encounter flow refresh for bluDM. Work through the implementation,
tests, and targeted browser QA; do not stop after analysis or return only a plan.

Read and follow the repository AGENTS.md first. Preserve unrelated user changes. Do not commit,
push, or open a PR unless I ask after the implementation is complete.

Design references

- docs/design/combat-tracker-refresh/README.md
- docs/design/combat-tracker-refresh/encounter-builder-refined.png
- docs/design/combat-tracker-refresh/encounter-edit-refined-v2.png
- docs/design/combat-tracker-refresh/encounter-initiative-physical-dice.png
- docs/design/combat-tracker-refresh/combat-tracker-focus-light.png
- docs/design/combat-tracker-refresh/combat-tracker-focus-dark-actions.png

Treat the mockups as interaction and hierarchy references, not pixel-perfect specifications.
Implement them with the existing semantic tokens, shared components, domain helpers, API clients,
and layout primitives. Inspect frontend/src/components/layout before adding layout code. Search
for existing patterns before creating abstractions and extend existing components where practical.

Product model

- This interface is used only by the DM.
- Players roll physical dice; do not add a player portal or player-facing dice controls.
- Player initiative is always entered manually from values called out at the table.
- The DM can roll initiative for allies and enemies together or by side.
- Every generated NPC or ally initiative remains manually editable.
- Initiative 0 and negative initiative values are valid. Empty means unresolved and must never be
  coerced to 0.
- The DM tracks initiative, AC, HP, conditions, selected NPC actions, and manual damage/healing.
- Preserve existing saves, spells, spell slots, death saves, undo, logs, meters, test runs, and
  transactional resolution behavior.
- Keep the current single-target tracker behavior unless an existing action explicitly supports
  more; multi-target redesign is out of scope.

Implement in this order

1. Encounter builder: minimal polish

- Keep the existing three steps and all state/data behavior in CampaignEncounterCreateDialog.
- Preserve the builder’s configure-left / preview-right layout.
- Make the preview column stable or sticky within the modal where viewport height allows.
- Keep the footer visible and ensure it does not cover scrollable content.
- Improve selected archetype and difficulty contrast. Selected descriptions must use the matching
  selected-control foreground rather than muted text that loses contrast.
- Compact the generated-enemy and preview rows by extending existing combatant card behavior where
  appropriate.
- Clarify the existing Roll HP label as “Roll HP at start” if this can be done without changing
  behavior.
- Do not broadly rewrite the builder; it is the design anchor and needs the least change.

2. Encounter editor: roster plus review

- Refactor EncounterEditPage and EncounterEditorSections toward the encounter-edit mockup.
- Keep Party, Allies, and Enemies in one main roster column with compact editable rows and clear
  Add actions.
- Keep each encounter combatant independent; do not merge the three goblins into one quantity row.
- Put encounter details, DM notes, readiness, and the run/test actions in one right review column.
- Remove the redundant seven-item anchor navigation if the same sections remain directly
  discoverable in the new layout.
- Render Run encounter and Test run in one location only, beside the readiness summary.
- Preserve staging, adding, editing, removing, reverting, saving, dirty detection, toasts,
  UnsavedChangesBar, source-mismatch warnings, and save-and-start behavior.
- Reuse EncounterCombatantCard and shared display primitives; add a compact variant only if it
  improves the builder, editor, and preview rather than creating a one-off wrapper.
- Make the review column sticky only at suitable desktop widths and preserve min-w-0, min-h-0,
  wrapping, and contained overflow.

3. Initiative setup: physical player rolls

- Refactor EncounterInitiativePage into a two-column entry + ordered-preview workspace.
- Remove the Roll Players control. Do not call rollInitiative with the player side anywhere in the
  UI.
- Player rows must say that physical rolls are entered manually.
- Keep Roll NPCs & allies, Re-roll allies, and Re-roll enemies using the existing side-aware API.
- Every row must have a stable numeric editor. Keep an input draft locally and commit on blur or
  Enter, or use an equally robust approach. Do not persist on every intermediate keystroke.
- Support 0 and negative initiative. Do not use Number(value) || 0 for empty input.
- Display a single ordered preview based on initiative descending and saved tie order. Move
  drag-and-drop tie ordering to this preview rather than presenting three independently draggable
  group columns.
- Explain that tied results can be dragged into the desired order.
- Preserve accessible pointer and keyboard drag behavior.
- Show ready and unresolved counts. Disable Begin Combat until every combatant has initiativeSet.
- Add a server-side begin guard as well. Direct API calls must not begin a run with unresolved
  combatants; return a clear 4xx error and leave the run unchanged.
- Implement a real clear-initiative operation if the Clear values control is included. Prefer one
  scoped bulk API/store operation with tests. Clearing sets initiativeSet=false; never fake clear
  by storing initiative 0.
- Provenance labels such as “manual” or “generated” are optional unless they are backed by truthful
  state after reload. Do not add misleading session-only labels.
- Ensure explicit tie ordering survives the begin command and becomes round-one order.

4. Combat tracker: focused DM workspace

- Use the light and dark tracker mockups plus README.md as the hierarchy reference.
- Keep a compact encounter status toolbar with encounter name, round, turn, timer, previous/next,
  Undo, Meters, and Finish Combat.
- Build one actor → action → target command surface from the existing active-turn header and
  resolution callbacks.
- Keep manual amount, damage, healing, damage type, request save, and manual result easy to reach.
- Use the existing CombatActionPicker in the rendered path so search, favorites, recent actions,
  categories, and keyboard navigation are not duplicated. NPC actions are the main auto-action
  use case, but preserve valid actions for other actors.
- Keep the three-region desktop board: concise active combatant, widest turn order, concise target.
- Compact TargetRow and quiet enemy framing. Use destructive red for destructive/danger meaning,
  not every enemy border. Acting and target states must include a marker, icon, or text and not
  rely on color alone.
- Add progressive disclosure to CombatSheet so vitals, effects, and common defenses come before
  the full skill list. Preserve all current roll capabilities and deep information.
- Keep CombatLog below the board or as an intentional collapsible region; do not add a permanent
  competing right rail.
- Preserve light/dark and every accent palette by using semantic tokens only. Do not introduce
  route-specific hex colors, generic gradients, glows, glass panels, oversized radii, decorative
  heroes, or badge-heavy rows.

Backend and data integrity

- Inspect the current run handlers and stores before changing them.
- Add the unresolved-initiative begin validation before changing run status, and cover it with a
  backend test.
- If implementing bulk clear, add the smallest coherent handler/request/store/API path and tests.
- Preserve gameplay randomness using the existing initiative roll implementation.
- Preserve ownership checks, encounter snapshots, combat log events, ordering, and transaction
  behavior.
- Do not redesign the encounter-run data model merely to match decorative text in a mockup.

Responsive and accessibility requirements

- Desktop should follow the mockups; smaller screens may stack in task order rather than shrinking
  into unreadable columns.
- Keep controls at least 40px high where practical.
- Preserve visible focus states, semantic headings, labels, button names, and keyboard operation.
- Use tabular numerals for initiative, HP, AC, round, turn, and timer.
- State must never be conveyed by color alone.
- Prevent page-level horizontal overflow and keep long lists independently scrollable where
  appropriate.

Testing

- Update CampaignEncounterCreateDialog tests for any deliberate builder label/layout changes.
- Update EncounterEditWorkflow tests for the roster/review layout and the single run-action
  location.
- Add focused EncounterInitiativePage tests. At minimum cover:
  - no Roll Players control;
  - Roll NPCs & allies sends only friendly and enemy sides;
  - per-side rerolls;
  - manual player input including 0 and a negative value;
  - empty input remains unresolved;
  - generated values can be overridden;
  - Begin Combat disabled while unresolved;
  - preview ordering and tie reordering;
  - clear behavior if implemented.
- Add backend coverage proving begin is rejected while initiative is unresolved and succeeds when
  all values are set. Cover clear behavior if implemented.
- Update CombatWorkspace, CombatActionPicker, TargetRow, and CombatSheet tests in proportion to the
  refactor. Preserve existing regression coverage.

Verification

- Format changed frontend and Markdown files with the repository tools.
- Run the relevant focused frontend and backend tests during development.
- Run node scripts/check-file-size.mjs from the repository root.
- Run make verify before handing back the result.
- Perform three targeted browser workflows rather than a broad sweep:
  1. create encounter builder;
  2. edit encounter and start a run;
  3. enter/roll initiative, resolve a tie, begin combat, then smoke-test manual HP and one NPC
     action in the tracker.
- Check both light and dark mode on the tracker and at least one narrow viewport for overflow.
- Report exact checks run, any limitations, and the main files changed.

Work autonomously through safe in-scope decisions. If a mockup conflicts with existing correct
behavior, preserve correctness and document the small visual deviation rather than weakening the
domain model.
```
