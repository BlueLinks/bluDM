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
- Run the configured formatter for frontend files when one exists. If no formatter is configured, avoid broad formatting-only churn.
- Comments should explain why a non-obvious decision exists, not narrate what the next line does.

## Testing And Verification
Before pushing code, run the checks relevant to the change. For normal feature/backend/frontend work, use:

```sh
cd frontend && npm run lint
cd frontend && npm run test
cd frontend && npm run build
node scripts/check-file-size.mjs
cd backend && gofmt -w <changed-go-files>
cd backend && go test ./...
cd backend && go vet ./...
docker compose config
```

For security-sensitive backend changes, also run:

```sh
cd backend && gosec -exclude=G404 ./...
```

If a check cannot be run locally, say so in the PR and explain why.

## Git And GitHub
- Work from an issue whenever possible.
- Before creating a branch, check whether a branch already exists for the issue.
- Branch names should include the issue number and a short slug, for example `issue-32-repository-working-rules`.
- Create PRs into `main`; do not push directly to `main`.
- Use conventional commits with a descriptive body when the motivation is not obvious.
- PRs should explain what changed, why it changed, how it was tested, and which issue it addresses.
