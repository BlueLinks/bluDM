# Party adjustment HTML mockup

Open `index.html` in a browser. The mockup contains three interactive states:

- fall damage through the generic quick-adjustment flow
- Aid through the rules-aware cast flow with spell-slot tracking
- Inspiring Leader through the same rules-aware flow without a spell slot

## Recommendation

Use one top-bar **Adjust** action with two workflows:

1. **Quick adjustment** for damage, healing, temporary HP, and temporary maximum-HP
   changes. This is the fast path for falls, traps, environmental damage, potions, house rules,
   and corrections.
2. **Cast or use feature** for a known spell, item, or character feature. This path pre-fills the
   rules, enforces target limits, creates a removable timed effect, and optionally consumes a spell
   slot or feature use.

The important boundary is that both workflows should call the same underlying adjustment/effect
service. The second workflow adds provenance and resource tracking; it should not become a separate
HP mutation system.

## Product notes

- Keep the entry point global, next to Dice and Theme, but scope the target list to the current
  campaign or active encounter.
- Default the generic flow to explicit, low-risk operations. Do not expose raw “set HP” as the
  primary control.
- Treat temporary HP as “keep higher” by default because temporary HP does not stack.
- Treat a temporary maximum-HP change as a removable effect with a duration. For Aid, change both
  current and maximum HP together and undo both when the effect expires.
- Show projected per-target results before applying the change.
- Record actor, source, targets, before/after values, and resource use in a shared activity log so
  out-of-combat changes are still auditable.
- If a known spell/feature is selected but slot or use tracking is unavailable, allow “apply without
  consuming” with an explicit note rather than blocking the DM.
