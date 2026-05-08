package db

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed standard_creatures.json
var standardCreaturesJSON []byte

type standardCreatureSeed struct {
	Slug            string          `json:"slug"`
	Name            string          `json:"name"`
	Description     string          `json:"description"`
	Size            string          `json:"size"`
	CreatureType    string          `json:"creatureType"`
	Alignment       string          `json:"alignment"`
	ArmorClass      int             `json:"armorClass"`
	HitPoints       int             `json:"hitPoints"`
	HitDice         string          `json:"hitDice"`
	ChallengeRating string          `json:"challengeRating"`
	XP              int             `json:"xp"`
	AvatarURL       string          `json:"avatarUrl"`
	SourceLabel     string          `json:"sourceLabel"`
	SourceURL       string          `json:"sourceUrl"`
	LicenseName     string          `json:"licenseName"`
	StatBlock       json.RawMessage `json:"statBlock"`
}

func seedStandardContent(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, standardCreaturesSchemaSQL); err != nil {
		return err
	}

	creatures, err := parseStandardCreatures()
	if err != nil {
		return err
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, creature := range creatures {
		if _, err := tx.Exec(ctx, upsertStandardCreatureSQL,
			creature.Slug,
			creature.Name,
			creature.Description,
			creature.Size,
			creature.CreatureType,
			creature.Alignment,
			creature.ArmorClass,
			creature.HitPoints,
			creature.HitDice,
			creature.ChallengeRating,
			creature.XP,
			creature.AvatarURL,
			creature.SourceLabel,
			creature.SourceURL,
			creature.LicenseName,
			creature.StatBlock,
		); err != nil {
			return fmt.Errorf("seed standard creature %q: %w", creature.Slug, err)
		}
	}

	return tx.Commit(ctx)
}

func parseStandardCreatures() ([]standardCreatureSeed, error) {
	var creatures []standardCreatureSeed
	if err := json.Unmarshal(standardCreaturesJSON, &creatures); err != nil {
		return nil, fmt.Errorf("parse standard creatures: %w", err)
	}
	for index, creature := range creatures {
		if creature.Slug == "" || creature.Name == "" {
			return nil, fmt.Errorf("standard creature at index %d is missing slug or name", index)
		}
		if len(creature.StatBlock) == 0 {
			creatures[index].StatBlock = json.RawMessage(`{}`)
		}
	}
	return creatures, nil
}

const standardCreaturesSchemaSQL = `
create table if not exists standard_creatures (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
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
    avatar_url text not null default '',
    source_label text not null default '',
    source_url text not null default '',
    license_name text not null default '',
    stat_block jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists standard_creatures_name_idx on standard_creatures(name);
create index if not exists standard_creatures_type_idx on standard_creatures(creature_type, challenge_rating);
`

const upsertStandardCreatureSQL = `
insert into standard_creatures (
    slug, name, description, size, creature_type, alignment, armor_class, hit_points, hit_dice,
    challenge_rating, xp, avatar_url, source_label, source_url, license_name, stat_block
) values (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
)
on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    size = excluded.size,
    creature_type = excluded.creature_type,
    alignment = excluded.alignment,
    armor_class = excluded.armor_class,
    hit_points = excluded.hit_points,
    hit_dice = excluded.hit_dice,
    challenge_rating = excluded.challenge_rating,
    xp = excluded.xp,
    avatar_url = excluded.avatar_url,
    source_label = excluded.source_label,
    source_url = excluded.source_url,
    license_name = excluded.license_name,
    stat_block = excluded.stat_block,
    updated_at = now();
`
