# Contributing

bluDM uses issue-led development, conventional commits, and pull requests into `main`.

## Workflow

1. Find or create a GitHub issue for the work.
2. Check whether a branch already exists for that issue.
3. Create a branch from the latest `main`:

   ```sh
   git fetch origin main
   git switch -c issue-<number>-short-description origin/main
   ```

4. Keep the change focused on the issue.
5. Run Prettier and the relevant checks before pushing.
6. Push the branch and open a PR into `main`.

## Branch Names

Use:

```text
issue-<number>-short-kebab-case-summary
```

Examples:

```text
issue-32-repository-working-rules
issue-23-import-export-content
issue-19-user-data-isolation
```

## Conventional Commits

Use conventional commits:

```text
<type>(optional-scope): <short summary>

<body explaining why, tradeoffs, or context when useful>

Refs #<issue>
```

Common types:

- `feat`: user-facing feature
- `fix`: bug fix
- `refactor`: structure change without intended behavior change
- `test`: tests only
- `docs`: documentation only
- `chore`: tooling, dependency, or maintenance work
- `ci`: CI/CD changes
- `perf`: performance improvement
- `style`: formatting-only change

Good examples:

```text
feat(combat): add death save controls

Players at 0 HP need to stay in initiative rather than being skipped like defeated enemies. This adds run-only death save state and UI controls for success, failure, and stabilization.

Refs #21
```

```text
fix(auth): scope campaign queries by user

Campaign data must not leak between authenticated users. This updates list/detail queries to enforce ownership at the database boundary and adds regression coverage for cross-user access.

Refs #19
```

Avoid vague commits like:

```text
fix stuff
updates
wip
changes
```

## Pull Requests

PRs should include:

- Linked issue, for example `Refs #32` or `Closes #32`.
- Summary of what changed.
- Explanation of why the change is needed.
- Tests and checks run.
- Screenshots or short clips for UI changes when useful.
- Notes about follow-up work or known limitations.

Keep PRs reviewable. If a change grows too large, split it by domain or behavior.

## Verification

Run the checks relevant to the files touched.

Frontend:

```sh
cd frontend && npm run lint
cd frontend && npm run format:check
cd frontend && npm run test
cd frontend && npm run build
node scripts/check-file-size.mjs
```

Backend:

```sh
cd backend && gofmt -w <changed-go-files>
cd backend && go test ./...
cd backend && go vet ./...
```

Compose/deployment:

```sh
docker compose config
```

Security-sensitive backend changes:

```sh
cd backend && gosec -exclude=G404 ./...
```

Run Prettier before pushing frontend, Markdown, JSON, CSS, or Sass changes:

```sh
cd frontend && npm run format
```

Avoid unrelated formatting churn.

## Code Standards

- Reuse existing components and helpers before adding new ones.
- Keep dependencies minimal and justified.
- Prefer clear, typed interfaces between backend, frontend, and domain helpers.
- Keep UI primitives generic and feature code inside feature folders.
- Keep API authorization checks on the backend, not only in the frontend.
- Leave related tests or tracking issues when you touch risky behavior.
