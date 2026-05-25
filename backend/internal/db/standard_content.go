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
	SourceKey         string                              `json:"sourceKey"`
	Slug              string                              `json:"slug"`
	Name              string                              `json:"name"`
	Level             int                                 `json:"level"`
	School            string                              `json:"school"`
	CastingTime       string                              `json:"castingTime"`
	Range             string                              `json:"range"`
	Components        json.RawMessage                     `json:"components"`
	Duration          string                              `json:"duration"`
	Ritual            bool                                `json:"ritual"`
	Concentration     bool                                `json:"concentration"`
	Description       string                              `json:"description"`
	HigherLevel       string                              `json:"higherLevel"`
	SourceNote        string                              `json:"sourceNote"`
	SourceLabel       string                              `json:"sourceLabel"`
	SourceURL         string                              `json:"sourceUrl"`
	LicenseName       string                              `json:"licenseName"`
	Mechanics         json.RawMessage                     `json:"mechanics"`
	ProjectileScaling *standardSpellProjectileScalingSeed `json:"projectileScaling"`
	Actions           []standardSpellActionSeed           `json:"actions"`
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
		var spellID string
		if err := tx.QueryRow(ctx, upsertStandardSpellSQL,
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
		).Scan(&spellID); err != nil {
			return fmt.Errorf("seed standard spell %q: %w", spell.Slug, err)
		}
		if err := replaceStandardSpellAutomation(ctx, tx, spellID, spell.ProjectileScaling, spell.Actions); err != nil {
			return fmt.Errorf("seed standard spell automation %q: %w", spell.Slug, err)
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
		cleanStandardSpellText(&spells[index])
		inferStandardSpellAutomation(&spells[index])
	}
	return spells, nil
}

func cleanStandardSpellText(spell *standardSpellSeed) {
	switch spell.Slug {
	case "srd-5-2-1-aid":
		setStandardSpellText(
			spell,
			"Choose up to three creatures within range. Each target's Hit Point maximum and current Hit Points increase by 5 for the duration.",
			"Each target's Hit Points increase by 5 for each spell slot level above 2.",
		)
	case "srd-5-2-1-animate-objects":
		setStandardSpellText(
			spell,
			"Objects animate at your command. Choose a number of nonmagical objects within range that aren't being worn or carried, aren't fixed to a surface, and aren't Gargantuan. The maximum number of objects is equal to your spellcasting ability modifier; for this number, a Medium or smaller target counts as one object, a Large target counts as two, and a Huge target counts as three. Each target animates, sprouts legs, and becomes a Construct that uses the Animated Object stat block; this creature is under your control until the spell ends or until it is reduced to 0 Hit Points. Each creature you make with this spell is an ally to you and your allies. In combat, it shares your Initiative count and takes its turn immediately after yours. Until the spell ends, you can take a Bonus Action to mentally command any creature you made with this spell if the creature is within 500 feet of you. If you control multiple creatures, you can command any of them at the same time, issuing the same command to each one. If you issue no commands, the creature takes the Dodge action and moves only to avoid harm. When the creature drops to 0 Hit Points, it reverts to its object form, and any remaining damage carries over to that form.",
			"The creature's Slam damage increases by 1d4 (Medium or smaller), 1d6 (Large), or 1d12 (Huge) for each spell slot level above 5.",
		)
	case "srd-5-2-1-contact-other-plane":
		setStandardSpellText(
			spell,
			"You mentally contact a demigod, the spirit of a long-dead sage, or some other knowledgeable entity from another plane. Contacting this otherworldly intelligence can break your mind. When you cast this spell, make a DC 15 Intelligence saving throw. On a successful save, you can ask the entity up to five questions. You must ask your questions before the spell ends. The GM answers each question with one word, such as \"yes,\" \"no,\" \"maybe,\" \"never,\" \"irrelevant,\" or \"unclear\" if the entity doesn't know the answer to the question. If a one-word answer would be misleading, the GM might instead offer a short phrase as an answer. On a failed save, you take 6d6 Psychic damage and have the Incapacitated condition until you finish a Long Rest. A Greater Restoration spell cast on you ends this effect.",
			"",
		)
	case "srd-5-2-1-heroism":
		setStandardSpellText(
			spell,
			"A willing creature you touch is imbued with bravery. Until the spell ends, the creature is immune to the Frightened condition and gains Temporary Hit Points equal to your spellcasting ability modifier at the start of each of its turns.",
			"You can target one additional creature for each spell slot level above 1.",
		)
	}
}

func setStandardSpellText(spell *standardSpellSeed, description string, higherLevel string) {
	spell.Description = description
	spell.HigherLevel = higherLevel
	mechanics := map[string]any{}
	_ = json.Unmarshal(spell.Mechanics, &mechanics)
	mechanics["rawText"] = description
	spell.Mechanics, _ = json.Marshal(mechanics)
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

create table if not exists standard_spell_projectile_scaling (
    standard_spell_id uuid primary key references standard_spells(id) on delete cascade,
    base_projectiles integer not null default 1,
    scaling_type text not null default 'none',
    scale_from_level integer not null default 0,
    additional_projectiles integer not null default 0,
    step_size integer not null default 1,
    description text not null default '',
    cantrip_scaling jsonb not null default '{}'::jsonb
);
create table if not exists standard_spell_actions (
    id uuid primary key default gen_random_uuid(),
    standard_spell_id uuid not null references standard_spells(id) on delete cascade,
    name text not null default '',
    sort_order integer not null default 0,
    action_type text not null default 'damage',
    save_ability text not null default '',
    successful_save_effect text not null default 'none',
    attack_modifier integer not null default 0,
    hit_special_event text not null default 'none',
    weapon_source text not null default '',
    attack_ability_override text not null default '',
    damage_ability_override text not null default '',
    damage_type_choice text not null default '',
    damage_type_options text[] not null default '{}'::text[]
);
create index if not exists standard_spell_actions_spell_idx on standard_spell_actions(standard_spell_id, sort_order);
create table if not exists standard_spell_action_roll_parts (
    id uuid primary key default gen_random_uuid(),
    standard_spell_action_id uuid not null references standard_spell_actions(id) on delete cascade,
    sort_order integer not null default 0,
    roll_kind text not null default 'damage',
    damage_type text not null default '',
    magical boolean not null default false,
    dice_count integer not null default 1,
    die_size integer not null default 6,
    fixed_value integer not null default 0,
    add_primary_stat_modifier boolean not null default false,
    condition_name text not null default '',
    timing text not null default 'immediate',
    scaling_type text not null default 'none',
    scaling_from_level integer not null default 0,
    scaling_dice_count integer not null default 0,
    scaling_die_size integer not null default 6,
    scaling_fixed_value integer not null default 0,
    scaling_step_size integer not null default 1,
    cantrip_scaling jsonb not null default '{}'::jsonb
);
create index if not exists standard_spell_action_roll_parts_action_idx on standard_spell_action_roll_parts(standard_spell_action_id, sort_order);
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
    updated_at = now()
returning id;
`
