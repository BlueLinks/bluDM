create extension if not exists pgcrypto;

create table users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    password_hash text not null,
    created_at timestamptz not null default now()
);

create table sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index sessions_user_id_idx on sessions(user_id);
create index sessions_expires_at_idx on sessions(expires_at);

create table campaigns (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text not null default '',
    allowed_standard_sources text[] not null default array['srd-2014']::text[],
    encounter_ruleset text not null default 'dnd-5e-2014-xp-v1',
    archived_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table uploaded_assets (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid references users(id) on delete set null,
    filename text not null,
    content_type text not null,
    byte_size bigint not null,
    data bytea not null,
    created_at timestamptz not null default now()
);

create table creatures (
    id uuid primary key default gen_random_uuid(),
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

create table spells (
    id uuid primary key default gen_random_uuid(),
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

create table items (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references users(id) on delete cascade,
    name text not null,
    category text not null default '',
    item_type text not null default '',
    rarity text not null default '',
    attunement boolean not null default false,
    value_amount integer not null default 0,
    value_unit text not null default 'gp',
    weight double precision not null default 0,
    description text not null default '',
    properties text[] not null default array[]::text[],
    damage jsonb not null default '{}'::jsonb,
    armor_class jsonb not null default '{}'::jsonb,
    data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index items_owner_user_id_idx on items(owner_user_id, updated_at desc);
create index items_owner_category_name_idx on items(owner_user_id, category, name);

create table action_templates (
    id uuid primary key default gen_random_uuid(),
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

create table action_template_roll_parts (
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

create index action_template_roll_parts_template_idx on action_template_roll_parts(action_template_id, sort_order);

create table creature_actions (
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

create index creature_actions_creature_idx on creature_actions(creature_id, sort_order);

create table creature_action_roll_parts (
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

create index creature_action_roll_parts_action_idx on creature_action_roll_parts(creature_action_id, sort_order);

create table creature_spellcasting_profiles (
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

create table creature_spells (
    id uuid primary key default gen_random_uuid(),
    creature_id uuid not null references creatures(id) on delete cascade,
    spell_id uuid not null references spells(id) on delete cascade,
    spell_level integer not null default 0,
    prepared boolean not null default true,
    innate boolean not null default false,
    sort_order integer not null default 0,
    unique (creature_id, spell_id)
);

create index creature_spells_creature_level_idx on creature_spells(creature_id, spell_level, sort_order);

create table players (
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

create index players_campaign_id_idx on players(campaign_id);

create table campaign_creatures (
    campaign_id uuid not null references campaigns(id) on delete cascade,
    creature_id uuid not null references creatures(id) on delete cascade,
    disposition text not null default 'neutral',
    created_at timestamptz not null default now(),
    primary key (campaign_id, creature_id)
);

create index campaign_creatures_creature_id_idx on campaign_creatures(creature_id);

create table campaign_locations (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    name text not null,
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index campaign_locations_campaign_id_idx on campaign_locations(campaign_id, name);

create table campaign_maps (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    parent_location_id uuid references campaign_locations(id) on delete set null,
    name text not null,
    description text not null default '',
    map_type text not null default 'custom',
    mode text not null default 'blank',
    image_asset_id uuid references uploaded_assets(id) on delete set null,
    width double precision not null default 1000,
    height double precision not null default 700,
    scale_distance_per_pixel double precision not null default 1,
    scale_distance_unit text not null default 'miles',
    calibration_pixel_length double precision not null default 0,
    calibration_distance double precision not null default 0,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index campaign_maps_campaign_id_idx on campaign_maps(campaign_id, name);
create index campaign_maps_parent_location_id_idx on campaign_maps(parent_location_id);
create index campaign_maps_campaign_parent_idx on campaign_maps(campaign_id, parent_location_id, updated_at desc);

create table campaign_map_pins (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    map_id uuid not null references campaign_maps(id) on delete cascade,
    location_id uuid not null references campaign_locations(id) on delete cascade,
    x double precision not null,
    y double precision not null,
    label_override text not null default '',
    visibility text not null default 'dm',
    state text not null default 'active',
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index campaign_map_pins_campaign_idx on campaign_map_pins(campaign_id);
create index campaign_map_pins_map_idx on campaign_map_pins(map_id);
create index campaign_map_pins_location_idx on campaign_map_pins(location_id);
create index campaign_map_pins_map_location_idx on campaign_map_pins(map_id, location_id);

create table campaign_journeys (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    name text not null,
    origin text not null default '',
    destination text not null default '',
    distance double precision not null,
    distance_unit text not null,
    terrain text not null,
    pace text not null,
    good_roads boolean not null default false,
    encounter_distance_feet integer,
    weather jsonb not null default '{}'::jsonb,
    route_input_mode text not null default 'route',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index campaign_journeys_campaign_id_idx on campaign_journeys(campaign_id, created_at desc);

create table roll_tables (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid references campaigns(id) on delete cascade,
    source text not null default 'campaign',
    name text not null,
    description text not null default '',
    category text not null default 'custom',
    tags text[] not null default '{}',
    die_expression text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index roll_tables_campaign_id_idx on roll_tables(campaign_id, updated_at desc);
create index roll_tables_source_idx on roll_tables(source, category, name);

create table roll_table_rows (
    id uuid primary key default gen_random_uuid(),
    table_id uuid not null references roll_tables(id) on delete cascade,
    min_roll integer not null,
    max_roll integer not null,
    label text not null,
    result_text text not null,
    notes text not null default '',
    sort_order integer not null default 0
);

create index roll_table_rows_table_id_idx on roll_table_rows(table_id, min_roll, max_roll);

create table encounters (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    name text not null,
    description text not null default '',
    status text not null default 'planned',
    location text not null default '',
    room_number text not null default '',
    loot_notes text not null default '',
    difficulty_ruleset text not null default 'dnd-5e-2014-xp-v1',
    background_asset_id uuid references uploaded_assets(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index encounters_campaign_id_idx on encounters(campaign_id);

create table encounter_combatants (
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

create index encounter_combatants_encounter_side_idx on encounter_combatants(encounter_id, side, sort_order);

create table encounter_runs (
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

create table encounter_run_combatants (
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

create index encounter_run_combatants_run_idx on encounter_run_combatants(encounter_run_id, sort_order);

create table combat_log_events (
    id uuid primary key default gen_random_uuid(),
    encounter_run_id uuid not null references encounter_runs(id) on delete cascade,
    sequence bigint generated always as identity,
    event_type text not null,
    actor_id uuid,
    target_id uuid,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index combat_log_events_run_sequence_idx on combat_log_events(encounter_run_id, sequence);

create or replace function touch_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger campaigns_touch_updated_at
before update on campaigns
for each row execute function touch_updated_at();

create trigger creatures_touch_updated_at
before update on creatures
for each row execute function touch_updated_at();

create trigger spells_touch_updated_at
before update on spells
for each row execute function touch_updated_at();

create trigger action_templates_touch_updated_at
before update on action_templates
for each row execute function touch_updated_at();

create trigger creature_actions_touch_updated_at
before update on creature_actions
for each row execute function touch_updated_at();

create trigger creature_spellcasting_profiles_touch_updated_at
before update on creature_spellcasting_profiles
for each row execute function touch_updated_at();

create trigger players_touch_updated_at
before update on players
for each row execute function touch_updated_at();

create trigger encounters_touch_updated_at
before update on encounters
for each row execute function touch_updated_at();

create trigger encounter_combatants_touch_updated_at
before update on encounter_combatants
for each row execute function touch_updated_at();
