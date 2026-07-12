package httpapi

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path"
	"regexp"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/store"
)

const importExportArchiveFormat = "bludm.export"
const importExportArchiveVersion = 2
const importExportMaxJSONBytes = 20 << 20

var archiveKeyUnsafe = regexp.MustCompile(`[^a-z0-9]+`)

type archiveManifest struct {
	Format           string                `json:"format"`
	Version          int                   `json:"version"`
	DataFormat       string                `json:"dataFormat"`
	DataVersion      int                   `json:"dataVersion"`
	ExportedAt       time.Time             `json:"exportedAt"`
	SourceAppVersion string                `json:"sourceAppVersion"`
	BundleType       string                `json:"bundleType"`
	Roots            []archiveRoot         `json:"roots"`
	Files            map[string][]string   `json:"files"`
	Graph            string                `json:"graph"`
	Counts           map[string]int        `json:"counts"`
	References       map[string]any        `json:"references"`
	ExportStats      store.ExportPlanStats `json:"exportStats"`
}

type archiveRoot struct {
	Type  string `json:"type"`
	Key   string `json:"key"`
	Label string `json:"label"`
}

type archiveEntityFile struct {
	Type            string         `json:"type"`
	Key             string         `json:"key"`
	Label           string         `json:"label"`
	Data            any            `json:"data"`
	InternalRecords map[string]int `json:"internalRecords,omitempty"`
}

type archiveEntityPayload struct {
	Type  string          `json:"type"`
	Key   string          `json:"key"`
	Label string          `json:"label"`
	Data  json.RawMessage `json:"data"`
}

type archiveInternalRecords struct {
	CreatureLinks     []dbmodels.CampaignCreatureEntity            `json:"creatureLinks,omitempty"`
	CreatureActions   []dbmodels.CreatureActionEntity              `json:"creatureActions,omitempty"`
	CreatureRollParts []dbmodels.CreatureActionRollPartEntity      `json:"creatureRollParts,omitempty"`
	Spellcasting      []dbmodels.CreatureSpellcastingProfileEntity `json:"spellcasting,omitempty"`
	CreatureSpells    []dbmodels.CreatureSpellEntity               `json:"creatureSpells,omitempty"`
	SpellScaling      []dbmodels.SpellProjectileScalingEntity      `json:"spellScaling,omitempty"`
	SpellActions      []dbmodels.SpellActionEntity                 `json:"spellActions,omitempty"`
	SpellRollParts    []dbmodels.SpellActionRollPartEntity         `json:"spellRollParts,omitempty"`
	ActionTemplates   []dbmodels.ActionTemplateEntity              `json:"actionTemplates,omitempty"`
	ActionRollParts   []dbmodels.ActionTemplateRollPartEntity      `json:"actionRollParts,omitempty"`
	Combatants        []dbmodels.EncounterCombatantEntity          `json:"combatants,omitempty"`
	Runs              []dbmodels.EncounterRunEntity                `json:"runs,omitempty"`
	RunCombatants     []dbmodels.EncounterRunCombatantEntity       `json:"runCombatants,omitempty"`
	RunSpellSlots     []dbmodels.EncounterRunSpellSlotEntity       `json:"runSpellSlots,omitempty"`
	RunEffects        []dbmodels.EncounterRunActiveEffectEntity    `json:"runEffects,omitempty"`
	RunAlerts         []dbmodels.EncounterRunAlertEntity           `json:"runAlerts,omitempty"`
	CombatLog         []dbmodels.CombatLogEventEntity              `json:"combatLog,omitempty"`
	LocationLinks     []dbmodels.CampaignLocationLinkEntity        `json:"locationLinks,omitempty"`
	NPCLocationLinks  []dbmodels.CampaignNpcLocationLinkEntity     `json:"npcLocationLinks,omitempty"`
	LocationStock     []dbmodels.CampaignLocationStockEntity       `json:"locationStock,omitempty"`
	MapPins           []dbmodels.CampaignMapPinEntity              `json:"mapPins,omitempty"`
	RollTableRows     []dbmodels.RollTableRowEntity                `json:"rollTableRows,omitempty"`
	Assets            []store.ExportAsset                          `json:"assets,omitempty"`
}

