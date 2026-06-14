package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SpellcastingStore struct {
	db *gorm.DB
}

type SpellcastingInput struct {
	SpellcastingAbility       string
	InnateSpellcastingAbility string
	CasterLevel               int
	SpellSaveDC               int
	SpellAttackBonus          int
	Slots                     map[string]any
	Spells                    []CreatureSpellInput
}

type CreatureSpellInput struct {
	SpellID       string
	LibrarySource string
	SpellLevel    int
	Prepared      bool
	Innate        bool
}

func (s SpellcastingStore) Profile(ctx context.Context, ownerUserID, creatureID string) (models.CreatureSpellcastingProfile, error) {
	if err := ensureCreatureOwnedTx(ctx, s.db, ownerUserID, creatureID); err != nil {
		return models.CreatureSpellcastingProfile{}, err
	}
	var entity dbmodels.CreatureSpellcastingProfileEntity
	err := s.db.WithContext(ctx).Where("creature_id = ?", strings.TrimSpace(creatureID)).First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.CreatureSpellcastingProfile{
			CreatureID: strings.TrimSpace(creatureID),
			Slots:      map[string]any{},
			Spells:     []models.CreatureSpell{},
		}, nil
	}
	if err != nil {
		return models.CreatureSpellcastingProfile{}, err
	}
	profile := spellcastingProfileFromEntity(entity)
	spells, err := s.creatureSpells(ctx, creatureID)
	if err != nil {
		return models.CreatureSpellcastingProfile{}, err
	}
	profile.Spells = spells
	return profile, nil
}

func (s SpellcastingStore) UpsertProfile(ctx context.Context, ownerUserID, creatureID string, input SpellcastingInput) (models.CreatureSpellcastingProfile, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCreatureOwnedTx(ctx, tx, ownerUserID, creatureID); err != nil {
			return err
		}
		entity := dbmodels.CreatureSpellcastingProfileEntity{
			CreatureID:                strings.TrimSpace(creatureID),
			SpellcastingAbility:       input.SpellcastingAbility,
			InnateSpellcastingAbility: input.InnateSpellcastingAbility,
			CasterLevel:               input.CasterLevel,
			SpellSaveDC:               input.SpellSaveDC,
			SpellAttackBonus:          input.SpellAttackBonus,
			Slots:                     jsonMap(input.Slots),
		}
		if err := tx.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "creature_id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"spellcasting_ability",
				"innate_spellcasting_ability",
				"caster_level",
				"spell_save_dc",
				"spell_attack_bonus",
				"slots",
			}),
		}).Create(&entity).Error; err != nil {
			return err
		}
		if err := tx.Where("creature_id = ?", strings.TrimSpace(creatureID)).Delete(&dbmodels.CreatureSpellEntity{}).Error; err != nil {
			return err
		}
		for index, spell := range input.Spells {
			if strings.TrimSpace(spell.SpellID) == "" {
				continue
			}
			entity, err := s.creatureSpellEntity(ctx, tx, ownerUserID, creatureID, spell, index)
			if err != nil {
				return err
			}
			if err := tx.Create(&entity).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return models.CreatureSpellcastingProfile{}, err
	}
	return s.Profile(ctx, ownerUserID, creatureID)
}

