# Reusable Roll Tables Implementation Spec

Issue: [#69 feat(tools): add reusable roll tables and global table roller](https://github.com/BlueLinks/bluDM/issues/69)

## Backend

Add campaign-owned custom roll tables and read-only provided tables.

Tables:

- `roll_tables`
  - `id uuid primary key default gen_random_uuid()`
  - `campaign_id uuid references campaigns(id) on delete cascade`
  - `source text not null` enum-like value: `campaign`, `provided`
  - `name text not null`
  - `description text not null default ''`
  - `category text not null default 'custom'`
  - `tags text[] not null default '{}'`
  - `die_expression text not null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`

- `roll_table_rows`
  - `id uuid primary key default gen_random_uuid()`
  - `table_id uuid not null references roll_tables(id) on delete cascade`
  - `min_roll integer not null`
  - `max_roll integer not null`
  - `label text not null`
  - `result_text text not null`
  - `notes text not null default ''`
  - `sort_order integer not null default 0`

Indexes:

- `roll_tables_campaign_id_idx on roll_tables(campaign_id, updated_at desc)`
- `roll_tables_source_idx on roll_tables(source, category, name)`
- `roll_table_rows_table_id_idx on roll_table_rows(table_id, min_roll, max_roll)`

Provided tables can either live in seed/bootstrap code or use `source = 'provided'` with `campaign_id null`. They must not be editable through campaign endpoints.

## API

Authenticated endpoints:

- `GET /api/campaigns/{campaignID}/roll-tables`
- `POST /api/campaigns/{campaignID}/roll-tables`
- `GET /api/campaigns/{campaignID}/roll-tables/{tableID}`
- `PUT /api/campaigns/{campaignID}/roll-tables/{tableID}`
- `DELETE /api/campaigns/{campaignID}/roll-tables/{tableID}`
- `POST /api/campaigns/{campaignID}/roll-tables/{tableID}/clone`
- `POST /api/campaigns/{campaignID}/roll-tables/{tableID}/roll`

List should return campaign tables plus provided tables.

Ownership rules:

- Campaign tables require `campaign_id` ownership through the existing `campaignByID` pattern.
- Provided tables are globally readable to authenticated users with access to the campaign context.
- Provided tables cannot be updated or deleted.
- Cloning a provided table creates a campaign table copy.
- Cloning a campaign table creates another campaign table with `Copy of {name}`.

Roll response:

```json
{
  "roll": {
    "tableId": "uuid",
    "tableName": "Tavern Rumors",
    "dieExpression": "1d20",
    "rolledValue": 13,
    "matchedRange": "11-15",
    "label": "Merchant trouble",
    "resultText": "A caravan master is paying for discreet guards.",
    "notes": "",
    "rolledAt": "2026-06-03T12:00:00Z"
  }
}
```

## Validation

Table validation:

- Name is required after trimming.
- Source is server-owned; clients cannot create provided tables.
- Category must be known or `custom`.
- Die expression must be one supported one-die expression in v1.
- Tags are trimmed, deduplicated, and capped to a reasonable count.
- Row list cannot be empty.

Row validation:

- `min_roll` and `max_roll` must be within the die bounds.
- `min_roll <= max_roll`.
- Ranges cannot overlap.
- Gaps are rejected for v1 so rolling always produces a result.
- Labels and result text are required after trimming.
- Sort order is normalized server-side by range.

## Rolling

- Parse the die expression into a die size.
- Use `crypto/rand.Int` for server-side rolls.
- Find the row where `min_roll <= rolledValue <= max_roll`.
- Return roll metadata and matched row content.
- Frontend can animate while waiting, but the backend is the source of truth for persisted/custom table rolls.

## Frontend Types

Add types:

- `RollTable`
- `RollTableRow`
- `RollTableFormState`
- `RollTableRollResult`
- `RollTableCategory`
- `RollTableSource`

API helpers:

- `campaignRollTables(campaignID)`
- `createCampaignRollTable(campaignID, payload)`
- `updateCampaignRollTable(campaignID, tableID, payload)`
- `deleteCampaignRollTable(campaignID, tableID)`
- `cloneCampaignRollTable(campaignID, tableID)`
- `rollCampaignRollTable(campaignID, tableID)`

## UI Components

Suggested component split:

- `TableRollerTool`: top-bar trigger plus modal.
- `TableRollerModal`: search, table list, selected table preview, roll result, recent roll log.
- `RollTableManager`: list/manage surface.
- `RollTableEditorModal` or `RollTableEditorPage`: create/edit table form.
- `RollTableRowEditor`: one-face roll/label/result controls.
- `RollTableResultCard`: animated result surface.

Reuse:

- `Modal`, `Button`, `Field`, `Input`, `Select`, `Textarea`, `ConfirmDialog`.
- Existing dice modal visual language.
- Existing `RollLogProvider` only if it can support table-specific metadata without muddying manual dice entries; otherwise add a sibling table-roll log provider.

## Tests

Backend:

- CRUD requires campaign ownership.
- Provided tables are readable but not editable/deletable.
- Clone provided and campaign tables creates editable campaign records.
- Validation rejects invalid die expressions, empty rows, invalid row coverage, and blank labels/results.
- Rolling returns a value inside the die bounds and the matching row.
- Deleting a campaign cascades campaign roll tables and rows.

Frontend:

- Top-bar `Tables` button opens the table roller.
- Roller lists provided and campaign tables.
- Search/category filters narrow table choices.
- Rolling shows numeric roll, matched range, label, result text, and adds a recent log entry.
- Manager can create, edit, duplicate/clone, and delete custom tables.
- Provided tables show read-only state and clone action.
- Editor validation displays range overlap/gap errors.

## Verification

- `cd backend && gofmt -w <changed-go-files>`
- `cd backend && go test ./...`
- `cd backend && go vet ./...`
- `cd backend && gosec -exclude=G404 ./...`
- `cd frontend && npm run lint`
- `cd frontend && npm run format:check`
- `cd frontend && npm run test`
- `cd frontend && npm run build`
- `node scripts/check-file-size.mjs`
- `docker compose config`
- Browser-check the top-bar table roller and management flow at `http://localhost:3080`.
