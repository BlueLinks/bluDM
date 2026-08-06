package store

import (
	"encoding/json"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
)

func runCombatantEntityFromInput(runID string, sortOrder int, input RunCombatantInput) dbmodels.EncounterRunCombatantEntity {
	var initiative *int
	if input.InitiativeSet {
		initiative = &input.Initiative
	}
	return dbmodels.EncounterRunCombatantEntity{
		EncounterRunID:    strings.TrimSpace(runID),
		SourceCombatantID: stringPointer(input.SourceCombatantID),
		SourceType:        input.SourceType,
		PlayerID:          stringPointer(input.PlayerID),
		CreatureID:        stringPointer(input.CreatureID),
		Side:              canonicalCombatantSide(input.SourceType, input.Side),
		DisplayName:       input.DisplayName,
		ColorLabel:        input.ColorLabel,
		AvatarURL:         input.AvatarURL,
		ArmorClass:        input.ArmorClass,
		MaxHitPoints:      input.MaxHitPoints,
		CurrentHitPoints:  input.CurrentHitPoints,
		Initiative:        initiative,
		InitiativeSet:     input.InitiativeSet,
		SortOrder:         sortOrder,
		Snapshot:          jsonMap(input.Snapshot),
	}
}

func encounterRunFromEntity(entity dbmodels.EncounterRunEntity) models.EncounterRun {
	return models.EncounterRun{
		ID:               entity.ID,
		EncounterID:      entity.EncounterID,
		Status:           entity.Status,
		IsTest:           entity.IsTest,
		CurrentRound:     entity.CurrentRound,
		CurrentTurnIndex: entity.CurrentTurnIndex,
		StartedAt:        entity.StartedAt,
		EndedAt:          entity.EndedAt,
		Summary:          map[string]any(entity.Summary),
	}
}

func encounterRunCombatantFromEntity(entity dbmodels.EncounterRunCombatantEntity) models.EncounterRunCombatant {
	var initiative int
	if entity.Initiative != nil {
		initiative = *entity.Initiative
	}
	conditions := []string{}
	_ = json.Unmarshal([]byte(entity.Conditions), &conditions)
	return models.EncounterRunCombatant{
		ID:                       entity.ID,
		EncounterRunID:           entity.EncounterRunID,
		SourceCombatantID:        stringFromPointer(entity.SourceCombatantID),
		SourceType:               entity.SourceType,
		PlayerID:                 stringFromPointer(entity.PlayerID),
		CreatureID:               stringFromPointer(entity.CreatureID),
		Side:                     canonicalCombatantSide(entity.SourceType, entity.Side),
		DisplayName:              entity.DisplayName,
		ColorLabel:               entity.ColorLabel,
		AvatarURL:                entity.AvatarURL,
		ArmorClass:               entity.ArmorClass,
		MaxHitPoints:             entity.MaxHitPoints,
		CurrentHitPoints:         entity.CurrentHitPoints,
		TemporaryHitPoints:       entity.TemporaryHitPoints,
		MaxHitPointsModifier:     entity.MaxHitPointsModifier,
		ArmorClassBonus:          entity.ArmorClassBonus,
		ArmorClassOverride:       entity.ArmorClassOverride,
		MaxHitPointsOverride:     entity.MaxHitPointsOverride,
		CurrentHitPointsOverride: entity.CurrentHitPointsOverride,
		Initiative:               initiative,
		InitiativeSet:            entity.InitiativeSet,
		SortOrder:                entity.SortOrder,
		Defeated:                 entity.Defeated,
		Conditions:               conditions,
		DamageDealt:              entity.DamageDealt,
		DamageTaken:              entity.DamageTaken,
		HealingDone:              entity.HealingDone,
		HealingReceived:          entity.HealingReceived,
		Kills:                    entity.Kills,
		DeathSaveSuccesses:       entity.DeathSaveSuccesses,
		DeathSaveFailures:        entity.DeathSaveFailures,
		Stable:                   entity.Stable,
		Snapshot:                 map[string]any(entity.Snapshot),
	}
}

func combatLogEventFromEntity(entity dbmodels.CombatLogEventEntity) models.CombatLogEvent {
	return models.CombatLogEvent{
		ID:             entity.ID,
		EncounterRunID: entity.EncounterRunID,
		Sequence:       entity.Sequence,
		EventType:      entity.EventType,
		ActorID:        stringFromPointer(entity.ActorID),
		TargetID:       stringFromPointer(entity.TargetID),
		Payload:        map[string]any(entity.Payload),
		CreatedAt:      entity.CreatedAt,
	}
}

func encounterRunSpellSlotFromEntity(entity dbmodels.EncounterRunSpellSlotEntity) models.EncounterRunSpellSlot {
	return models.EncounterRunSpellSlot{
		ID:             entity.ID,
		EncounterRunID: entity.EncounterRunID,
		CombatantID:    entity.CombatantID,
		SpellLevel:     entity.SpellLevel,
		MaxSlots:       entity.MaxSlots,
		RemainingSlots: entity.RemainingSlots,
	}
}

func encounterRunEffectFromEntity(entity dbmodels.EncounterRunActiveEffectEntity) models.EncounterRunEffect {
	return models.EncounterRunEffect{
		ID:             entity.ID,
		EncounterRunID: entity.EncounterRunID,
		CasterID:       entity.CasterID,
		TargetID:       entity.TargetID,
		SpellID:        stringFromPointer(entity.SpellID),
		LibrarySource:  entity.LibrarySource,
		SpellName:      entity.SpellName,
		CastLevel:      entity.CastLevel,
		Concentration:  entity.Concentration,
		Timing:         entity.Timing,
		EffectKind:     entity.EffectKind,
		ConditionName:  entity.ConditionName,
		Amount:         entity.Amount,
		Payload:        map[string]any(entity.Payload),
		Active:         entity.Active,
		CreatedAt:      entity.CreatedAt,
	}
}

func encounterRunAlertFromEntity(entity dbmodels.EncounterRunAlertEntity) models.EncounterRunAlert {
	return models.EncounterRunAlert{
		ID:             entity.ID,
		EncounterRunID: entity.EncounterRunID,
		AlertType:      entity.AlertType,
		ActorID:        stringFromPointer(entity.ActorID),
		TargetID:       stringFromPointer(entity.TargetID),
		Title:          entity.Title,
		Message:        entity.Message,
		DC:             entity.DC,
		Payload:        map[string]any(entity.Payload),
		Resolved:       entity.Resolved,
		CreatedAt:      entity.CreatedAt,
	}
}

func jsonBytes(value any) (dbmodels.JSONBytes, error) {
	bytes, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	if !json.Valid(bytes) {
		return nil, errors.New("invalid JSON")
	}
	return dbmodels.JSONBytes(bytes), nil
}
