package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"bludm/backend/internal/store"
)

const importExportMaxUploadBytes = 50 << 20
const importExportMaxEntries = 1500
const importExportMaxAssetBytes = 10 << 20

type exportCreateRequest struct {
	BundleType  string   `json:"bundleType"`
	CampaignIDs []string `json:"campaignIds"`
	ObjectIDs   []string `json:"objectIds"`
	Options     struct {
		IncludeAssets        bool `json:"includeAssets"`
		IncludeDungeonStudio bool `json:"includeDungeonStudio"`
		IncludePlayers       bool `json:"includePlayers"`
	} `json:"options"`
}

func (s *Server) createImportExportExport(w http.ResponseWriter, r *http.Request) {
	started := time.Now()
	user, _ := s.currentUser(r)
	var req exportCreateRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.BundleType == "" {
		req.BundleType = "everything"
	}
	pkg, err := s.stores.ImportExport.Export(r.Context(), user.ID, store.ExportOptions{
		BundleType:           req.BundleType,
		CampaignIDs:          req.CampaignIDs,
		ObjectIDs:            req.ObjectIDs,
		IncludeAssets:        req.Options.IncludeAssets,
		IncludeDungeonStudio: req.Options.IncludeDungeonStudio,
		IncludePlayers:       req.Options.IncludePlayers,
	})
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "campaign not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	zipStarted := time.Now()
	data, err := buildImportExportZip(pkg)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not build export")
		return
	}
	stats := pkg.Stats
	stats.ZipGenerationMillis = time.Since(zipStarted).Milliseconds()
	manifestSummary := store.ImportExportManifestSummary(pkg.Manifest)
	manifestSummary["exportStats"] = stats
	id := randomExportID()
	filename := importExportFilename(pkg.Manifest.BundleType, pkg.Manifest.ExportedAt)
	s.rememberExport(id, cachedExport{Filename: filename, Data: data, CreatedAt: time.Now().UTC()})
	history, err := s.stores.ImportExport.RecordHistory(r.Context(), user.ID, store.ImportExportHistoryInput{
		Action:           "export",
		BundleType:       pkg.Manifest.BundleType,
		Name:             filename,
		ExportID:         &id,
		BundleVersion:    pkg.Manifest.Version,
		SourceAppVersion: pkg.Manifest.SourceAppVersion,
		SizeBytes:        int64(len(data)),
		DurationMillis:   time.Since(started).Milliseconds(),
		Status:           "success",
		Warnings:         pkg.Manifest.DependencyGraph.Warnings,
		Counts:           importExportCounts(pkg.Manifest),
		ManifestSummary:  manifestSummary,
		DependencyGraph:  pkg.Manifest.DependencyGraph,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not record export history")
		return
	}
	history = s.withHistoryDownloadState(history)
	writeJSON(w, http.StatusCreated, map[string]any{
		"export": map[string]any{
			"id":                id,
			"historyId":         history.ID,
			"name":              filename,
			"bundleType":        pkg.Manifest.BundleType,
			"downloadUrl":       "/api/import-export/exports/" + id + "/download",
			"downloadExpiresAt": history.DownloadExpiresAt,
			"size":              len(data),
			"counts":            importExportCounts(pkg.Manifest),
			"createdAt":         pkg.Manifest.ExportedAt,
			"dependencyGraph":   pkg.Manifest.DependencyGraph,
			"stats":             stats,
		},
		"history": history,
	})
}

func (s *Server) downloadImportExportExport(w http.ResponseWriter, r *http.Request) {
	exportID := strings.TrimSpace(r.PathValue("exportID"))
	entry, ok := s.cachedExport(exportID)
	if !ok {
		writeError(w, http.StatusNotFound, "export ZIP has expired; create a fresh export to download the archive again")
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", entry.Filename))
	w.Header().Set("Cache-Control", "private, no-store")
	// The response is a binary ZIP attachment, not an HTML document.
	// nosemgrep: go.lang.security.audit.xss.no-direct-write-to-responsewriter.no-direct-write-to-responsewriter
	_, _ = w.Write(entry.Data)
}

func (s *Server) previewImportExportImport(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	manifest, assets, totalBytes, err := readImportExportUpload(w, r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	preview, err := s.stores.ImportExport.Preview(r.Context(), user.ID, manifest, assets, totalBytes)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	mode := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("mode")))
	if mode == "merge" {
		plan, err := s.stores.ImportExport.PlanMerge(r.Context(), store.MergePlanInput{
			OwnerUserID:      user.ID,
			TargetCampaignID: strings.TrimSpace(r.URL.Query().Get("targetCampaignId")),
			Manifest:         manifest,
			Assets:           assets,
		})
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		preview.MergePlan = &plan
		preview.Warnings = append(preview.Warnings, "Merge Planner Preview: review the planner decisions before confirming merge execution.")
	}
	writeJSON(w, http.StatusOK, map[string]any{"preview": preview})
}

