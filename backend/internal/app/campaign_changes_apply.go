package app

import (
	"context"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

func (s *Service) applyCampaignChangeTx(
	ctx context.Context,
	tx *gorm.DB,
	principal Principal,
	campaignID string,
	change CampaignChange,
	refs map[string]resolvedChangeReference,
) (any, error) {
	if err := validateCampaignChange(principal, change); err != nil {
		return nil, err
	}
	switch change.Operation {
	case "create_location":
		var command LocationCommand
		if err := decodeChange(change, &command); err != nil {
			return nil, err
		}
		normalizeLocationCommand(&command)
		resolved, err := resolveAppliedReference(command.ParentLocationID, "location", refs)
		if err != nil {
			return nil, err
		}
		command.ParentLocationID = resolved
		if command.Name == "" {
			return nil, ValidationError("missing_name", "location name is required", nil)
		}
		if err := locationBelongsToCampaign(ctx, tx, campaignID, command.ParentLocationID); err != nil {
			return nil, err
		}
		entity := locationEntity(campaignID, command)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return nil, err
		}
		registerAppliedReference(refs, change.ClientRef, "location", entity.ID)
		return map[string]any{
			"operation": "created", "operationType": change.Operation,
			"clientRef": change.ClientRef, "location": locationModel(entity),
			"appUrl":   s.AppURL("/campaigns/" + campaignID + "/world/location/" + entity.ID),
			"warnings": []string{},
		}, nil
	case "create_npc":
		var command NPCCommand
		if err := decodeChange(change, &command); err != nil {
			return nil, err
		}
		if err := validateNPC(command); err != nil {
			return nil, err
		}
		entity := creatureEntity(principal.UserID, command)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return nil, err
		}
		if err := tx.WithContext(ctx).Create(&dbmodels.CampaignCreatureEntity{
			CampaignID: campaignID, CreatureID: entity.ID,
			Disposition: normalizedToken(command.Disposition, "neutral"),
		}).Error; err != nil {
			return nil, err
		}
		registerAppliedReference(refs, change.ClientRef, "npc", entity.ID)
		return map[string]any{
			"operation": "created", "operationType": change.Operation,
			"clientRef": change.ClientRef, "npc": creatureModel(entity),
			"appUrl": s.AppURL("/creatures/" + entity.ID), "warnings": []string{},
		}, nil
	case "link_npc_to_location":
		var command NPCLinkCommand
		if err := decodeChange(change, &command); err != nil {
			return nil, err
		}
		var err error
		command.CreatureID, err = resolveAppliedReference(command.CreatureID, "npc", refs)
		if err != nil {
			return nil, err
		}
		command.LocationID, err = resolveAppliedReference(command.LocationID, "location", refs)
		if err != nil {
			return nil, err
		}
		if err := locationBelongsToCampaign(ctx, tx, campaignID, command.LocationID); err != nil {
			return nil, err
		}
		var creatureCount int64
		if err := tx.WithContext(ctx).Model(&dbmodels.CampaignCreatureEntity{}).
			Where("campaign_id = ? and creature_id = ?", campaignID, command.CreatureID).
			Count(&creatureCount).Error; err != nil {
			return nil, err
		}
		if creatureCount == 0 {
			return nil, NewError(CodeNotFound, "campaign NPC not found", nil)
		}
		entity := dbmodels.CampaignNpcLocationLinkEntity{
			CampaignID: campaignID, CreatureID: command.CreatureID,
			LocationID: command.LocationID, LinkType: normalizedToken(command.LinkType, "frequents"),
			Visibility: normalizedToken(command.Visibility, "dm"), Notes: command.Notes,
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return nil, err
		}
		return map[string]any{
			"operation": "created", "operationType": change.Operation,
			"clientRef": change.ClientRef, "link": npcLinkModel(entity),
			"appUrl":   s.AppURL("/campaigns/" + campaignID + "/world/location/" + command.LocationID),
			"warnings": []string{},
		}, nil
	case "create_location_link":
		var command LocationLinkCommand
		if err := decodeChange(change, &command); err != nil {
			return nil, err
		}
		var err error
		command.SourceLocationID, err = resolveAppliedReference(command.SourceLocationID, "location", refs)
		if err != nil {
			return nil, err
		}
		command.TargetLocationID, err = resolveAppliedReference(command.TargetLocationID, "location", refs)
		if err != nil {
			return nil, err
		}
		for _, id := range []string{command.SourceLocationID, command.TargetLocationID} {
			if err := locationBelongsToCampaign(ctx, tx, campaignID, id); err != nil {
				return nil, err
			}
		}
		entity := dbmodels.CampaignLocationLinkEntity{
			CampaignID: campaignID, SourceLocationID: command.SourceLocationID,
			TargetLocationID: command.TargetLocationID,
			LinkType:         normalizedToken(command.LinkType, "link"), Label: command.Label,
			Direction:  normalizedToken(command.Direction, "two-way"),
			Visibility: normalizedToken(command.Visibility, "public"), Notes: command.Notes,
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return nil, err
		}
		return map[string]any{
			"operation": "created", "operationType": change.Operation,
			"clientRef": change.ClientRef, "link": locationLinkModel(entity),
			"appUrl":   s.AppURL("/campaigns/" + campaignID + "/world/location/" + command.SourceLocationID),
			"warnings": []string{},
		}, nil
	default:
		return nil, ValidationError("unsupported_bulk_operation",
			"use the dedicated tool for this operation in the current profile",
			map[string]any{"operation": change.Operation},
		)
	}
}