func buildImportExportZip(pkg store.ExportPackage) ([]byte, error) {
	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	files := map[string][]string{}
	if err := writeArchiveDataFiles(writer, pkg, files); err != nil {
		_ = writer.Close()
		return nil, err
	}
	if err := writeArchiveJSON(writer, "graph.json", pkg.Manifest.DependencyGraph, pkg.Manifest.ExportedAt); err != nil {
		_ = writer.Close()
		return nil, err
	}
	files["graph"] = []string{"graph.json"}
	files["assets"] = archiveAssetPaths(pkg.Assets)
	manifest := archiveManifest{
		Format:           importExportArchiveFormat,
		Version:          importExportArchiveVersion,
		DataFormat:       pkg.Manifest.Format,
		DataVersion:      pkg.Manifest.Version,
		ExportedAt:       pkg.Manifest.ExportedAt,
		SourceAppVersion: pkg.Manifest.SourceAppVersion,
		BundleType:       pkg.Manifest.BundleType,
		Roots:            archiveRoots(pkg.Manifest.DependencyGraph.Projection),
		Files:            files,
		Graph:            "graph.json",
		Counts:           importExportCounts(pkg.Manifest),
		References:       pkg.Manifest.References,
		ExportStats:      pkg.Manifest.ExportStats,
	}
	if err := writeArchiveJSON(writer, "manifest.json", manifest, pkg.Manifest.ExportedAt); err != nil {
		_ = writer.Close()
		return nil, err
	}
	for _, asset := range pkg.Assets {
		if err := safeZipPath(asset.Asset.Path); err != nil {
			_ = writer.Close()
			return nil, err
		}
		header := &zip.FileHeader{Name: asset.Asset.Path, Method: zip.Deflate}
		header.SetModTime(pkg.Manifest.ExportedAt)
		fileWriter, err := writer.CreateHeader(header)
		if err != nil {
			_ = writer.Close()
			return nil, err
		}
		if _, err := fileWriter.Write(asset.Data); err != nil {
			_ = writer.Close()
			return nil, err
		}
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func writeArchiveDataFiles(writer *zip.Writer, pkg store.ExportPackage, files map[string][]string) error {
	add := func(group, kind, id, label string, data any, internal map[string]int) error {
		key := archiveEntityKey(label, id)
		name := group + "/" + key + ".json"
		files[group] = append(files[group], name)
		return writeArchiveJSON(writer, name, archiveEntityFile{Type: kind, Key: key, Label: label, Data: data, InternalRecords: internal}, pkg.Manifest.ExportedAt)
	}
	for _, entity := range pkg.Manifest.Campaigns {
		if err := add("campaigns", "campaign", entity.ID, entity.Name, entity, nil); err != nil {
			return err
		}
	}
	for _, entity := range pkg.Manifest.Encounters {
		if err := add("encounters", "encounter", entity.ID, entity.Name, entity, map[string]int{"combatants": countEncounterCombatants(pkg.Manifest, entity.ID), "runs": countEncounterRuns(pkg.Manifest, entity.ID)}); err != nil {
			return err
		}
	}
	for _, entity := range pkg.Manifest.NPCs {
		if err := add("npcs", "npc", entity.ID, entity.Name, entity, map[string]int{"actions": countCreatureActions(pkg.Manifest, entity.ID), "spells": countCreatureSpells(pkg.Manifest, entity.ID)}); err != nil {
			return err
		}
	}
	for _, entity := range pkg.Manifest.Players {
		if err := add("players", "player", entity.ID, entity.CharacterName, entity, nil); err != nil {
			return err
		}
	}
	for _, entity := range pkg.Manifest.Locations {
		group := locationArchiveGroup(entity.LocationType)
		if err := add(group, strings.TrimSuffix(group, "s"), entity.ID, entity.Name, entity, map[string]int{"stock": countLocationStock(pkg.Manifest, entity.ID), "npcPlacements": countNPCPlacements(pkg.Manifest, entity.ID)}); err != nil {
			return err
		}
	}
	for _, entity := range pkg.Manifest.Maps {
		if err := add("maps", "map", entity.ID, entity.Name, entity, map[string]int{"pins": countMapPins(pkg.Manifest, entity.ID)}); err != nil {
			return err
		}
	}
	for _, entity := range pkg.Manifest.Journeys {
		if err := add("journeys", "journey", entity.ID, entity.Name, entity, nil); err != nil {
			return err
		}
	}
	for _, entity := range pkg.Manifest.RollTables {
		if err := add("roll-tables", "roll table", entity.ID, entity.Name, entity, map[string]int{"rows": countRollTableRows(pkg.Manifest, entity.ID)}); err != nil {
			return err
		}
	}
	for _, entity := range pkg.Manifest.Items {
		if err := add("items", "item", entity.ID, entity.Name, entity, nil); err != nil {
			return err
		}
	}
	for _, entity := range pkg.Manifest.Spells {
		if err := add("spells", "spell", entity.ID, entity.Name, entity, map[string]int{"automation": countSpellActions(pkg.Manifest, entity.ID)}); err != nil {
			return err
		}
	}
	internal := archiveInternalRecordsFromManifest(pkg.Manifest)
	files["internal"] = []string{"internal/records.json"}
	return writeArchiveJSON(writer, "internal/records.json", internal, pkg.Manifest.ExportedAt)
}

func writeArchiveJSON(writer *zip.Writer, name string, value any, modTime time.Time) error {
	header := &zip.FileHeader{Name: name, Method: zip.Deflate}
	header.SetModTime(modTime)
	fileWriter, err := writer.CreateHeader(header)
	if err != nil {
		return err
	}
	encoder := json.NewEncoder(fileWriter)
	encoder.SetIndent("", "  ")
	return encoder.Encode(value)
}

func readImportExportUpload(w http.ResponseWriter, r *http.Request) (store.PortableManifest, map[string][]byte, int64, error) {
	r.Body = http.MaxBytesReader(w, r.Body, importExportMaxUploadBytes)
	reader, err := r.MultipartReader()
	if err != nil {
		return store.PortableManifest{}, nil, 0, errors.New("import must be a multipart ZIP upload")
	}
	var zipData []byte
	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return store.PortableManifest{}, nil, 0, errors.New("could not read import upload")
		}
		if part.FormName() != "bundle" {
			_ = part.Close()
			continue
		}
		zipData, err = io.ReadAll(io.LimitReader(part, importExportMaxUploadBytes+1))
		_ = part.Close()
		if err != nil {
			return store.PortableManifest{}, nil, 0, errors.New("could not read import upload")
		}
		break
	}
	if len(zipData) == 0 {
		return store.PortableManifest{}, nil, 0, errors.New("ZIP bundle is required")
	}
	if len(zipData) > importExportMaxUploadBytes {
		return store.PortableManifest{}, nil, 0, errors.New("ZIP bundle is too large")
	}
	manifest, assets, err := parseImportExportZip(zipData)
	return manifest, assets, int64(len(zipData)), err
}

