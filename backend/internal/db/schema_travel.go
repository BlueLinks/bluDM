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
`)
	return err
}
