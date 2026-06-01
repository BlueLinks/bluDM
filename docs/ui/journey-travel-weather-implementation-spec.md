# Journey Travel And Weather Implementation Spec

## Summary

This spec defines the implementation contract for the v1 campaign journey calculator. It is intentionally campaign-scoped, persisted, and independent from map uploads or reusable roll tables.

Issue: [#67 feat(campaigns): add journey travel time and weather calculator](https://github.com/BlueLinks/bluDM/issues/67)

## Data Model

Add a `campaign_journeys` table.

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `campaign_id uuid not null references campaigns(id) on delete cascade`
- `name text not null`
- `origin text not null default ''`
- `destination text not null default ''`
- `distance double precision not null`
- `distance_unit text not null`
- `terrain text not null`
- `pace text not null`
- `route_condition text not null`
- `climate text not null`
- `duration_hours double precision not null`
- `duration_days double precision not null`
- `weather jsonb not null default '{}'::jsonb`
- `assumptions jsonb not null default '[]'::jsonb`
- `notes text not null default ''`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- `campaign_journeys_campaign_id_idx` on `(campaign_id, updated_at desc)`.

Backend model:

- Add `models.Journey` with JSON fields matching frontend names.
- Represent `weather` as a structured object/map containing `severity`, `title`, `text`, and `prompt`.
- Represent `assumptions` as an ordered list of strings.

## API Contract

All routes require authentication and must verify the campaign belongs to the current user using existing campaign ownership helpers.

Routes:

- `GET /api/campaigns/{campaignID}/journeys`
  - Returns `{ "journeys": Journey[] }`.
- `POST /api/campaigns/{campaignID}/journeys/calculate`
  - Accepts the same route inputs as create/update, plus optional existing weather/notes.
  - Returns `{ "calculation": JourneyCalculation }`.
  - Does not persist.
- `POST /api/campaigns/{campaignID}/journeys`
  - Creates a journey after recalculating trusted server-side values.
  - Returns `{ "journey": Journey }`.
- `PUT /api/campaigns/{campaignID}/journeys/{journeyID}`
  - Updates a campaign journey after recalculating trusted server-side values.
  - Returns `{ "journey": Journey }`.
- `DELETE /api/campaigns/{campaignID}/journeys/{journeyID}`
  - Deletes a campaign journey.
  - Returns `204`.

Request fields:

- `name`
- `origin`
- `destination`
- `distance`
- `distanceUnit`
- `terrain`
- `pace`
- `routeCondition`
- `climate`
- `weather`
- `notes`
- `rerollWeather`

Server-calculated response fields:

- `durationHours`
- `durationDays`
- `durationLabel`
- `assumptions`
- `weather`

## Validation And Normalization

Server-side rules:

- `name` is required after trimming.
- `distance` must be greater than `0`.
- `distanceUnit` must be `miles`, `kilometers`, or `hexes`.
- `pace` must be `slow`, `normal`, or `fast`.
- `terrain`, `routeCondition`, and `climate` must be from the supported option lists.
- Unknown or invalid option values return `400`.
- Notes, origin, destination, and weather text fields are trimmed.
- Create/update always recalculates duration and assumptions on the server.
- If `rerollWeather` is false and valid weather is supplied, preserve edited weather text.
- If `rerollWeather` is true or no valid weather is supplied, generate a new weather payload.

## Travel Math

Distance conversion:

- Miles: `distance`.
- Kilometers: `distance * 0.621371`.
- Hexes: `distance * 6`.

Pace base miles per day:

- Slow: `18`.
- Normal: `24`.
- Fast: `30`.

Route multipliers:

- Road or trail: `1`.
- Trackless: `0.5`.
- Difficult terrain: `0.5`.
- Hazardous terrain: `0.5`.
- Forced march: `1.25`.
- Mounted: `1.5`.
- Vehicle: `1.25`.
- Boat: `1.25`.
- Flight: `2`.
- Magic-assisted: `2`.

Terrain multipliers:

- Road, plains, coastal, urban, water: `1`.
- Forest, desert, underground: `0.75`.
- Swamp, mountains, arctic: `0.5`.
- Custom: `1`.

Calculation:

- `effectiveMilesPerDay = basePace * routeMultiplier * terrainMultiplier`
- Clamp effective miles per day to at least `1`.
- `durationDays = convertedMiles / effectiveMilesPerDay`
- `durationHours = durationDays * 24`

Duration label:

- If `durationHours < 24`, use rounded hours.
- Otherwise use days with one decimal place when needed.

Assumptions should include the converted distance, pace, route multiplier, terrain multiplier, and effective miles per day.

## Weather Generation

Weather tables must be bluDM-authored text. Do not copy random tables from paid books.

The first implementation can use deterministic table arrays in backend code keyed by broad climate/terrain categories. Each generated weather result must include:

- `severity`: `calm`, `notable`, `harsh`, or `dangerous`.
- `title`.
- `text`.
- `prompt`.

Weather selection may use simple random choice for v1. If the request later adds a seed, expose deterministic generation through the calculate endpoint without changing saved journey shape.

## Frontend Contract

Add TypeScript types:

- `Journey`
- `JourneyWeather`
- `JourneyCalculation`
- `JourneyFormState`

Add API helpers:

- `campaignJourneys(campaignId)`
- `calculateJourney(campaignId, payload)`
- `createJourney(campaignId, payload)`
- `updateJourney(campaignId, journeyId, payload)`
- `deleteJourney(campaignId, journeyId)`

Campaign detail page behavior:

- Load journeys alongside campaign detail or after campaign detail loads.
- Add journey count to overview cards.
- Render saved journeys in a new `Journeys` section panel.
- Use one modal component for create and edit.
- Calculate on initial create after required inputs are valid, on explicit calculate, and before save.
- Reroll weather by calling calculate with `rerollWeather: true`.

## Test Coverage

Backend tests:

- Miles, kilometers, and hex conversion.
- Pace, route, and terrain multipliers.
- Weather generation always returns severity/title/text.
- Create/list/update/delete journey success path.
- Invalid name, distance, unit, pace, terrain, route, and climate return `400`.
- User cannot access another user's campaign journeys.
- Campaign deletion cascades journey records.

Frontend tests:

- Campaign detail renders journey count and saved journey cards.
- Create modal calculates duration/weather and saves a journey.
- Reroll weather preserves route inputs and notes.
- Edit modal loads saved values and updates the card.
- Delete confirmation removes a journey from the panel.

Verification commands:

```sh
cd backend && gofmt -w <changed-go-files>
cd backend && go test ./...
cd backend && go vet ./...
cd frontend && npm run lint
cd frontend && npm run format:check
cd frontend && npm run test
cd frontend && npm run build
node scripts/check-file-size.mjs
docker compose config
```
