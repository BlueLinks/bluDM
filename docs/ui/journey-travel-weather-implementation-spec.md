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

Calculation is stateless. It accepts origin, destination, distance, unit, terrain, pace, `goodRoads`, structured weather, component-level `rollWeather` flags, `encounterDistanceFeet`, and `rollEncounterDistance`.

## Travel Math

- Miles are used internally.
- Kilometers convert with `0.621371`.
- Hexes default to `5` miles.
- Pace: slow 18 miles/day, normal 24 miles/day, fast 30 miles/day.
- Terrain uses the SRD 5.2 Travel Terrain table maximum pace and encounter distance.
- Good roads raise the terrain maximum pace by one stage, capped at fast.
- The requested pace is capped to the adjusted terrain maximum pace.
- Output hours, days, display label, effective pace, terrain maximum pace, rolled encounter distance summary, assumptions, and weather.

## Encounter Distance

- Terrain encounter distance uses the SRD 5.2 Travel Terrain dice.
- The first valid calculation rolls encounter distance automatically.
- The DM can reroll encounter distance or manually select a legal terrain result.
- The rolled distance is the awareness/start distance where the party and other creatures may become aware of each other.
- Random encounter frequency or encounter generation is out of scope for this modal.

## Weather

- Weather has temperature, wind, and precipitation components.
- Each component can be set manually or rolled independently.
- Temperature roll: 1-14 normal, 15-17 colder, 18-20 warmer; colder/warmer rolls `1d4 * 10°F`.
- Wind roll: 1-14 none, 15-17 light, 18-20 strong.
- Precipitation roll: 1-14 none, 15-17 light rain or heavy snow, 18-20 heavy rain or heavy snow.
- Weather is selected in the modal and is not persisted as a journey.

## Frontend

- Add `CampaignLocation`, `TravelWeather`, `TravelCalculation`, and `TravelFormState`.
- Add API helpers for campaign locations and travel calculation.
- Replace saved journey UI with a `TravelPanel` and `TravelCalculatorModal`.
- The calculator modal uses the existing modal pattern, a `Route` / `Direct distance` segmented control, explicit saved/custom origin and destination inputs in route mode, live calculated result, encounter distance summary, assumptions, and icon-labeled structured weather controls.

## Tests

- Backend travel math for miles, kilometers, 5-mile hexes, terrain max pace, good roads, and rolled encounter awareness distances.
- Backend validation for invalid distance/options.
- Backend component weather rolls and manual weather preservation.
- Frontend renders saved locations.
- Frontend creates/edits locations.
- Frontend calculator recalculates when inputs change.
- Frontend component weather rolls do not lose route fields.
