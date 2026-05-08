package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func EnsureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
create extension if not exists pgcrypto;

create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    password_hash text,
    avatar_asset_id uuid,
    avatar_url text not null default '',
    created_at timestamptz not null default now()
);

alter table users alter column password_hash drop not null;
alter table users add column if not exists avatar_asset_id uuid;
alter table users add column if not exists avatar_url text not null default '';

create table if not exists auth_identities (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    provider text not null,
    provider_subject text not null,
    email text not null default '',
    email_verified boolean not null default false,
    created_at timestamptz not null default now(),
    last_login_at timestamptz not null default now(),
    unique (provider, provider_subject)
);

create index if not exists auth_identities_user_id_idx on auth_identities(user_id);

create table if not exists oauth_states (
    id uuid primary key default gen_random_uuid(),
    state_hash text not null unique,
    provider text not null,
    nonce text not null,
    pkce_verifier text not null,
    purpose text not null default 'login',
    user_id uuid references users(id) on delete cascade,
    return_to text not null default '/',
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

alter table oauth_states add column if not exists purpose text not null default 'login';
alter table oauth_states add column if not exists user_id uuid references users(id) on delete cascade;
create index if not exists oauth_states_expires_at_idx on oauth_states(expires_at);

create table if not exists sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);

create table if not exists campaigns (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid references users(id) on delete cascade,
    name text not null,
    description text not null default '',
    archived_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists uploaded_assets (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid references users(id) on delete cascade,
    filename text not null,
    content_type text not null,
    byte_size bigint not null,
    data bytea not null,
    created_at timestamptz not null default now()
);

create table if not exists creatures (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid references users(id) on delete cascade,
    name text not null,
    description text not null default '',
    size text not null default '',
    creature_type text not null default '',
    alignment text not null default '',
    armor_class integer not null default 10,
    hit_points integer not null default 1,
    hit_dice text not null default '',
    challenge_rating text not null default '',
    xp integer not null default 0,
    image_asset_id uuid references uploaded_assets(id) on delete set null,
    avatar_url text not null default '',
    stat_block jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists spells (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid references users(id) on delete cascade,
    name text not null,
    level integer not null default 0,
    school text not null default '',
    casting_time text not null default '',
    spell_range text not null default '',
    components jsonb not null default '{}'::jsonb,
    duration text not null default '',
    ritual boolean not null default false,
    concentration boolean not null default false,
    description text not null default '',
    higher_level text not null default '',
    source_note text not null default '',
    mechanics jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists action_templates (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid references users(id) on delete cascade,
    name text not null,
    description text not null default '',
    recharge text not null default '',
    limited_uses integer not null default 0,
    limit_type text not null default 'day',
    reach integer not null default 0,
    action_range integer not null default 0,
    aoe_type text not null default '',
    aoe_size integer not null default 0,
    action_type text not null default 'melee_weapon',
    attack_modifier integer not null default 0,
    miss_effect text not null default 'none',
    hit_special_event text not null default 'none',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table campaigns add column if not exists owner_user_id uuid references users(id) on delete cascade;
alter table uploaded_assets add column if not exists owner_user_id uuid references users(id) on delete cascade;
alter table uploaded_assets drop constraint if exists uploaded_assets_owner_user_id_fkey;
alter table uploaded_assets add constraint uploaded_assets_owner_user_id_fkey foreign key (owner_user_id) references users(id) on delete cascade;
alter table creatures add column if not exists owner_user_id uuid references users(id) on delete cascade;
alter table spells add column if not exists owner_user_id uuid references users(id) on delete cascade;
alter table action_templates add column if not exists owner_user_id uuid references users(id) on delete cascade;

with first_user as (select id from users order by created_at asc limit 1)
update campaigns set owner_user_id = (select id from first_user) where owner_user_id is null and exists(select 1 from first_user);
with first_user as (select id from users order by created_at asc limit 1)
update uploaded_assets set owner_user_id = (select id from first_user) where owner_user_id is null and exists(select 1 from first_user);
with first_user as (select id from users order by created_at asc limit 1)
update creatures set owner_user_id = (select id from first_user) where owner_user_id is null and exists(select 1 from first_user);
with first_user as (select id from users order by created_at asc limit 1)
update spells set owner_user_id = (select id from first_user) where owner_user_id is null and exists(select 1 from first_user);
with first_user as (select id from users order by created_at asc limit 1)
update action_templates set owner_user_id = (select id from first_user) where owner_user_id is null and exists(select 1 from first_user);

alter table campaigns alter column owner_user_id set not null;
alter table uploaded_assets alter column owner_user_id set not null;
alter table creatures alter column owner_user_id set not null;
alter table spells alter column owner_user_id set not null;
alter table action_templates alter column owner_user_id set not null;

create index if not exists campaigns_owner_user_id_idx on campaigns(owner_user_id, updated_at desc);
create index if not exists uploaded_assets_owner_user_id_idx on uploaded_assets(owner_user_id, created_at desc);
create index if not exists creatures_owner_user_id_idx on creatures(owner_user_id, updated_at desc);
create index if not exists spells_owner_user_id_idx on spells(owner_user_id, level, name);
create index if not exists action_templates_owner_user_id_idx on action_templates(owner_user_id, name);

create table if not exists action_template_roll_parts (
    id uuid primary key default gen_random_uuid(),
    action_template_id uuid not null references action_templates(id) on delete cascade,
    sort_order integer not null default 0,
    roll_kind text not null default 'damage',
    damage_type text not null default '',
    magical boolean not null default false,
    dice_count integer not null default 1,
    die_size integer not null default 6,
    fixed_value integer not null default 0
);

create index if not exists action_template_roll_parts_template_idx on action_template_roll_parts(action_template_id, sort_order);

create table if not exists creature_actions (
    id uuid primary key default gen_random_uuid(),
    creature_id uuid not null references creatures(id) on delete cascade,
    source_template_id uuid references action_templates(id) on delete set null,
    sort_order integer not null default 0,
    name text not null,
    description text not null default '',
    recharge text not null default '',
    limited_uses integer not null default 0,
    limit_type text not null default 'day',
    reach integer not null default 0,
    action_range integer not null default 0,
    aoe_type text not null default '',
    aoe_size integer not null default 0,
    action_type text not null default 'melee_weapon',
    attack_modifier integer not null default 0,
    miss_effect text not null default 'none',
    hit_special_event text not null default 'none',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists creature_actions_creature_idx on creature_actions(creature_id, sort_order);

create table if not exists creature_action_roll_parts (
    id uuid primary key default gen_random_uuid(),
    creature_action_id uuid not null references creature_actions(id) on delete cascade,
    sort_order integer not null default 0,
    roll_kind text not null default 'damage',
    damage_type text not null default '',
    magical boolean not null default false,
    dice_count integer not null default 1,
    die_size integer not null default 6,
    fixed_value integer not null default 0
);

create index if not exists creature_action_roll_parts_action_idx on creature_action_roll_parts(creature_action_id, sort_order);

create table if not exists creature_spellcasting_profiles (
    creature_id uuid primary key references creatures(id) on delete cascade,
    spellcasting_ability text not null default '',
    innate_spellcasting_ability text not null default '',
    caster_level integer not null default 0,
    spell_save_dc integer not null default 0,
    spell_attack_bonus integer not null default 0,
    slots jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists creature_spells (
    id uuid primary key default gen_random_uuid(),
    creature_id uuid not null references creatures(id) on delete cascade,
    spell_id uuid not null references spells(id) on delete cascade,
    spell_level integer not null default 0,
    prepared boolean not null default true,
    innate boolean not null default false,
    sort_order integer not null default 0,
    unique (creature_id, spell_id)
);

create index if not exists creature_spells_creature_level_idx on creature_spells(creature_id, spell_level, sort_order);

create table if not exists players (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    character_name text not null,
    player_name text not null default '',
    armor_class integer not null default 10,
    max_hit_points integer not null default 1,
    current_hit_points integer not null default 1,
    temporary_hit_points integer not null default 0,
    temporary_max_hit_points integer not null default 0,
    experience_points integer not null default 0,
    character_sheet jsonb not null default '{}'::jsonb,
    image_asset_id uuid references uploaded_assets(id) on delete set null,
    avatar_url text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists players_campaign_id_idx on players(campaign_id);

alter table players add column if not exists experience_points integer not null default 0;
alter table players add column if not exists image_asset_id uuid references uploaded_assets(id) on delete set null;
alter table players add column if not exists avatar_url text not null default '';
alter table creatures add column if not exists image_asset_id uuid references uploaded_assets(id) on delete set null;
alter table creatures add column if not exists avatar_url text not null default '';

create table if not exists campaign_creatures (
    campaign_id uuid not null references campaigns(id) on delete cascade,
    creature_id uuid not null references creatures(id) on delete cascade,
    disposition text not null default 'neutral',
    created_at timestamptz not null default now(),
    primary key (campaign_id, creature_id)
);

create index if not exists campaign_creatures_creature_id_idx on campaign_creatures(creature_id);

create table if not exists encounters (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    name text not null,
    description text not null default '',
    status text not null default 'planned',
    location text not null default '',
    room_number text not null default '',
    loot_notes text not null default '',
    background_asset_id uuid references uploaded_assets(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists encounters_campaign_id_idx on encounters(campaign_id);

alter table encounters add column if not exists status text not null default 'planned';
alter table encounters add column if not exists location text not null default '';
alter table encounters add column if not exists room_number text not null default '';
alter table encounters add column if not exists loot_notes text not null default '';
alter table encounters add column if not exists background_asset_id uuid references uploaded_assets(id) on delete set null;

create table if not exists encounter_combatants (
    id uuid primary key default gen_random_uuid(),
    encounter_id uuid not null references encounters(id) on delete cascade,
    source_type text not null,
    player_id uuid references players(id) on delete cascade,
    creature_id uuid references creatures(id) on delete set null,
    side text not null default 'enemy',
    display_name text not null,
    color_label text not null default 'slate',
    avatar_url text not null default '',
    armor_class integer not null default 10,
    max_hit_points integer not null default 1,
    current_hit_points integer not null default 1,
    rolled_hp boolean not null default false,
    sort_order integer not null default 0,
    snapshot jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists encounter_combatants_encounter_side_idx on encounter_combatants(encounter_id, side, sort_order);

create table if not exists encounter_runs (
    id uuid primary key default gen_random_uuid(),
    encounter_id uuid not null references encounters(id) on delete cascade,
    status text not null default 'setup',
    is_test boolean not null default false,
    current_round integer not null default 1,
    current_turn_index integer not null default 0,
    started_at timestamptz not null default now(),
    ended_at timestamptz,
    summary jsonb not null default '{}'::jsonb
);

alter table encounter_runs add column if not exists is_test boolean not null default false;
alter table encounter_runs alter column status set default 'setup';
alter table encounter_runs add column if not exists summary jsonb not null default '{}'::jsonb;

create table if not exists encounter_run_combatants (
    id uuid primary key default gen_random_uuid(),
    encounter_run_id uuid not null references encounter_runs(id) on delete cascade,
    source_combatant_id uuid references encounter_combatants(id) on delete set null,
    source_type text not null default 'creature',
    player_id uuid references players(id) on delete set null,
    creature_id uuid references creatures(id) on delete set null,
    side text not null default 'enemy',
    display_name text not null,
    color_label text not null default 'slate',
    avatar_url text not null default '',
    armor_class integer not null default 10,
    max_hit_points integer not null default 1,
    current_hit_points integer not null default 1,
    temporary_hit_points integer not null default 0,
    max_hit_points_modifier integer not null default 0,
    armor_class_bonus integer not null default 0,
    armor_class_override integer not null default 0,
    max_hit_points_override integer not null default 0,
    current_hit_points_override integer not null default 0,
    initiative integer,
    initiative_set boolean not null default false,
    sort_order integer not null default 0,
    defeated boolean not null default false,
    conditions jsonb not null default '[]'::jsonb,
    damage_dealt integer not null default 0,
    damage_taken integer not null default 0,
    healing_done integer not null default 0,
    healing_received integer not null default 0,
    kills integer not null default 0,
    death_save_successes integer not null default 0,
    death_save_failures integer not null default 0,
    stable boolean not null default false,
    snapshot jsonb not null default '{}'::jsonb
);

create index if not exists encounter_run_combatants_run_idx on encounter_run_combatants(encounter_run_id, sort_order);

alter table encounter_run_combatants add column if not exists source_type text not null default 'creature';
alter table encounter_run_combatants add column if not exists player_id uuid references players(id) on delete set null;
alter table encounter_run_combatants add column if not exists creature_id uuid references creatures(id) on delete set null;
alter table encounter_run_combatants add column if not exists temporary_hit_points integer not null default 0;
alter table encounter_run_combatants add column if not exists max_hit_points_modifier integer not null default 0;
alter table encounter_run_combatants add column if not exists armor_class_bonus integer not null default 0;
alter table encounter_run_combatants add column if not exists armor_class_override integer not null default 0;
alter table encounter_run_combatants add column if not exists max_hit_points_override integer not null default 0;
alter table encounter_run_combatants add column if not exists current_hit_points_override integer not null default 0;
alter table encounter_run_combatants add column if not exists initiative_set boolean not null default false;
alter table encounter_run_combatants add column if not exists defeated boolean not null default false;
alter table encounter_run_combatants add column if not exists conditions jsonb not null default '[]'::jsonb;
alter table encounter_run_combatants add column if not exists damage_dealt integer not null default 0;
alter table encounter_run_combatants add column if not exists damage_taken integer not null default 0;
alter table encounter_run_combatants add column if not exists healing_done integer not null default 0;
alter table encounter_run_combatants add column if not exists healing_received integer not null default 0;
alter table encounter_run_combatants add column if not exists kills integer not null default 0;
alter table encounter_run_combatants add column if not exists death_save_successes integer not null default 0;
alter table encounter_run_combatants add column if not exists death_save_failures integer not null default 0;
alter table encounter_run_combatants add column if not exists stable boolean not null default false;

create table if not exists combat_log_events (
    id uuid primary key default gen_random_uuid(),
    encounter_run_id uuid not null references encounter_runs(id) on delete cascade,
    sequence bigint generated always as identity,
    event_type text not null,
    actor_id uuid,
    target_id uuid,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists combat_log_events_run_sequence_idx on combat_log_events(encounter_run_id, sequence);

create or replace function touch_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'campaigns_touch_updated_at') then
        create trigger campaigns_touch_updated_at
        before update on campaigns
        for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'creatures_touch_updated_at') then
        create trigger creatures_touch_updated_at
        before update on creatures
        for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'spells_touch_updated_at') then
        create trigger spells_touch_updated_at
        before update on spells
        for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'action_templates_touch_updated_at') then
        create trigger action_templates_touch_updated_at
        before update on action_templates
        for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'creature_actions_touch_updated_at') then
        create trigger creature_actions_touch_updated_at
        before update on creature_actions
        for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'creature_spellcasting_profiles_touch_updated_at') then
        create trigger creature_spellcasting_profiles_touch_updated_at
        before update on creature_spellcasting_profiles
        for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'players_touch_updated_at') then
        create trigger players_touch_updated_at
        before update on players
        for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'encounters_touch_updated_at') then
        create trigger encounters_touch_updated_at
        before update on encounters
        for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'encounter_combatants_touch_updated_at') then
        create trigger encounter_combatants_touch_updated_at
        before update on encounter_combatants
        for each row execute function touch_updated_at();
    end if;
end $$;
`)
	return err
}
