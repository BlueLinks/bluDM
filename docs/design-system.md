# bluDM Design System

This document describes the shared styling rules for bluDM. It exists to keep the app visually coherent as new pages and workflows are added.

## Core Principles

- Use semantic tokens first.
- Prefer shared components over page-specific styling.
- Use route-specific styling only when the product genuinely needs a distinct workspace treatment.
- Keep light and dark modes aligned by changing tokens, not rewriting layouts.
- Keep theme selection global so buttons, links, tabs, focus rings, selected states, secondary accents, and surfaces stay consistent.
- Do not use green, blue, red, or any named palette color as shorthand for product meaning.
- Keep accent color, semantic status color, neutral surfaces, and companion colors separate.

## Color Tokens

The shared theme is driven by semantic CSS variables exposed through Tailwind.

Primary tokens:

- `background`
- `foreground`
- `card`
- `card-foreground`
- `muted`
- `muted-foreground`
- `border`
- `primary`
- `primary-foreground`
- `secondary`
- `secondary-foreground`
- `tertiary`
- `tertiary-foreground`
- `neutral`
- `neutral-foreground`
- `surface`
- `surface-foreground`
- `accent`
- `accent-foreground`
- `info`
- `info-foreground`
- `success`
- `success-foreground`
- `warning`
- `warning-foreground`
- `destructive`
- `destructive-foreground`

Guidelines:

- `primary` is the theme-backed interactive color for buttons, links, active tabs, selected navigation, selected cards, focus states, switches, sliders, and major identity emphasis.
- `secondary` is the supporting identity color for character sheets, ability cards, secondary highlights, and supportive emphasis.
- `tertiary` is the alternate emphasis color for secondary stat groups, count chips, workspace accents, and nested panels.
- `accent` is a supporting theme color for low-density highlights, banners, and decorative emphasis when a stronger role is not needed.
- `neutral`, `surface`, `muted`, `background`, and `card` are neutral surface tokens. They should not carry product meaning such as selected, mine, success, friendly, or official.
- `success`, `warning`, `destructive`, and `info` are semantic status tokens. They must not change when the user chooses a different accent.
- `success` means a successful/positive state, not “selected”, “active”, “mine”, or “friendly”.
- `destructive` means danger, removal, failed states, downed combatants, or harmful outcomes.
- `warning` means caution, unresolved risk, critical attention, or blocked-but-recoverable state.
- `info` means neutral guidance, explanatory panels, active areas, or non-critical system state.
- Avoid hardcoding one-off brand colors in page components.
- Character identity stats are theme-backed, not semantic status. Use `primary` for AC/defense, `tertiary` for HP/body resources, and `secondary` for ability scores, temp HP, speed, and supporting character statistics unless a real warning/danger/success state is being communicated.

## Companion Colors

Companion colors are stable secondary colors for recurring product categories. They are not user-selectable accents and should not change across accent sets.

Shared companion tokens:

- `companion-personal`: user-created or personal library content.
- `companion-official`: official, SRD, standard, or read-only shared rules content.
- `companion-imported`: imported content and import-origin markers.
- `companion-shared`: party/shared table content, allies, friendly combatants, or shared ownership.
- `companion-custom`: custom variants, unusual categories, and over-threshold labels.
- `companion-metadata`: neutral metadata, stat labels, roles, and category tags.
- `companion-draft`: draft, unsaved, or provisional content.
- `companion-published`: published/available content when it is not simply a success state.

Companion colors must stay visually distinct from the built-in theme palette. They are for stable content/category identity, not for selected navigation or ordinary emphasis.

Examples:

- Spell Library source toggles use `companion-personal` for My Library and `companion-official` for SRD. `companion-personal` must remain distinct from both green success and the selected accent.
- Read-only SRD badges use `companion-official`, not the selected accent.
- Friendly encounter/NPC identity uses `companion-shared`, not green.
- CR, roles, and neutral stat chips use `companion-metadata`; character AC/defense stats use `primary`.
- Difficulty uses semantic tokens: Easy is `success`, Medium is `info`, Hard is `warning`, Deadly is `destructive`, and Over Deadly is `companion-custom`.
- Imported archive/source markers should use `companion-imported`, unless they are reporting success, warning, or danger.

## Theme Architecture

bluDM supports shared theme sets that work in both light and dark mode:

- Forest: evergreen primary, moss/sage secondary, bark brown tertiary.
- Ocean: blue primary, teal secondary, sea-green tertiary.
- Blossom: pink primary, mauve secondary, purple/plum tertiary.
- Ember: red primary, orange/rust secondary, burgundy/clay tertiary.

The user-facing selector is still labelled as an accent selector because that is the simple choice exposed in the UI. Internally, each option defines a complete palette: `primary`, `secondary`, `tertiary`, `accent`, `neutral`, `surface`, and foreground pairs. New components should not read the accent preference directly; they should inherit the resulting semantic theme tokens.

Rules:

- Do not create page-specific accent systems.
- Do not hardcode a blue-only or green-only visual language inside a route.
- Use the shared accent selector for any future accent choices.
- Accent must not recolor semantic states. A red accent should not make success red, and a green accent should not make every selected or personal item green.
- Use theme-backed `primary` for selected navigation, active tabs, focus rings, primary buttons, selected cards, active chips, progress indicators, switches, sliders, and direct interaction highlights.
- Use `surface` when a region needs a quiet interior background without inheriting historical green tint from `muted`.

## Light And Dark Modes

- Light mode should remain off-white, readable, and restrained.
- Dark mode should keep contrast strong without becoming neon or overly saturated.
- Both modes must share the same component hierarchy and spacing rules.
- Theme changes should not require alternate page layouts unless contrast or canvas legibility demands it.

## Elevation System

bluDM uses a small shared depth scale instead of ad hoc shadows.

- `flat`: forms, tables, dense controls, and quiet containers.
- `raised`: standard cards and panels with light border reinforcement and a measured shadow.
- `interactive`: clickable cards, buttons, and other hoverable controls that should feel tactile.
- `featured`: summary cards, important stat panels, and other higher-emphasis content surfaces.
- `hero`: workspace banners, page headers, and other top-of-page identity surfaces.

Guidelines:

- Use borders first; shadows should reinforce the surface hierarchy, not replace it.
- Keep shadows subtle in light mode and even more restrained in dark mode.
- Use hover lift only on genuinely interactive surfaces.
- Do not add shadows to dense forms, data tables, or plain list rows.
- Prefer `WorkspaceBanner`, `FeatureCard`, and `MetricCard` instead of inventing one-off shadow recipes.

## Surface Hierarchy

Shared surfaces should generally follow this order:

- Level 0: `background` for page chrome and empty canvas areas.
- Level 1: `card` for standard panels, dialogs, list rows, and grouped content.
- Level 2: `surface` for quiet interior regions, filter rails, and nested work areas.
- Level 3: elevated summary cards and featured content blocks with slightly stronger shadow or gradient treatment.
- Level 4: hero, workspace, and profile banners with the strongest layering and subtle decorative gradients.

Guidelines:

- Keep borders subtle and consistent.
- Prefer small, measured shadows over heavy atmospheric effects.
- Use `flat` for forms and dense utilities, `raised` for ordinary panels, `interactive` for hoverable cards and buttons, `featured` for important summary surfaces, and `hero` for banners.
- Use gradients sparingly and only when they clarify a workspace, banner, summary surface, or canvas.
- Campaign World can be richer and more layered, but it should still inherit the same semantic palette as the rest of the app.
- `muted` is a neutral surface token, not a chip or avatar token. Do not use `bg-muted` for badges, source chips, selected pills, stat chips, initials avatars, icon placeholders, or status indicators.
- Shared layout primitives provide the preferred implementation path for richer surfaces: `WorkspaceBanner`, `FeatureCard`, and `MetricCard`.

## Tabs And Navigation

- Active tabs should use `primary` or `accent`, not ad hoc color classes.
- Sidebar and section navigation should use the same token logic as the rest of the app.
- Selected states should be readable in light and dark themes and across every accent set.

## Hero And Banner Patterns

- Use `WorkspaceBanner` for page heroes, workspace headers, and profile headers that need a stronger identity surface.
- Use `FeatureCard` for dashboard tiles, workspace action cards, import/export summary cards, and other medium-emphasis summary surfaces.
- Use `MetricCard` for compact stat blocks, summary totals, and dashboard counters.
- Keep banners theme-aware by deriving gradients from `primary`, `secondary`, `tertiary`, or `accent` tokens rather than literal colors.
- Do not add gradients to dense forms, tables, or standard list rows.

## Buttons

- Every interactive background token should have an explicit foreground token pair, such as `primary` / `primary-foreground`, `secondary` / `secondary-foreground`, `tertiary` / `tertiary-foreground`, and `surface` / `surface-foreground`.
- Button variants should declare their own foreground classes instead of inheriting text color from the parent surface.
- `primary` buttons are the main call to action and must always use the themed `primary` / `primary-foreground` color pair as a filled button.
- `secondary` buttons are supporting actions and must remain visibly clickable with the themed `secondary` / `secondary-foreground` color pair, not a neutral surface treatment.
- `tertiary` buttons distinguish alternate, non-semantic actions that need to remain visible beside primary and secondary controls. Encounter Test actions use this role so they do not blend into Edit and Clone.
- `outline` buttons are for lower-emphasis actions that still need a strong border affordance; they may use neutral surfaces but must set both default and hover foregrounds explicitly.
- `ghost` buttons are for low-emphasis controls; they should stay lightweight but must gain a visible surface or border on hover/focus.
- `info` buttons are for information-led actions, `warning` for cautionary actions, `success` for confirming actions, and `danger` for destructive actions.
- `success` buttons are reserved for genuinely positive/confirming outcomes, not ordinary “Add” or “Roll” actions.
- `danger` buttons are reserved for destructive or harmful actions.
- Add, create, roll, regenerate, and quick-action controls should usually use `primary` or `secondary`.
- Primary buttons should have the strongest contrast and the clearest hover/focus affordance.
- Secondary buttons should still read as clickable in both light and dark themes.
- Ghost buttons should gain a visible surface or border on hover and focus.
- Disabled buttons should remain legible but clearly subdued.
- Hover, active, and disabled states should each specify both background and foreground treatment.
- Buttons should not inherit body text colors, and coloured button variants should not use card or panel depth classes that define their own neutral backgrounds.
- Icon-only, split, toolbar, pagination, menu, and dialog buttons should all reuse the shared `Button` primitive or the same semantic token rules.
- Avoid using shadows as the only affordance in dark mode; pair them with border contrast and surface layering.

