package store

import (
	"context"
	"errors"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type SpellStore struct {
	db *gorm.DB
}

type SpellInput struct {
	Name              string
	Level             int
	School            string
	CastingTime       string
	CastType          string
	Range             string
	RangeType         string
	RangeFeet         int
	Components        map[string]any
	Material          string
	Classes           []string
	Duration          string
	DurationType      string
	DurationValue     int
	DurationScale     string
	AOEType           string
	AOESize           int
	Ritual            bool
	Concentration     bool
	ScalingType       string
	Description       string
	HigherLevel       string
	SourceNote        string
	SourceMaterial    string
	Mechanics         map[string]any
	ProjectileScaling *models.SpellProjectileScaling
	Actions           []models.SpellAction
}

func (s SpellStore) List(ctx context.Context, ownerUserID, q string, level int, includeUser, includeStandard bool, sources []string) ([]models.Spell, error) {
	spells := []models.Spell{}
	if includeUser {
		var entities []dbmodels.SpellEntity
		query := s.db.WithContext(ctx).
			Where("owner_user_id = ?", ownerUserID).
			Order("level asc, name asc").
			Limit(500)
		if q != "" {
			pattern := "%" + q + "%"
			query = query.Where("name ilike ? or school ilike ?", pattern, pattern)
		}
		if level >= 0 {
			query = query.Where("level = ?", level)
		}
		if err := query.Find(&entities).Error; err != nil {
			return nil, err
		}
		for _, entity := range entities {
			spells = append(spells, spellFromEntity(entity))
		}
	}
	if includeStandard {
		standard, err := s.listStandard(ctx, q, level, sources)
		if err != nil {
			return nil, err
		}
		spells = append(spells, standard...)
	}
	return s.AttachAutomation(ctx, spells)
}

func (s SpellStore) ByID(ctx context.Context, ownerUserID, spellID, librarySource string) (models.Spell, error) {
	if librarySource == "standard" {
		spell, err := s.standardByID(ctx, spellID)
		if err != nil {
			return models.Spell{}, err
		}
		spells, err := s.AttachAutomation(ctx, []models.Spell{spell})
		if err != nil {
			return models.Spell{}, err
		}
		return spells[0], nil
	}
	var entity dbmodels.SpellEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(spellID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Spell{}, ErrNotFound
	}
	if err != nil {
		return models.Spell{}, err
	}
	spells, err := s.AttachAutomation(ctx, []models.Spell{spellFromEntity(entity)})
	if err != nil {
		return models.Spell{}, err
	}
	return spells[0], nil
}

func (s SpellStore) Create(ctx context.Context, ownerUserID string, input SpellInput) (models.Spell, error) {
	var spell models.Spell
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		entity := spellEntityFromInput(ownerUserID, input)
		if err := tx.Create(&entity).Error; err != nil {
			return err
		}
		if err := replaceSpellAutomation(ctx, tx, entity.ID, input); err != nil {
			return err
		}
		spell = spellFromEntity(entity)
		return nil
	})
	if err != nil {
		return models.Spell{}, err
	}
	spells, err := s.AttachAutomation(ctx, []models.Spell{spell})
	if err != nil {
		return models.Spell{}, err
	}
	return spells[0], nil
}

func (s SpellStore) Update(ctx context.Context, ownerUserID, spellID string, input SpellInput) (models.Spell, error) {
	var spell models.Spell
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var entity dbmodels.SpellEntity
		err := tx.Where("id = ? and owner_user_id = ?", strings.TrimSpace(spellID), ownerUserID).First(&entity).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		updated := spellEntityFromInput(ownerUserID, input)
		updated.ID = entity.ID
		updated.CreatedAt = entity.CreatedAt
		if err := tx.Save(&updated).Error; err != nil {
			return err
		}
		if err := replaceSpellAutomation(ctx, tx, updated.ID, input); err != nil {
			return err
		}
		spell = spellFromEntity(updated)
		return nil
	})
	if err != nil {
		return models.Spell{}, err
	}
	spells, err := s.AttachAutomation(ctx, []models.Spell{spell})
	if err != nil {
		return models.Spell{}, err
	}
	return spells[0], nil
}

func (s SpellStore) Delete(ctx context.Context, ownerUserID, spellID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(spellID), ownerUserID).
		Delete(&dbmodels.SpellEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s SpellStore) listStandard(ctx context.Context, q string, level int, sources []string) ([]models.Spell, error) {
	var entities []standardSpellEntity
	query := s.db.WithContext(ctx).
		Table("standard_spells").
		Order("level asc, name asc").
		Limit(1000)
	if q != "" {
		pattern := "%" + q + "%"
		query = query.Where("name ilike ? or school ilike ?", pattern, pattern)
	}
	if level >= 0 {
		query = query.Where("level = ?", level)
	}
	if len(sources) > 0 {
		query = query.Where("source_key in ?", sources)
	}
	if err := query.Find(&entities).Error; err != nil {
		return nil, err
	}
	spells := make([]models.Spell, 0, len(entities))
	for _, entity := range entities {
		spells = append(spells, standardSpellFromEntity(entity))
	}
	return spells, nil
}

