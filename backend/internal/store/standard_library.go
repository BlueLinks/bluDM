package store

import (
	"context"
	"errors"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

type LibraryStore struct {
	db *gorm.DB
}

type StandardLibraryFilters struct {
	Category string
	Query    string
	Sources  []string
	Compact  bool
}

func (s LibraryStore) ListSources(ctx context.Context) ([]models.StandardSource, error) {
	var entities []standardSourceEntity
	if err := s.db.WithContext(ctx).Table("standard_sources").Order("source_key").Find(&entities).Error; err != nil {
		return nil, err
	}
	sources := make([]models.StandardSource, 0, len(entities))
	for _, entity := range entities {
		sources = append(sources, standardSourceFromEntity(entity))
	}
	return sources, nil
}

func (s LibraryStore) ListEntries(ctx context.Context, filters StandardLibraryFilters) ([]models.StandardLibraryEntry, error) {
	var entities []standardLibraryEntryEntity
	query := s.db.WithContext(ctx).
		Table("standard_library_entries").
		Select(standardLibraryEntrySelect(filters.Compact)).
		Joins("join standard_sources on standard_sources.source_key = standard_library_entries.source_key").
		Order("standard_library_entries.category asc, standard_library_entries.name asc").
		Limit(1000)

	category := strings.TrimSpace(filters.Category)
	if category != "" {
		query = query.Where("standard_library_entries.category = ?", category)
	}
	sources := normalizeStringFilters(filters.Sources)
	if len(sources) > 0 {
		query = query.Where("standard_library_entries.source_key in ?", sources)
	}
	q := strings.TrimSpace(filters.Query)
	if q != "" {
		pattern := "%" + q + "%"
		query = query.Where("standard_library_entries.name ilike ? or standard_library_entries.summary ilike ?", pattern, pattern)
	}

	if err := query.Find(&entities).Error; err != nil {
		return nil, err
	}
	entries := make([]models.StandardLibraryEntry, 0, len(entities))
	for _, entity := range entities {
		entries = append(entries, standardLibraryEntryFromEntity(entity))
	}
	return entries, nil
}

func (s LibraryStore) EquipmentEntries(ctx context.Context, sources []string) ([]models.StandardLibraryEntry, error) {
	return s.ListEntries(ctx, StandardLibraryFilters{
		Category: "equipment",
		Sources:  sources,
	})
}

func (s LibraryStore) EquipmentEntryByID(ctx context.Context, entryID string) (models.StandardLibraryEntry, error) {
	return s.EntryByID(ctx, entryID, "equipment", nil)
}

func (s LibraryStore) EntryByID(
	ctx context.Context,
	entryID string,
	category string,
	sources []string,
) (models.StandardLibraryEntry, error) {
	var entity standardLibraryEntryEntity
	query := s.db.WithContext(ctx).
		Table("standard_library_entries").
		Select(standardLibraryEntrySelect(false)).
		Joins("join standard_sources on standard_sources.source_key = standard_library_entries.source_key").
		Where("standard_library_entries.id = ?", strings.TrimSpace(entryID))
	if category = strings.TrimSpace(category); category != "" && category != "all" {
		query = query.Where("standard_library_entries.category = ?", category)
	}
	if allowed := normalizeStringFilters(sources); len(allowed) > 0 {
		query = query.Where("standard_library_entries.source_key in ?", allowed)
	}
	err := query.First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.StandardLibraryEntry{}, ErrNotFound
	}
	if err != nil {
		return models.StandardLibraryEntry{}, err
	}
	return standardLibraryEntryFromEntity(entity), nil
}

func standardLibraryEntrySelect(compact bool) string {
	dataExpression := "standard_library_entries.data"
	if compact {
		dataExpression = "'{}'::jsonb"
	}
	return `standard_library_entries.id,
		standard_library_entries.source_key,
		standard_sources.label as source_label,
		standard_library_entries.category,
		standard_library_entries.slug,
		standard_library_entries.name,
		standard_library_entries.summary,
		standard_library_entries.description,
		` + dataExpression + ` as data,
		standard_library_entries.created_at,
		standard_library_entries.updated_at`
}

func normalizeStringFilters(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			result = append(result, value)
		}
	}
	return result
}

type standardSourceEntity struct {
	Key         string `gorm:"column:source_key"`
	Label       string
	Ruleset     string
	LicenseName string
	SourceURL   string
	Attribution string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type standardLibraryEntryEntity struct {
	ID          string
	SourceKey   string
	SourceLabel string
	Category    string
	Slug        string
	Name        string
	Summary     string
	Description string
	Data        dbmodels.JSONMap
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func standardSourceFromEntity(entity standardSourceEntity) models.StandardSource {
	return models.StandardSource{
		Key:         entity.Key,
		Label:       entity.Label,
		Ruleset:     entity.Ruleset,
		LicenseName: entity.LicenseName,
		SourceURL:   entity.SourceURL,
		Attribution: entity.Attribution,
		CreatedAt:   entity.CreatedAt,
		UpdatedAt:   entity.UpdatedAt,
	}
}

func standardLibraryEntryFromEntity(entity standardLibraryEntryEntity) models.StandardLibraryEntry {
	return models.StandardLibraryEntry{
		ID:          entity.ID,
		SourceKey:   entity.SourceKey,
		SourceLabel: entity.SourceLabel,
		Category:    entity.Category,
		Slug:        entity.Slug,
		Name:        entity.Name,
		Summary:     entity.Summary,
		Description: entity.Description,
		ReadOnly:    true,
		Data:        map[string]any(entity.Data),
		CreatedAt:   entity.CreatedAt,
		UpdatedAt:   entity.UpdatedAt,
	}
}
