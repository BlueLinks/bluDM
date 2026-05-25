package db

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type standardSpellAutomationTx interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type standardSpellProjectileScalingSeed struct {
	BaseProjectiles       int            `json:"baseProjectiles"`
	ScalingType           string         `json:"scalingType"`
	ScaleFromLevel        int            `json:"scaleFromLevel"`
	AdditionalProjectiles int            `json:"additionalProjectiles"`
	StepSize              int            `json:"stepSize"`
	Description           string         `json:"description"`
	CantripScaling        map[string]any `json:"cantripScaling"`
}

type standardSpellActionSeed struct {
	Name                  string                        `json:"name"`
	ActionType            string                        `json:"actionType"`
	SaveAbility           string                        `json:"saveAbility"`
	SuccessfulSaveEffect  string                        `json:"successfulSaveEffect"`
	AttackModifier        int                           `json:"attackModifier"`
	HitSpecialEvent       string                        `json:"hitSpecialEvent"`
	WeaponSource          string                        `json:"weaponSource"`
	AttackAbilityOverride string                        `json:"attackAbilityOverride"`
	DamageAbilityOverride string                        `json:"damageAbilityOverride"`
	DamageTypeChoice      string                        `json:"damageTypeChoice"`
	DamageTypeOptions     []string                      `json:"damageTypeOptions"`
	Rolls                 []standardSpellActionRollSeed `json:"rolls"`
}

type standardSpellActionRollSeed struct {
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

type parsedSpellFormula struct {
	diceCount int
	dieSize   int
	fixed     int
	addStat   bool
}

func replaceStandardSpellAutomation(
	ctx context.Context,
	tx standardSpellAutomationTx,
	spellID string,
	projectiles *standardSpellProjectileScalingSeed,
	actions []standardSpellActionSeed,
) error {
	if _, err := tx.Exec(ctx, `delete from standard_spell_projectile_scaling where standard_spell_id = $1`, spellID); err != nil {
		return err
	}
	if projectiles != nil {
		cantripScaling := projectiles.CantripScaling
		if cantripScaling == nil {
			cantripScaling = map[string]any{}
		}
		cantripScalingBytes, err := json.Marshal(cantripScaling)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			insert into standard_spell_projectile_scaling (
				standard_spell_id, base_projectiles, scaling_type, scale_from_level,
				additional_projectiles, step_size, description, cantrip_scaling
			)
			values ($1, $2, $3, $4, $5, $6, $7, $8)
		`, spellID, positiveOrDefault(projectiles.BaseProjectiles, 1), defaultText(projectiles.ScalingType, "none"),
			projectiles.ScaleFromLevel, projectiles.AdditionalProjectiles, positiveOrDefault(projectiles.StepSize, 1),
			projectiles.Description, cantripScalingBytes); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx, `delete from standard_spell_actions where standard_spell_id = $1`, spellID); err != nil {
		return err
	}
	for actionIndex, action := range actions {
		var actionID string
		if err := tx.QueryRow(ctx, `
			insert into standard_spell_actions (
				standard_spell_id, name, sort_order, action_type, save_ability,
				successful_save_effect, attack_modifier, hit_special_event,
				weapon_source, attack_ability_override, damage_ability_override,
				damage_type_choice, damage_type_options
			)
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			returning id
		`, spellID, action.Name, actionIndex, defaultText(action.ActionType, "damage"), action.SaveAbility,
			defaultText(action.SuccessfulSaveEffect, "none"), action.AttackModifier, defaultText(action.HitSpecialEvent, "none"),
			action.WeaponSource, action.AttackAbilityOverride, action.DamageAbilityOverride,
			defaultText(action.DamageTypeChoice, "specific"), action.DamageTypeOptions).Scan(&actionID); err != nil {
			return err
		}
		for rollIndex, roll := range action.Rolls {
			cantripScaling := roll.CantripScaling
			if cantripScaling == nil {
				cantripScaling = map[string]any{}
			}
			cantripScalingBytes, err := json.Marshal(cantripScaling)
			if err != nil {
				return err
			}
			effectConfig := roll.EffectConfig
			if effectConfig == nil {
				effectConfig = map[string]any{}
			}
			effectConfigBytes, err := json.Marshal(effectConfig)
			if err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `
				insert into standard_spell_action_roll_parts (
					standard_spell_action_id, sort_order, roll_kind, damage_type, magical,
					dice_count, die_size, fixed_value, add_primary_stat_modifier,
					condition_name, effect_config, timing, scaling_type, scaling_from_level, scaling_dice_count,
					scaling_die_size, scaling_fixed_value, scaling_step_size, cantrip_scaling
				)
				values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
			`, actionID, rollIndex, defaultText(roll.RollKind, "damage"), roll.DamageType, roll.Magical,
				nonNegativeOrDefault(roll.DiceCount, 0), positiveOrDefault(roll.DieSize, 6), roll.FixedValue,
				roll.AddPrimaryStatModifier, roll.ConditionName, effectConfigBytes, defaultText(roll.Timing, "immediate"),
				defaultText(roll.ScalingType, "none"), roll.ScalingFromLevel, roll.ScalingDiceCount,
				positiveOrDefault(roll.ScalingDieSize, 6), roll.ScalingFixedValue,
				positiveOrDefault(roll.ScalingStepSize, 1), cantripScalingBytes); err != nil {
				return err
			}
		}
	}
	return nil
}
