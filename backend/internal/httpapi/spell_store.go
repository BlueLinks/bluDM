package httpapi

import (
	"context"
	"encoding/json"

	"bludm/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type spellDataTx interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

func (s *Server) replaceSpellChildren(ctx context.Context, tx spellDataTx, spellID string, req spellRequest) error {
	if _, err := tx.Exec(ctx, `delete from spell_projectile_scaling where spell_id = $1`, spellID); err != nil {
		return err
	}
	if req.ProjectileScaling != nil {
		projectiles := req.ProjectileScaling
		cantripScaling := projectiles.CantripScaling
		if cantripScaling == nil {
			cantripScaling = map[string]any{}
		}
		cantripScalingBytes, err := json.Marshal(cantripScaling)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			insert into spell_projectile_scaling (
				spell_id, base_projectiles, scaling_type, scale_from_level,
				additional_projectiles, step_size, description, cantrip_scaling
			)
			values ($1, $2, $3, $4, $5, $6, $7, $8)
		`, spellID, projectiles.BaseProjectiles, projectiles.ScalingType, projectiles.ScaleFromLevel,
			projectiles.AdditionalProjectiles, projectiles.StepSize, projectiles.Description, cantripScalingBytes); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx, `delete from spell_actions where spell_id = $1`, spellID); err != nil {
		return err
	}
	for actionIndex, action := range req.Actions {
		var actionID string
		err := tx.QueryRow(ctx, `
			insert into spell_actions (
				spell_id, name, sort_order, action_type, save_ability,
				successful_save_effect, attack_modifier, hit_special_event,
				weapon_source, attack_ability_override, damage_ability_override, damage_type_choice,
				damage_type_options
			)
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			returning id
		`, spellID, action.Name, actionIndex, action.ActionType, action.SaveAbility,
			action.SuccessfulSaveEffect, action.AttackModifier, action.HitSpecialEvent,
			action.WeaponSource, action.AttackAbilityOverride, action.DamageAbilityOverride,
			action.DamageTypeChoice, action.DamageTypeOptions).Scan(&actionID)
		if err != nil {
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
				insert into spell_action_roll_parts (
					spell_action_id, sort_order, roll_kind, damage_type, magical,
					dice_count, die_size, fixed_value, add_primary_stat_modifier,
					condition_name, effect_config, timing, scaling_type, scaling_from_level, scaling_dice_count,
					scaling_die_size, scaling_fixed_value, scaling_step_size, cantrip_scaling
				)
				values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
			`, actionID, rollIndex, roll.RollKind, roll.DamageType, roll.Magical,
				nonNegativeOrDefault(roll.DiceCount, 0), positiveOrDefault(roll.DieSize, 6), roll.FixedValue,
				roll.AddPrimaryStatModifier, roll.ConditionName, effectConfigBytes, roll.Timing, roll.ScalingType, roll.ScalingFromLevel,
				roll.ScalingDiceCount, positiveOrDefault(roll.ScalingDieSize, 6),
				roll.ScalingFixedValue, positiveOrDefault(roll.ScalingStepSize, 1), cantripScalingBytes); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Server) attachSpellChildren(ctx context.Context, spells []models.Spell) ([]models.Spell, error) {
	for index := range spells {
		projectiles, actions, err := s.spellAutomation(ctx, spells[index])
		if err != nil {
			return nil, err
		}
		spells[index].ProjectileScaling = projectiles
		spells[index].Actions = actions
	}
	return spells, nil
}

func (s *Server) spellAutomation(ctx context.Context, spell models.Spell) (*models.SpellProjectileScaling, []models.SpellAction, error) {
	if spell.LibrarySource == "standard" {
		projectiles, err := s.standardSpellProjectileScaling(ctx, spell.ID)
		if err != nil {
			return nil, nil, err
		}
		actions, err := s.standardSpellActions(ctx, spell.ID)
		if err != nil {
			return nil, nil, err
		}
		return projectiles, actions, nil
	}
	projectiles, err := s.spellProjectileScaling(ctx, spell.ID)
	if err != nil {
		return nil, nil, err
	}
	actions, err := s.spellActions(ctx, spell.ID)
	if err != nil {
		return nil, nil, err
	}
	return projectiles, actions, nil
}

func (s *Server) spellProjectileScaling(ctx context.Context, spellID string) (*models.SpellProjectileScaling, error) {
	var scaling models.SpellProjectileScaling
	err := s.db.QueryRow(ctx, `
		select base_projectiles, scaling_type, scale_from_level, additional_projectiles,
			step_size, description, cantrip_scaling
		from spell_projectile_scaling
		where spell_id = $1
	`, spellID).Scan(&scaling.BaseProjectiles, &scaling.ScalingType, &scaling.ScaleFromLevel,
		&scaling.AdditionalProjectiles, &scaling.StepSize, &scaling.Description, &scaling.CantripScaling)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &scaling, nil
}

func (s *Server) standardSpellProjectileScaling(ctx context.Context, spellID string) (*models.SpellProjectileScaling, error) {
	var scaling models.SpellProjectileScaling
	err := s.db.QueryRow(ctx, `
		select base_projectiles, scaling_type, scale_from_level, additional_projectiles,
			step_size, description, cantrip_scaling
		from standard_spell_projectile_scaling
		where standard_spell_id = $1
	`, spellID).Scan(&scaling.BaseProjectiles, &scaling.ScalingType, &scaling.ScaleFromLevel,
		&scaling.AdditionalProjectiles, &scaling.StepSize, &scaling.Description, &scaling.CantripScaling)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &scaling, nil
}

func (s *Server) spellActions(ctx context.Context, spellID string) ([]models.SpellAction, error) {
	rows, err := s.db.Query(ctx, `
		select id, name, sort_order, action_type, save_ability, successful_save_effect,
			attack_modifier, hit_special_event, weapon_source, attack_ability_override,
			damage_ability_override, damage_type_choice, damage_type_options
		from spell_actions
		where spell_id = $1
		order by sort_order asc, name asc
	`, spellID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	actions := []models.SpellAction{}
	for rows.Next() {
		var action models.SpellAction
		if err := rows.Scan(&action.ID, &action.Name, &action.SortOrder, &action.ActionType,
			&action.SaveAbility, &action.SuccessfulSaveEffect, &action.AttackModifier,
			&action.HitSpecialEvent, &action.WeaponSource, &action.AttackAbilityOverride,
			&action.DamageAbilityOverride, &action.DamageTypeChoice, &action.DamageTypeOptions); err != nil {
			return nil, err
		}
		action.Rolls, err = s.spellActionRolls(ctx, action.ID)
		if err != nil {
			return nil, err
		}
		actions = append(actions, action)
	}
	return actions, rows.Err()
}

func (s *Server) standardSpellActions(ctx context.Context, spellID string) ([]models.SpellAction, error) {
	rows, err := s.db.Query(ctx, `
		select id, name, sort_order, action_type, save_ability, successful_save_effect,
			attack_modifier, hit_special_event, weapon_source, attack_ability_override,
			damage_ability_override, damage_type_choice, damage_type_options
		from standard_spell_actions
		where standard_spell_id = $1
		order by sort_order asc, name asc
	`, spellID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	actions := []models.SpellAction{}
	for rows.Next() {
		var action models.SpellAction
		if err := rows.Scan(&action.ID, &action.Name, &action.SortOrder, &action.ActionType,
			&action.SaveAbility, &action.SuccessfulSaveEffect, &action.AttackModifier,
			&action.HitSpecialEvent, &action.WeaponSource, &action.AttackAbilityOverride,
			&action.DamageAbilityOverride, &action.DamageTypeChoice, &action.DamageTypeOptions); err != nil {
			return nil, err
		}
		action.Rolls, err = s.standardSpellActionRolls(ctx, action.ID)
		if err != nil {
			return nil, err
		}
		actions = append(actions, action)
	}
	return actions, rows.Err()
}

func (s *Server) spellActionRolls(ctx context.Context, actionID string) ([]models.SpellActionRollPart, error) {
	rows, err := s.db.Query(ctx, `
		select id, sort_order, roll_kind, damage_type, magical, dice_count, die_size,
			fixed_value, add_primary_stat_modifier, condition_name, effect_config, timing, scaling_type,
			scaling_from_level, scaling_dice_count, scaling_die_size, scaling_fixed_value,
			scaling_step_size, cantrip_scaling
		from spell_action_roll_parts
		where spell_action_id = $1
		order by sort_order asc
	`, actionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rolls := []models.SpellActionRollPart{}
	for rows.Next() {
		var roll models.SpellActionRollPart
		var cantripScalingBytes []byte
		var effectConfigBytes []byte
		if err := rows.Scan(&roll.ID, &roll.SortOrder, &roll.RollKind, &roll.DamageType,
			&roll.Magical, &roll.DiceCount, &roll.DieSize, &roll.FixedValue,
			&roll.AddPrimaryStatModifier, &roll.ConditionName, &effectConfigBytes, &roll.Timing, &roll.ScalingType, &roll.ScalingFromLevel,
			&roll.ScalingDiceCount, &roll.ScalingDieSize, &roll.ScalingFixedValue,
			&roll.ScalingStepSize, &cantripScalingBytes); err != nil {
			return nil, err
		}
		roll.EffectConfig, _ = unmarshalJSONMap(effectConfigBytes)
		roll.CantripScaling, _ = unmarshalJSONMap(cantripScalingBytes)
		rolls = append(rolls, roll)
	}
	return rolls, rows.Err()
}

func (s *Server) standardSpellActionRolls(ctx context.Context, actionID string) ([]models.SpellActionRollPart, error) {
	rows, err := s.db.Query(ctx, `
		select id, sort_order, roll_kind, damage_type, magical, dice_count, die_size,
			fixed_value, add_primary_stat_modifier, condition_name, effect_config, timing, scaling_type,
			scaling_from_level, scaling_dice_count, scaling_die_size, scaling_fixed_value,
			scaling_step_size, cantrip_scaling
		from standard_spell_action_roll_parts
		where standard_spell_action_id = $1
		order by sort_order asc
	`, actionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rolls := []models.SpellActionRollPart{}
	for rows.Next() {
		var roll models.SpellActionRollPart
		var cantripScalingBytes []byte
		var effectConfigBytes []byte
		if err := rows.Scan(&roll.ID, &roll.SortOrder, &roll.RollKind, &roll.DamageType,
			&roll.Magical, &roll.DiceCount, &roll.DieSize, &roll.FixedValue,
			&roll.AddPrimaryStatModifier, &roll.ConditionName, &effectConfigBytes, &roll.Timing, &roll.ScalingType, &roll.ScalingFromLevel,
			&roll.ScalingDiceCount, &roll.ScalingDieSize, &roll.ScalingFixedValue,
			&roll.ScalingStepSize, &cantripScalingBytes); err != nil {
			return nil, err
		}
		roll.EffectConfig, _ = unmarshalJSONMap(effectConfigBytes)
		roll.CantripScaling, _ = unmarshalJSONMap(cantripScalingBytes)
		rolls = append(rolls, roll)
	}
	return rolls, rows.Err()
}

func nonNegativeOrDefault(value int, fallback int) int {
	if value >= 0 {
		return value
	}
	return fallback
}

func positiveOrDefault(value int, fallback int) int {
	if value > 0 {
		return value
	}
	return fallback
}
