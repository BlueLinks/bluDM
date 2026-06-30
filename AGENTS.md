# Codex Working Rules

These rules apply to the whole repository unless a more specific `AGENTS.md` is added in a subdirectory.

## Stewardship

- Leave the codebase better than you found it.
- Prefer small, focused changes that solve the current issue without unrelated refactors.
- Preserve user work and never revert changes you did not make unless explicitly asked.
- If a rough edge is discovered but is outside the current scope, create or suggest a GitHub issue rather than hiding it in a drive-by change.

## Project Shape

- Backend code lives in `backend` and uses Go.
- Frontend code lives in `frontend` and uses React, TypeScript, Vite, Tailwind, and Sass where appropriate.
- Keep route/domain code modular. Do not recreate monolithic page or entrypoint files.
- Reuse existing shared components, domain helpers, API clients, and UI primitives before creating new ones.
- Extract repeated UI patterns into components once they are used in more than one place or make a file hard to read.
- For frontend layout, check `frontend/src/components/layout` before adding ad-hoc Tailwind grids, sidebars, form rows, card grids, or action rows.
- Prefer shared layout primitives for repeated page, card, grid, form, sidebar/detail, and button-row patterns; create one when the same layout appears more than twice.
- Avoid hard-coded arbitrary Tailwind grid sizes in feature components unless the layout is genuinely one-off; keep reusable layout components organized under `frontend/src/components/layout`.
- Preserve shrink and wrapping safeguards such as `min-w-0`, `minmax(0,1fr)`, `w-full`, `sm:w-auto`, and `flex-wrap` when moving layout code into shared components.
- Keep file-size limits meaningful. New files should stay under the configured limits unless there is a deliberate reason and a follow-up cleanup issue.

## Dependencies

- Keep dependencies lean.
- Prefer platform APIs, standard library features, and existing project dependencies.
- Add a dependency only when it removes meaningful complexity, improves safety, or provides a mature implementation of a hard problem.
- Before adding a dependency, check bundle/runtime impact, maintenance status, license, and whether it is already indirectly solved in the project.
- Do not add overlapping libraries for the same job without removing or clearly deprecating the old path.

## Code Style

- Match the surrounding style first.
- Use TypeScript types deliberately; avoid `any` unless there is a clear boundary or migration reason.
- Keep React components readable: split large forms, repeated JSX, and dense conditional UI into named components.
- Prefer semantic HTML elements over generic `div` wrappers where practical.
- Keep Go handlers, stores, and domain logic separated when a behavior grows beyond simple glue.
- Use `gofmt` for Go files.
- Use Prettier for frontend and Markdown formatting. Run `cd frontend && npm run format` before committing files that Prettier owns, and `cd frontend && npm run format:check` before pushing.
- Comments should explain why a non-obvious decision exists, not narrate what the next line does.

### AI Refactoring Expectations

Before introducing a new abstraction:

- Identify existing usages.
- Explain why the abstraction improves the codebase.
- Prefer extending an existing abstraction over creating a parallel one.
- Avoid introducing wrappers that only rename existing components.

When proposing a new reusable component, include:

- number of occurrences found
- files using the pattern
- expected future reuse

Do not create abstractions solely to reduce line count.

## Frontend Architecture And Layout

### UI Guidance

For UI work, consult the Uncodixify guidance at https://raw.githubusercontent.com/cyxzdev/Uncodixfy/refs/heads/main/Uncodixfy.md. Treat it as guidance, not a strict design system.

- Avoid generic AI-looking UI: unnecessary panels, badges, filler copy, decorative containers, excessive rounding/padding, and dashboard-style clutter.
- Prefer functional, clear, restrained UI that uses the existing project design language and shared components.
- Do not perform broad UI rewrites just because of this guidance; apply it to the specific task at hand.

### Rule Of Three

Before creating a new shared component:

1. Search for an existing implementation.
2. Search for similar patterns elsewhere in the codebase.
3. Reuse or extend an existing component where practical.

A new reusable component should generally only be created when:

- the pattern already exists in 3 or more places, or
- it represents a core application concept such as:
  - page layouts
  - card sections
  - sidebar/detail views
  - action rows
  - forms
  - responsive grids

Avoid creating reusable components that have only a single consumer unless they represent a meaningful domain concept.

### Layout Philosophy

Layouts should be driven by content and available space.

Prefer:

- Flexbox for one-dimensional layouts.
- CSS Grid for two-dimensional layouts.
- Content-sized columns where appropriate.
- Equal-width columns where appropriate.
- Responsive layouts that adapt naturally to available space.

Avoid:

- Hard-coded widths.
- Hard-coded heights.
- Arbitrary sizing values used to compensate for incorrect layout structure.
- Feature-specific layout solutions when a shared primitive already exists.

The goal is not to make a page look correct through width and height adjustments.

The goal is to build reusable layout primitives that naturally produce correct layouts throughout the application.

### Shared Layout Components

