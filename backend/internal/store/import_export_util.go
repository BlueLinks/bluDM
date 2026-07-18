package store

import (
	"context"
	"fmt"
	"strings"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

func (s ImportExportStore) detectConflicts(ctx context.Context, ownerUserID string, manifest PortableManifest) []ImportConflict {
	conflicts := []ImportConflict{}
	projection := BuildDependencyGraph(manifest).Projection
	projected := projectedNodesByRawID(manifest, projection)
	addNameConflict := func(kind, table, nameColumn, name, id string) {
		if strings.TrimSpace(name) == "" {
			return
		}
		var count int64
		_ = s.db.WithContext(ctx).Table(table).
			Where("owner_user_id = ? and lower("+nameColumn+") = lower(?)", ownerUserID, name).
			Count(&count).Error
		if count > 0 {
			conflicts = append(conflicts, ImportConflict{
				Kind:       kind,
				Name:       name,
				Severity:   "warning",
				Default:    "rename-imported",
				Options:    []string{"rename-imported", "keep-existing", "skip-imported"},
				ImportedID: id,
				EntityID:   projected[nodeID(kind, id)].ID,
				EntityKind: projected[nodeID(kind, id)].Kind,
				Message:    conflictMessage(projected[nodeID(kind, id)], name),
				Impact:     conflictImpact(projected[nodeID(kind, id)]),
			})
		}
	}
	for _, campaign := range manifest.Campaigns {
		var count int64
		_ = s.db.WithContext(ctx).Table("campaigns").
			Where("owner_user_id = ? and archived_at is null and lower(name) = lower(?)", ownerUserID, campaign.Name).
			Count(&count).Error
		if count > 0 {
			conflicts = append(conflicts, ImportConflict{
				Kind:       "campaign",
				Name:       campaign.Name,
				Severity:   "warning",
				Default:    "rename-imported",
				Options:    []string{"rename-imported", "keep-existing", "skip-imported"},
				ImportedID: campaign.ID,
				EntityID:   projected[nodeID("campaign", campaign.ID)].ID,
				EntityKind: projected[nodeID("campaign", campaign.ID)].Kind,
				Message:    conflictMessage(projected[nodeID("campaign", campaign.ID)], campaign.Name),
				Impact:     conflictImpact(projected[nodeID("campaign", campaign.ID)]),
			})
		}
	}
	for _, player := range manifest.Players {
		addNameConflict("player", "players", "character_name", player.CharacterName, player.ID)
	}
	for _, creature := range manifest.NPCs {
		addNameConflict("npc", "creatures", "name", creature.Name, creature.ID)
	}
	for _, item := range manifest.Items {
		addNameConflict("item", "items", "name", item.Name, item.ID)
	}
	for _, spell := range manifest.Spells {
		addNameConflict("spell", "spells", "name", spell.Name, spell.ID)
	}
	for _, location := range manifest.Locations {
		kind := locationGraphKind(location.LocationType)
		if kind != "shop" && kind != "dungeon" {
			continue
		}
		var count int64
		_ = s.db.WithContext(ctx).Table("campaign_locations").
			Where("campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null) and lower(name) = lower(?) and location_type = ?", ownerUserID, location.Name, location.LocationType).
			Count(&count).Error
		if count > 0 {
			viewNode := projected[nodeID("location", location.ID)]
			conflicts = append(conflicts, ImportConflict{
				Kind:       kind,
				Name:       location.Name,
				Severity:   "warning",
				Default:    "rename-imported",
				Options:    []string{"rename-imported", "keep-existing", "skip-imported"},
				ImportedID: location.ID,
				EntityID:   viewNode.ID,
				EntityKind: viewNode.Kind,
				Message:    conflictMessage(viewNode, location.Name),
				Impact:     conflictImpact(viewNode),
			})
		}
	}
	if manifest.Version != ImportExportVersion {
		conflicts = append(conflicts, ImportConflict{Kind: "version", Name: "Bundle version", Severity: "danger", Default: "block", Blocking: true})
	}
	return conflicts
}

func importPreviewSummary(view DependencyGraphView) ImportPreviewSummary {
	return ImportPreviewSummary{
		Entities:           view.Nodes,
		Groups:             view.Groups,
		InternalRecords:    view.Counts.InternalRecords,
		Assets:             view.Counts.Assets,
		StandardReferences: view.Counts.StandardReferences,
		RootObjects:        view.Counts.RootObjects,
	}
}

func projectedNodesByRawID(manifest PortableManifest, view DependencyGraphView) map[string]DependencyGraphViewNode {
	byLabelKind := map[string]DependencyGraphViewNode{}
	for _, node := range view.Nodes {
		byLabelKind[node.Kind+"\x00"+node.Label] = node
	}
	mapped := map[string]DependencyGraphViewNode{}
	for _, entity := range manifest.Campaigns {
		mapped[nodeID("campaign", entity.ID)] = byLabelKind["campaign\x00"+entity.Name]
	}
	for _, entity := range manifest.Players {
		mapped[nodeID("player", entity.ID)] = byLabelKind["player\x00"+entity.CharacterName]
	}
	for _, entity := range manifest.NPCs {
		mapped[nodeID("npc", entity.ID)] = byLabelKind["npc\x00"+entity.Name]
	}
	for _, entity := range manifest.Items {
		mapped[nodeID("item", entity.ID)] = byLabelKind["item\x00"+entity.Name]
	}
	for _, entity := range manifest.Spells {
		mapped[nodeID("spell", entity.ID)] = byLabelKind["spell\x00"+entity.Name]
	}
	for _, entity := range manifest.Locations {
		mapped[nodeID("location", entity.ID)] = byLabelKind[locationGraphKind(entity.LocationType)+"\x00"+entity.Name]
	}
	return mapped
}

func conflictMessage(node DependencyGraphViewNode, fallback string) string {
	kind := node.Kind
	if kind == "" {
		kind = "object"
	}
	label := node.Label
	if label == "" {
		label = fallback
	}
	return titleWords(kind) + ": " + label + " already exists."
}

func conflictImpact(node DependencyGraphViewNode) string {
	if node.InternalRecords == 0 {
		return "Only this high-level object is affected."
	}
	return fmt.Sprintf("%d internal record%s will follow the selected resolution.", node.InternalRecords, pluralSuffix(node.InternalRecords))
}

func pluralSuffix(count int) string {
	if count == 1 {
		return ""
	}
	return "s"
}

func (s ImportExportStore) importName(ctx context.Context, tx *gorm.DB, table, ownerUserID, name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "Imported"
	}
	column := "name"
	if table == "players" {
		column = "character_name"
	}
	query := tx.WithContext(ctx).Table(table).Where("owner_user_id = ? and lower("+column+") = lower(?)", ownerUserID, name)
	if table == "campaigns" {
		query = query.Where("archived_at is null")
	}
	var count int64
	if err := query.Count(&count).Error; err != nil || count == 0 {
		return name
	}
	for index := 2; index < 1000; index++ {
		candidate := fmt.Sprintf("%s (Imported %d)", name, index)
		query := tx.WithContext(ctx).Table(table).Where("owner_user_id = ? and lower("+column+") = lower(?)", ownerUserID, candidate)
		if table == "campaigns" {
			query = query.Where("archived_at is null")
		}
		count = 0
		if err := query.Count(&count).Error; err == nil && count == 0 {
			return candidate
		}
	}
	return name + " (Imported)"
}

