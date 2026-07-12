package httpapi

import (
	"errors"
	"strings"

	"bludm/backend/internal/store"
)

func archiveInternalRecordsFromManifest(manifest store.PortableManifest) archiveInternalRecords {
	return archiveInternalRecords{
		CreatureLinks:     manifest.CreatureLinks,
		CreatureActions:   manifest.CreatureActions,
		CreatureRollParts: manifest.CreatureRollParts,
		Spellcasting:      manifest.Spellcasting,
		CreatureSpells:    manifest.CreatureSpells,
		SpellScaling:      manifest.SpellScaling,
		SpellActions:      manifest.SpellActions,
		SpellRollParts:    manifest.SpellRollParts,
		ActionTemplates:   manifest.ActionTemplates,
		ActionRollParts:   manifest.ActionRollParts,
		Combatants:        manifest.Combatants,
		Runs:              manifest.Runs,
		RunCombatants:     manifest.RunCombatants,
		RunSpellSlots:     manifest.RunSpellSlots,
		RunEffects:        manifest.RunEffects,
		RunAlerts:         manifest.RunAlerts,
		CombatLog:         manifest.CombatLog,
		LocationLinks:     manifest.LocationLinks,
		NPCLocationLinks:  manifest.NPCLocationLinks,
		LocationStock:     manifest.LocationStock,
		MapPins:           manifest.MapPins,
		RollTableRows:     manifest.RollTableRows,
		Assets:            manifest.Assets,
	}
}

func applyArchiveInternalRecords(manifest *store.PortableManifest, internal archiveInternalRecords) {
	manifest.CreatureLinks = internal.CreatureLinks
	manifest.CreatureActions = internal.CreatureActions
	manifest.CreatureRollParts = internal.CreatureRollParts
	manifest.Spellcasting = internal.Spellcasting
	manifest.CreatureSpells = internal.CreatureSpells
	manifest.SpellScaling = internal.SpellScaling
	manifest.SpellActions = internal.SpellActions
	manifest.SpellRollParts = internal.SpellRollParts
	manifest.ActionTemplates = internal.ActionTemplates
	manifest.ActionRollParts = internal.ActionRollParts
	manifest.Combatants = internal.Combatants
	manifest.Runs = internal.Runs
	manifest.RunCombatants = internal.RunCombatants
	manifest.RunSpellSlots = internal.RunSpellSlots
	manifest.RunEffects = internal.RunEffects
	manifest.RunAlerts = internal.RunAlerts
	manifest.CombatLog = internal.CombatLog
	manifest.LocationLinks = internal.LocationLinks
	manifest.NPCLocationLinks = internal.NPCLocationLinks
	manifest.LocationStock = internal.LocationStock
	manifest.MapPins = internal.MapPins
	manifest.RollTableRows = internal.RollTableRows
	manifest.Assets = internal.Assets
}

func validateArchiveIndex(entries map[string][]byte, archive archiveManifest) error {
	if archive.Files == nil {
		return errors.New("archive manifest file index is missing")
	}
	if len(archive.Files["internal"]) == 0 {
		return errors.New("archive manifest must reference internal records")
	}
	graphPath := blankArchiveDefault(archive.Graph, "graph.json")
	referenced := map[string]bool{"manifest.json": true, graphPath: true}
	if _, ok := entries[graphPath]; !ok {
		return errors.New("archive manifest references a missing graph file")
	}
	for _, paths := range archive.Files {
		for _, filePath := range paths {
			if strings.HasPrefix(filePath, "assets/") {
				continue
			}
			referenced[filePath] = true
			if _, ok := entries[filePath]; !ok {
				return errors.New("archive manifest references a missing data file")
			}
		}
	}
	for filePath := range entries {
		if !referenced[filePath] && strings.HasSuffix(filePath, ".json") {
			return errors.New("archive contains an unindexed logical file")
		}
	}
	return nil
}

func archiveRoots(graph store.DependencyGraphView) []archiveRoot {
	nodes := map[string]store.DependencyGraphViewNode{}
	for _, node := range graph.Nodes {
		nodes[node.ID] = node
	}
	roots := make([]archiveRoot, 0, len(graph.Roots))
	for _, id := range graph.Roots {
		node, ok := nodes[id]
		if !ok {
			continue
		}
		roots = append(roots, archiveRoot{Type: node.Kind, Key: strings.TrimPrefix(node.ID, node.Kind+":"), Label: node.Label})
	}
	return roots
}

func archiveAssetPaths(assets []store.ExportAssetFile) []string {
	paths := make([]string, 0, len(assets))
	for _, asset := range assets {
		paths = append(paths, asset.Asset.Path)
	}
	return paths
}

func archiveEntityKey(label, id string) string {
	key := strings.Trim(archiveKeyUnsafe.ReplaceAllString(strings.ToLower(label), "-"), "-")
	if key == "" {
		key = "object"
	}
	suffix := strings.ReplaceAll(id, "-", "")
	if len(suffix) > 8 {
		suffix = suffix[:8]
	}
	if suffix == "" {
		return key
	}
	return key + "-" + suffix
}

func locationArchiveGroup(locationType string) string {
	switch strings.ToLower(strings.TrimSpace(locationType)) {
	case "shop", "market", "store":
		return "shops"
	case "dungeon", "dungeon-room", "room":
		return "dungeons"
	default:
		return "locations"
	}
}

func blankArchiveDefault(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func countEncounterCombatants(manifest store.PortableManifest, encounterID string) int {
	count := 0
	for _, entity := range manifest.Combatants {
		if entity.EncounterID == encounterID {
			count++
		}
	}
	return count
}

func countEncounterRuns(manifest store.PortableManifest, encounterID string) int {
	count := 0
	for _, entity := range manifest.Runs {
		if entity.EncounterID == encounterID {
			count++
		}
	}
	return count
}

func countCreatureActions(manifest store.PortableManifest, creatureID string) int {
	count := 0
	for _, entity := range manifest.CreatureActions {
		if entity.CreatureID == creatureID {
			count++
		}
	}
	return count
}

func countCreatureSpells(manifest store.PortableManifest, creatureID string) int {
	count := 0
	for _, entity := range manifest.CreatureSpells {
		if entity.CreatureID == creatureID {
			count++
		}
	}
	return count
}

func countLocationStock(manifest store.PortableManifest, locationID string) int {
	count := 0
	for _, entity := range manifest.LocationStock {
		if entity.LocationID == locationID {
			count++
		}
	}
	return count
}

func countNPCPlacements(manifest store.PortableManifest, locationID string) int {
	count := 0
	for _, entity := range manifest.NPCLocationLinks {
		if entity.LocationID == locationID {
			count++
		}
	}
	return count
}

func countMapPins(manifest store.PortableManifest, mapID string) int {
	count := 0
	for _, entity := range manifest.MapPins {
		if entity.MapID == mapID {
			count++
		}
	}
	return count
}

func countRollTableRows(manifest store.PortableManifest, tableID string) int {
	count := 0
	for _, entity := range manifest.RollTableRows {
		if entity.TableID == tableID {
			count++
		}
	}
	return count
}

func countSpellActions(manifest store.PortableManifest, spellID string) int {
	count := 0
	for _, entity := range manifest.SpellActions {
		if entity.SpellID == spellID {
			count++
		}
	}
	return count
}