func parseImportExportZip(data []byte) (store.PortableManifest, map[string][]byte, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return store.PortableManifest{}, nil, errors.New("malformed ZIP bundle")
	}
	if len(reader.File) > importExportMaxEntries {
		return store.PortableManifest{}, nil, errors.New("ZIP bundle has too many entries")
	}
	entries := map[string][]byte{}
	assets := map[string][]byte{}
	seenEntries := map[string]struct{}{}
	for _, file := range reader.File {
		if err := safeZipPath(file.Name); err != nil {
			return store.PortableManifest{}, nil, err
		}
		if _, exists := seenEntries[file.Name]; exists {
			return store.PortableManifest{}, nil, errors.New("ZIP bundle contains duplicate files")
		}
		seenEntries[file.Name] = struct{}{}
		if file.Method != zip.Store && file.Method != zip.Deflate {
			return store.PortableManifest{}, nil, errors.New("ZIP bundle uses an unsupported compression method")
		}
		if file.FileInfo().IsDir() {
			continue
		}
		limit := int64(importExportMaxJSONBytes)
		if strings.HasPrefix(file.Name, "assets/") {
			limit = importExportMaxAssetBytes
		}
		if file.UncompressedSize64 > uint64(limit) {
			return store.PortableManifest{}, nil, errors.New("ZIP entry is too large")
		}
		handle, err := file.Open()
		if err != nil {
			return store.PortableManifest{}, nil, errors.New("could not read ZIP entry")
		}
		content, readErr := io.ReadAll(io.LimitReader(handle, limit+1))
		_ = handle.Close()
		if readErr != nil {
			return store.PortableManifest{}, nil, errors.New("could not read ZIP entry")
		}
		if strings.HasPrefix(file.Name, "assets/") {
			assets[file.Name] = content
		} else {
			entries[file.Name] = content
		}
	}
	manifest, err := parseArchiveManifest(entries)
	if err != nil {
		return store.PortableManifest{}, nil, err
	}
	if err := store.ValidatePortableManifest(manifest); err != nil {
		return store.PortableManifest{}, nil, err
	}
	if err := validateImportExportAssets(manifest, assets); err != nil {
		return store.PortableManifest{}, nil, err
	}
	return manifest, assets, nil
}

