# bluDM Privacy Notes

bluDM is a self-hosted application. The operator of the deployed instance controls the server,
database, backups, logs, reverse proxy, OAuth credentials, and access to the deployment.

## Data Stored

bluDM stores:

- account email addresses returned by configured sign-in providers
- provider identifiers needed to recognize returning OAuth users
- hashed local password credentials when local fallback auth is enabled
- hashed session tokens and session expiry times
- campaign, player, creature, spell, action, encounter, combat log, XP, and loot data
- uploaded or imported avatar and image bytes

bluDM does not need to store Google or Apple access tokens or refresh tokens for sign-in.

## Data Isolation

Campaigns, creatures, spells, action templates, uploaded assets, and nested gameplay records are
scoped to the signed-in user that created them. Users should not be able to view or modify another
user's stored resources unless a future sharing feature explicitly grants access.

## Operator Responsibilities

For production deployments:

- serve bluDM over HTTPS
- set `COOKIE_SECURE=true`
- protect database volumes and backups
- keep OAuth client secrets and Apple private keys outside Git
- rotate credentials if they are exposed
- test backup restore before relying on backups

## Deletion And Export

Account deletion and full data export are not automated yet. Until those features are implemented,
the self-hosted operator is responsible for removing or exporting data directly from the database.
