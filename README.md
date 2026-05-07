# bluDM Encounter Tracker

A self-hosted D&D 5e encounter tracker built with a Go backend, React frontend, and PostgreSQL.

The first implementation slice includes:

- Single-DM setup flow and optional `.env` bootstrap admin.
- Enforced session-cookie authentication.
- PostgreSQL schema for users, sessions, campaigns, assets, creatures, spells, players, encounters, and combat log events.
- Protected campaign list/create API.
- Protected creature and spell library create/list APIs.
- React setup/login flow, campaign dashboard, and starter creature/spell library screens.

See [ENCOUNTER_TRACKER_PLAN.md](/Users/bluelinks/Developer/bluDM/ENCOUNTER_TRACKER_PLAN.md) for the product plan.

## Local Development

Start PostgreSQL:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up postgres
```

Run the API:

```sh
cd backend
go run ./cmd/server
```

Run the frontend:

```sh
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

The production Docker stack publishes the web container on `WEB_PORT`, which defaults to `3080` to avoid common dev-server conflicts.

To run the API in Docker as well:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up postgres api
```

## Self-Hosted Deployment

bluDM is set up for a simple Portainer Git deployment:

- Portainer watches the GitHub repository.
- The root `docker-compose.yml` builds the `web` and `api` services, then runs Postgres.
- The frontend nginx container serves React and proxies `/api` to the backend.
- Only the web port is exposed by default; Postgres and the API stay internal.

See [PORTAINER_DEPLOYMENT.md](/Users/bluelinks/Developer/bluDM/PORTAINER_DEPLOYMENT.md) for the deployment checklist, backup notes, and CI/CD behavior.

## Initial Login

For local development, the checked-in `.env` currently bootstraps:

- Email: `dm@example.test`
- Password: `correct horse battery staple`

The bootstrap admin is only created when the `users` table is empty. If a DM account already exists in the database, changing `.env` will not overwrite it.

For a real self-hosted install, copy `.env.example` to `.env` and change at least:

- `POSTGRES_PASSWORD`
- `SESSION_SECRET` with at least 32 characters
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` with at least 12 characters
- `COOKIE_SECURE=true` when running behind HTTPS

## Quality Gates

Run the same baseline checks locally that CI runs on pull requests:

```sh
make verify
```

The GitHub Actions workflow also builds Docker images, smoke-tests `/health` and `/api/health`, and runs free security checks.

## Notes

- The current database migration is mounted into the Postgres container and runs when the database volume is first created.
- Authentication is intentionally enforced. The setup route is only useful before the first DM account exists.
- Uploaded image storage is planned in PostgreSQL for v1, matching the self-hosting decision in the plan.
- The combat log schema starts with events so undo and encounter summaries can build on a durable history.
- Creature and spell creation are intentionally app-native for now. JSON fields are available for richer stat blocks, components, and mechanics while the dedicated forms mature.
