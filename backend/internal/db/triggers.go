package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ensureTouchTriggers(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
create or replace function touch_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'campaigns_touch_updated_at') then
        create trigger campaigns_touch_updated_at before update on campaigns for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'creatures_touch_updated_at') then
        create trigger creatures_touch_updated_at before update on creatures for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'spells_touch_updated_at') then
        create trigger spells_touch_updated_at before update on spells for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'action_templates_touch_updated_at') then
        create trigger action_templates_touch_updated_at before update on action_templates for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'creature_actions_touch_updated_at') then
        create trigger creature_actions_touch_updated_at before update on creature_actions for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'creature_spellcasting_profiles_touch_updated_at') then
        create trigger creature_spellcasting_profiles_touch_updated_at before update on creature_spellcasting_profiles for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'players_touch_updated_at') then
        create trigger players_touch_updated_at before update on players for each row execute function touch_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'encounters_touch_updated_at') then
        create trigger encounters_touch_updated_at before update on encounters for each row execute function touch_updated_at();
    end if;
	if not exists (select 1 from pg_trigger where tgname = 'campaign_locations_touch_updated_at') then
		create trigger campaign_locations_touch_updated_at before update on campaign_locations for each row execute function touch_updated_at();
	end if;
	if not exists (select 1 from pg_trigger where tgname = 'campaign_journeys_touch_updated_at') then
		create trigger campaign_journeys_touch_updated_at before update on campaign_journeys for each row execute function touch_updated_at();
	end if;
	if not exists (select 1 from pg_trigger where tgname = 'encounter_combatants_touch_updated_at') then
		create trigger encounter_combatants_touch_updated_at before update on encounter_combatants for each row execute function touch_updated_at();
	end if;
end $$;
`)
	return err
}
