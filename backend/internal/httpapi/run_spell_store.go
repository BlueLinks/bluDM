package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type runSpellTx interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
}

func (s *Server) snapshotRunSpellSlots(ctx context.Context, tx runSpellTx, runID string) error {
	rows, err := tx.Query(ctx, `
		select encounter_run_combatants.id, encounter_run_combatants.source_type,
			coalesce(creature_spellcasting_profiles.slots, '{}'::jsonb),
			encounter_run_combatants.snapshot
		from encounter_run_combatants
		left join creature_spellcasting_profiles on creature_spellcasting_profiles.creature_id = encounter_run_combatants.creature_id
		where encounter_run_combatants.encounter_run_id = $1
	`, runID)
	if err != nil {
		return err
	}
	defer rows.Close()
	type slotSource struct {
		combatantID string
		sourceType  string
		maxSlots    map[string]any
		remaining   map[string]any
	}
	sources := []slotSource{}
	for rows.Next() {
		var source slotSource
		var slotsBytes []byte
		var snapshotBytes []byte
		if err := rows.Scan(&source.combatantID, &source.sourceType, &slotsBytes, &snapshotBytes); err != nil {
			return err
		}
		source.maxSlots, _ = unmarshalJSONMap(slotsBytes)
		if source.sourceType == "player" {
			snapshot, _ := unmarshalJSONMap(snapshotBytes)
			sheet := sourceMap(snapshot)
			source.maxSlots = mapFromAny(sheet["spellSlots"])
			source.remaining = mapFromAny(sheet["spellSlotsRemaining"])
		}
		sources = append(sources, source)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, source := range sources {
		for level := 1; level <= 9; level++ {
			levelKey := strconv.Itoa(level)
			count := intFromAny(source.maxSlots[levelKey])
			if count <= 0 {
				continue
			}
			remaining := count
			if source.remaining != nil {
				remaining = min(max(0, intFromAny(source.remaining[levelKey])), count)
			}
			if _, err := tx.Exec(ctx, `
				insert into encounter_run_spell_slots (
					encounter_run_id, combatant_id, spell_level, max_slots, remaining_slots
				)
				values ($1, $2, $3, $4, $5)
				on conflict (combatant_id, spell_level) do nothing
			`, runID, source.combatantID, level, count, remaining); err != nil {
				return err
			}
		}
	}
	return nil
}

func mapFromAny(value any) map[string]any {
	if mapped, ok := value.(map[string]any); ok {
		return mapped
	}
	return nil
}

func (s *Server) runSpellSlots(ctx context.Context, runID string) ([]models.EncounterRunSpellSlot, error) {
	return s.stores.Runs.SpellSlots(ctx, runID)
}

func (s *Server) runActiveEffects(ctx context.Context, runID string) ([]models.EncounterRunEffect, error) {
	return s.stores.Runs.ActiveEffects(ctx, runID)
}

func (s *Server) runAlerts(ctx context.Context, runID string) ([]models.EncounterRunAlert, error) {
	return s.stores.Runs.Alerts(ctx, runID)
}

func marshalEffectPayload(payload map[string]any) []byte {
	bytes, _ := json.Marshal(payload)
	return bytes
}
