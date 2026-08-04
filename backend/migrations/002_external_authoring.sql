-- Forward-only MCP and external-authoring schema.
alter table api_tokens add column if not exists scopes text[] not null default '{}';
alter table api_tokens add column if not exists campaign_restriction_mode text not null default 'legacy_all';
alter table api_tokens add column if not exists authentication_version integer not null default 1;
alter table api_tokens add column if not exists revoked_at timestamptz;

create table if not exists api_token_campaigns (
  token_id uuid not null references api_tokens(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (token_id, campaign_id)
);

create table if not exists oidc_subject_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  issuer text not null,
  subject text not null,
  created_at timestamptz not null default now(),
  unique (issuer, subject)
);

alter table creature_actions add column if not exists display_section text not null default 'action';
alter table action_templates add column if not exists display_section text not null default 'action';
alter table encounters add column if not exists revision integer not null default 1;

create table if not exists encounter_revisions (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references encounters(id) on delete cascade,
  revision integer not null,
  snapshot jsonb not null,
  generation_input jsonb not null default '{}',
  generation_output jsonb not null default '{}',
  change_reason text not null,
  actor_user_id uuid not null references users(id) on delete cascade,
  actor_token_id uuid references api_tokens(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (encounter_id, revision)
);

create table if not exists idempotency_records (
  id uuid primary key default gen_random_uuid(),
  principal_key text not null,
  operation text not null,
  idempotency_key text not null,
  input_hash text not null,
  response jsonb not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (principal_key, operation, idempotency_key)
);

create table if not exists authoring_previews (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  principal_key text not null,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  operations_hash text not null,
  operations jsonb not null,
  entity_versions jsonb not null default '{}',
  result jsonb not null default '{}',
  expires_at timestamptz not null,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists external_audit_records (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  user_id uuid not null references users(id) on delete cascade,
  token_id uuid references api_tokens(id) on delete set null,
  authentication text not null,
  client_name text not null default '',
  operation text not null,
  campaign_id uuid references campaigns(id) on delete set null,
  target_entity_id uuid,
  required_scopes jsonb not null default '{}',
  "authorization" text not null,
  result_class text not null,
  idempotency_replay boolean not null default false,
  encounter_revision integer not null default 0,
  generator_version text not null default '',
  seed text not null default '',
  duration_ms bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists api_tokens_revoked_at_idx on api_tokens(revoked_at);
create index if not exists api_token_campaigns_campaign_idx on api_token_campaigns(campaign_id);
create index if not exists encounter_revisions_encounter_created_idx
  on encounter_revisions(encounter_id, created_at desc);
create index if not exists idempotency_records_expires_at_idx on idempotency_records(expires_at);
create index if not exists authoring_previews_expires_at_idx on authoring_previews(expires_at);
create index if not exists external_audit_records_created_at_idx
  on external_audit_records(created_at desc);
