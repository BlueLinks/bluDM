package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"

	dbmodels "bludm/backend/internal/db"
)

func (s ImportExportStore) existingMergeRecords(ctx context.Context, ownerUserID string, candidates []mergeCandidate) (map[string][]existingMergeRecord, error) {
	result := map[string][]existingMergeRecord{}
	if s.db == nil {
		return result, nil
	}
	seen := map[string]mergeCandidate{}
	for _, candidate := range candidates {
		seen[candidate.Kind] = candidate
	}
	for _, candidate := range seen {
		rows, err := s.loadExistingMergeRecords(ctx, ownerUserID, candidate)
		if err != nil {
			return nil, err
		}
		for _, record := range rows {
			key := mergeExistingRecordKey(candidate, record)
			result[key] = append(result[key], record)
		}
	}
	return result, nil
}

func (s ImportExportStore) loadExistingMergeRecords(ctx context.Context, ownerUserID string, candidate mergeCandidate) ([]existingMergeRecord, error) {
	switch candidate.Kind {
	case "campaign":
		var entities []dbmodels.CampaignEntity
		if err := s.db.WithContext(ctx).Where("owner_user_id = ? and archived_at is null", ownerUserID).Find(&entities).Error; err != nil {
			return nil, err
		}
		return mapMergeRecords(entities, func(entity dbmodels.CampaignEntity) existingMergeRecord {
			return existingMergeRecord{ID: entity.ID, Label: entity.Name, Fingerprint: mergeFingerprint(entity)}
		}), nil
	case "player":
		var entities []dbmodels.PlayerEntity
		if err := s.db.WithContext(ctx).Where("owner_user_id = ?", ownerUserID).Find(&entities).Error; err != nil {
			return nil, err
		}
		return mapMergeRecords(entities, func(entity dbmodels.PlayerEntity) existingMergeRecord {
			return existingMergeRecord{ID: entity.ID, Label: entity.CharacterName, CampaignID: stringFromPointer(entity.CampaignID), Fingerprint: mergeFingerprint(entity)}
		}), nil
	case "npc":
		var entities []dbmodels.CreatureEntity
		if err := s.db.WithContext(ctx).Where("owner_user_id = ?", ownerUserID).Find(&entities).Error; err != nil {
			return nil, err
		}
		return mapMergeRecords(entities, func(entity dbmodels.CreatureEntity) existingMergeRecord {
			return existingMergeRecord{ID: entity.ID, Label: entity.Name, Fingerprint: mergeFingerprint(entity)}
		}), nil
	case "item":
		var entities []dbmodels.ItemEntity
		if err := s.db.WithContext(ctx).Where("owner_user_id = ?", ownerUserID).Find(&entities).Error; err != nil {
			return nil, err
		}
		return mapMergeRecords(entities, func(entity dbmodels.ItemEntity) existingMergeRecord {
			return existingMergeRecord{ID: entity.ID, Label: entity.Name, Fingerprint: mergeFingerprint(entity)}
		}), nil
	case "spell":
		var entities []dbmodels.SpellEntity
		if err := s.db.WithContext(ctx).Where("owner_user_id = ?", ownerUserID).Find(&entities).Error; err != nil {
			return nil, err
		}
		return mapMergeRecords(entities, func(entity dbmodels.SpellEntity) existingMergeRecord {
			return existingMergeRecord{ID: entity.ID, Label: entity.Name, Fingerprint: mergeFingerprint(entity)}
		}), nil
	case "encounter", "map", "shop", "dungeon", "location", "journey", "roll table":
		return s.loadCampaignScopedMergeRecords(ctx, ownerUserID, candidate)
	}
	return nil, nil
}

