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
    allowed_standard_sources text[] not null default array['srd-2014']::text[],
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
    school text not null default '', casting_time text not null default '',
    cast_type text not null default '', spell_range text not null default '',
    range_type text not null default '', range_feet integer not null default 0,
    components jsonb not null default '{}'::jsonb,
    material_components text not null default '', classes text[] not null default '{}'::text[],
    duration text not null default '', duration_type text not null default '',
    duration_value integer not null default 0, duration_scale text not null default '',
    aoe_type text not null default '', aoe_size integer not null default 0,
    ritual boolean not null default false, concentration boolean not null default false,
    scaling_type text not null default 'none', description text not null default '',
    higher_level text not null default '', source_note text not null default '',
    source_material text not null default '',
    mechanics jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create table if not exists items (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid references users(id) on delete cascade,
    name text not null, category text not null default '', item_type text not null default '',
    rarity text not null default '', attunement boolean not null default false,
    value_amount integer not null default 0, value_unit text not null default 'gp',
    weight double precision not null default 0, description text not null default '',
    properties text[] not null default array[]::text[],
    damage jsonb not null default '{}'::jsonb, armor_class jsonb not null default '{}'::jsonb,
    data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table items add column if not exists owner_user_id uuid references users(id) on delete cascade;
alter table items add column if not exists category text not null default '', add column if not exists item_type text not null default '', add column if not exists rarity text not null default '', add column if not exists attunement boolean not null default false, add column if not exists value_amount integer not null default 0, add column if not exists value_unit text not null default 'gp', add column if not exists weight double precision not null default 0, add column if not exists description text not null default '', add column if not exists properties text[] not null default array[]::text[], add column if not exists damage jsonb not null default '{}'::jsonb, add column if not exists armor_class jsonb not null default '{}'::jsonb, add column if not exists data jsonb not null default '{}'::jsonb;
create index if not exists items_owner_user_id_idx on items(owner_user_id, updated_at desc);
create index if not exists items_owner_category_name_idx on items(owner_user_id, category, name);
create table if not exists spell_projectile_scaling (
    spell_id uuid primary key references spells(id) on delete cascade,
    base_projectiles integer not null default 1, scaling_type text not null default 'none',
    scale_from_level integer not null default 0, additional_projectiles integer not null default 0,
    step_size integer not null default 1, description text not null default '',
    cantrip_scaling jsonb not null default '{}'::jsonb
);
create table if not exists spell_actions (
    id uuid primary key default gen_random_uuid(),
    spell_id uuid not null references spells(id) on delete cascade,
    name text not null default '', sort_order integer not null default 0,
    action_type text not null default 'damage', save_ability text not null default '',
    successful_save_effect text not null default 'none', attack_modifier integer not null default 0,
    hit_special_event text not null default 'none',
    weapon_source text not null default '',
    attack_ability_override text not null default '',
    damage_ability_override text not null default '',
    damage_type_choice text not null default '',
    damage_type_options text[] not null default '{}'::text[]
);
create table if not exists spell_action_roll_parts (
    id uuid primary key default gen_random_uuid(),
    spell_action_id uuid not null references spell_actions(id) on delete cascade,
    sort_order integer not null default 0, roll_kind text not null default 'damage',
    damage_type text not null default '', magical boolean not null default false,
    dice_count integer not null default 1, die_size integer not null default 6,
    fixed_value integer not null default 0, add_primary_stat_modifier boolean not null default false,
    condition_name text not null default '',
    effect_config jsonb not null default '{}'::jsonb,
    timing text not null default 'immediate',
    scaling_type text not null default 'none', scaling_from_level integer not null default 0,
    scaling_dice_count integer not null default 0, scaling_die_size integer not null default 6,
    scaling_fixed_value integer not null default 0, scaling_step_size integer not null default 1,
    cantrip_scaling jsonb not null default '{}'::jsonb
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
alter table campaigns add column if not exists allowed_standard_sources text[] not null default array['srd-2014']::text[];
alter table uploaded_assets add column if not exists owner_user_id uuid references users(id) on delete cascade;
alter table uploaded_assets drop constraint if exists uploaded_assets_owner_user_id_fkey;
alter table uploaded_assets add constraint uploaded_assets_owner_user_id_fkey foreign key (owner_user_id) references users(id) on delete cascade;
alter table creatures add column if not exists owner_user_id uuid references users(id) on delete cascade;
alter table spells add column if not exists cast_type text not null default '', add column if not exists range_type text not null default '', add column if not exists range_feet integer not null default 0, add column if not exists material_components text not null default '', add column if not exists classes text[] not null default '{}'::text[], add column if not exists duration_type text not null default '', add column if not exists duration_value integer not null default 0, add column if not exists duration_scale text not null default '', add column if not exists aoe_type text not null default '', add column if not exists aoe_size integer not null default 0, add column if not exists scaling_type text not null default 'none', add column if not exists source_material text not null default '';
alter table spells add column if not exists owner_user_id uuid references users(id) on delete cascade;
alter table spell_action_roll_parts add column if not exists condition_name text not null default '';
alter table spell_action_roll_parts add column if not exists effect_config jsonb not null default '{}'::jsonb;
alter table spell_action_roll_parts add column if not exists timing text not null default 'immediate';
alter table spell_action_roll_parts add column if not exists cantrip_scaling jsonb not null default '{}'::jsonb;
alter table spell_projectile_scaling add column if not exists cantrip_scaling jsonb not null default '{}'::jsonb;
alter table spell_actions add column if not exists weapon_source text not null default '', add column if not exists attack_ability_override text not null default '', add column if not exists damage_ability_override text not null default '', add column if not exists damage_type_choice text not null default '', add column if not exists damage_type_options text[] not null default '{}'::text[];
alter table action_templates add column if not exists owner_user_id uuid references users(id) on delete cascade;
alter table action_templates add column if not exists icon_source text not null default 'none', add column if not exists icon_key text not null default '', add column if not exists icon_asset_id uuid references uploaded_assets(id) on delete set null, add column if not exists icon_url text not null default '', add column if not exists icon_attribution text not null default '';
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
alter table creature_actions add column if not exists icon_source text not null default 'none', add column if not exists icon_key text not null default '', add column if not exists icon_asset_id uuid references uploaded_assets(id) on delete set null, add column if not exists icon_url text not null default '', add column if not exists icon_attribution text not null default '';
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
    spell_id uuid references spells(id) on delete cascade,
    standard_spell_id uuid,
    library_source text not null default 'user',
    spell_level integer not null default 0,
    prepared boolean not null default true,
    innate boolean not null default false,
    sort_order integer not null default 0
);
alter table creature_spells add column if not exists standard_spell_id uuid;
alter table creature_spells add column if not exists library_source text not null default 'user';
alter table creature_spells alter column spell_id drop not null;
create index if not exists creature_spells_creature_level_idx on creature_spells(creature_id, spell_level, sort_order);
create unique index if not exists creature_spells_user_spell_idx on creature_spells(creature_id, spell_id) where spell_id is not null;
create unique index if not exists creature_spells_standard_spell_idx on creature_spells(creature_id, standard_spell_id) where standard_spell_id is not null;
create table if not exists players (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid references users(id) on delete cascade,
    campaign_id uuid references campaigns(id) on delete cascade,
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
alter table players add column if not exists owner_user_id uuid references users(id) on delete cascade;
alter table players alter column campaign_id drop not null;
alter table players add column if not exists experience_points integer not null default 0;
alter table players add column if not exists image_asset_id uuid references uploaded_assets(id) on delete set null;
alter table players add column if not exists avatar_url text not null default '';
alter table creatures add column if not exists image_asset_id uuid references uploaded_assets(id) on delete set null;
alter table creatures add column if not exists avatar_url text not null default '';
update players
set owner_user_id = campaigns.owner_user_id
from campaigns
where players.campaign_id = campaigns.id and players.owner_user_id is null;
with first_user as (select id from users order by created_at asc limit 1)
update players set owner_user_id = (select id from first_user) where owner_user_id is null and exists(select 1 from first_user);
alter table players alter column owner_user_id set not null;
create index if not exists players_owner_user_id_idx on players(owner_user_id, updated_at desc);
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
alter table encounter_run_combatants add column if not exists source_type text not null default 'creature', add column if not exists player_id uuid references players(id) on delete set null, add column if not exists creature_id uuid references creatures(id) on delete set null, add column if not exists temporary_hit_points integer not null default 0, add column if not exists max_hit_points_modifier integer not null default 0, add column if not exists armor_class_bonus integer not null default 0, add column if not exists armor_class_override integer not null default 0, add column if not exists max_hit_points_override integer not null default 0, add column if not exists current_hit_points_override integer not null default 0, add column if not exists initiative_set boolean not null default false, add column if not exists defeated boolean not null default false, add column if not exists conditions jsonb not null default '[]'::jsonb, add column if not exists damage_dealt integer not null default 0, add column if not exists damage_taken integer not null default 0, add column if not exists healing_done integer not null default 0, add column if not exists healing_received integer not null default 0, add column if not exists kills integer not null default 0, add column if not exists death_save_successes integer not null default 0, add column if not exists death_save_failures integer not null default 0, add column if not exists stable boolean not null default false;
create table if not exists encounter_run_spell_slots (
    id uuid primary key default gen_random_uuid(),
    encounter_run_id uuid not null references encounter_runs(id) on delete cascade,
    combatant_id uuid not null references encounter_run_combatants(id) on delete cascade,
    spell_level integer not null,
    max_slots integer not null default 0,
    remaining_slots integer not null default 0,
    unique(combatant_id, spell_level)
);
create table if not exists encounter_run_active_effects (
    id uuid primary key default gen_random_uuid(),
    encounter_run_id uuid not null references encounter_runs(id) on delete cascade,
    caster_id uuid not null references encounter_run_combatants(id) on delete cascade,
    target_id uuid not null references encounter_run_combatants(id) on delete cascade,
    spell_id uuid,
    library_source text not null default 'user',
    spell_name text not null default '',
    cast_level integer not null default 0,
    concentration boolean not null default false,
    timing text not null default 'immediate',
    effect_kind text not null default '',
    condition_name text not null default '',
    amount integer not null default 0,
    payload jsonb not null default '{}'::jsonb,
    active boolean not null default true,
    created_at timestamptz not null default now()
);
create table if not exists encounter_run_alerts (
    id uuid primary key default gen_random_uuid(),
    encounter_run_id uuid not null references encounter_runs(id) on delete cascade,
    alert_type text not null,
    actor_id uuid references encounter_run_combatants(id) on delete cascade,
    target_id uuid references encounter_run_combatants(id) on delete cascade,
    title text not null default '',
    message text not null default '',
    dc integer not null default 0,
    payload jsonb not null default '{}'::jsonb,
    resolved boolean not null default false,
    created_at timestamptz not null default now()
);
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
`)
	if err != nil {
		return err
	}
	if err := ensureTouchTriggers(ctx, pool); err != nil {
		return err
	}
	return seedStandardContent(ctx, pool)
}