func (s ImportExportStore) findWhere(ctx context.Context, dest any, query string, args ...any) error {
	return s.db.WithContext(ctx).Where(query, args...).Find(dest).Error
}

func manifestCounts(manifest PortableManifest) map[string]int {
	return map[string]int{
		"campaigns":     len(manifest.Campaigns),
		"encounters":    len(manifest.Encounters),
		"players":       len(manifest.Players),
		"npcs":          len(manifest.NPCs),
		"maps":          len(manifest.Maps),
		"locations":     len(manifest.Locations),
		"shops":         countLocationsByGraphKind(manifest.Locations, "shop"),
		"dungeons":      countLocationsByGraphKind(manifest.Locations, "dungeon"),
		"spells":        len(manifest.Spells),
		"items":         len(manifest.Items),
		"assets":        len(manifest.Assets),
		"journeys":      len(manifest.Journeys),
		"rollTables":    len(manifest.RollTables),
		"combatLog":     len(manifest.CombatLog),
		"dungeonStudio": countDungeonStudioMaps(manifest.Maps),
	}
}

func unsupportedForManifest(manifest PortableManifest) []string {
	unsupported := []string{}
	if normalizeBundleType(manifest.BundleType) == "custom" {
		unsupported = append(unsupported, "This bundle type is scaffolded but not fully importable yet.")
	}
	return unsupported
}

func countDungeonStudioMaps(maps []dbmodels.CampaignMapEntity) int {
	count := 0
	for _, campaignMap := range maps {
		if _, ok := campaignMap.Metadata["studio"]; ok {
			count++
		}
	}
	return count
}

func countLocationsByGraphKind(locations []dbmodels.CampaignLocationEntity, kind string) int {
	count := 0
	for _, location := range locations {
		if locationGraphKind(location.LocationType) == kind {
			count++
		}
	}
	return count
}

func normalizeBundleType(bundleType string) string {
	switch strings.TrimSpace(strings.ToLower(bundleType)) {
	case "everything", "campaign", "encounter", "npc", "player", "item", "spell", "map", "shop", "dungeon", "journey", "roll-table", "custom":
		return strings.TrimSpace(strings.ToLower(bundleType))
	default:
		return ""
	}
}

func safeAssetFilename(filename string) string {
	filename = strings.TrimSpace(strings.ReplaceAll(filename, "\\", "/"))
	if slash := strings.LastIndex(filename, "/"); slash >= 0 {
		filename = filename[slash+1:]
	}
	if filename == "" || filename == "." || filename == ".." {
		return "asset.bin"
	}
	return strings.NewReplacer("..", ".", "/", "-", "\\", "-").Replace(filename)
}

type stringSet map[string]struct{}

func (s stringSet) add(value string) {
	value = strings.TrimSpace(value)
	if value != "" {
		s[value] = struct{}{}
	}
}

func (s stringSet) values() []string {
	values := make([]string, 0, len(s))
	for value := range s {
		values = append(values, value)
	}
	return values
}

func idsFrom[T any](values []T, id func(T) string) []string {
	ids := make([]string, 0, len(values))
	for _, value := range values {
		ids = append(ids, id(value))
	}
	return uniqueNonEmpty(ids)
}

func rawIDsFrom[T any](values []T, id func(T) string) []string {
	ids := make([]string, 0, len(values))
	for _, value := range values {
		ids = append(ids, strings.TrimSpace(id(value)))
	}
	return ids
}

func uniqueNonEmpty(values []string) []string {
	seen := map[string]struct{}{}
	unique := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		unique = append(unique, value)
	}
	return unique
}

func mergeByID[T any](existing []T, incoming []T, id func(T) string) []T {
	seen := map[string]struct{}{}
	merged := make([]T, 0, len(existing)+len(incoming))
	for _, value := range existing {
		seen[id(value)] = struct{}{}
		merged = append(merged, value)
	}
	for _, value := range incoming {
		key := id(value)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		merged = append(merged, value)
	}
	return merged
}
