package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"errors"
	"strings"
)

type spellRequest struct {
	Name              string                         `json:"name"`
	Level             int                            `json:"level"`
	School            string                         `json:"school"`
	CastingTime       string                         `json:"castingTime"`
	CastType          string                         `json:"castType"`
	Range             string                         `json:"range"`
	RangeType         string                         `json:"rangeType"`
	RangeFeet         int                            `json:"rangeFeet"`
	Components        map[string]any                 `json:"components"`
	Material          string                         `json:"materialComponents"`
	Classes           []string                       `json:"classes"`
	Duration          string                         `json:"duration"`
	DurationType      string                         `json:"durationType"`
	DurationValue     int                            `json:"durationValue"`
	DurationScale     string                         `json:"durationScale"`
	AOEType           string                         `json:"aoeType"`
	AOESize           int                            `json:"aoeSize"`
	Ritual            bool                           `json:"ritual"`
	Concentration     bool                           `json:"concentration"`
	ScalingType       string                         `json:"scalingType"`
	Description       string                         `json:"description"`
	HigherLevel       string                         `json:"higherLevel"`
	SourceNote        string                         `json:"sourceNote"`
	SourceMaterial    string                         `json:"sourceMaterial"`
	Mechanics         map[string]any                 `json:"mechanics"`
	ProjectileScaling *spellProjectileScalingRequest `json:"projectileScaling"`
	Actions           []spellActionRequest           `json:"actions"`
}

func (req *spellRequest) normalize() {
	req.Name = strings.TrimSpace(req.Name)
	req.School = strings.TrimSpace(req.School)
	req.CastingTime = strings.TrimSpace(req.CastingTime)
	req.CastType = strings.TrimSpace(req.CastType)
	req.Range = strings.TrimSpace(req.Range)
	req.RangeType = strings.TrimSpace(req.RangeType)
	req.Material = strings.TrimSpace(req.Material)
	req.Duration = strings.TrimSpace(req.Duration)
	req.DurationType = strings.TrimSpace(req.DurationType)
	req.DurationScale = strings.TrimSpace(req.DurationScale)
	req.AOEType = strings.TrimSpace(req.AOEType)
	req.ScalingType = strings.TrimSpace(req.ScalingType)
	req.Description = strings.TrimSpace(req.Description)
	req.HigherLevel = strings.TrimSpace(req.HigherLevel)
	req.SourceNote = strings.TrimSpace(req.SourceNote)
	req.SourceMaterial = strings.TrimSpace(req.SourceMaterial)
	for index := range req.Classes {
		req.Classes[index] = strings.TrimSpace(req.Classes[index])
	}
	if req.ProjectileScaling != nil {
		req.ProjectileScaling.normalize()
	}
	for index := range req.Actions {
		req.Actions[index].normalize()
	}
}

func (req spellRequest) validate() error {
	if req.Name == "" {
		return errors.New("name is required")
	}
	if req.Level < 0 || req.Level > 9 {
		return errors.New("level must be between 0 and 9")
	}
	for _, action := range req.Actions {
		if err := action.validate(); err != nil {
			return err
		}
	}
	return nil
}

type spellProjectileScalingRequest struct {
	BaseProjectiles       int            `json:"baseProjectiles"`
	ScalingType           string         `json:"scalingType"`
	ScaleFromLevel        int            `json:"scaleFromLevel"`
	AdditionalProjectiles int            `json:"additionalProjectiles"`
	StepSize              int            `json:"stepSize"`
	Description           string         `json:"description"`
	CantripScaling        map[string]any `json:"cantripScaling"`
}

func (req *spellProjectileScalingRequest) normalize() {
	req.ScalingType = strings.TrimSpace(req.ScalingType)
	req.Description = strings.TrimSpace(req.Description)
}