func (s *Server) executeImportExportImport(w http.ResponseWriter, r *http.Request) {
	started := time.Now()
	user, _ := s.currentUser(r)
	mode := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("mode")))
	if mode == "" {
		mode = "clone"
	}
	if mode != "clone" && mode != "restore" && mode != "merge" {
		writeError(w, http.StatusBadRequest, "unsupported import mode")
		return
	}
	if mode == "restore" && r.URL.Query().Get("confirmRestore") != "true" {
		writeError(w, http.StatusBadRequest, "restore import requires explicit confirmation")
		return
	}
	if mode == "merge" && r.URL.Query().Get("confirmMerge") != "true" {
		writeError(w, http.StatusBadRequest, "merge import requires explicit confirmation")
		return
	}
	manifest, assets, totalBytes, err := readImportExportUpload(w, r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	graph := store.BuildDependencyGraph(manifest)
	var result store.CloneImportResult
	var mergePlan *store.MergePlan
	if mode == "restore" {
		result, err = s.stores.ImportExport.RestoreImport(r.Context(), user.ID, manifest, assets)
	} else if mode == "merge" {
		var plan store.MergePlan
		result, plan, err = s.stores.ImportExport.MergeImport(r.Context(), user.ID, manifest, assets)
		mergePlan = &plan
	} else {
		result, err = s.stores.ImportExport.CloneImport(r.Context(), user.ID, manifest, assets)
	}
	if err != nil {
		manifestSummary := store.ImportExportManifestSummary(manifest)
		if mergePlan != nil {
			manifestSummary["mergePlan"] = mergePlan
		}
		if mode == "merge" {
			manifestSummary["mergeProvenance"] = store.MergeProvenanceForManifest(manifest, mode, "")
		}
		_, _ = s.stores.ImportExport.RecordHistory(r.Context(), user.ID, store.ImportExportHistoryInput{
			Action:           "import",
			BundleType:       manifest.BundleType,
			Name:             importExportHistoryName("import", manifest.BundleType, time.Now().UTC()),
			ImportMode:       mode,
			BundleVersion:    manifest.Version,
			SourceAppVersion: manifest.SourceAppVersion,
			SizeBytes:        totalBytes,
			DurationMillis:   time.Since(started).Milliseconds(),
			Status:           "failed",
			Warnings:         graph.Warnings,
			Counts:           importExportCounts(manifest),
			ManifestSummary:  manifestSummary,
			DependencyGraph:  graph,
		})
		writeError(w, http.StatusBadRequest, "could not "+mode+" bundle: "+err.Error())
		return
	}
	manifestSummary := store.ImportExportManifestSummary(manifest)
	if mergePlan != nil {
		manifestSummary["mergePlan"] = mergePlan
	}
	if mode == "merge" {
		manifestSummary["mergeProvenance"] = store.MergeProvenanceForManifest(manifest, mode, "")
	}
	history, err := s.stores.ImportExport.RecordHistory(r.Context(), user.ID, store.ImportExportHistoryInput{
		Action:           "import",
		BundleType:       manifest.BundleType,
		Name:             importExportHistoryName("import", manifest.BundleType, time.Now().UTC()),
		ImportMode:       mode,
		BundleVersion:    manifest.Version,
		SourceAppVersion: manifest.SourceAppVersion,
		SizeBytes:        totalBytes,
		DurationMillis:   time.Since(started).Milliseconds(),
		Status:           "success",
		Warnings:         graph.Warnings,
		Counts:           importExportCounts(manifest),
		ManifestSummary:  manifestSummary,
		DependencyGraph:  graph,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not record import history")
		return
	}
	response := map[string]any{"import": result, "history": history}
	if mergePlan != nil {
		response["mergePlan"] = mergePlan
	}
	writeJSON(w, http.StatusCreated, response)
}

func (s *Server) listImportExportHistory(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	records, err := s.stores.ImportExport.History(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load import/export history")
		return
	}
	for index := range records {
		records[index] = s.withHistoryDownloadState(records[index])
	}
	writeJSON(w, http.StatusOK, map[string]any{"history": records})
}

func (s *Server) getImportExportHistory(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	record, err := s.stores.ImportExport.HistoryEntry(r.Context(), user.ID, strings.TrimSpace(r.PathValue("historyID")))
	if err != nil {
		writeError(w, http.StatusNotFound, "history entry not found")
		return
	}
	record = s.withHistoryDownloadState(record)
	writeJSON(w, http.StatusOK, map[string]any{"history": record})
}

func (s *Server) deleteImportExportHistory(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	if err := s.stores.ImportExport.DeleteHistory(r.Context(), user.ID, strings.TrimSpace(r.PathValue("historyID"))); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete history entry")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) clearImportExportHistory(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	if err := s.stores.ImportExport.ClearHistory(r.Context(), user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not clear history")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) rememberExport(id string, entry cachedExport) {
	s.exportCache.mu.Lock()
	defer s.exportCache.mu.Unlock()
	for key, cached := range s.exportCache.entries {
		if time.Since(cached.CreatedAt) > time.Hour {
			delete(s.exportCache.entries, key)
		}
	}
	s.exportCache.entries[id] = entry
}

