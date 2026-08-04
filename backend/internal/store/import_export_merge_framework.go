package store

import (
	"reflect"
	"strings"
	"time"
)

type mergeEntityFramework struct {
	mergeFieldMergeKinds map[string]mergeFieldMergeSpec
}

type mergeFieldMergeSpec struct {
	ignoredFields map[string]bool
}

func newMergeEntityFramework() mergeEntityFramework {
	return mergeEntityFramework{
		mergeFieldMergeKinds: map[string]mergeFieldMergeSpec{
			"campaign":   {ignoredFields: mergeIgnoreFields("ID", "OwnerUserID", "ArchivedAt", "CreatedAt", "UpdatedAt")},
			"encounter":  {ignoredFields: mergeIgnoreFields("ID", "CampaignID", "LocationID", "BackgroundAssetID", "Revision", "CreatedAt", "UpdatedAt")},
			"npc":        {ignoredFields: mergeIgnoreFields("ID", "OwnerUserID", "ImageAssetID", "CreatedAt", "UpdatedAt")},
			"item":       {ignoredFields: mergeIgnoreFields("ID", "OwnerUserID", "CreatedAt", "UpdatedAt")},
			"spell":      {ignoredFields: mergeIgnoreFields("ID", "OwnerUserID", "CreatedAt", "UpdatedAt")},
			"player":     {ignoredFields: mergeIgnoreFields("ID", "OwnerUserID", "CampaignID", "ImageAssetID", "CreatedAt", "UpdatedAt")},
			"location":   {ignoredFields: mergeIgnoreFields("ID", "CampaignID", "ParentLocationID", "CreatedAt", "UpdatedAt")},
			"shop":       {ignoredFields: mergeIgnoreFields("ID", "CampaignID", "ParentLocationID", "CreatedAt", "UpdatedAt")},
			"dungeon":    {ignoredFields: mergeIgnoreFields("ID", "CampaignID", "ParentLocationID", "CreatedAt", "UpdatedAt")},
			"map":        {ignoredFields: mergeIgnoreFields("ID", "CampaignID", "ParentLocationID", "ImageAssetID", "CreatedAt", "UpdatedAt")},
			"journey":    {ignoredFields: mergeIgnoreFields("ID", "CampaignID", "CreatedAt", "UpdatedAt")},
			"roll table": {ignoredFields: mergeIgnoreFields("ID", "CampaignID", "CreatedAt", "UpdatedAt")},
		},
	}
}

func mergeIgnoreFields(names ...string) map[string]bool {
	result := map[string]bool{}
	for _, name := range names {
		result[name] = true
	}
	return result
}

func (f mergeEntityFramework) supportsFieldMerge(kind string) bool {
	_, ok := f.mergeFieldMergeKinds[kind]
	return ok
}

func (f mergeEntityFramework) fieldDiffs(kind string, existing, imported any) []MergeFieldDiff {
	spec, ok := f.mergeFieldMergeKinds[kind]
	if !ok {
		return nil
	}
	existingValue := reflect.Indirect(reflect.ValueOf(existing))
	importedValue := reflect.Indirect(reflect.ValueOf(imported))
	if !existingValue.IsValid() || !importedValue.IsValid() || existingValue.Type() != importedValue.Type() {
		return nil
	}
	diffs := make([]MergeFieldDiff, 0, existingValue.NumField())
	for index := 0; index < existingValue.NumField(); index++ {
		fieldType := existingValue.Type().Field(index)
		if !fieldType.IsExported() || spec.ignoredFields[fieldType.Name] {
			continue
		}
		existingField := existingValue.Field(index).Interface()
		importedField := importedValue.Field(index).Interface()
		status := mergeFieldStatus(existingField, importedField)
		diffs = append(diffs, MergeFieldDiff{
			Field:          fieldType.Name,
			Existing:       mergeFieldDisplayValue(existingField),
			Imported:       mergeFieldDisplayValue(importedField),
			Status:         status,
			Recommendation: mergeFieldRecommendation(status),
		})
	}
	return diffs
}

func mergeFieldStatus(existing, imported any) string {
	if reflect.DeepEqual(existing, imported) {
		return "same"
	}
	if mergeIsZero(existing) && mergeIsZero(imported) {
		return "same"
	}
	if mergeIsZero(existing) && !mergeIsZero(imported) {
		return "added"
	}
	if !mergeIsZero(existing) && mergeIsZero(imported) {
		return "removed"
	}
	return "changed"
}

func mergeFieldRecommendation(status string) string {
	switch status {
	case "added":
		return "merge_missing_fields"
	case "removed", "changed":
		return "keep_existing"
	default:
		return "keep_existing"
	}
}

func mergeIsZero(value any) bool {
	if value == nil {
		return true
	}
	typed := reflect.ValueOf(value)
	switch typed.Kind() {
	case reflect.String:
		return strings.TrimSpace(typed.String()) == ""
	case reflect.Bool:
		return !typed.Bool()
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return typed.Int() == 0
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return typed.Uint() == 0
	case reflect.Float32, reflect.Float64:
		return typed.Float() == 0
	case reflect.Pointer, reflect.Interface:
		return typed.IsNil()
	case reflect.Slice, reflect.Map:
		return typed.Len() == 0
	case reflect.Struct:
		if t, ok := value.(time.Time); ok {
			return t.IsZero()
		}
	}
	return reflect.DeepEqual(value, reflect.Zero(typed.Type()).Interface())
}

func mergeFieldDisplayValue(value any) any {
	if value == nil {
		return nil
	}
	if t, ok := value.(time.Time); ok {
		if t.IsZero() {
			return nil
		}
		return t.UTC().Format(time.RFC3339)
	}
	return value
}

func mergeProvenanceFromManifest(manifest PortableManifest, mode, importedID string) MergeProvenance {
	return MergeProvenance{
		ArchiveFingerprint: mergeFingerprint(manifest),
		ArchiveVersion:     manifest.Version,
		ImportedAt:         time.Now().UTC(),
		ImportMode:         mode,
		OriginalExportedID: importedID,
		ImportBatchID:      mergeFingerprint(map[string]any{"manifest": manifest, "importedId": importedID, "mode": mode}),
	}
}

func MergeProvenanceForManifest(manifest PortableManifest, mode, importedID string) MergeProvenance {
	return mergeProvenanceFromManifest(manifest, mode, importedID)
}

func mergeDecisionProvenance(manifest PortableManifest, importedID string) *MergeProvenance {
	provenance := mergeProvenanceFromManifest(manifest, "merge", importedID)
	return &provenance
}

func mergeDecisionProvenanceForReference(importedID string) *MergeProvenance {
	provenance := MergeProvenance{
		OriginalExportedID: importedID,
		ImportMode:         "merge",
		ImportedAt:         time.Now().UTC(),
		ImportBatchID:      mergeFingerprint(map[string]any{"importedId": importedID, "mode": "merge"}),
	}
	return &provenance
}