## Forms

- Forms should use shared inputs, textareas, selects, and field groups.
- Focus rings should come from the shared accent/primary tokens.
- Avoid page-specific form border colors unless they communicate real validation state.

## Empty, Loading, And Error States

- Empty states should be concise and actionable.
- Loading states should use the same surfaces as the loaded UI.
- Success, warning, and error feedback should use the shared status tokens.
- Validation and preview states should stay semantically consistent across import/export, campaign tools, and world tools.
- Read-only source explanations should use companion content tokens when the emphasis is source identity rather than system information.
- Empty states may use a subtle theme-aware banner or icon plate when the action needs more visual presence, but they should remain restrained and readable.

## Gradients And Special Effects

- Gradients are allowed when they support a workspace identity or clarify a canvas surface.
- Gradients should never substitute for semantic hierarchy.
- Avoid stacking multiple decorative gradients unless the page is a true immersive workspace, such as Campaign World.
- Even immersive workspaces must inherit the shared theme tokens and accent system.
- Use gradients on hero sections, workspace headers, dashboard summaries, profile headers, empty states, and wizard steps.
- Avoid gradients on forms, dense tables, input controls, and ordinary cards.

Allowed literal-color exceptions:

- OAuth/provider buttons and logos may use provider brand colors.
- Dungeon Studio map, terrain, room, region, and object artwork may use literal colors because they are canvas/art data, not application chrome.
- User-selectable custom colors, such as combatant color labels and color input fallbacks, may store literal hex values.
- Data visualizations may compute colors when the color is the data itself. Prefer documenting the mapping near the helper.
- If a literal color appears in product UI chrome, migrate it to a semantic, accent, neutral, or companion token.

## Component Patterns

- Page headers use `PageHeader`; eyebrow labels may use accent.
- Panels and cards use `SectionPanel`, `MutedPanel`, `WorkspaceBanner`, `FeatureCard`, `MetricCard`, `card`, `background`, `border`, and `surface` tokens.
- `SectionPanel` and `MutedPanel` usually map to flat or raised surfaces; `FeatureCard`, `MetricCard`, and `WorkspaceBanner` map to featured or hero surfaces.
- Tabs, segmented controls, and category filters use accent-backed selected states with neutral hover states.
- Tabs, segmented controls, dropdown triggers, toggle buttons, and selectable cards should use explicit foreground tokens for default, hover, selected, and disabled states.
- Badges and chips use `Badge`, `StatChip`, or shared source-tone helpers. Avoid local color maps in feature components.
- Badge and chip tone should name the meaning: `accent` for active interaction, semantic tones for status, and companion tones for stable content/source categories. Avoid untyped grey chips unless the metadata meaning is intentional.
- Stat displays and property/value panels use `StatChip` or `PropertyCard` from `frontend/src/components/shared/displayPrimitives.tsx`.
- Character ability displays use `AbilityScoreCard`; AC/HP/temp/speed displays use `VitalStatCard`; general compact count badges use `StatChip`.
- Placeholder avatars and initials use `InitialsAvatar`, which defaults to the theme-backed primary tone for character/NPC identity. Use companion tones only when the avatar represents source/category identity rather than a person or creature.
- Content source filters use `ContentSourceFilter`, `StandardSourceToggles`, and source-tone helpers instead of nested checkboxes or feature-specific source chips.
- Search boxes, filters, and forms use shared inputs, fields, selects, checkboxes, and focus tokens.
- Inputs, selects, and other interactive controls should keep focus rings visible in both light and dark mode and should not rely on inherited text color.
- Empty states use neutral surfaces with accent only for the primary empty-state icon.
- Error states use `destructive`; warnings use `warning`; success confirmations use `success`; explanatory guidance uses `info`.
- Navigation hover is neutral; active/selected navigation is accent-backed and must respect the selected accent.
- The strongest shared examples today are the campaign world hero/header surfaces, campaign overview tiles, import/export summary cards, and compact metric cards.
- Depth should be introduced where it clarifies hierarchy or clickability, not to make every component look embossed.

## Introducing New Styles

Before adding a new visual pattern:

1. Search for an existing shared component.
2. Search for a similar pattern elsewhere in the app.
3. Reuse or extend the shared pattern if practical.
4. Document the change here if it affects future styling decisions.

If a new page needs a distinctive treatment, explain why in the code or roadmap and keep the divergence small and token-driven.

Before finishing significant UI work, run a hardcoded-color audit for Tailwind palette names and literal hex/RGB/HSL values. Classify each hit as accent, semantic, neutral, companion, provider brand, user custom color, data visualization, or map/art color.