func (s *Server) cachedExport(id string) (cachedExport, bool) {
	s.exportCache.mu.Lock()
	defer s.exportCache.mu.Unlock()
	entry, ok := s.exportCache.entries[id]
	if !ok || time.Since(entry.CreatedAt) > time.Hour {
		delete(s.exportCache.entries, id)
		return cachedExport{}, false
	}
	return entry, true
}

func (s *Server) exportCacheAvailable(id string) bool {
	s.exportCache.mu.Lock()
	defer s.exportCache.mu.Unlock()
	entry, ok := s.exportCache.entries[id]
	if !ok || time.Since(entry.CreatedAt) > time.Hour {
		delete(s.exportCache.entries, id)
		return false
	}
	return true
}

func (s *Server) withHistoryDownloadState(record store.ImportExportHistoryRecord) store.ImportExportHistoryRecord {
	if record.ExportID == nil {
		return record
	}
	if s.exportCacheAvailable(*record.ExportID) {
		record.DownloadAvailable = true
		record.DownloadStatus = "Download available until the cached archive expires."
		return record
	}
	record.DownloadAvailable = false
	record.DownloadStatus = "Archive bytes have expired; history and inspection data are still available."
	return record
}

func randomExportID() string {
	var data [16]byte
	if _, err := rand.Read(data[:]); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(data[:])
}

func importExportFilename(bundleType string, exportedAt time.Time) string {
	stamp := exportedAt.Format("20060102-150405")
	if bundleType == "" {
		bundleType = "bundle"
	}
	return "bludm-" + bundleType + "-" + stamp + ".zip"
}

func importExportHistoryName(action, bundleType string, at time.Time) string {
	if bundleType == "" {
		bundleType = "bundle"
	}
	return "bludm-" + action + "-" + bundleType + "-" + at.Format("20060102-150405")
}

func importExportCounts(manifest store.PortableManifest) map[string]int {
	return map[string]int{
		"campaigns":  len(manifest.Campaigns),
		"encounters": len(manifest.Encounters),
		"players":    len(manifest.Players),
		"npcs":       len(manifest.NPCs),
		"maps":       len(manifest.Maps),
		"locations":  len(manifest.Locations),
		"journeys":   len(manifest.Journeys),
		"rollTables": len(manifest.RollTables),
		"spells":     len(manifest.Spells),
		"items":      len(manifest.Items),
		"assets":     len(manifest.Assets),
	}
}
