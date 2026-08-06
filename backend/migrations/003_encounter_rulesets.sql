alter table campaigns
    add column if not exists encounter_ruleset text not null default '';

update campaigns
set encounter_ruleset = case
    when allowed_standard_sources @> array['srd-5-2-1']::text[]
      and not (allowed_standard_sources @> array['srd-2014']::text[])
        then 'dnd-5e-2024-xp-v1'
    else 'dnd-5e-2014-xp-v1'
end
where encounter_ruleset = '';

alter table campaigns
    alter column encounter_ruleset set default '';

alter table encounters
    add column if not exists difficulty_ruleset text not null
        default 'dnd-5e-2014-xp-v1';

update encounters
set difficulty_ruleset = 'dnd-5e-2014-xp-v1'
where difficulty_ruleset = '';
