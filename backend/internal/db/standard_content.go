package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func seedStandardContent(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
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

insert into standard_creatures (
    slug, name, description, size, creature_type, alignment, armor_class, hit_points, hit_dice,
    challenge_rating, xp, source_label, source_url, license_name, stat_block
) values
    (
        'srd-goblin', 'Goblin', 'A nimble Small humanoid often used as a low-level skirmisher.',
        'Small', 'Humanoid', 'Neutral evil', 15, 7, '2d6', '1/4', 50,
        'SRD seed', 'https://www.dndbeyond.com/srd', 'CC-BY-4.0 / SRD',
        '{"abilities":{"str":8,"dex":14,"con":10,"int":10,"wis":8,"cha":8},"skills":{"stealth":6},"senses":{"darkvision":60,"passivePerception":9},"defaultDisposition":"enemy"}'::jsonb
    ),
    (
        'srd-wolf', 'Wolf', 'A fast pack hunter with keen senses.',
        'Medium', 'Beast', 'Unaligned', 13, 11, '2d8+2', '1/4', 50,
        'SRD seed', 'https://www.dndbeyond.com/srd', 'CC-BY-4.0 / SRD',
        '{"abilities":{"str":12,"dex":15,"con":12,"int":3,"wis":12,"cha":6},"skills":{"perception":3,"stealth":4},"senses":{"passivePerception":13},"defaultDisposition":"enemy"}'::jsonb
    ),
    (
        'srd-skeleton', 'Skeleton', 'An animated undead guard or minion.',
        'Medium', 'Undead', 'Lawful evil', 13, 13, '2d8+4', '1/4', 50,
        'SRD seed', 'https://www.dndbeyond.com/srd', 'CC-BY-4.0 / SRD',
        '{"abilities":{"str":10,"dex":14,"con":15,"int":6,"wis":8,"cha":5},"senses":{"darkvision":60,"passivePerception":9},"defenses":{"vulnerabilities":["bludgeoning"],"immunities":["poison"],"conditionImmunities":["poisoned"]},"defaultDisposition":"enemy"}'::jsonb
    ),
    (
        'srd-bandit', 'Bandit', 'A lightly armored humanoid outlaw or hired blade.',
        'Medium', 'Humanoid', 'Any non-lawful alignment', 12, 11, '2d8+2', '1/8', 25,
        'SRD seed', 'https://www.dndbeyond.com/srd', 'CC-BY-4.0 / SRD',
        '{"abilities":{"str":11,"dex":12,"con":12,"int":10,"wis":10,"cha":10},"senses":{"passivePerception":10},"defaultDisposition":"enemy"}'::jsonb
    ),
    (
        'srd-acolyte', 'Acolyte', 'A low-level priestly NPC suitable as an ally, contact, or rival.',
        'Medium', 'Humanoid', 'Any alignment', 10, 9, '2d8', '1/4', 50,
        'SRD seed', 'https://www.dndbeyond.com/srd', 'CC-BY-4.0 / SRD',
        '{"abilities":{"str":10,"dex":10,"con":10,"int":10,"wis":14,"cha":11},"skills":{"medicine":4,"religion":2},"senses":{"passivePerception":12},"spellcasting":{"ability":"wis","level":1},"defaultDisposition":"friendly"}'::jsonb
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
    source_label = excluded.source_label,
    source_url = excluded.source_url,
    license_name = excluded.license_name,
    stat_block = excluded.stat_block,
    updated_at = now();
`)
	return err
}
