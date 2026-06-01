# Travel Calculator And Weather Implementation Spec

Issue: [#67 feat(campaigns): add journey travel time and weather calculator](https://github.com/BlueLinks/bluDM/issues/67)

## Backend

Add `campaign_locations`:

- `id uuid primary key default gen_random_uuid()`
- `campaign_id uuid not null references campaigns(id) on delete cascade`
- `name text not null`
- `notes text not null default ''`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Authenticated campaign APIs:

- `GET /api/campaigns/{campaignID}/locations`
- `POST /api/campaigns/{campaignID}/locations`
- `PUT /api/campaigns/{campaignID}/locations/{locationID}`
- `DELETE /api/campaigns/{campaignID}/locations/{locationID}`
- `POST /api/campaigns/{campaignID}/travel/calculate`

Calculation is stateless. It accepts origin, destination, distance, unit, terrain, pace, route condition, climate, weather, and `rerollWeather`.

## Travel Math

- Miles are used internally.
- Kilometers convert with `0.621371`.
- Hexes default to `6` miles.
- Pace: slow 18 miles/day, normal 24 miles/day, fast 30 miles/day.
- Terrain and route conditions apply conservative multipliers.
- Output hours, days, display label, assumptions, and weather.

## Weather

- Weather tables are bluDM-authored/open text.
- `rerollWeather: true` returns a random weather payload.
- Otherwise valid submitted weather is preserved.
- Weather is editable in the modal and is not persisted as a journey.

## Frontend

- Add `CampaignLocation`, `TravelWeather`, `TravelCalculation`, and `TravelFormState`.
- Add API helpers for campaign locations and travel calculation.
- Replace saved journey UI with a `TravelPanel` and `TravelCalculatorModal`.
- The calculator modal uses the existing modal pattern, practical form controls, live calculated result, assumptions, and editable weather fields.

## Tests

- Backend travel math for miles, kilometers, and hexes.
- Backend validation for invalid distance/options.
- Backend weather generation and edited weather preservation.
- Frontend renders saved locations.
- Frontend creates/edits locations.
- Frontend calculator recalculates when inputs change.
- Frontend random weather does not lose route fields.