type spellActionRequest struct {
	Name                  string                   `json:"name"`
	ActionType            string                   `json:"actionType"`
	SaveAbility           string                   `json:"saveAbility"`
	SuccessfulSaveEffect  string                   `json:"successfulSaveEffect"`
	AttackModifier        int                      `json:"attackModifier"`
	HitSpecialEvent       string                   `json:"hitSpecialEvent"`
	WeaponSource          string                   `json:"weaponSource"`
	AttackAbilityOverride string                   `json:"attackAbilityOverride"`
	DamageAbilityOverride string                   `json:"damageAbilityOverride"`
	DamageTypeChoice      string                   `json:"damageTypeChoice"`
	DamageTypeOptions     []string                 `json:"damageTypeOptions"`
	Rolls                 []spellActionRollRequest `json:"rolls"`
}

func (req *spellActionRequest) normalize() {
	req.Name = strings.TrimSpace(req.Name)
	req.ActionType = strings.TrimSpace(req.ActionType)
	req.SaveAbility = strings.TrimSpace(req.SaveAbility)
	req.SuccessfulSaveEffect = strings.TrimSpace(req.SuccessfulSaveEffect)
	req.HitSpecialEvent = strings.TrimSpace(req.HitSpecialEvent)
	req.WeaponSource = strings.TrimSpace(req.WeaponSource)
	req.AttackAbilityOverride = strings.TrimSpace(req.AttackAbilityOverride)
	req.DamageAbilityOverride = strings.TrimSpace(req.DamageAbilityOverride)
	req.DamageTypeChoice = strings.TrimSpace(req.DamageTypeChoice)
	for index := range req.DamageTypeOptions {
		req.DamageTypeOptions[index] = strings.TrimSpace(req.DamageTypeOptions[index])
	}
	for index := range req.Rolls {
		req.Rolls[index].normalize()
	}
}

func (req spellActionRequest) validate() error {
	if req.ActionType == "" {
		return errors.New("spell action type is required")
	}
	for _, roll := range req.Rolls {
		if roll.DiceCount < 0 {
			return errors.New("spell roll dice count cannot be negative")
		}
	}
	return nil
}

type spellActionRollRequest struct {
	RollKind               string         `json:"rollKind"`
	DamageType             string         `json:"damageType"`
	Magical                bool           `json:"magical"`
	DiceCount              int            `json:"diceCount"`
	DieSize                int            `json:"dieSize"`
	FixedValue             int            `json:"fixedValue"`
	AddPrimaryStatModifier bool           `json:"addPrimaryStatModifier"`
	ConditionName          string         `json:"conditionName"`
	EffectConfig           map[string]any `json:"effectConfig"`
	Timing                 string         `json:"timing"`
	ScalingType            string         `json:"scalingType"`
	ScalingFromLevel       int            `json:"scalingFromLevel"`
	ScalingDiceCount       int            `json:"scalingDiceCount"`
	ScalingDieSize         int            `json:"scalingDieSize"`
	ScalingFixedValue      int            `json:"scalingFixedValue"`
	ScalingStepSize        int            `json:"scalingStepSize"`
	CantripScaling         map[string]any `json:"cantripScaling"`
}

func (req *spellActionRollRequest) normalize() {
	req.RollKind = strings.TrimSpace(req.RollKind)
	req.DamageType = strings.TrimSpace(req.DamageType)
	req.ConditionName = strings.TrimSpace(req.ConditionName)
	if req.EffectConfig == nil {
		req.EffectConfig = map[string]any{}
	}
	req.Timing = strings.TrimSpace(req.Timing)
	req.ScalingType = strings.TrimSpace(req.ScalingType)
	if req.Timing == "" {
		req.Timing = "immediate"
	}
}

