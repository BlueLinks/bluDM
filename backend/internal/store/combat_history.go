package store

import (
	"context"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
)

type CombatHistoryOptions struct {
	Query        string
	IncludeTests bool
	Page         int
	Status       string
}

const combatHistoryPageSize = 20

func (s RunStore) History(ctx context.Context, ownerID, campaignID string, options CombatHistoryOptions) (models.CombatHistory, error) {
	result := models.CombatHistory{Runs: []models.CombatHistoryEntry{}}
	if _, err := (CampaignStore{db: s.db}).ByID(ctx, ownerID, campaignID); err != nil {
		return result, err
	}
	query := s.db.WithContext(ctx).Table("encounter_runs").
		Joins("join encounters on encounters.id = encounter_runs.encounter_id").
		Joins("join campaigns on campaigns.id = encounters.campaign_id").
		Where("campaigns.owner_user_id = ? and campaigns.id = ?", ownerID, campaignID).
		Where(`encounter_runs.status = 'ended' OR EXISTS (
			SELECT 1 FROM combat_log_events finished WHERE finished.encounter_run_id = encounter_runs.id
			AND finished.event_type = 'combat_finished' AND NOT EXISTS (
				SELECT 1 FROM combat_log_events later WHERE later.encounter_run_id = encounter_runs.id
				AND later.sequence > finished.sequence AND later.event_type IN ('combat_began', 'combat_resumed', 'turn_changed')
			))`)
	if !options.IncludeTests {
		query = query.Where("encounter_runs.is_test = false")
	}
	if options.Status == "completed" {
		query = query.Where("encounter_runs.status = 'ended'")
	} else if options.Status == "finished" {
		query = query.Where("encounter_runs.status = 'active'")
	}
	nameSQL := "coalesce(nullif(encounter_runs.summary->>'encounterName', ''), encounters.name)"
	if q := strings.TrimSpace(options.Query); q != "" {
		query = query.Where(nameSQL+" ILIKE ?", "%"+q+"%")
	}
	if err := query.Count(&result.Total).Error; err != nil {
		return result, err
	}
	var entities []struct {
		dbmodels.EncounterRunEntity
		EncounterName string
	}
	if err := query.Select("encounter_runs.*, " + nameSQL + " as encounter_name").
		Order("encounter_runs.started_at desc, encounter_runs.id desc").
		Limit(combatHistoryPageSize).Offset(max(0, options.Page-1) * combatHistoryPageSize).
		Find(&entities).Error; err != nil {
		return result, err
	}
	if len(entities) == 0 {
		return result, nil
	}
	ids := make([]string, 0, len(entities))
	for _, entity := range entities {
		ids = append(ids, entity.ID)
	}
	var combatants []dbmodels.EncounterRunCombatantEntity
	if err := s.db.WithContext(ctx).Where("encounter_run_id in ?", ids).
		Order("initiative desc nulls last, sort_order asc, display_name asc").Find(&combatants).Error; err != nil {
		return result, err
	}
	var events []dbmodels.CombatLogEventEntity
	historyEventTypes := append(append([]string{}, timingEventTypes...), "manual_hp")
	if err := s.db.WithContext(ctx).Where("encounter_run_id in ? and event_type in ?", ids, historyEventTypes).
		Order("sequence asc").Find(&events).Error; err != nil {
		return result, err
	}
	for _, entity := range entities {
		run := encounterRunFromEntity(entity.EncounterRunEntity)
		entry := models.CombatHistoryEntry{ID: run.ID, EncounterID: run.EncounterID, EncounterName: entity.EncounterName,
			Status: run.Status, IsTest: run.IsTest, StartedAt: run.StartedAt, EndedAt: run.EndedAt, Rounds: run.CurrentRound}
		for _, combatant := range combatants {
			if combatant.EncounterRunID == run.ID {
				person := encounterRunCombatantFromEntity(combatant)
				run.Combatants = append(run.Combatants, person)
				if person.Side == "player" || person.Side == "friendly" {
					entry.DamageDone += person.DamageDealt
				}
			}
		}
		var timeline []dbmodels.CombatLogEventEntity
		for _, event := range events {
			if event.EncounterRunID == run.ID {
				timeline = append(timeline, event)
				run.Events = append(run.Events, combatLogEventFromEntity(event))
			}
		}
		normalizeReportHealing(&run, run.Events)
		entry.HealingDone = 0
		for _, person := range run.Combatants {
			if person.Side == "player" || person.Side == "friendly" {
				entry.HealingDone += person.HealingDone
			}
		}
		timing := calculateRunTiming(run, timeline)
		if timing.CombatStartedAt != nil {
			var elapsed int64
			for _, ms := range timing.TurnTimeMs {
				elapsed += ms
			}
			entry.ActiveTimeMs = &elapsed
		}
		result.Runs = append(result.Runs, entry)
	}
	return result, nil
}

func (s RunStore) Report(ctx context.Context, ownerID, runID string) (models.CombatReport, error) {
	run, err := s.ByID(ctx, ownerID, runID)
	if err != nil {
		return models.CombatReport{}, err
	}
	encounter, err := encounterEntityForOwner(ctx, s.db, ownerID, run.EncounterID)
	if err != nil {
		return models.CombatReport{}, err
	}
	// Reports need the entire log; the live tracker's recent-event window stays small.
	run.Events, err = s.CombatLogEventsForRun(ctx, runID, -1)
	if err != nil {
		return models.CombatReport{}, err
	}
	normalizeReportHealing(&run, run.Events)
	name := stringFromAny(run.Summary["encounterName"])
	if name == "" {
		name = encounter.Name
	}
	return models.CombatReport{Run: run, CampaignID: encounter.CampaignID, EncounterName: name}, nil
}