func parseArchiveManifest(entries map[string][]byte) (store.PortableManifest, error) {
	if raw, ok := entries["bludm-export.json"]; ok {
		var manifest store.PortableManifest
		if err := json.Unmarshal(raw, &manifest); err != nil {
			return store.PortableManifest{}, errors.New("manifest JSON is malformed")
		}
		return manifest, nil
	}
	raw, ok := entries["manifest.json"]
	if !ok {
		return store.PortableManifest{}, errors.New("manifest is missing")
	}
	var archive archiveManifest
	if err := json.Unmarshal(raw, &archive); err != nil {
		return store.PortableManifest{}, errors.New("manifest JSON is malformed")
	}
	if archive.Format != importExportArchiveFormat || archive.Version != importExportArchiveVersion {
		return store.PortableManifest{}, fmt.Errorf("unsupported archive version %d", archive.Version)
	}
	if err := validateArchiveIndex(entries, archive); err != nil {
		return store.PortableManifest{}, err
	}
	manifest := store.PortableManifest{
		Format:           blankArchiveDefault(archive.DataFormat, store.ImportExportFormat),
		Version:          archive.DataVersion,
		ExportedAt:       archive.ExportedAt,
		SourceAppVersion: archive.SourceAppVersion,
		BundleType:       archive.BundleType,
		References:       archive.References,
		ExportStats:      archive.ExportStats,
	}
	if manifest.Version == 0 {
		manifest.Version = store.ImportExportVersion
	}
	if err := hydrateArchiveDataFiles(entries, archive.Files, &manifest); err != nil {
		return store.PortableManifest{}, err
	}
	if graphRaw, ok := entries[blankArchiveDefault(archive.Graph, "graph.json")]; ok {
		if err := json.Unmarshal(graphRaw, &manifest.DependencyGraph); err != nil {
			return store.PortableManifest{}, errors.New("graph JSON is malformed")
		}
	}
	return manifest, nil
}

func hydrateArchiveDataFiles(entries map[string][]byte, files map[string][]string, manifest *store.PortableManifest) error {
	for group, paths := range files {
		for _, archivePath := range paths {
			if group == "assets" || group == "graph" {
				continue
			}
			raw, ok := entries[archivePath]
			if !ok {
				return errors.New("archive manifest references a missing data file")
			}
			if group == "internal" {
				var internal archiveInternalRecords
				if err := json.Unmarshal(raw, &internal); err != nil {
					return errors.New("internal archive records are malformed")
				}
				applyArchiveInternalRecords(manifest, internal)
				continue
			}
			if err := hydrateArchiveEntity(group, raw, manifest); err != nil {
				return err
			}
		}
	}
	return nil
}

