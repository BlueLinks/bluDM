package store

import (
	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"github.com/lib/pq"
)

type standardSpellProjectileScalingEntity struct {
	StandardSpellID       string
	BaseProjectiles       int
	ScalingType           string
	ScaleFromLevel        int
	AdditionalProjectiles int
	StepSize              int
	Description           string
	CantripScaling        dbmodels.JSONMap
}

type standardSpellActionEntity struct {
	ID                    string
	StandardSpellID       string
	Name                  string
	SortOrder             int
	ActionType            string
	SaveAbility           string
	SuccessfulSaveEffect  string
	AttackModifier        int
	HitSpecialEvent       string
	WeaponSource          string
	AttackAbilityOverride string
	DamageAbilityOverride string
	DamageTypeChoice      string
	DamageTypeOptions     pq.StringArray
}

type standardSpellActionRollPartEntity struct {
	ID                     string
	StandardSpellActionID  string
	SortOrder              int
	RollKind               string
	DamageType             string
	Magical                bool
	DiceCount              int
	DieSize                int
	FixedValue             int
	AddPrimaryStatModifier bool
	ConditionName          string
	EffectConfig           dbmodels.JSONMap
	Timing                 string
	ScalingType            string
	ScalingFromLevel       int
	ScalingDiceCount       int
	ScalingDieSize         int
	ScalingFixedValue      int
	ScalingStepSize        int
	CantripScaling         dbmodels.JSONMap
}

func standardSpellActionFromEntity(entity standardSpellActionEntity) models.SpellAction {
	return models.SpellAction{
		ID:                    entity.ID,
		Name:                  entity.Name,
		SortOrder:             entity.SortOrder,
		ActionType:            entity.ActionType,
		SaveAbility:           entity.SaveAbility,
		SuccessfulSaveEffect:  entity.SuccessfulSaveEffect,
		AttackModifier:        entity.AttackModifier,
		HitSpecialEvent:       entity.HitSpecialEvent,
		WeaponSource:          entity.WeaponSource,
		AttackAbilityOverride: entity.AttackAbilityOverride,
		DamageAbilityOverride: entity.DamageAbilityOverride,
		DamageTypeChoice:      entity.DamageTypeChoice,
		DamageTypeOptions:     []string(entity.DamageTypeOptions),
	}
}

func standardSpellActionRollFromEntity(entity standardSpellActionRollPartEntity) models.SpellActionRollPart {
	return models.SpellActionRollPart{
		ID:                     entity.ID,
		SortOrder:              entity.SortOrder,
		RollKind:               entity.RollKind,
		DamageType:             entity.DamageType,
		Magical:                entity.Magical,
		DiceCount:              entity.DiceCount,
		DieSize:                entity.DieSize,
		FixedValue:             entity.FixedValue,
		AddPrimaryStatModifier: entity.AddPrimaryStatModifier,
		ConditionName:          entity.ConditionName,
		EffectConfig:           map[string]any(entity.EffectConfig),
		Timing:                 entity.Timing,
		ScalingType:            entity.ScalingType,
		ScalingFromLevel:       entity.ScalingFromLevel,
		ScalingDiceCount:       entity.ScalingDiceCount,
		ScalingDieSize:         entity.ScalingDieSize,
		ScalingFixedValue:      entity.ScalingFixedValue,
		ScalingStepSize:        entity.ScalingStepSize,
		CantripScaling:         map[string]any(entity.CantripScaling),
	}
}
