# README Screenshot Capture Guide

Store GitHub README screenshots in this folder and reference them from the root
`README.md` with relative links such as:

```md
![Encounter tracker](docs/screenshots/encounter-tracker.png)
```

## Suggested Files

- `campaign-dashboard.png` - signed-in campaign or dashboard view.
- `encounter-tracker.png` - active encounter with initiative, combatants, HP or status controls, and combat log if visible.
- `spell-library-prismatic.png` - spell library search for `prismatic` with SRD source labels visible.
- `spell-preview-prismatic-wall.png` - Prismatic Wall preview with all structured layers visible.
- `spell-copy-roll-table.png` - copied Prismatic Spray or similar roll-table outcome editor.
- `combat-cast-dialog.png` - spell cast dialog with targets and structured roll-table/effect controls.

## Capture Notes

- Prefer desktop screenshots around 1440px wide.
- Crop browser chrome unless the address bar adds useful context.
- Avoid exposing personal campaign names, secrets, tokens, or private data.
- Keep the README compact: use three primary screenshots there and move the full gallery here if needed.

## Programmatic Capture

These can be captured manually, or generated with Playwright against a local seeded
environment once the exact demo data and screens are stable.
