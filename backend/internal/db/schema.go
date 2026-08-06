package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"gorm.io/gorm"
)

func EnsureSchema(ctx context.Context, gdb *gorm.DB, seedPool *pgxpool.Pool) error {
	if err := gdb.WithContext(ctx).Exec(`create extension if not exists pgcrypto`).Error; err != nil {
		return err
	}
	if err := gdb.WithContext(ctx).AutoMigrate(schemaEntities()...); err != nil {
		return err
	}
	if err := backfillEncounterRulesets(ctx, gdb); err != nil {
		return err
	}
	if err := ensurePostgresIndexes(ctx, gdb); err != nil {
		return err
	}
	if err := ensureTouchTriggers(ctx, gdb); err != nil {
		return err
	}
	return seedStandardContent(ctx, seedPool)
}

func backfillEncounterRulesets(ctx context.Context, gdb *gorm.DB) error {
	if err := gdb.WithContext(ctx).Exec(`
update campaigns
set encounter_ruleset = case
    when allowed_standard_sources @> array['srd-5-2-1']::text[]
      and not (allowed_standard_sources @> array['srd-2014']::text[])
        then 'dnd-5e-2024-xp-v1'
    else 'dnd-5e-2014-xp-v1'
end
where encounter_ruleset = ''
`).Error; err != nil {
		return err
	}
	return gdb.WithContext(ctx).Exec(`
update encounters
set difficulty_ruleset = 'dnd-5e-2014-xp-v1'
where difficulty_ruleset = ''
`).Error
}

func schemaEntities() []any {
	return []any{
		&UserEntity{},
		&AuthIdentityEntity{},
		&OAuthStateEntity{},
		&SessionEntity{},
		&APITokenEntity{},
		&APITokenCampaignEntity{},
		&OIDCSubjectLinkEntity{},
		&CampaignEntity{},
		&UploadedAssetEntity{},
		&CreatureEntity{},
		&SpellEntity{},
		&SpellProjectileScalingEntity{},
		&SpellActionEntity{},
		&SpellActionRollPartEntity{},
		&ActionTemplateEntity{},
		&ActionTemplateRollPartEntity{},
		&CreatureActionEntity{},
		&CreatureActionRollPartEntity{},
		&CreatureSpellcastingProfileEntity{},
		&CreatureSpellEntity{},
		&PlayerEntity{},
		&CampaignCreatureEntity{},
		&EncounterEntity{},
		&EncounterCombatantEntity{},
		&EncounterRevisionEntity{},
		&EncounterRunEntity{},
		&EncounterRunCombatantEntity{},
		&EncounterRunSpellSlotEntity{},
		&EncounterRunActiveEffectEntity{},
		&EncounterRunAlertEntity{},
		&CombatLogEventEntity{},
		&ItemEntity{},
		&CampaignLocationEntity{},
		&CampaignLocationLinkEntity{},
		&CampaignNpcLocationLinkEntity{},
		&CampaignLocationStockEntity{},
		&CampaignMapEntity{},
		&CampaignMapPinEntity{},
		&CampaignJourneyEntity{},
		&RollTableEntity{},
		&RollTableRowEntity{},
		&ImportExportHistoryEntity{},
		&IdempotencyRecordEntity{},
		&AuthoringPreviewEntity{},
		&ExternalAuditRecordEntity{},
	}
}

func ensurePostgresIndexes(ctx context.Context, gdb *gorm.DB) error {
	statements := []string{
		`create unique index if not exists creature_spells_user_spell_idx on creature_spells(creature_id, spell_id) where spell_id is not null`,
		`create unique index if not exists creature_spells_standard_spell_idx on creature_spells(creature_id, standard_spell_id) where standard_spell_id is not null`,
		`create index if not exists oauth_states_expires_at_idx on oauth_states(expires_at)`,
		`create index if not exists sessions_expires_at_idx on sessions(expires_at)`,
		`create index if not exists api_tokens_expires_at_idx on api_tokens(expires_at)`,
		`create index if not exists api_tokens_revoked_at_idx on api_tokens(revoked_at)`,
		`create index if not exists encounters_location_id_idx on encounters(location_id)`,
		`create index if not exists encounter_revisions_encounter_created_idx on encounter_revisions(encounter_id, created_at desc)`,
		`create index if not exists idempotency_records_expires_at_idx on idempotency_records(expires_at)`,
		`create index if not exists authoring_previews_expires_at_idx on authoring_previews(expires_at)`,
		`create index if not exists external_audit_records_created_at_idx on external_audit_records(created_at desc)`,
		`create index if not exists campaign_maps_campaign_parent_idx on campaign_maps(campaign_id, parent_location_id, updated_at desc)`,
		`create index if not exists campaign_map_pins_map_location_idx on campaign_map_pins(map_id, location_id)`,
		`create index if not exists combat_log_events_run_sequence_idx on combat_log_events(encounter_run_id, sequence)`,
		`create index if not exists import_export_history_owner_created_idx on import_export_history(owner_user_id, created_at desc)`,
	}
	for _, statement := range statements {
		if err := gdb.WithContext(ctx).Exec(statement).Error; err != nil {
			return err
		}
	}
	return nil
}