func (s SpellStore) standardByID(ctx context.Context, spellID string) (models.Spell, error) {
	var entity standardSpellEntity
	err := s.db.WithContext(ctx).
		Table("standard_spells").
		Where("id = ?", strings.TrimSpace(spellID)).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Spell{}, ErrNotFound
	}
	if err != nil {
		return models.Spell{}, err
	}
	return standardSpellFromEntity(entity), nil
}

func spellEntityFromInput(ownerUserID string, input SpellInput) dbmodels.SpellEntity {
	return dbmodels.SpellEntity{
		OwnerUserID:        ownerUserID,
		Name:               input.Name,
		Level:              input.Level,
		School:             input.School,
		CastingTime:        input.CastingTime,
		CastType:           input.CastType,
		SpellRange:         input.Range,
		RangeType:          input.RangeType,
		RangeFeet:          input.RangeFeet,
		Components:         jsonMap(input.Components),
		MaterialComponents: input.Material,
		Classes:            pq.StringArray(input.Classes),
		Duration:           input.Duration,
		DurationType:       input.DurationType,
		DurationValue:      input.DurationValue,
		DurationScale:      input.DurationScale,
		AOEType:            input.AOEType,
		AOESize:            input.AOESize,
		Ritual:             input.Ritual,
		Concentration:      input.Concentration,
		ScalingType:        input.ScalingType,
		Description:        input.Description,
		HigherLevel:        input.HigherLevel,
		SourceNote:         input.SourceNote,
		SourceMaterial:     input.SourceMaterial,
		Mechanics:          jsonMap(input.Mechanics),
	}
}

func spellFromEntity(entity dbmodels.SpellEntity) models.Spell {
	return models.Spell{
		ID:             entity.ID,
		Name:           entity.Name,
		Level:          entity.Level,
		School:         entity.School,
		CastingTime:    entity.CastingTime,
		CastType:       entity.CastType,
		Range:          entity.SpellRange,
		RangeType:      entity.RangeType,
		RangeFeet:      entity.RangeFeet,
		Components:     map[string]any(entity.Components),
		Material:       entity.MaterialComponents,
		Classes:        []string(entity.Classes),
		Duration:       entity.Duration,
		DurationType:   entity.DurationType,
		DurationValue:  entity.DurationValue,
		DurationScale:  entity.DurationScale,
		AOEType:        entity.AOEType,
		AOESize:        entity.AOESize,
		Ritual:         entity.Ritual,
		Concentration:  entity.Concentration,
		ScalingType:    entity.ScalingType,
		Description:    entity.Description,
		HigherLevel:    entity.HigherLevel,
		SourceNote:     entity.SourceNote,
		SourceMaterial: entity.SourceMaterial,
		LibrarySource:  "user",
		Mechanics:      map[string]any(entity.Mechanics),
		Actions:        []models.SpellAction{},
		CreatedAt:      entity.CreatedAt,
		UpdatedAt:      entity.UpdatedAt,
	}
}

type standardSpellEntity struct {
	ID            string
	Name          string
	Level         int
	School        string
	CastingTime   string
	SpellRange    string
	Components    dbmodels.JSONMap
	Duration      string
	Ritual        bool
	Concentration bool
	Description   string
	HigherLevel   string
	SourceNote    string
	SourceKey     string
	SourceLabel   string
	Mechanics     dbmodels.JSONMap
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func standardSpellFromEntity(entity standardSpellEntity) models.Spell {
	mechanics := map[string]any(entity.Mechanics)
	return models.Spell{
		ID:            entity.ID,
		Name:          entity.Name,
		Level:         entity.Level,
		School:        entity.School,
		CastingTime:   entity.CastingTime,
		Range:         entity.SpellRange,
		Components:    map[string]any(entity.Components),
		Duration:      entity.Duration,
		Ritual:        entity.Ritual,
		Concentration: entity.Concentration,
		Description:   entity.Description,
		HigherLevel:   entity.HigherLevel,
		SourceNote:    entity.SourceNote,
		SourceKey:     entity.SourceKey,
		SourceLabel:   entity.SourceLabel,
		Mechanics:     mechanics,
		Classes:       standardSpellClasses(mechanics),
		LibrarySource: "standard",
		ReadOnly:      true,
		Actions:       []models.SpellAction{},
		CreatedAt:     entity.CreatedAt,
		UpdatedAt:     entity.UpdatedAt,
	}
}

func standardSpellClasses(mechanics map[string]any) []string {
	rawClasses, ok := mechanics["classes"].([]any)
	if !ok {
		return []string{}
	}
	classes := make([]string, 0, len(rawClasses))
	for _, rawClass := range rawClasses {
		className, ok := rawClass.(string)
		if !ok {
			continue
		}
		className = strings.TrimSpace(className)
		if className != "" {
			classes = append(classes, className)
		}
	}
	return classes
}
