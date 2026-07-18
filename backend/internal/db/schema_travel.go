package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ensureTravelSchema(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
create table if not exists campaign_locations (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    parent_location_id uuid references campaign_locations(id) on delete set null,
    name text not null,
    location_type text not null default 'custom',
    custom_type_label text not null default '',
    summary text not null default '',
    notes text not null default '',
    public_notes text not null default '',
    dm_notes text not null default '',
    tags text[] not null default '{}',
    sort_order integer not null default 0,
    status text not null default 'active',
    map_anchor jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists campaign_locations_campaign_id_idx on campaign_locations(campaign_id, name);
create index if not exists campaign_locations_parent_location_id_idx on campaign_locations(parent_location_id);

create table if not exists campaign_location_links (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    source_location_id uuid not null references campaign_locations(id) on delete cascade,
    target_location_id uuid not null references campaign_locations(id) on delete cascade,
    link_type text not null default 'link',
    label text not null default '',
    direction text not null default 'two-way',
    visibility text not null default 'public',
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists campaign_location_links_campaign_idx on campaign_location_links(campaign_id, source_location_id);
create index if not exists campaign_location_links_source_idx on campaign_location_links(source_location_id);
create index if not exists campaign_location_links_target_idx on campaign_location_links(target_location_id);

create table if not exists campaign_npc_location_links (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    creature_id uuid not null references creatures(id) on delete cascade,
    location_id uuid not null references campaign_locations(id) on delete cascade,
    link_type text not null default 'frequents',
    visibility text not null default 'dm',
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (campaign_id, creature_id, location_id, link_type)
);
create index if not exists campaign_npc_location_links_campaign_idx on campaign_npc_location_links(campaign_id, location_id);
create index if not exists campaign_npc_location_links_creature_idx on campaign_npc_location_links(creature_id);
create index if not exists campaign_npc_location_links_location_idx on campaign_npc_location_links(location_id);

create table if not exists campaign_location_stock (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    location_id uuid not null references campaign_locations(id) on delete cascade,
    item_id uuid not null,
    library_source text not null default 'user',
    quantity integer not null default 1,
    price_amount integer not null default 0,
    price_unit text not null default 'gp',
    availability text not null default 'in-stock',
    notes text not null default '',
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (campaign_id, location_id, item_id, library_source)
);
create index if not exists campaign_location_stock_campaign_idx on campaign_location_stock(campaign_id, location_id);
create index if not exists campaign_location_stock_item_idx on campaign_location_stock(item_id, library_source);

create table if not exists campaign_maps (
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
create index if not exists campaign_maps_campaign_id_idx on campaign_maps(campaign_id, name);
create index if not exists campaign_maps_parent_location_id_idx on campaign_maps(parent_location_id);
create index if not exists campaign_maps_campaign_parent_idx on campaign_maps(campaign_id, parent_location_id, updated_at desc);

create table if not exists campaign_map_pins (
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
create index if not exists campaign_map_pins_campaign_idx on campaign_map_pins(campaign_id);
create index if not exists campaign_map_pins_map_idx on campaign_map_pins(map_id);
create index if not exists campaign_map_pins_location_idx on campaign_map_pins(location_id);
create index if not exists campaign_map_pins_map_location_idx on campaign_map_pins(map_id, location_id);

create table if not exists campaign_journeys (
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
create index if not exists campaign_journeys_campaign_id_idx on campaign_journeys(campaign_id, created_at desc);

create table if not exists roll_tables (
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
create index if not exists roll_tables_campaign_id_idx on roll_tables(campaign_id, updated_at desc);
create index if not exists roll_tables_source_idx on roll_tables(source, category, name);

create table if not exists roll_table_rows (
    id uuid primary key default gen_random_uuid(),
    table_id uuid not null references roll_tables(id) on delete cascade,
    min_roll integer not null,
    max_roll integer not null,
    label text not null,
    result_text text not null,
    notes text not null default '',
    sort_order integer not null default 0
);
create index if not exists roll_table_rows_table_id_idx on roll_table_rows(table_id, min_roll, max_roll);

alter table campaign_journeys add column if not exists good_roads boolean not null default false;
alter table campaign_journeys add column if not exists encounter_distance_feet integer;
alter table campaign_journeys add column if not exists route_input_mode text not null default 'route';
alter table campaign_locations add column if not exists parent_location_id uuid references campaign_locations(id) on delete set null;
alter table campaign_locations add column if not exists location_type text not null default 'custom';
alter table campaign_locations add column if not exists custom_type_label text not null default '';
alter table campaign_locations add column if not exists summary text not null default '';
alter table campaign_locations add column if not exists public_notes text not null default '';
alter table campaign_locations add column if not exists dm_notes text not null default '';
alter table campaign_locations add column if not exists tags text[] not null default '{}';
alter table campaign_locations add column if not exists sort_order integer not null default 0;
alter table campaign_locations add column if not exists status text not null default 'active';
alter table campaign_locations add column if not exists map_anchor jsonb not null default '{}'::jsonb;
alter table campaign_maps add column if not exists parent_location_id uuid references campaign_locations(id) on delete set null;
alter table campaign_maps add column if not exists description text not null default '';
alter table campaign_maps add column if not exists map_type text not null default 'custom';
alter table campaign_maps add column if not exists mode text not null default 'blank';
alter table campaign_maps add column if not exists image_asset_id uuid references uploaded_assets(id) on delete set null;
alter table campaign_maps add column if not exists width double precision not null default 1000;
alter table campaign_maps add column if not exists height double precision not null default 700;
alter table campaign_maps add column if not exists scale_distance_per_pixel double precision not null default 1;
alter table campaign_maps add column if not exists scale_distance_unit text not null default 'miles';
alter table campaign_maps add column if not exists calibration_pixel_length double precision not null default 0;
alter table campaign_maps add column if not exists calibration_distance double precision not null default 0;
alter table campaign_maps add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table campaign_map_pins add column if not exists label_override text not null default '';
alter table campaign_map_pins add column if not exists visibility text not null default 'dm';
alter table campaign_map_pins add column if not exists state text not null default 'active';
alter table campaign_map_pins add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
    if exists (select 1 from information_schema.columns where table_name = 'campaign_journeys' and column_name = 'route_condition') then
        alter table campaign_journeys alter column route_condition set default '';
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'campaign_journeys' and column_name = 'climate') then
        alter table campaign_journeys alter column climate set default '';
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'campaign_journeys' and column_name = 'duration_hours') then
        alter table campaign_journeys alter column duration_hours set default 0;
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'campaign_journeys' and column_name = 'duration_days') then
        alter table campaign_journeys alter column duration_days set default 0;
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'campaign_journeys' and column_name = 'assumptions') then
        alter table campaign_journeys alter column assumptions set default '[]'::jsonb;
    end if;
end $$;

do $$
begin
    if exists (select 1 from information_schema.columns where table_name = 'campaign_journeys' and column_name = 'route_condition') then
        update campaign_journeys
        set good_roads = true
        where route_condition = 'road';
    end if;
end $$;

update campaign_journeys
set good_roads = true, terrain = 'grassland'
where terrain = 'road';

update campaign_journeys
set terrain = 'grassland'
where terrain not in ('arctic', 'coastal', 'desert', 'forest', 'grassland', 'hill', 'mountain', 'swamp', 'underdark', 'urban', 'waterborne');

update campaign_journeys
set weather = '{"temperature":"normal","temperatureDeltaF":null,"wind":"none","precipitation":"none"}'::jsonb
where not (weather ? 'temperature' and weather ? 'wind' and weather ? 'precipitation');
`)
	return err
}
