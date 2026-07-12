package store

import (
	"context"
	"reflect"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

func mergeApplyMissingFields(kind string, existing any, imported any, provenance *MergeProvenance) []MergeFieldDiff {
	existingValue := reflect.ValueOf(existing)
	if existingValue.Kind() != reflect.Pointer || existingValue.IsNil() {
		return nil
	}
	existingStruct := existingValue.Elem()
	importedStruct := reflect.Indirect(reflect.ValueOf(imported))
	if !existingStruct.IsValid() || !importedStruct.IsValid() || existingStruct.Type() != importedStruct.Type() {
		return nil
	}
	spec := newMergeEntityFramework().mergeFieldMergeKinds[kind]
	diffs := []MergeFieldDiff{}
	for index := 0; index < existingStruct.NumField(); index++ {
		fieldType := existingStruct.Type().Field(index)
		if !fieldType.IsExported() || spec.ignoredFields[fieldType.Name] {
			continue
		}
		existingField := existingStruct.Field(index)
		importedField := importedStruct.Field(index)
		if !existingField.CanSet() {
			continue
		}
		switch existingField.Kind() {
		case reflect.Map:
			if mapDiff := mergeMissingMapField(existingField, importedField); mapDiff != nil {
				diffs = append(diffs, MergeFieldDiff{
					Field:          fieldType.Name,
					Existing:       mapDiff.Existing,
					Imported:       mapDiff.Imported,
					Status:         mapDiff.Status,
					Recommendation: mergeFieldRecommendation(mapDiff.Status),
				})
			}
		default:
			if diff := mergeMissingScalarField(existingField, importedField, fieldType.Name); diff != nil {
				diffs = append(diffs, *diff)
			}
		}
	}
	if provenance != nil {
		mergeAttachProvenance(existing, provenance)
	}
	return diffs
}

func mergeMissingFieldsIntoExisting(ctx context.Context, tx *gorm.DB, kind string, existingID string, existing any, imported any, provenance *MergeProvenance) error {
	if err := tx.WithContext(ctx).Where("id = ?", existingID).First(existing).Error; err != nil {
		return err
	}
	_ = mergeApplyMissingFields(kind, existing, imported, provenance)
	return tx.WithContext(ctx).Save(existing).Error
}

type mergeMapDiff struct {
	Existing any
	Imported any
	Status   string
}

func mergeMissingScalarField(existingField, importedField reflect.Value, fieldName string) *MergeFieldDiff {
	existingValue := existingField.Interface()
	importedValue := importedField.Interface()
	if reflect.DeepEqual(existingValue, importedValue) {
		return nil
	}
	if mergeIsZero(existingValue) && mergeIsZero(importedValue) {
		return nil
	}
	if mergeIsZero(existingValue) && !mergeIsZero(importedValue) {
		existingField.Set(importedField)
		return &MergeFieldDiff{
			Field:          fieldName,
			Existing:       mergeFieldDisplayValue(existingValue),
			Imported:       mergeFieldDisplayValue(importedValue),
			Status:         "added",
			Recommendation: "merge_missing_fields",
		}
	}
	return &MergeFieldDiff{
		Field:          fieldName,
		Existing:       mergeFieldDisplayValue(existingValue),
		Imported:       mergeFieldDisplayValue(importedValue),
		Status:         mergeFieldStatus(existingValue, importedValue),
		Recommendation: "keep_existing",
	}
}

func mergeMissingMapField(existingField, importedField reflect.Value) *mergeMapDiff {
	if importedField.IsNil() || importedField.Len() == 0 {
		return nil
	}
	if existingField.IsNil() || existingField.Len() == 0 {
		existingField.Set(importedField)
		return &mergeMapDiff{Existing: nil, Imported: importedField.Interface(), Status: "added"}
	}
	existingMap, ok := existingField.Interface().(dbmodels.JSONMap)
	if !ok {
		return nil
	}
	importedMap, ok := importedField.Interface().(dbmodels.JSONMap)
	if !ok {
		return nil
	}
	if existingSubsetOf(existingMap, importedMap) && len(importedMap) > len(existingMap) {
		merged := cloneJSONMap(existingMap)
		mergeJSONMapMissing(merged, importedMap)
		existingField.Set(reflect.ValueOf(merged))
		return &mergeMapDiff{Existing: existingMap, Imported: importedMap, Status: "added"}
	}
	if reflect.DeepEqual(existingMap, importedMap) {
		return nil
	}
	return &mergeMapDiff{Existing: existingMap, Imported: importedMap, Status: "changed"}
}

func mergeAttachProvenance(existing any, provenance *MergeProvenance) {
	if provenance == nil {
		return
	}
	switch typed := existing.(type) {
	case *dbmodels.CampaignEntity:
		typed.Metadata = mergeProvenanceMap(typed.Metadata, provenance)
	case *dbmodels.UploadedAssetEntity:
		typed.Metadata = mergeProvenanceMap(typed.Metadata, provenance)
	case *dbmodels.CreatureEntity:
		typed.StatBlock = mergeProvenanceMap(typed.StatBlock, provenance)
	case *dbmodels.SpellEntity:
		typed.Mechanics = mergeProvenanceMap(typed.Mechanics, provenance)
	case *dbmodels.PlayerEntity:
		typed.CharacterSheet = mergeProvenanceMap(typed.CharacterSheet, provenance)
	case *dbmodels.ItemEntity:
		typed.Data = mergeProvenanceMap(typed.Data, provenance)
	case *dbmodels.EncounterEntity:
		typed.Metadata = mergeProvenanceMap(typed.Metadata, provenance)
	case *dbmodels.CampaignLocationEntity:
		typed.MapAnchor = mergeProvenanceMap(typed.MapAnchor, provenance)
	case *dbmodels.CampaignMapEntity:
		typed.Metadata = mergeProvenanceMap(typed.Metadata, provenance)
	case *dbmodels.CampaignMapPinEntity:
		typed.Metadata = mergeProvenanceMap(typed.Metadata, provenance)
	case *dbmodels.CampaignJourneyEntity:
		typed.Weather = mergeProvenanceMap(typed.Weather, provenance)
	case *dbmodels.RollTableEntity:
		typed.Metadata = mergeProvenanceMap(typed.Metadata, provenance)
	case *dbmodels.SpellProjectileScalingEntity:
		typed.CantripScaling = mergeProvenanceMap(typed.CantripScaling, provenance)
	}
}

func mergeProvenanceMap(existing dbmodels.JSONMap, provenance *MergeProvenance) dbmodels.JSONMap {
	result := cloneJSONMap(existing)
	result["mergeProvenance"] = provenance
	return result
}

func cloneJSONMap(value dbmodels.JSONMap) dbmodels.JSONMap {
	if value == nil {
		return dbmodels.JSONMap{}
	}
	result := dbmodels.JSONMap{}
	for key, raw := range value {
		result[key] = raw
	}
	return result
}

func mergeJSONMapMissing(existing dbmodels.JSONMap, imported dbmodels.JSONMap) {
	if existing == nil {
		return
	}
	for key, value := range imported {
		if key == "mergeProvenance" {
			continue
		}
		current, ok := existing[key]
		if !ok || mergeIsZero(current) {
			existing[key] = value
			continue
		}
		if childExisting, ok := current.(map[string]any); ok {
			if childImported, ok := value.(map[string]any); ok {
				for childKey, childValue := range childImported {
					if _, childExists := childExisting[childKey]; !childExists {
						childExisting[childKey] = childValue
					}
				}
				existing[key] = childExisting
			}
		}
	}
}

func existingSubsetOf(existing dbmodels.JSONMap, imported dbmodels.JSONMap) bool {
	for key, existingValue := range existing {
		importedValue, ok := imported[key]
		if !ok || !reflect.DeepEqual(existingValue, importedValue) {
			return false
		}
	}
	return true
}