func (s SpellcastingStore) creatureSpellEntity(ctx context.Context, tx *gorm.DB, ownerUserID, creatureID string, input CreatureSpellInput, sortOrder int) (dbmodels.CreatureSpellEntity, error) {
	spellID := strings.TrimSpace(input.SpellID)
	if strings.TrimSpace(input.LibrarySource) == "standard" {
		var count int64
		if err := tx.WithContext(ctx).Table("standard_spells").Where("id = ?", spellID).Count(&count).Error; err != nil {
			return dbmodels.CreatureSpellEntity{}, err
		}
		if count == 0 {
			return dbmodels.CreatureSpellEntity{}, ErrNotFound
		}
		return dbmodels.CreatureSpellEntity{
			CreatureID:      strings.TrimSpace(creatureID),
			StandardSpellID: stringPointer(spellID),
			LibrarySource:   "standard",
			SpellLevel:      input.SpellLevel,
			Prepared:        input.Prepared,
			Innate:          input.Innate,
			SortOrder:       sortOrder,
		}, nil
	}
	var count int64
	if err := tx.WithContext(ctx).
		Model(&dbmodels.SpellEntity{}).
		Where("id = ? and owner_user_id = ?", spellID, ownerUserID).
		Count(&count).Error; err != nil {
		return dbmodels.CreatureSpellEntity{}, err
	}
	if count == 0 {
		return dbmodels.CreatureSpellEntity{}, ErrNotFound
	}
	return dbmodels.CreatureSpellEntity{
		CreatureID:    strings.TrimSpace(creatureID),
		SpellID:       stringPointer(spellID),
		LibrarySource: "user",
		SpellLevel:    input.SpellLevel,
		Prepared:      input.Prepared,
		Innate:        input.Innate,
		SortOrder:     sortOrder,
	}, nil
}

func (s SpellcastingStore) creatureSpells(ctx context.Context, creatureID string) ([]models.CreatureSpell, error) {
	type creatureSpellRow struct {
		ID            string
		CreatureID    string
		SpellID       string
		SpellName     string
		LibrarySource string
		SourceKey     string
		SourceLabel   string
		SpellLevel    int
		Prepared      bool
		Innate        bool
		SortOrder     int
	}
	var rows []creatureSpellRow
	if err := s.db.WithContext(ctx).
		Table("creature_spells").
		Select(`
			creature_spells.id,
			creature_spells.creature_id,
			coalesce(creature_spells.spell_id::text, creature_spells.standard_spell_id::text, '') as spell_id,
			coalesce(spells.name, standard_spells.name, '') as spell_name,
			creature_spells.library_source,
			coalesce(standard_spells.source_key, '') as source_key,
			coalesce(standard_spells.source_label, '') as source_label,
			creature_spells.spell_level,
			creature_spells.prepared,
			creature_spells.innate,
			creature_spells.sort_order
		`).
		Joins("left join spells on spells.id = creature_spells.spell_id").
		Joins("left join standard_spells on standard_spells.id = creature_spells.standard_spell_id").
		Where("creature_spells.creature_id = ?", strings.TrimSpace(creatureID)).
		Order("creature_spells.spell_level asc, creature_spells.sort_order asc").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	spells := make([]models.CreatureSpell, 0, len(rows))
	for _, row := range rows {
		spells = append(spells, models.CreatureSpell{
			ID:            row.ID,
			CreatureID:    row.CreatureID,
			SpellID:       row.SpellID,
			SpellName:     row.SpellName,
			LibrarySource: row.LibrarySource,
			SourceKey:     row.SourceKey,
			SourceLabel:   row.SourceLabel,
			SpellLevel:    row.SpellLevel,
			Prepared:      row.Prepared,
			Innate:        row.Innate,
			SortOrder:     row.SortOrder,
		})
	}
	return spells, nil
}

func spellcastingProfileFromEntity(entity dbmodels.CreatureSpellcastingProfileEntity) models.CreatureSpellcastingProfile {
	return models.CreatureSpellcastingProfile{
		CreatureID:                entity.CreatureID,
		SpellcastingAbility:       entity.SpellcastingAbility,
		InnateSpellcastingAbility: entity.InnateSpellcastingAbility,
		CasterLevel:               entity.CasterLevel,
		SpellSaveDC:               entity.SpellSaveDC,
		SpellAttackBonus:          entity.SpellAttackBonus,
		Slots:                     map[string]any(entity.Slots),
		Spells:                    []models.CreatureSpell{},
		CreatedAt:                 entity.CreatedAt,
		UpdatedAt:                 entity.UpdatedAt,
	}
}