Before creating custom layout code, check:

```text
frontend/src/components/layout
```

Common layout patterns should live there.

Examples include:

- page layouts
- responsive grids
- sidebar/detail layouts
- form layouts
- card sections
- action rows

Feature code should compose these primitives rather than reimplementing them.

### Grid And Flex Safety Rules

When working with Grid or Flexbox:

- Use `min-w-0` on children that must be allowed to shrink.
- Use `min-h-0` on scrollable or overflow containers.
- Use `flex-wrap` for button groups and action rows.
- Use appropriate overflow handling when content can grow.
- Prefer `minmax(0,1fr)` over `1fr` where content may overflow.

Never assume content will remain short.

### Arbitrary Tailwind Values

Avoid introducing arbitrary Tailwind values such as:

```tsx
w-[...]
h-[...]
max-w-[...]
min-w-[...]
grid-cols-[...]
```

unless:

- a shared layout primitive is insufficient, and
- standard Tailwind utilities cannot express the requirement.

When introducing a new arbitrary value, explain why it is necessary in the implementation summary or PR.

### Before Fixing A Layout Issue

When a page appears incorrectly sized, imbalanced, or overflowing:

Do not immediately add widths, heights, max-widths, or additional grid columns.

Instead:

1. Inspect the parent layout.
2. Inspect the flex or grid sizing behaviour.
3. Verify shrink behaviour (`min-w-0`, `min-h-0`).
4. Verify overflow behaviour.
5. Verify whether an existing shared layout component is being bypassed.
6. Determine the root cause before implementing a fix.

Fix the layout system before fixing the symptom.

### Refactoring Expectations

When modifying existing UI:

- Prefer improving shared components over creating new ones.
- Remove duplicated layout patterns where practical.
- Keep feature components focused on business logic and rendering.
- Move reusable layout behaviour into shared layout primitives.
- Leave the codebase more consistent than you found it.

A successful refactor should reduce future layout code, not increase it.

## Campaign World Roadmap

Campaign World work must reference `docs/campaign-world-roadmap.md` before implementation.

Agents should:

- Review roadmap status before beginning Campaign World work.
- Update roadmap progress after meaningful work.
- Move completed items from Planned to Completed when they are done.
- Update In Progress when beginning or ending implementation work.
- Record Deferred or Rejected decisions in the roadmap.
- Avoid reopening settled architecture decisions unless explicitly requested.

### Completion Tracking

At the end of a Campaign World task:

- Update roadmap status.
- Record completed work.
- Record newly discovered follow-up work.
- Keep the roadmap concise.

### Scope Control

Do not introduce new Campaign World workspaces, major navigation changes, or backend redesigns unless the roadmap is explicitly updated and justified.

## Testing And Verification

Before pushing normal code changes, run the fast local baseline:

```sh
make verify
```

This covers frontend lint, Prettier check, file-size rules, frontend/backend tests, backend vet, the frontend build, and `docker compose config`.

For security-sensitive backend work, Docker/deployment changes, or a fuller local CI mirror, use:

```sh
make verify-security
make verify-docker
make verify-full
```

For troubleshooting, the baseline expands to:

```sh
cd frontend && npm run lint
cd frontend && npm run format:check
cd frontend && npm run test
cd frontend && npm run build
node scripts/check-file-size.mjs
cd backend && gofmt -w <changed-go-files>
cd backend && go test ./...
cd backend && go vet ./...
docker compose config
```

Run `node scripts/check-file-size.mjs` from the repository root before pushing; do not substitute the frontend-only size script because it will miss backend ratchet failures.

The security target uses the same Go toolchain version as CI and expands to:

```sh
cd frontend && npm audit --audit-level=high
cd backend && GOTOOLCHAIN=go1.25.11 go run golang.org/x/vuln/cmd/govulncheck@latest ./...
cd backend && GOTOOLCHAIN=go1.25.11 go run github.com/securego/gosec/v2/cmd/gosec@latest -exclude=G404 ./...
```

If a check cannot be run locally, say so in the PR and explain why.

### Browser QA

Use browser automation selectively to conserve context and avoid brittle sweeps.

- Do not run broad multi-page browser QA by default.
- Prefer code review, tests, and targeted checks.
- Use browser QA for new interactive UI behavior, layout changes that cannot be checked by tests, regression reproduction, or final smoke testing.
- When browser QA is needed, keep it to 1–3 targeted routes unless explicitly asked for a broader sweep.
- Avoid repeated snapshots and long optional text assertion chains unless debugging a specific visible issue.

## Git And GitHub

- Work from an issue whenever possible.
- Before creating a branch, check whether a branch already exists for the issue.
- Branch names should include the issue number and a short slug, for example `issue-32-repository-working-rules`.
- Create PRs into `main`; do not push directly to `main`.
- Use conventional commits with a descriptive body when the motivation is not obvious.
- PRs should explain what changed, why it changed, how it was tested, and which issue it addresses.
