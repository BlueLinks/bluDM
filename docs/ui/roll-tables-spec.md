# Reusable Roll Tables And Global Table Roller UI Spec

Issue: [#69 feat(tools): add reusable roll tables and global table roller](https://github.com/BlueLinks/bluDM/issues/69)

## Summary

Add reusable roll tables as a roleplay tool for DMs. A DM can create tables such as tavern rumors, NPC traits, travel events, treasure quirks, weather, and wild magic, then roll those tables from a global menu without leaving the current workflow.

The global roller should feel like a sibling of the existing dice roller: compact top-bar trigger, focused modal/panel, animated result surface, and recent roll log.

## V1 Shape

- Add a top-bar `Tables` button beside `Travel` and `Dice`.
- Add a global `Table roller` modal opened from that button.
- Add a management surface for creating, editing, duplicating, deleting, and cloning roll tables.
- Support campaign-scoped custom tables in v1.
- Support provided read-only tables, including at least one bluDM-authored/open-license weather or travel-events table.
- Let provided tables be cloned into editable campaign tables.
- Keep import/export hooks in the data model, but do not build package import/export in this issue.

## Table Types

V1 should support deterministic range tables:

- Die expression: `1d4`, `1d6`, `1d8`, `1d10`, `1d12`, `1d20`, or `1d100`.
- Rows with inclusive `min` and `max` values.
- One-result-per-face tables are represented as rows where `min == max`.
- Larger range tables such as `1-10`, `11-20`, and `91-100` are valid.

Weighted tables and multi-dice expressions should be reserved for follow-up unless implementation is simple enough to add without expanding the UI.

## Table Record

Each table includes:

- Name.
- Optional description.
- Tags.
- Scope: campaign or provided.
- Category: weather, rumor, NPC, travel, treasure, encounter, magic, or custom.
- Die expression.
- Rows.
- Created and updated timestamps for campaign tables.

Each row includes:

- Min roll.
- Max roll.
- Label.
- Result text.
- Optional DM notes.

## Global Roller Modal

The modal should prioritize fast use during play.

Layout:

- Header with title, short description, and a `Manage tables` action.
- Left/top area for table search, category filter, and table list.
- Selected-table preview with description, tags, die expression, and visible outcomes.
- Primary `Roll table` button.
- Animated result card showing rolled value/range, label, result text, table name, and timestamp.
- Recent table-roll log with timestamp, table name, rolled value, and result label.

Behavior:

- The last selected table remains selected while the app session is open.
- Rolling a table adds to the recent table-roll log.
- Search filters table name, description, tags, and row labels/result text.
- Provided tables are visually labeled `Provided`.
- Campaign tables are visually labeled `Campaign`.
- If no tables exist, show an empty state with a create action.

## Management UI

The management view can be a page, modal, or drawer. V1 should prefer a page or wide modal if row editing feels cramped.

The management list should show:

- Table name.
- Category.
- Die expression.
- Row count.
- Scope/source.
- Updated timestamp.
- Actions: Roll, Edit, Duplicate or Clone, Delete.

The table editor should show:

- Details section: name, description, category, tags, die expression.
- Tags as removable chips with suggestions from loaded provided and campaign tables, plus a typed add-new-tag control.
- Outcome rows in a dense but scannable table/editor with one row per die face.
- Validation messages for missing labels/results and invalid row coverage.
- Quick actions:
  - Reset rows for the selected die.

Delete uses the existing confirmation dialog pattern.

## Provided Tables

Provided tables should be read-only and separated from campaign tables.

V1 provided-table candidates:

- Travel weather prompt table.
- Tavern rumor starter table.
- NPC mannerism table.
- Travel complication table.

Provided text must be bluDM-authored or open-license content, not copied from paid books.

## Recent Roll Log

Recent table rolls are session-visible in v1, matching the current dice-roll log behavior.

Each log entry includes:

- Timestamp.
- Table name.
- Roll expression.
- Rolled value.
- Matched range.
- Result label.
- Result text preview.

Persisting table-roll logs is a follow-up unless it falls out naturally from the backend model.

## Out Of Scope

- Import/export package support.
- Weighted rows.
- Multi-dice curves such as `2d6`.
- Nested follow-up table references.
- Integrating journey weather generation with saved tables.
- Player-facing roll-table visibility.
- Permission models beyond existing campaign ownership.

## Acceptance Criteria

- A DM can create a campaign roll table with text attached to each face or range.
- A DM can open a global menu from anywhere, select a table, roll it, and see the result without leaving the current page.
- Rolls show the numeric roll, matched range, and result text.
- Recent table rolls are logged for quick reference.
- Provided tables are visible, read-only, and cloneable into editable campaign tables.
- Custom campaign tables can be edited, duplicated, and deleted.
- The UI visually matches the existing dice menu closely enough to feel like the same tool family.
