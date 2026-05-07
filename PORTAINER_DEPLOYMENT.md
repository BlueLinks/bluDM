# Portainer Deployment

bluDM uses the same simple deployment model as bluCatch for the first self-hosted release: GitHub holds the source, Portainer watches the repository, and the root `docker-compose.yml` builds and runs the stack.

## Stack Layout

- `web`: nginx serving the built React app and proxying `/api` to the backend.
- `migrate`: one-shot schema readiness command that runs before the API starts.
- `api`: Go backend.
- `postgres`: PostgreSQL with a named Docker volume.
- `postgres-backup`: optional profile for scheduled `pg_dump` backups.

Only `web` exposes a host port by default. The API and database stay on the internal Docker network.

## Portainer Setup

1. Create a GitHub repository for bluDM and push the project.
2. In Portainer, create a new stack from a Git repository.
3. Set the compose path to `docker-compose.yml`.
4. Add the production environment variables from `.env.example`, replacing every secret.
5. Enable Git polling or create a Portainer stack webhook.
6. If using webhooks, add the webhook URL as a GitHub Actions secret named `PORTAINER_WEBHOOK_URL`.

Portainer should deploy from `main` only. Pull requests are guarded by GitHub Actions but should not deploy.

## Production Environment

Set these values in Portainer or in a server-side `.env` file that is not committed:

```sh
POSTGRES_DB=bludm
POSTGRES_USER=bludm
POSTGRES_PASSWORD=replace-me
WEB_PORT=3000
SESSION_SECRET=replace-me-with-at-least-32-random-characters
COOKIE_SECURE=true
PUBLIC_APP_URL=https://your-domain.example
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=replace-me-with-a-long-password
POSTGRES_BACKUP_INTERVAL_SECONDS=86400
POSTGRES_BACKUP_RETENTION_DAYS=14
```

The bootstrap admin is only created when the users table is empty.

## Schema Updates

The stack runs the `migrate` service before starting the API. Today that command uses the same idempotent schema readiness logic as the server, which keeps v1 simple and compatible with the current migration file. Later, this can be swapped for a versioned migration tool without changing the Portainer deployment shape.

## Backups

To enable the built-in backup service, deploy with the `backup` profile enabled in Portainer, or run:

```sh
docker compose --profile backup up -d
```

Backups are written to `./backups/postgres` on the server. Copy these somewhere outside the Docker host as well; a backup that only lives on the same disk is not enough.

Restore test:

```sh
createdb bludm_restore
pg_restore -d bludm_restore backups/postgres/bludm-YYYYMMDD-HHMMSS.dump
```

## Local Development

Use the dev override when you want direct local access to Postgres and the API:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up postgres api
```

Then run the frontend dev server:

```sh
cd frontend
npm install
npm run dev
```

## CI/CD

GitHub Actions runs on pull requests and pushes to `main`:

- frontend lint, tests, build, and file-size checks
- backend tests, `go vet`, `govulncheck`, and `gosec`
- compose validation
- Docker builds
- smoke test for `/health` and `/api/health`
- free security scans with Gitleaks, Trivy, and Semgrep

Merging to `main` is the deployment signal for Portainer.
