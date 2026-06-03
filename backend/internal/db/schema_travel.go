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
    name text not null,
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists campaign_locations_campaign_id_idx on campaign_locations(campaign_id, name);

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

alter table campaign_journeys add column if not exists good_roads boolean not null default false;
alter table campaign_journeys add column if not exists encounter_distance_feet integer;
alter table campaign_journeys add column if not exists route_input_mode text not null default 'route';

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
