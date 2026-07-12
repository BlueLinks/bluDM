package store

import (
	"context"
	"encoding/json"
	"time"

	dbmodels "bludm/backend/internal/db"
)

type ImportExportHistoryInput struct {
	Action           string
	BundleType       string
	Name             string
	ExportID         *string
	ImportMode       string
	BundleVersion    int
	SourceAppVersion string
	SizeBytes        int64
	DurationMillis   int64
	Status           string
	Warnings         []string
	Counts           map[string]int
	ManifestSummary  map[string]any
	DependencyGraph  DependencyGraph
}

type ImportExportHistoryRecord struct {
	ID                string          `json:"id"`
	Action            string          `json:"action"`
	BundleType        string          `json:"bundleType"`
	Name              string          `json:"name"`
	ExportID          *string         `json:"exportId,omitempty"`
	DownloadURL       string          `json:"downloadUrl,omitempty"`
	DownloadAvailable bool            `json:"downloadAvailable"`
	DownloadExpiresAt *time.Time      `json:"downloadExpiresAt,omitempty"`
	DownloadStatus    string          `json:"downloadStatus,omitempty"`
	ImportMode        string          `json:"importMode"`
	BundleVersion     int             `json:"bundleVersion"`
	SourceAppVersion  string          `json:"sourceAppVersion"`
	SizeBytes         int64           `json:"sizeBytes"`
	DurationMillis    int64           `json:"durationMillis"`
	Status            string          `json:"status"`
	Warnings          []string        `json:"warnings"`
	Counts            map[string]int  `json:"counts"`
	ManifestSummary   map[string]any  `json:"manifestSummary"`
	DependencyGraph   DependencyGraph `json:"dependencyGraph"`
	CreatedAt         time.Time       `json:"createdAt"`
}

func (s ImportExportStore) RecordHistory(ctx context.Context, ownerUserID string, input ImportExportHistoryInput) (ImportExportHistoryRecord, error) {
	if input.Status == "" {
		input.Status = "success"
	}
	entity := dbmodels.ImportExportHistoryEntity{
		OwnerUserID:      ownerUserID,
		Action:           input.Action,
		BundleType:       input.BundleType,
		Name:             input.Name,
		ExportID:         input.ExportID,
		ImportMode:       input.ImportMode,
		BundleVersion:    input.BundleVersion,
		SourceAppVersion: input.SourceAppVersion,
		SizeBytes:        input.SizeBytes,
		DurationMillis:   input.DurationMillis,
		Status:           input.Status,
		Warnings:         stringsJSONMap(input.Warnings),
		Counts:           intMapJSONMap(input.Counts),
		ManifestSummary:  dbmodels.JSONMap(input.ManifestSummary),
		DependencyGraph:  structJSONMap(input.DependencyGraph),
	}
	if err := s.db.WithContext(ctx).Create(&entity).Error; err != nil {
		return ImportExportHistoryRecord{}, err
	}
	return historyRecordFromEntity(entity), nil
}

func (s ImportExportStore) History(ctx context.Context, ownerUserID string) ([]ImportExportHistoryRecord, error) {
	var rows []dbmodels.ImportExportHistoryEntity
	if err := s.db.WithContext(ctx).
		Where("owner_user_id = ?", ownerUserID).
		Order("created_at desc").
		Limit(50).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	records := make([]ImportExportHistoryRecord, 0, len(rows))
	for _, row := range rows {
		records = append(records, historyRecordFromEntity(row))
	}
	return records, nil
}

func (s ImportExportStore) HistoryEntry(ctx context.Context, ownerUserID, historyID string) (ImportExportHistoryRecord, error) {
	var row dbmodels.ImportExportHistoryEntity
	if err := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", historyID, ownerUserID).
		First(&row).Error; err != nil {
		return ImportExportHistoryRecord{}, err
	}
	return historyRecordFromEntity(row), nil
}

func (s ImportExportStore) DeleteHistory(ctx context.Context, ownerUserID, historyID string) error {
	return s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", historyID, ownerUserID).
		Delete(&dbmodels.ImportExportHistoryEntity{}).Error
}

func (s ImportExportStore) ClearHistory(ctx context.Context, ownerUserID string) error {
	return s.db.WithContext(ctx).
		Where("owner_user_id = ?", ownerUserID).
		Delete(&dbmodels.ImportExportHistoryEntity{}).Error
}

func historyRecordFromEntity(entity dbmodels.ImportExportHistoryEntity) ImportExportHistoryRecord {
	record := ImportExportHistoryRecord{
		ID:               entity.ID,
		Action:           entity.Action,
		BundleType:       entity.BundleType,
		Name:             entity.Name,
		ExportID:         entity.ExportID,
		ImportMode:       entity.ImportMode,
		BundleVersion:    entity.BundleVersion,
		SourceAppVersion: entity.SourceAppVersion,
		SizeBytes:        entity.SizeBytes,
		DurationMillis:   entity.DurationMillis,
		Status:           entity.Status,
		Warnings:         stringsFromJSONMap(entity.Warnings),
		Counts:           intsFromJSONMap(entity.Counts),
		ManifestSummary:  map[string]any(entity.ManifestSummary),
		CreatedAt:        entity.CreatedAt,
	}
	if record.ExportID != nil {
		expiresAt := entity.CreatedAt.Add(time.Hour)
		record.DownloadURL = "/api/import-export/exports/" + *record.ExportID + "/download"
		record.DownloadExpiresAt = &expiresAt
		record.DownloadStatus = "Cached download expires one hour after export."
	}
	_ = mapToStruct(entity.DependencyGraph, &record.DependencyGraph)
	return record
}

func stringsJSONMap(values []string) dbmodels.JSONMap {
	mapped := dbmodels.JSONMap{"items": []string{}}
	if len(values) > 0 {
		mapped["items"] = values
	}
	return mapped
}

func stringsFromJSONMap(value dbmodels.JSONMap) []string {
	raw, _ := value["items"].([]any)
	values := make([]string, 0, len(raw))
	for _, item := range raw {
		if text, ok := item.(string); ok {
			values = append(values, text)
		}
	}
	return values
}

func intMapJSONMap(values map[string]int) dbmodels.JSONMap {
	mapped := dbmodels.JSONMap{}
	for key, value := range values {
		mapped[key] = value
	}
	return mapped
}

func intsFromJSONMap(value dbmodels.JSONMap) map[string]int {
	mapped := map[string]int{}
	for key, raw := range value {
		switch typed := raw.(type) {
		case int:
			mapped[key] = typed
		case int64:
			mapped[key] = int(typed)
		case float64:
			mapped[key] = int(typed)
		}
	}
	return mapped
}

func structJSONMap(value any) dbmodels.JSONMap {
	var mapped map[string]any
	bytes, err := json.Marshal(value)
	if err == nil {
		_ = json.Unmarshal(bytes, &mapped)
	}
	return dbmodels.JSONMap(mapped)
}

func mapToStruct(value dbmodels.JSONMap, target any) error {
	bytes, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return json.Unmarshal(bytes, target)
}

func ImportExportManifestSummary(manifest PortableManifest) map[string]any {
	return map[string]any{
		"format":           manifest.Format,
		"version":          manifest.Version,
		"bundleType":       manifest.BundleType,
		"exportedAt":       manifest.ExportedAt,
		"sourceAppVersion": manifest.SourceAppVersion,
		"counts":           manifestCounts(manifest),
		"exportStats":      manifest.ExportStats,
	}
}
