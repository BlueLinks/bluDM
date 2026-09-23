package store

import (
	"context"
	"strings"

	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

// Saved encounters retain their authored roster and historical snapshot, but
// referenced source profiles are authoritative until a run is started.
type encounterReferenceResolver struct {
	db        *gorm.DB
	ownerID   string
	full      bool
	players   map[string]*models.Player
	creatures map[string]*referencedCreature
}

type referencedCreature struct {
	profile      models.Creature
	actions      []models.CreatureAction
	spellcasting models.CreatureSpellcastingProfile
}

func newEncounterReferenceResolver(db *gorm.DB, ownerID string, full bool) *encounterReferenceResolver {
	return &encounterReferenceResolver{
		db: db, ownerID: ownerID, full: full,
		players: map[string]*models.Player{}, creatures: map[string]*referencedCreature{},
	}
}

func (r *encounterReferenceResolver) resolve(ctx context.Context, combatant models.EncounterCombatant) (models.EncounterCombatant, error) {
	switch combatant.SourceType {
	case "player":
		if combatant.PlayerID == "" {
			return combatant, nil
		}
		player, err := r.player(ctx, combatant.PlayerID)
		if err != nil || player == nil {
			return combatant, err
		}
		base := snapshotSource(combatant.Snapshot, "player")
		savedMaxHP := combatant.MaxHitPoints
		combatant.DisplayName = currentOrOverride(combatant.DisplayName, sourceString(base, "characterName"), player.CharacterName)
		combatant.ArmorClass = currentStatOrOverride(combatant.ArmorClass, playerSourceStat(base, "armorClass"), player.ArmorClass)
		combatant.MaxHitPoints = currentStatOrOverride(combatant.MaxHitPoints, playerSourceStat(base, "maxHitPoints"), player.MaxHitPoints)
		combatant.CurrentHitPoints = currentEncounterHP(combatant.CurrentHitPoints, savedMaxHP, combatant.MaxHitPoints)
		originalAvatar := sourceAvatar(base)
		if originalAvatar == "" {
			originalAvatar = sourceString(base, "referenceAvatarUrl")
		}
		combatant.AvatarURL = currentOrOverride(combatant.AvatarURL, originalAvatar, assetOrExternalURL(player.AvatarAssetID, player.AvatarURL))
		combatant.Snapshot = copySnapshot(combatant.Snapshot)
		combatant.Snapshot["player"] = map[string]any(structJSONMap(player))
	case "creature":
		creatureID := combatant.CreatureID
		if creatureID == "" {
			creatureID = sourceString(combatant.Snapshot, "standardCreatureId")
		}
		if creatureID == "" {
			return combatant, nil
		}
		creature, err := r.creature(ctx, creatureID, combatant.CreatureID == "")
		if err != nil || creature == nil {
			return combatant, err
		}
		base := snapshotSource(combatant.Snapshot, "creature")
		savedMaxHP := combatant.MaxHitPoints
		combatant.DisplayName = currentOrOverride(combatant.DisplayName, sourceString(base, "name"), creature.profile.Name)
		combatant.ArmorClass = currentStatOrOverride(combatant.ArmorClass, sourceInt(base, "armorClass"), creature.profile.ArmorClass)
		combatant.MaxHitPoints = currentStatOrOverride(combatant.MaxHitPoints, sourceInt(base, "hitPoints"), creature.profile.HitPoints)
		combatant.CurrentHitPoints = currentEncounterHP(combatant.CurrentHitPoints, savedMaxHP, combatant.MaxHitPoints)
		combatant.AvatarURL = currentOrOverride(combatant.AvatarURL, sourceAvatar(base), assetOrExternalURL(creature.profile.ImageAssetID, creature.profile.AvatarURL))
		combatant.Snapshot = copySnapshot(combatant.Snapshot)
		combatant.Snapshot["creature"] = map[string]any(structJSONMap(creature.profile))
		combatant.Snapshot["xp"] = creature.profile.XP
		if r.full && creature.profile.LibrarySource != "standard" {
			combatant.Snapshot["actions"] = creature.actions
			combatant.Snapshot["spellcasting"] = creature.spellcasting
		}
	}
	return combatant, nil
}

func (r *encounterReferenceResolver) player(ctx context.Context, id string) (*models.Player, error) {
	if player, ok := r.players[id]; ok {
		return player, nil
	}
	player, err := (PlayerStore{db: r.db}).ByID(ctx, r.ownerID, id)
	if IsNotFound(err) {
		r.players[id] = nil
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	r.players[id] = &player
	return &player, nil
}

func (r *encounterReferenceResolver) creature(ctx context.Context, id string, standard bool) (*referencedCreature, error) {
	key := id
	if standard {
		key = "standard:" + id
	}
	if creature, ok := r.creatures[key]; ok {
		return creature, nil
	}
	store := CreatureStore{db: r.db}
	var profile models.Creature
	var err error
	if standard {
		profile, err = store.StandardByID(ctx, id)
	} else {
		profile, err = store.ByID(ctx, r.ownerID, id)
	}
	if IsNotFound(err) {
		r.creatures[key] = nil
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	result := &referencedCreature{profile: profile}
	if !standard && r.full {
		result.actions, err = (ActionStore{db: r.db}).ListCreatureActions(ctx, r.ownerID, id)
		if err != nil {
			return nil, err
		}
		result.spellcasting, err = (SpellcastingStore{db: r.db}).Profile(ctx, r.ownerID, id)
		if err != nil {
			return nil, err
		}
	}
	r.creatures[key] = result
	return result, nil
}

func snapshotSource(snapshot map[string]any, key string) map[string]any {
	if nested, ok := snapshot[key].(map[string]any); ok {
		return nested
	}
	return snapshot
}

func sourceString(source map[string]any, key string) string {
	value, _ := source[key].(string)
	return strings.TrimSpace(value)
}

func sourceInt(source map[string]any, key string) int {
	switch value := source[key].(type) {
	case int:
		return value
	case float64:
		return int(value)
	default:
		return 0
	}
}

func playerSourceStat(source map[string]any, key string) int {
	if value := sourceInt(source, "reference"+strings.ToUpper(key[:1])+key[1:]); value > 0 {
		return value
	}
	return sourceInt(source, key)
}

func sourceAvatar(source map[string]any) string {
	assetID := sourceString(source, "avatarAssetId")
	if assetID == "" {
		assetID = sourceString(source, "imageAssetId")
	}
	return assetOrExternalURL(assetID, sourceString(source, "avatarUrl"))
}

func currentOrOverride(saved, original, current string) string {
	if original != "" && saved != "" && saved != original {
		return saved
	}
	return current
}

func currentStatOrOverride(saved, original, current int) int {
	if original > 0 && saved > 0 && saved != original {
		return saved
	}
	return max(1, current)
}

func currentEncounterHP(saved, originalMax, currentMax int) int {
	if originalMax > 0 && saved >= originalMax {
		return currentMax
	}
	return min(max(0, saved), currentMax)
}

func copySnapshot(source map[string]any) map[string]any {
	result := make(map[string]any, len(source)+2)
	for key, value := range source {
		result[key] = value
	}
	return result
}