func (s ImportExportStore) loadCampaignScopedMergeRecords(ctx context.Context, ownerUserID string, candidate mergeCandidate) ([]existingMergeRecord, error) {
	switch candidate.Kind {
	case "encounter":
		var entities []dbmodels.EncounterEntity
		if err := s.db.WithContext(ctx).Where("campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null)", ownerUserID).Find(&entities).Error; err != nil {
			return nil, err
		}
		return mapMergeRecords(entities, func(entity dbmodels.EncounterEntity) existingMergeRecord {
			return existingMergeRecord{ID: entity.ID, Label: entity.Name, CampaignID: entity.CampaignID, Fingerprint: mergeFingerprint(entity)}
		}), nil
	case "map":
		var entities []dbmodels.CampaignMapEntity
		if err := s.db.WithContext(ctx).Where("campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null)", ownerUserID).Find(&entities).Error; err != nil {
			return nil, err
		}
		return mapMergeRecords(entities, func(entity dbmodels.CampaignMapEntity) existingMergeRecord {
			return existingMergeRecord{ID: entity.ID, Label: entity.Name, CampaignID: entity.CampaignID, Fingerprint: mergeFingerprint(entity)}
		}), nil
	case "shop", "dungeon", "location":
		var entities []dbmodels.CampaignLocationEntity
		query := s.db.WithContext(ctx).Where("campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null)", ownerUserID)
		if candidate.Kind == "shop" || candidate.Kind == "dungeon" {
			query = query.Where("location_type in ?", locationTypeAliases(candidate.Kind))
		}
		if err := query.Find(&entities).Error; err != nil {
			return nil, err
		}
		return mapMergeRecords(entities, func(entity dbmodels.CampaignLocationEntity) existingMergeRecord {
			return existingMergeRecord{ID: entity.ID, Label: entity.Name, CampaignID: entity.CampaignID, Fingerprint: mergeFingerprint(entity)}
		}), nil
	case "journey":
		var entities []dbmodels.CampaignJourneyEntity
		if err := s.db.WithContext(ctx).Where("campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null)", ownerUserID).Find(&entities).Error; err != nil {
			return nil, err
		}
		return mapMergeRecords(entities, func(entity dbmodels.CampaignJourneyEntity) existingMergeRecord {
			return existingMergeRecord{ID: entity.ID, Label: entity.Name, CampaignID: entity.CampaignID, Fingerprint: mergeFingerprint(entity)}
		}), nil
	case "roll table":
		var entities []dbmodels.RollTableEntity
		if err := s.db.WithContext(ctx).Where("campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null)", ownerUserID).Find(&entities).Error; err != nil {
			return nil, err
		}
		return mapMergeRecords(entities, func(entity dbmodels.RollTableEntity) existingMergeRecord {
			return existingMergeRecord{ID: entity.ID, Label: entity.Name, CampaignID: stringFromPointer(entity.CampaignID), Fingerprint: mergeFingerprint(entity)}
		}), nil
	}
	return nil, nil
}

func mergeCandidates(manifest PortableManifest, targetCampaignID string) []mergeCandidate {
	candidates := []mergeCandidate{}
	campaignContext := func(importedCampaignID string) string {
		if strings.TrimSpace(targetCampaignID) != "" {
			return strings.TrimSpace(targetCampaignID)
		}
		return importedCampaignID
	}
	for _, entity := range manifest.Campaigns {
		candidate := mergeCandidate{Kind: "campaign", ImportedID: entity.ID, Label: entity.Name, Fingerprint: mergeFingerprint(entity), ProjectedNodeID: nodeID("campaign", entity.ID), AllowNameReuse: true}
		candidate.Payload = entity
		candidates = append(candidates, candidate)
	}
	for _, entity := range manifest.Players {
		candidate := mergeCandidate{Kind: "player", ImportedID: entity.ID, Label: entity.CharacterName, CampaignID: campaignContext(stringFromPointer(entity.CampaignID)), Fingerprint: mergeFingerprint(entity), ProjectedNodeID: nodeID("player", entity.ID)}
		candidate.Payload = entity
		candidates = append(candidates, candidate)
	}
	for _, entity := range manifest.NPCs {
		candidate := mergeCandidate{Kind: "npc", ImportedID: entity.ID, Label: entity.Name, Fingerprint: mergeFingerprint(entity), ProjectedNodeID: nodeID("npc", entity.ID), AllowNameReuse: true}
		candidate.Payload = entity
		candidates = append(candidates, candidate)
	}
	for _, entity := range manifest.Items {
		candidate := mergeCandidate{Kind: "item", ImportedID: entity.ID, Label: entity.Name, Fingerprint: mergeFingerprint(entity), ProjectedNodeID: nodeID("item", entity.ID), AllowNameReuse: true}
		candidate.Payload = entity
		candidates = append(candidates, candidate)
	}
	for _, entity := range manifest.Spells {
		candidate := mergeCandidate{Kind: "spell", ImportedID: entity.ID, Label: entity.Name, Fingerprint: mergeFingerprint(entity), ProjectedNodeID: nodeID("spell", entity.ID), AllowNameReuse: true}
		candidate.Payload = entity
		candidates = append(candidates, candidate)
	}
	for _, entity := range manifest.Encounters {
		candidate := mergeCandidate{Kind: "encounter", ImportedID: entity.ID, Label: entity.Name, CampaignID: campaignContext(entity.CampaignID), Fingerprint: mergeFingerprint(entity), ProjectedNodeID: nodeID("encounter", entity.ID)}
		candidate.Payload = entity
		candidates = append(candidates, candidate)
	}
	for _, entity := range manifest.Locations {
		kind := locationGraphKind(entity.LocationType)
		candidate := mergeCandidate{Kind: kind, ImportedID: entity.ID, Label: entity.Name, CampaignID: campaignContext(entity.CampaignID), Fingerprint: mergeFingerprint(entity), ProjectedNodeID: nodeID("location", entity.ID)}
		candidate.Payload = entity
		candidates = append(candidates, candidate)
	}
	for _, entity := range manifest.Maps {
		candidate := mergeCandidate{Kind: "map", ImportedID: entity.ID, Label: entity.Name, CampaignID: campaignContext(entity.CampaignID), Fingerprint: mergeFingerprint(entity), ProjectedNodeID: nodeID("map", entity.ID)}
		candidate.Payload = entity
		candidates = append(candidates, candidate)
	}
	for _, entity := range manifest.Journeys {
		candidate := mergeCandidate{Kind: "journey", ImportedID: entity.ID, Label: entity.Name, CampaignID: campaignContext(entity.CampaignID), Fingerprint: mergeFingerprint(entity), ProjectedNodeID: nodeID("journey", entity.ID)}
		candidate.Payload = entity
		candidates = append(candidates, candidate)
	}
	for _, entity := range manifest.RollTables {
		candidate := mergeCandidate{Kind: "roll table", ImportedID: entity.ID, Label: entity.Name, CampaignID: campaignContext(stringFromPointer(entity.CampaignID)), Fingerprint: mergeFingerprint(entity), ProjectedNodeID: nodeID("rollTable", entity.ID)}
		candidate.Payload = entity
		candidates = append(candidates, candidate)
	}
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].Kind == candidates[j].Kind {
			return candidates[i].Label < candidates[j].Label
		}
		return candidates[i].Kind < candidates[j].Kind
	})
	return candidates
}

