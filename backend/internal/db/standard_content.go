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

//go:embed standard_spells.json
var standardSpellsJSON []byte

type standardCreatureSeed struct {
	SourceKey       string          `json:"sourceKey"`
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

type standardSpellSeed struct {
	SourceKey     string          `json:"sourceKey"`
	Slug          string          `json:"slug"`
	Name          string          `json:"name"`
	Level         int             `json:"level"`
	School        string          `json:"school"`
	CastingTime   string          `json:"castingTime"`
	Range         string          `json:"range"`
	Components    json.RawMessage `json:"components"`
	Duration      string          `json:"duration"`
	Ritual        bool            `json:"ritual"`
	Concentration bool            `json:"concentration"`
	Description   string          `json:"description"`
	HigherLevel   string          `json:"higherLevel"`
	SourceNote    string          `json:"sourceNote"`
	SourceLabel   string          `json:"sourceLabel"`
	SourceURL     string          `json:"sourceUrl"`
	LicenseName   string          `json:"licenseName"`
	Mechanics     json.RawMessage `json:"mechanics"`
}

func seedStandardContent(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, standardLibrarySchemaSQL); err != nil {
		return err
	}
	if _, err := pool.Exec(ctx, standardCreaturesSchemaSQL); err != nil {
		return err
	}
	if _, err := pool.Exec(ctx, standardSpellsSchemaSQL); err != nil {
		return err
	}

	creatures, err := parseStandardCreatures()
	if err != nil {
		return err
	}
	spells, err := parseStandardSpells()
	if err != nil {
		return err
	}
	entries, err := parseStandardLibraryEntries()
	if err != nil {
		return err
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, source := range standardSources {
		if _, err := tx.Exec(ctx, upsertStandardSourceSQL,
			source.Key,
			source.Label,
			source.Ruleset,
			source.LicenseName,
			source.SourceURL,
			source.Attribution,
		); err != nil {
			return fmt.Errorf("seed standard source %q: %w", source.Key, err)
		}
	}
	for _, creature := range creatures {
		if _, err := tx.Exec(ctx, upsertStandardCreatureSQL,
			creature.SourceKey,
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
	for _, spell := range spells {
		if _, err := tx.Exec(ctx, upsertStandardSpellSQL,
			spell.SourceKey,
			spell.Slug,
			spell.Name,
			spell.Level,
			spell.School,
			spell.CastingTime,
			spell.Range,
			spell.Components,
			spell.Duration,
			spell.Ritual,
			spell.Concentration,
			spell.Description,
			spell.HigherLevel,
			spell.SourceNote,
			spell.SourceLabel,
			spell.SourceURL,
			spell.LicenseName,
			spell.Mechanics,
		); err != nil {
			return fmt.Errorf("seed standard spell %q: %w", spell.Slug, err)
		}
	}
	for _, entry := range entries {
		if _, err := tx.Exec(ctx, upsertStandardLibraryEntrySQL,
			entry.SourceKey,
			entry.Category,
			entry.Slug,
			entry.Name,
			entry.Summary,
			entry.Description,
			entry.Data,
		); err != nil {
			return fmt.Errorf("seed standard library entry %q/%q: %w", entry.Category, entry.Slug, err)
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
		if creature.SourceKey == "" {
			creatures[index].SourceKey = "srd-2014"
		}
		if len(creature.StatBlock) == 0 {
			creatures[index].StatBlock = json.RawMessage(`{}`)
		}
	}
	return creatures, nil
}

func parseStandardSpells() ([]standardSpellSeed, error) {
	var spells []standardSpellSeed
	if err := json.Unmarshal(standardSpellsJSON, &spells); err != nil {
		return nil, fmt.Errorf("parse standard spells: %w", err)
	}
	for index, spell := range spells {
		if spell.Slug == "" || spell.Name == "" {
			return nil, fmt.Errorf("standard spell at index %d is missing slug or name", index)
		}
		if spell.SourceKey == "" {
			spells[index].SourceKey = "srd-2014"
		}
		if len(spell.Components) == 0 {
			spells[index].Components = json.RawMessage(`{}`)
		}
		if len(spell.Mechanics) == 0 {
			spells[index].Mechanics = json.RawMessage(`{}`)
		}
	}
	return spells, nil
}

const standardCreaturesSchemaSQL = `
create table if not exists standard_creatures (
    id uuid primary key default gen_random_uuid(),
    source_key text not null default 'srd-2014' references standard_sources(source_key) on delete restrict,
    slug text not null,
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

alter table standard_creatures add column if not exists source_key text not null default 'srd-2014';
alter table standard_creatures drop constraint if exists standard_creatures_slug_key;
create index if not exists standard_creatures_name_idx on standard_creatures(name);
create index if not exists standard_creatures_type_idx on standard_creatures(creature_type, challenge_rating);
create index if not exists standard_creatures_source_key_idx on standard_creatures(source_key, name);
create unique index if not exists standard_creatures_source_slug_idx on standard_creatures(source_key, slug);
`

const standardSpellsSchemaSQL = `
create table if not exists standard_spells (
    id uuid primary key default gen_random_uuid(),
    source_key text not null default 'srd-2014' references standard_sources(source_key) on delete restrict,
    slug text not null,
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
    source_label text not null default '',
    source_url text not null default '',
    license_name text not null default '',
    mechanics jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table standard_spells add column if not exists source_key text not null default 'srd-2014';
alter table standard_spells drop constraint if exists standard_spells_slug_key;
create index if not exists standard_spells_name_idx on standard_spells(name);
create index if not exists standard_spells_level_name_idx on standard_spells(level, name);
create index if not exists standard_spells_school_idx on standard_spells(school);
create index if not exists standard_spells_source_key_idx on standard_spells(source_key, level, name);
create unique index if not exists standard_spells_source_slug_idx on standard_spells(source_key, slug);
`

const upsertStandardCreatureSQL = `
insert into standard_creatures (
    source_key, slug, name, description, size, creature_type, alignment, armor_class, hit_points, hit_dice,
    challenge_rating, xp, avatar_url, source_label, source_url, license_name, stat_block
) values (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
)
on conflict (source_key, slug) do update set
    source_key = excluded.source_key,
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

const upsertStandardSpellSQL = `
insert into standard_spells (
    source_key, slug, name, level, school, casting_time, spell_range, components, duration, ritual,
    concentration, description, higher_level, source_note, source_label, source_url,
    license_name, mechanics
) values (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
)
on conflict (source_key, slug) do update set
    source_key = excluded.source_key,
    name = excluded.name,
    level = excluded.level,
    school = excluded.school,
    casting_time = excluded.casting_time,
    spell_range = excluded.spell_range,
    components = excluded.components,
    duration = excluded.duration,
    ritual = excluded.ritual,
    concentration = excluded.concentration,
    description = excluded.description,
    higher_level = excluded.higher_level,
    source_note = excluded.source_note,
    source_label = excluded.source_label,
    source_url = excluded.source_url,
    license_name = excluded.license_name,
    mechanics = excluded.mechanics,
    updated_at = now();
`
