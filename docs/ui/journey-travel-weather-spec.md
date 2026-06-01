# Travel Calculator And Weather UI Spec

This spec defines the v1 campaign travel calculator for roleplay prep. The tool lives on the campaign detail page as a pop-up calculator, similar in spirit to the dice roller. It does not save journey records.

Issue: [#67 feat(campaigns): add journey travel time and weather calculator](https://github.com/BlueLinks/bluDM/issues/67)

## Shape

- Add a campaign detail overview card for `Travel`.
- Add a `Travel` panel near Party, Encounters, NPCs, and Recent Notes.
- The panel manages saved campaign locations.
- The panel action opens a `Travel calculator` modal.
- Do not add a top-level nav item in v1.

## Campaign Locations

Locations are reusable names saved to the campaign so a DM can reference places later.

Each location includes:

- Name.
- Optional notes.
- Created and updated timestamps.

The panel supports create, edit, and delete. Deleting a location only removes it from the saved location list; it does not affect encounters, notes, or previous calculator output.

## Calculator Modal

The modal should be a transient tool. Closing it does not save a journey.

Inputs:

- Origin, selected from saved campaign locations or typed manually.
- Destination, selected from saved campaign locations or typed manually.
- Distance.
- Unit: miles, kilometers, hexes.
- Terrain.
- Pace.
- Route condition.
- Climate / season.
- Editable weather title.
- Editable weather text.
- Editable weather prompt.

Outputs:

- Travel time updates whenever distance, unit, terrain, pace, route condition, or climate changes.
- Assumptions show the conversion and multipliers used.
- Weather can be typed manually.
- `Random weather` generates a bluDM-authored editable weather payload.

## Behavior

- The calculator requires a positive distance before calculating.
- Origin and destination are labels only in v1; the DM can use saved locations or type one-off places.
- Weather generation preserves typed weather unless the DM clicks `Random weather`.
- No journey records are persisted.

## Out Of Scope

- Maps, route geometry, and map pins.
- Saved journey logs.
- Reusable roll tables.
- Automatically deriving distance from saved locations.