func mergeExistingKey(candidate mergeCandidate) string {
	return strings.ToLower(candidate.Kind + "\x00" + candidate.CampaignID + "\x00" + strings.TrimSpace(candidate.Label))
}

func mergeExistingRecordKey(candidate mergeCandidate, record existingMergeRecord) string {
	return strings.ToLower(candidate.Kind + "\x00" + record.CampaignID + "\x00" + strings.TrimSpace(record.Label))
}

func (s ImportExportStore) loadMergeExistingEntity(ctx context.Context, kind, id string) (any, error) {
	switch kind {
	case "npc":
		var entity dbmodels.CreatureEntity
		if err := s.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
			return nil, err
		}
		return entity, nil
	case "item":
		var entity dbmodels.ItemEntity
		if err := s.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
			return nil, err
		}
		return entity, nil
	case "spell":
		var entity dbmodels.SpellEntity
		if err := s.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
			return nil, err
		}
		return entity, nil
	case "player":
		var entity dbmodels.PlayerEntity
		if err := s.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
			return nil, err
		}
		return entity, nil
	case "roll table":
		var entity dbmodels.RollTableEntity
		if err := s.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
			return nil, err
		}
		return entity, nil
	case "campaign":
		var entity dbmodels.CampaignEntity
		if err := s.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
			return nil, err
		}
		return entity, nil
	case "encounter":
		var entity dbmodels.EncounterEntity
		if err := s.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
			return nil, err
		}
		return entity, nil
	case "location", "shop", "dungeon":
		var entity dbmodels.CampaignLocationEntity
		if err := s.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
			return nil, err
		}
		return entity, nil
	case "map":
		var entity dbmodels.CampaignMapEntity
		if err := s.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
			return nil, err
		}
		return entity, nil
	case "journey":
		var entity dbmodels.CampaignJourneyEntity
		if err := s.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
			return nil, err
		}
		return entity, nil
	}
	return nil, errors.New("field merge entity not supported")
}

func mergeFingerprint(value any) string {
	data, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	var decoded any
	if err := json.Unmarshal(data, &decoded); err != nil {
		return string(data)
	}
	cleanMergeFingerprintValue(decoded)
	cleaned, err := json.Marshal(decoded)
	if err != nil {
		return string(data)
	}
	sum := sha256.Sum256(cleaned)
	return hex.EncodeToString(sum[:])
}

func cleanMergeFingerprintValue(value any) {
	switch typed := value.(type) {
	case map[string]any:
		for _, key := range []string{"ID", "OwnerUserID", "CreatedAt", "UpdatedAt", "ArchivedAt"} {
			delete(typed, key)
		}
		delete(typed, "mergeProvenance")
		for _, child := range typed {
			cleanMergeFingerprintValue(child)
		}
	case []any:
		for _, child := range typed {
			cleanMergeFingerprintValue(child)
		}
	}
}

func mapMergeRecords[T any](entities []T, mapper func(T) existingMergeRecord) []existingMergeRecord {
	records := make([]existingMergeRecord, 0, len(entities))
	for _, entity := range entities {
		records = append(records, mapper(entity))
	}
	return records
}
