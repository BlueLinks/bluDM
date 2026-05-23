package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

func (s *Server) actionTemplateUsage(ctx context.Context, templateID string) ([]map[string]any, error) {
	userID, _ := currentUserID(ctx)
	rows, err := s.db.Query(ctx, `
		select creature_actions.id, creatures.id, creatures.name, creature_actions.name
		from creature_actions
		join creatures on creatures.id = creature_actions.creature_id
		where creature_actions.source_template_id = $1 and creatures.owner_user_id = $2
		order by creatures.name asc, creature_actions.name asc
	`, templateID, userID)
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
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.ActionTemplate{}, errors.New("authentication required")
	}
	row := s.db.QueryRow(ctx, `
		select id, name, description, recharge, limited_uses, limit_type, reach, action_range,
			aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event,
			icon_source, icon_key, coalesce(icon_asset_id::text, ''), icon_url, icon_attribution,
			created_at, updated_at
		from action_templates
		where id = $1 and owner_user_id = $2
	`, templateID, userID)
	template, err := scanActionTemplate(row)
	if err != nil {
		return models.ActionTemplate{}, err
	}
	template.Rolls, err = s.actionTemplateRolls(ctx, template.ID)
	return template, err
}

func (s *Server) creatureActionByID(ctx context.Context, actionID string) (models.CreatureAction, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.CreatureAction{}, errors.New("authentication required")
	}
	row := s.db.QueryRow(ctx, `
		select creature_actions.id, creature_actions.creature_id, coalesce(creature_actions.source_template_id::text, ''),
			creature_actions.sort_order, creature_actions.name, creature_actions.description,
			creature_actions.recharge, creature_actions.limited_uses, creature_actions.limit_type,
			creature_actions.reach, creature_actions.action_range, creature_actions.aoe_type,
			creature_actions.aoe_size, creature_actions.action_type, creature_actions.attack_modifier,
			creature_actions.miss_effect, creature_actions.hit_special_event,
			creature_actions.icon_source, creature_actions.icon_key, coalesce(creature_actions.icon_asset_id::text, ''),
			creature_actions.icon_url, creature_actions.icon_attribution,
			creature_actions.created_at, creature_actions.updated_at
		from creature_actions
		join creatures on creatures.id = creature_actions.creature_id
		where creature_actions.id = $1 and creatures.owner_user_id = $2
	`, actionID, userID)
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
			action_type, attack_modifier, miss_effect, hit_special_event,
			icon_source, icon_key, coalesce(icon_asset_id::text, ''), icon_url, icon_attribution,
			created_at, updated_at
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
		&template.IconSource,
		&template.IconKey,
		&template.IconAssetID,
		&template.IconURL,
		&template.IconAttribution,
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
		&action.IconSource,
		&action.IconKey,
		&action.IconAssetID,
		&action.IconURL,
		&action.IconAttribution,
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

func insertActionTemplate(ctx context.Context, tx pgx.Tx, ownerUserID string, req actionRequest) (models.ActionTemplate, error) {
	row := tx.QueryRow(ctx, `
		insert into action_templates (
			owner_user_id, name, description, recharge, limited_uses, limit_type, reach, action_range,
			aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event,
			icon_source, icon_key, icon_asset_id, icon_url, icon_attribution
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
			$15, $16, nullif($17, '')::uuid, $18, $19)
		returning id, name, description, recharge, limited_uses, limit_type, reach, action_range,
			aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event,
			icon_source, icon_key, coalesce(icon_asset_id::text, ''), icon_url, icon_attribution,
			created_at, updated_at
	`, ownerUserID, req.Name, req.Description, req.Recharge, req.LimitedUses, req.LimitType, req.Reach, req.Range,
		req.AOEType, req.AOESize, req.ActionType, req.AttackModifier, req.MissEffect, req.HitSpecialEvent,
		req.IconSource, req.IconKey, req.IconAssetID, req.IconURL, req.IconAttribution)
	return scanActionTemplate(row)
}

func (s *Server) replaceActionTemplate(ctx context.Context, templateID string, req actionRequest) error {
	req.normalize()
	if err := req.validate(); err != nil {
		return err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `
		update action_templates
		set name = $2, description = $3, recharge = $4, limited_uses = $5,
			limit_type = $6, reach = $7, action_range = $8, aoe_type = $9,
			aoe_size = $10, action_type = $11, attack_modifier = $12,
			miss_effect = $13, hit_special_event = $14, icon_source = $15,
			icon_key = $16, icon_asset_id = nullif($17, '')::uuid, icon_url = $18,
			icon_attribution = $19, updated_at = now()
		where id = $1 and owner_user_id = $20
	`, templateID, req.Name, req.Description, req.Recharge, req.LimitedUses, req.LimitType, req.Reach,
		req.Range, req.AOEType, req.AOESize, req.ActionType, req.AttackModifier, req.MissEffect,
		req.HitSpecialEvent, req.IconSource, req.IconKey, req.IconAssetID, req.IconURL,
		req.IconAttribution, currentUserIDMust(ctx))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	if _, err := tx.Exec(ctx, `delete from action_template_roll_parts where action_template_id = $1`, templateID); err != nil {
		return err
	}
	if err := insertActionTemplateRolls(ctx, tx, templateID, req.Rolls); err != nil {
		return err
	}
	return tx.Commit(ctx)
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
			miss_effect, hit_special_event, icon_source, icon_key, icon_asset_id, icon_url, icon_attribution
		)
		values ($1, nullif($2, '')::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18, nullif($19, '')::uuid, $20, $21)
		returning id, creature_id, coalesce(source_template_id::text, ''), sort_order, name, description,
			recharge, limited_uses, limit_type, reach, action_range, aoe_type, aoe_size,
			action_type, attack_modifier, miss_effect, hit_special_event,
			icon_source, icon_key, coalesce(icon_asset_id::text, ''), icon_url, icon_attribution,
			created_at, updated_at
	`, creatureID, sourceTemplateID, nextOrder, req.Name, req.Description, req.Recharge, req.LimitedUses,
		req.LimitType, req.Reach, req.Range, req.AOEType, req.AOESize, req.ActionType,
		req.AttackModifier, req.MissEffect, req.HitSpecialEvent, req.IconSource, req.IconKey,
		req.IconAssetID, req.IconURL, req.IconAttribution)
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
		IconSource:      template.IconSource,
		IconKey:         template.IconKey,
		IconAssetID:     template.IconAssetID,
		IconURL:         template.IconURL,
		IconAttribution: template.IconAttribution,
		Rolls:           rolls,
	}
}

func actionRequestFromCreatureAction(action models.CreatureAction) actionRequest {
	rolls := make([]actionRollPartRequest, 0, len(action.Rolls))
	for _, roll := range action.Rolls {
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
		Name:             action.Name,
		SourceTemplateID: action.SourceTemplateID,
		Description:      action.Description,
		Recharge:         action.Recharge,
		LimitedUses:      action.LimitedUses,
		LimitType:        action.LimitType,
		Reach:            action.Reach,
		Range:            action.Range,
		AOEType:          action.AOEType,
		AOESize:          action.AOESize,
		ActionType:       action.ActionType,
		AttackModifier:   action.AttackModifier,
		MissEffect:       action.MissEffect,
		HitSpecialEvent:  action.HitSpecialEvent,
		IconSource:       action.IconSource,
		IconKey:          action.IconKey,
		IconAssetID:      action.IconAssetID,
		IconURL:          action.IconURL,
		IconAttribution:  action.IconAttribution,
		Rolls:            rolls,
	}
}
