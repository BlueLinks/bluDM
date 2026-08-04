package app

import (
	"context"
	"strings"

	dbmodels "bludm/backend/internal/db"
)

type resolvedChangeReference struct {
	Kind string
	ID   string
}

func (s *Service) validateCampaignChanges(
	ctx context.Context,
	principal Principal,
	campaignID string,
	changes []CampaignChange,
) ([]CampaignChange, error) {
	refs := map[string]resolvedChangeReference{}
	normalized := make([]CampaignChange, 0, len(changes))
	for index, change := range changes {
		change.Operation = normalizedToken(change.Operation, "")
		change.Operation = strings.ReplaceAll(change.Operation, "-", "_")
		change.ClientRef = strings.TrimSpace(change.ClientRef)
		if err := validateCampaignChange(principal, change); err != nil {
			return nil, ValidationError(
				"invalid_change", err.Error(), map[string]any{"index": index},
			)
		}
		if change.ClientRef != "" {
			if strings.HasPrefix(change.ClientRef, "ref:") || refs[change.ClientRef].Kind != "" {
				return nil, ValidationError(
					"invalid_client_ref", "clientRef must be unique and must not start with ref:",
					map[string]any{"index": index, "clientRef": change.ClientRef},
				)
			}
		}
		var err error
		switch change.Operation {
		case "create_location":
			var command LocationCommand
			if err = decodeChange(change, &command); err == nil {
				normalizeLocationCommand(&command)
				if command.Name == "" {
					err = ValidationError("missing_name", "location name is required", nil)
				} else {
					err = s.validatePreviewReference(
						ctx, campaignID, command.ParentLocationID, "location", refs,
					)
				}
				change.Data, _ = commandMap(command)
			}
			registerPreviewReference(refs, change.ClientRef, "location")
		case "create_npc":
			var command NPCCommand
			if err = decodeChange(change, &command); err == nil {
				err = validateNPC(command)
				change.Data, _ = commandMap(command)
			}
			registerPreviewReference(refs, change.ClientRef, "npc")
		case "link_npc_to_location":
			var command NPCLinkCommand
			if err = decodeChange(change, &command); err == nil {
				if strings.TrimSpace(command.CreatureID) == "" || strings.TrimSpace(command.LocationID) == "" {
					err = ValidationError("missing_reference", "creatureId and locationId are required", nil)
				}
			}
			if err == nil {
				err = s.validatePreviewReference(ctx, campaignID, command.CreatureID, "npc", refs)
			}
			if err == nil {
				err = s.validatePreviewReference(ctx, campaignID, command.LocationID, "location", refs)
			}
			if err == nil {
				command.LinkType = normalizedToken(command.LinkType, "frequents")
				command.Visibility = normalizedToken(command.Visibility, "dm")
				command.Notes = strings.TrimSpace(command.Notes)
				change.Data, _ = commandMap(command)
			}
		case "create_location_link":
			var command LocationLinkCommand
			if err = decodeChange(change, &command); err == nil {
				if strings.TrimSpace(command.SourceLocationID) == "" || strings.TrimSpace(command.TargetLocationID) == "" {
					err = ValidationError("missing_reference", "sourceLocationId and targetLocationId are required", nil)
				}
			}
			if err == nil {
				err = s.validatePreviewReference(ctx, campaignID, command.SourceLocationID, "location", refs)
			}
			if err == nil {
				err = s.validatePreviewReference(ctx, campaignID, command.TargetLocationID, "location", refs)
			}
			if err == nil && command.SourceLocationID == command.TargetLocationID {
				err = ValidationError("invalid_location_link", "source and target locations must differ", nil)
			}
			if err == nil {
				command.LinkType = normalizedToken(command.LinkType, "link")
				command.Direction = normalizedToken(command.Direction, "two-way")
				command.Visibility = normalizedToken(command.Visibility, "public")
				command.Label = strings.TrimSpace(command.Label)
				command.Notes = strings.TrimSpace(command.Notes)
				change.Data, _ = commandMap(command)
			}
		}
		if err != nil {
			return nil, ValidationError(
				"invalid_change", err.Error(), map[string]any{"index": index},
			)
		}
		normalized = append(normalized, change)
	}
	return normalized, nil
}

func commandMap(value any) (map[string]any, error) {
	result, err := jsonMap(value)
	return map[string]any(result), err
}

func registerPreviewReference(
	refs map[string]resolvedChangeReference,
	clientRef string,
	kind string,
) {
	if clientRef != "" {
		refs[clientRef] = resolvedChangeReference{Kind: kind}
	}
}

func registerAppliedReference(
	refs map[string]resolvedChangeReference,
	clientRef string,
	kind string,
	id string,
) {
	if clientRef != "" {
		refs[clientRef] = resolvedChangeReference{Kind: kind, ID: id}
	}
}

func (s *Service) validatePreviewReference(
	ctx context.Context,
	campaignID string,
	value string,
	expectedKind string,
	refs map[string]resolvedChangeReference,
) error {
	value = strings.TrimSpace(value)
	if value == "" {
		if expectedKind == "location" {
			return nil
		}
		return ValidationError("missing_reference", expectedKind+" reference is required", nil)
	}
	if strings.HasPrefix(value, "ref:") {
		ref, found := refs[strings.TrimPrefix(value, "ref:")]
		if !found || ref.Kind != expectedKind {
			return ValidationError(
				"unknown_client_ref", "reference must name an earlier compatible clientRef",
				map[string]any{"reference": value, "expectedKind": expectedKind},
			)
		}
		return nil
	}
	switch expectedKind {
	case "location":
		return locationBelongsToCampaign(ctx, s.db, campaignID, value)
	case "npc":
		var count int64
		if err := s.db.WithContext(ctx).Model(&dbmodels.CampaignCreatureEntity{}).
			Where("campaign_id = ? and creature_id = ?", campaignID, value).
			Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return ValidationError("unknown_npc", "unknown or cross-campaign NPC ID", nil)
		}
	}
	return nil
}

func resolveAppliedReference(
	value string,
	expectedKind string,
	refs map[string]resolvedChangeReference,
) (string, error) {
	value = strings.TrimSpace(value)
	if !strings.HasPrefix(value, "ref:") {
		return value, nil
	}
	ref, found := refs[strings.TrimPrefix(value, "ref:")]
	if !found || ref.Kind != expectedKind || ref.ID == "" {
		return "", ValidationError(
			"unknown_client_ref", "reference was not resolved by an earlier operation",
			map[string]any{"reference": value, "expectedKind": expectedKind},
		)
	}
	return ref.ID, nil
}
