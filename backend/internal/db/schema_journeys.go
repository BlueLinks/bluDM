package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ensureJourneySchema(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
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
    route_condition text not null,
    climate text not null,
    duration_hours double precision not null,
    duration_days double precision not null,
    weather jsonb not null default '{}'::jsonb,
    assumptions jsonb not null default '[]'::jsonb,
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists campaign_journeys_campaign_id_idx on campaign_journeys(campaign_id, updated_at desc);
`)
	return err
}
