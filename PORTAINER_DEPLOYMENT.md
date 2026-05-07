# Portainer Deployment

bluDM uses the same simple deployment model as bluCatch for the first self-hosted release: GitHub holds the source, Portainer watches the repository, and the root `docker-compose.yml` builds and runs the stack.

## Stack Layout

- `web`: nginx serving the built React app and proxying `/api` to the backend.
- `api`: Go backend.
- `postgres`: PostgreSQL with a named Docker volume.
- `migrate`: optional one-shot schema readiness command under the `tools` profile.
- `postgres-backup`: optional profile for scheduled `pg_dump` backups.

Only `web` exposes a host port by default. The API and database stay on the internal Docker network.

The web container waits for the API container to start, not for the API healthcheck to pass. This keeps Portainer from aborting the entire deployment before logs are inspectable if the API has a startup issue.

The published web port is plain HTTP unless you put it behind a reverse proxy. For a direct LAN test, use `http://<server-ip>:<WEB_PORT>`, not `https://`.

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
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=bludm
DATABASE_USER=bludm
DATABASE_PASSWORD=replace-me
DATABASE_SSLMODE=disable
WEB_PORT=3080
SESSION_SECRET=replace-me-with-at-least-32-random-characters
COOKIE_SECURE=true
PUBLIC_APP_URL=https://your-domain.example
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=replace-me-with-a-long-password
POSTGRES_BACKUP_INTERVAL_SECONDS=86400
POSTGRES_BACKUP_RETENTION_DAYS=14
```

The bootstrap admin is only created when the users table is empty.

Important startup validation:

- `SESSION_SECRET` must be at least 32 characters.
- `ADMIN_PASSWORD` must be at least 12 characters when `ADMIN_EMAIL` is set.
- `WEB_PORT` is the host port Portainer publishes. Change it if another stack already uses that port.
- For the Docker stack, leave `DATABASE_URL` unset unless you have a specific reason to override the split `DATABASE_*` variables. The app will connect to `postgres`, not `localhost`, inside Docker.
- Set `DATABASE_PASSWORD` to the same value as `POSTGRES_PASSWORD` if you use the split database variables.

Postgres password note:

`POSTGRES_PASSWORD` is only used when the Postgres volume is first initialized. If a stack has already created its `postgres_data` volume, changing `POSTGRES_PASSWORD` later will not change the existing database user's password. For a fresh install with no data to keep, remove the stack and its volumes, then redeploy. To keep the volume, update the database user's password from inside the Postgres container instead.

```sh
psql -U bludm -d bludm -c "alter user bludm with password 'new-password-here';"
```

## Schema Updates

The API runs idempotent schema readiness checks on startup. The optional `migrate` service uses the same logic and can be run manually with the `tools` profile when you want to verify schema readiness without starting the API:

```sh
docker compose --profile tools run --rm migrate
```

The app builds its Postgres connection string from `DATABASE_*` / `POSTGRES_*` variables so passwords with characters like `@`, `#`, `/`, or `:` do not break URL parsing. If you set `DATABASE_URL` explicitly, make sure special characters are URL-encoded.

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
