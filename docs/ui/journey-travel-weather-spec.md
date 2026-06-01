# Journey Travel And Weather UI Spec

## Summary

This spec defines the v1 journey calculator for campaign play. The tool lives on the campaign detail page and helps DMs plan overland travel without requiring a map upload, route geometry, or reusable roll-table system.

The first implementation should let a DM create saved campaign journeys, calculate travel duration from simple inputs, generate weather, edit the generated text, and revisit saved journeys later.

Visual mockups are available in [journey-travel-weather-mockups.html](./journey-travel-weather-mockups.html).

Issue: [#67 feat(campaigns): add journey travel time and weather calculator](https://github.com/BlueLinks/bluDM/issues/67)

## Design Goals

- Keep the workflow useful during prep and live play: enter route facts, calculate, save, and move on.
- Make assumptions visible so travel math feels inspectable rather than mysterious.
- Treat weather as DM guidance, not immutable rules text.
- Keep v1 independent from campaign maps and global roll tables while leaving obvious integration points.
- Match the existing campaign detail visual language: compact cards, practical panels, restrained controls, and no marketing-style layout.

## Campaign Detail Placement

Add journey support directly to the campaign detail page.

Campaign overview cards should become a four-card grid:

- Player Characters.
- Encounters.
- Campaign NPCs.
- Journeys.

Add a `Journeys` section panel near the existing Party, Encounters, NPCs, and Recent Notes panels. The panel should show saved journeys for the current campaign and provide a primary `Add journey` action.

The journey panel should not add a top-level sidebar nav item in v1.

## Saved Journey Card

Each saved journey card should include:

- Journey name.
- Origin and destination when present.
- Distance with unit.
- Terrain, pace, and route condition.
- Travel duration summary, such as `2.5 days` or `18 hours`.
- Weather title and severity.
- Updated date.
- Actions: edit and delete.

Cards should be compact and readable in a campaign dashboard grid. Long route names and notes must wrap without pushing action buttons off-screen.

Example:

```text
North Road To Ironford
Waterdeep -> Ironford        63 mi
Forest · Normal pace · Road
2.6 days · Cool Rain
```

## Empty State

When no journeys exist, show a small empty state inside the panel:

```text
No journeys yet. Add a route to calculate travel time, generate weather, and save DM notes.
```

The empty state should include an `Add journey` button in the panel action area or immediately below the text.

## Journey Modal

Use a modal for create and edit. It should be responsive:

- Desktop: two-column layout.
- Mobile: single-column stacked layout.

Left/top column: inputs.

- Name, required.
- Origin, optional.
- Destination, optional.
- Distance, required positive number.
- Unit: miles, kilometers, hexes.
- Terrain.
- Travel pace.
- Route condition.
- Climate/season.

Right/bottom column: calculated output.

- Travel duration.
- Assumptions used.
- Generated weather severity, title, text, and prompt.
- Buttons: calculate, reroll weather.
- Editable weather text and DM notes.

The modal footer should include:

- Cancel.
- Save journey.

On edit, the modal should preload the saved calculation and weather. Recalculate should update the duration and assumptions. Reroll weather should update weather fields while preserving the route inputs and DM notes.

## Input Options

Distance units:

- Miles.
- Kilometers.
- Hexes.

Terrain:

- Road.
- Plains.
- Forest.
- Swamp.
- Mountains.
- Desert.
- Arctic.
- Coastal.
- Underground.
- Urban.
- Water.
- Custom.

Pace:

- Slow.
- Normal.
- Fast.

Route condition:

- Road or trail.
- Trackless.
- Difficult terrain.
- Hazardous terrain.
- Forced march.
- Mounted.
- Vehicle.
- Boat.
- Flight.
- Magic-assisted.

Climate/season:

- Temperate.
- Hot.
- Cold.
- Wet.
- Dry.
- Winter.
- Spring.
- Summer.
- Autumn.

## Calculation Output

The duration summary should prioritize human readability:

- Less than one day: show hours, such as `6 hours`.
- One day or more: show days with one decimal when needed, such as `2.5 days`.
- Also show the exact hours in the assumptions/details area.

Assumptions should be visible as short bullets or chips:

- Distance converted to miles.
- Pace miles per day.
- Terrain or route multiplier.
- Any v1 limitation, such as mounted/vehicle values being guidance rather than creature-specific speed.

## Weather Output

Weather output should include:

- Severity: calm, notable, harsh, or dangerous.
- Title.
- Narrative text.
- Optional mechanical or prep prompt.

Weather text is editable. The generated result is a starting point, not a locked table result.

Rerolling weather should:

- Keep route inputs.
- Keep journey name, origin, destination, and DM notes.
- Replace weather severity/title/text/prompt.
- Not save until the DM clicks `Save journey`.

## Error And Loading States

Use existing `Callout`, `MutedPanel`, toast, and confirmation patterns.

- Invalid input should show inline validation or a clear error callout.
- Calculation failure should not close the modal.
- Delete should require confirmation.
- Saving should reload or update the journey panel without a full page refresh.

## Future Integration Hooks

V1 should leave clear room for:

- Passing distance from campaign map pins.
- Selecting a saved weather roll table from future global roll tables.
- Choosing party members to infer slowest speed.
- Saving a journey as a travel log entry or campaign note.
- Linking journeys to encounters or map locations.
