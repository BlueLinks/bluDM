package httpapi

import (
	"bludm/backend/internal/models"
	"context"

	"github.com/jackc/pgx/v5"
)

func (s *Server) actionTemplateUsage(ctx context.Context, templateID string) ([]map[string]any, error) {
	rows, err := s.db.Query(ctx, `
		select creature_actions.id, creatures.id, creatures.name, creature_actions.name
		from creature_actions
		join creatures on creatures.id = creature_actions.creature_id
		where creature_actions.source_template_id = $1
		order by creatures.name asc, creature_actions.name asc
	`, templateID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	usage := []map[string]any{}
	for rows.Next() {
		var actionID, creatureID, creatureName, actionName string
		if err := rows.Scan(&actionID, &creatureID, &creatureName, &actionName); err != nil {
			return nil, err
		}
		usage = append(usage, map[string]any{
			"actionId":     actionID,
			"creatureId":   creatureID,
			"creatureName": creatureName,
			"actionName":   actionName,
		})
	}
	return usage, rows.Err()
}

func (s *Server) actionTemplateByID(ctx context.Context, templateID string) (models.ActionTemplate, error) {
	row := s.db.QueryRow(ctx, `
		select id, name, description, recharge, limited_uses, limit_type, reach, action_range,
			aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event,
			created_at, updated_at
		from action_templates
		where id = $1
	`, templateID)
	template, err := scanActionTemplate(row)
	if err != nil {
		return models.ActionTemplate{}, err
	}
	template.Rolls, err = s.actionTemplateRolls(ctx, template.ID)
	return template, err
}

func (s *Server) creatureActionByID(ctx context.Context, actionID string) (models.CreatureAction, error) {
	row := s.db.QueryRow(ctx, `
		select id, creature_id, coalesce(source_template_id::text, ''), sort_order, name, description,
			recharge, limited_uses, limit_type, reach, action_range, aoe_type, aoe_size,
			action_type, attack_modifier, miss_effect, hit_special_event, created_at, updated_at
		from creature_actions
		where id = $1
	`, actionID)
	action, err := scanCreatureAction(row)
	if err != nil {
		return models.CreatureAction{}, err
	}
	action.Rolls, err = s.creatureActionRolls(ctx, action.ID)
	return action, err
}

func (s *Server) creatureActions(ctx context.Context, creatureID string) ([]models.CreatureAction, error) {
	rows, err := s.db.Query(ctx, `
		select id, creature_id, coalesce(source_template_id::text, ''), sort_order, name, description,
			recharge, limited_uses, limit_type, reach, action_range, aoe_type, aoe_size,
			action_type, attack_modifier, miss_effect, hit_special_event, created_at, updated_at
		from creature_actions
		where creature_id = $1
		order by sort_order asc, created_at asc
	`, creatureID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	actions := []models.CreatureAction{}
	for rows.Next() {
		action, err := scanCreatureAction(rows)
		if err != nil {
			return nil, err
		}
		action.Rolls, err = s.creatureActionRolls(ctx, action.ID)
		if err != nil {
			return nil, err
		}
		actions = append(actions, action)
	}
	return actions, rows.Err()
}

func (s *Server) actionTemplateRolls(ctx context.Context, templateID string) ([]models.ActionRollPart, error) {
	rows, err := s.db.Query(ctx, `
		select id, sort_order, roll_kind, damage_type, magical, dice_count, die_size, fixed_value
		from action_template_roll_parts
		where action_template_id = $1
		order by sort_order asc
	`, templateID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRollParts(rows)
}

func (s *Server) creatureActionRolls(ctx context.Context, actionID string) ([]models.ActionRollPart, error) {
	rows, err := s.db.Query(ctx, `
		select id, sort_order, roll_kind, damage_type, magical, dice_count, die_size, fixed_value
		from creature_action_roll_parts
		where creature_action_id = $1
		order by sort_order asc
	`, actionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRollParts(rows)
}

func scanActionTemplate(row scanner) (models.ActionTemplate, error) {
	var template models.ActionTemplate
	err := row.Scan(
		&template.ID,
		&template.Name,
		&template.Description,
		&template.Recharge,
		&template.LimitedUses,
		&template.LimitType,
		&template.Reach,
		&template.Range,
		&template.AOEType,
		&template.AOESize,
		&template.ActionType,
		&template.AttackModifier,
		&template.MissEffect,
		&template.HitSpecialEvent,
		&template.CreatedAt,
		&template.UpdatedAt,
	)
	return template, err
}

func scanCreatureAction(row scanner) (models.CreatureAction, error) {
	var action models.CreatureAction
	err := row.Scan(
		&action.ID,
		&action.CreatureID,
		&action.SourceTemplateID,
		&action.SortOrder,
		&action.Name,
		&action.Description,
		&action.Recharge,
		&action.LimitedUses,
		&action.LimitType,
		&action.Reach,
		&action.Range,
		&action.AOEType,
		&action.AOESize,
		&action.ActionType,
		&action.AttackModifier,
		&action.MissEffect,
		&action.HitSpecialEvent,
		&action.CreatedAt,
		&action.UpdatedAt,
	)
	return action, err
}

type rollRows interface {
	Next() bool
	Scan(dest ...any) error
	Err() error
}

func scanRollParts(rows rollRows) ([]models.ActionRollPart, error) {
	rolls := []models.ActionRollPart{}
	for rows.Next() {
		var roll models.ActionRollPart
		if err := rows.Scan(&roll.ID, &roll.SortOrder, &roll.RollKind, &roll.DamageType, &roll.Magical, &roll.DiceCount, &roll.DieSize, &roll.FixedValue); err != nil {
			return nil, err
		}
		rolls = append(rolls, roll)
	}
	return rolls, rows.Err()
}

func insertActionTemplate(ctx context.Context, tx pgx.Tx, req actionRequest) (models.ActionTemplate, error) {
	row := tx.QueryRow(ctx, `
		insert into action_templates (
			name, description, recharge, limited_uses, limit_type, reach, action_range,
			aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		returning id, name, description, recharge, limited_uses, limit_type, reach, action_range,
			aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event,
			created_at, updated_at
	`, req.Name, req.Description, req.Recharge, req.LimitedUses, req.LimitType, req.Reach, req.Range,
		req.AOEType, req.AOESize, req.ActionType, req.AttackModifier, req.MissEffect, req.HitSpecialEvent)
	return scanActionTemplate(row)
}

func insertCreatureAction(ctx context.Context, tx pgx.Tx, creatureID, sourceTemplateID string, req actionRequest) (models.CreatureAction, error) {
	var nextOrder int
	if err := tx.QueryRow(ctx, `select coalesce(max(sort_order) + 1, 0) from creature_actions where creature_id = $1`, creatureID).Scan(&nextOrder); err != nil {
		return models.CreatureAction{}, err
	}
	row := tx.QueryRow(ctx, `
		insert into creature_actions (
			creature_id, source_template_id, sort_order, name, description, recharge, limited_uses,
			limit_type, reach, action_range, aoe_type, aoe_size, action_type, attack_modifier,
			miss_effect, hit_special_event
		)
		values ($1, nullif($2, '')::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		returning id, creature_id, coalesce(source_template_id::text, ''), sort_order, name, description,
			recharge, limited_uses, limit_type, reach, action_range, aoe_type, aoe_size,
			action_type, attack_modifier, miss_effect, hit_special_event, created_at, updated_at
	`, creatureID, sourceTemplateID, nextOrder, req.Name, req.Description, req.Recharge, req.LimitedUses,
		req.LimitType, req.Reach, req.Range, req.AOEType, req.AOESize, req.ActionType,
		req.AttackModifier, req.MissEffect, req.HitSpecialEvent)
	return scanCreatureAction(row)
}

func insertActionTemplateRolls(ctx context.Context, tx pgx.Tx, templateID string, rolls []actionRollPartRequest) error {
	for index, roll := range rolls {
		roll.normalize(index)
		if _, err := tx.Exec(ctx, `
			insert into action_template_roll_parts (
				action_template_id, sort_order, roll_kind, damage_type, magical, dice_count, die_size, fixed_value
			)
			values ($1, $2, $3, $4, $5, $6, $7, $8)
		`, templateID, index, roll.RollKind, roll.DamageType, roll.Magical, roll.DiceCount, roll.DieSize, roll.FixedValue); err != nil {
			return err
		}
	}
	return nil
}

func insertCreatureActionRolls(ctx context.Context, tx pgx.Tx, actionID string, rolls []actionRollPartRequest) error {
	for index, roll := range rolls {
		roll.normalize(index)
		if _, err := tx.Exec(ctx, `
			insert into creature_action_roll_parts (
				creature_action_id, sort_order, roll_kind, damage_type, magical, dice_count, die_size, fixed_value
			)
			values ($1, $2, $3, $4, $5, $6, $7, $8)
		`, actionID, index, roll.RollKind, roll.DamageType, roll.Magical, roll.DiceCount, roll.DieSize, roll.FixedValue); err != nil {
			return err
		}
	}
	return nil
}

func actionRequestFromTemplate(template models.ActionTemplate) actionRequest {
	rolls := make([]actionRollPartRequest, 0, len(template.Rolls))
	for _, roll := range template.Rolls {
		rolls = append(rolls, actionRollPartRequest{
			RollKind:   roll.RollKind,
			DamageType: roll.DamageType,
			Magical:    roll.Magical,
			DiceCount:  roll.DiceCount,
			DieSize:    roll.DieSize,
			FixedValue: roll.FixedValue,
		})
	}
	return actionRequest{
		Name:            template.Name,
		Description:     template.Description,
		Recharge:        template.Recharge,
		LimitedUses:     template.LimitedUses,
		LimitType:       template.LimitType,
		Reach:           template.Reach,
		Range:           template.Range,
		AOEType:         template.AOEType,
		AOESize:         template.AOESize,
		ActionType:      template.ActionType,
		AttackModifier:  template.AttackModifier,
		MissEffect:      template.MissEffect,
		HitSpecialEvent: template.HitSpecialEvent,
		Rolls:           rolls,
	}
}