func spellInputFromRequest(req spellRequest) store.SpellInput {
	return store.SpellInput{
		Name:              req.Name,
		Level:             req.Level,
		School:            req.School,
		CastingTime:       req.CastingTime,
		CastType:          req.CastType,
		Range:             req.Range,
		RangeType:         req.RangeType,
		RangeFeet:         req.RangeFeet,
		Components:        req.Components,
		Material:          req.Material,
		Classes:           req.Classes,
		Duration:          req.Duration,
		DurationType:      req.DurationType,
		DurationValue:     req.DurationValue,
		DurationScale:     req.DurationScale,
		AOEType:           req.AOEType,
		AOESize:           req.AOESize,
		Ritual:            req.Ritual,
		Concentration:     req.Concentration,
		ScalingType:       req.ScalingType,
		Description:       req.Description,
		HigherLevel:       req.HigherLevel,
		SourceNote:        req.SourceNote,
		SourceMaterial:    req.SourceMaterial,
		Mechanics:         req.Mechanics,
		ProjectileScaling: spellProjectileScalingFromRequest(req.ProjectileScaling),
		Actions:           spellActionsFromRequest(req.Actions),
	}
}

func spellProjectileScalingFromRequest(req *spellProjectileScalingRequest) *models.SpellProjectileScaling {
	if req == nil {
		return nil
	}
	return &models.SpellProjectileScaling{
		BaseProjectiles:       req.BaseProjectiles,
		ScalingType:           req.ScalingType,
		ScaleFromLevel:        req.ScaleFromLevel,
		AdditionalProjectiles: req.AdditionalProjectiles,
		StepSize:              req.StepSize,
		Description:           req.Description,
		CantripScaling:        req.CantripScaling,
	}
}

func spellActionsFromRequest(reqs []spellActionRequest) []models.SpellAction {
	actions := make([]models.SpellAction, 0, len(reqs))
	for index, req := range reqs {
		actions = append(actions, models.SpellAction{
			Name:                  req.Name,
			SortOrder:             index,
			ActionType:            req.ActionType,
			SaveAbility:           req.SaveAbility,
			SuccessfulSaveEffect:  req.SuccessfulSaveEffect,
			AttackModifier:        req.AttackModifier,
			HitSpecialEvent:       req.HitSpecialEvent,
			WeaponSource:          req.WeaponSource,
			AttackAbilityOverride: req.AttackAbilityOverride,
			DamageAbilityOverride: req.DamageAbilityOverride,
			DamageTypeChoice:      req.DamageTypeChoice,
			DamageTypeOptions:     req.DamageTypeOptions,
			Rolls:                 spellActionRollsFromRequest(req.Rolls),
		})
	}
	return actions
}

func spellActionRollsFromRequest(reqs []spellActionRollRequest) []models.SpellActionRollPart {
	rolls := make([]models.SpellActionRollPart, 0, len(reqs))
	for index, req := range reqs {
		rolls = append(rolls, models.SpellActionRollPart{
			SortOrder:              index,
			RollKind:               req.RollKind,
			DamageType:             req.DamageType,
			Magical:                req.Magical,
			DiceCount:              req.DiceCount,
			DieSize:                req.DieSize,
			FixedValue:             req.FixedValue,
			AddPrimaryStatModifier: req.AddPrimaryStatModifier,
			ConditionName:          req.ConditionName,
			EffectConfig:           req.EffectConfig,
			Timing:                 req.Timing,
			ScalingType:            req.ScalingType,
			ScalingFromLevel:       req.ScalingFromLevel,
			ScalingDiceCount:       req.ScalingDiceCount,
			ScalingDieSize:         req.ScalingDieSize,
			ScalingFixedValue:      req.ScalingFixedValue,
			ScalingStepSize:        req.ScalingStepSize,
			CantripScaling:         req.CantripScaling,
		})
	}
	return rolls
}

func standardSpellClasses(mechanics map[string]any) []string {
	rawClasses, ok := mechanics["classes"].([]any)
	if !ok {
		return []string{}
	}
	classes := make([]string, 0, len(rawClasses))
	for _, rawClass := range rawClasses {
		className, ok := rawClass.(string)
		if !ok {
			continue
		}
		className = strings.TrimSpace(className)
		if className != "" {
			classes = append(classes, className)
		}
	}
	return classes
}