func hydrateArchiveEntity(group string, raw []byte, manifest *store.PortableManifest) error {
	var payload archiveEntityPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return errors.New("archive entity file is malformed")
	}
	switch group {
	case "campaigns":
		return appendArchiveEntity(payload.Data, &manifest.Campaigns)
	case "encounters":
		return appendArchiveEntity(payload.Data, &manifest.Encounters)
	case "npcs":
		return appendArchiveEntity(payload.Data, &manifest.NPCs)
	case "players":
		return appendArchiveEntity(payload.Data, &manifest.Players)
	case "locations", "shops", "dungeons":
		return appendArchiveEntity(payload.Data, &manifest.Locations)
	case "maps":
		return appendArchiveEntity(payload.Data, &manifest.Maps)
	case "journeys":
		return appendArchiveEntity(payload.Data, &manifest.Journeys)
	case "roll-tables":
		return appendArchiveEntity(payload.Data, &manifest.RollTables)
	case "items":
		return appendArchiveEntity(payload.Data, &manifest.Items)
	case "spells":
		return appendArchiveEntity(payload.Data, &manifest.Spells)
	default:
		return nil
	}
}

func appendArchiveEntity[T any](raw json.RawMessage, target *[]T) error {
	var entity T
	if err := json.Unmarshal(raw, &entity); err != nil {
		return errors.New("archive entity data is malformed")
	}
	*target = append(*target, entity)
	return nil
}

func validateImportExportAssets(manifest store.PortableManifest, assets map[string][]byte) error {
	seenIDs := map[string]struct{}{}
	seenPaths := map[string]struct{}{}
	for _, asset := range manifest.Assets {
		if strings.TrimSpace(asset.ID) == "" {
			return errors.New("manifest contains an asset without an ID")
		}
		if _, exists := seenIDs[asset.ID]; exists {
			return errors.New("manifest contains duplicate asset IDs")
		}
		seenIDs[asset.ID] = struct{}{}
		if err := safeZipPath(asset.Path); err != nil {
			return err
		}
		if !strings.HasPrefix(asset.Path, "assets/") {
			return errors.New("manifest asset path must be inside assets/")
		}
		if _, exists := seenPaths[asset.Path]; exists {
			return errors.New("manifest contains duplicate asset paths")
		}
		seenPaths[asset.Path] = struct{}{}
		if _, ok := assets[asset.Path]; !ok {
			return errors.New("manifest references a missing asset file")
		}
		if !allowedImportExportAssetType(asset.ContentType) {
			return errors.New("manifest contains an unsupported asset MIME type")
		}
		if asset.ByteSize > importExportMaxAssetBytes {
			return errors.New("manifest references an oversized asset")
		}
		if strings.TrimSpace(asset.SHA256) != "" {
			sum := sha256.Sum256(assets[asset.Path])
			if hex.EncodeToString(sum[:]) != strings.TrimSpace(asset.SHA256) {
				return errors.New("manifest asset hash does not match ZIP entry")
			}
		}
	}
	for path := range assets {
		if _, ok := seenPaths[path]; !ok {
			return errors.New("ZIP bundle contains an asset not listed in the manifest")
		}
	}
	return nil
}

func allowedImportExportAssetType(contentType string) bool {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "image/gif", "image/jpeg", "image/png", "image/webp":
		return true
	default:
		return false
	}
}

func safeZipPath(name string) error {
	name = strings.TrimSpace(name)
	clean := path.Clean(name)
	if name == "" || strings.HasPrefix(name, "/") || strings.HasPrefix(name, "\\") || strings.Contains(name, "\\") || strings.Contains(clean, "../") || clean == ".." || clean != name {
		return errors.New("ZIP bundle contains an unsafe path")
	}
	return nil
}
