package httpapi

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/store"
)

func TestBuildImportExportZipWritesSplitArchive(t *testing.T) {
	exportedAt := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	data, err := buildImportExportZip(store.ExportPackage{
		Manifest: store.PortableManifest{
			Format:     store.ImportExportFormat,
			Version:    store.ImportExportVersion,
			ExportedAt: exportedAt,
			BundleType: "campaign",
			Campaigns:  []dbmodels.CampaignEntity{{ID: "campaign-1", Name: "Ash Coast"}},
			DependencyGraph: store.BuildDependencyGraph(store.PortableManifest{
				Format:     store.ImportExportFormat,
				Version:    store.ImportExportVersion,
				BundleType: "campaign",
				Campaigns:  []dbmodels.CampaignEntity{{ID: "campaign-1", Name: "Ash Coast"}},
			}),
			Assets: []store.ExportAsset{
				{
					ID:          "asset-1",
					Filename:    "avatar.png",
					ContentType: "image/png",
					ByteSize:    4,
					Path:        "assets/avatar.png",
				},
			},
		},
		Assets: []store.ExportAssetFile{
			{
				Asset: store.ExportAsset{Path: "assets/avatar.png"},
				Data:  []byte("data"),
			},
		},
	})
	if err != nil {
		t.Fatalf("expected ZIP export: %v", err)
	}

	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		t.Fatalf("expected readable ZIP: %v", err)
	}
	names := map[string]bool{}
	for _, file := range reader.File {
		names[file.Name] = true
	}
	if names["bludm-export.json"] {
		t.Fatalf("expected v2 split archive, got legacy manifest entry: %+v", names)
	}
	if !names["manifest.json"] || !names["graph.json"] || !names["internal/records.json"] || !names["assets/avatar.png"] {
		t.Fatalf("expected split manifest, graph, internal records, and asset entries, got %+v", names)
	}
	foundCampaign := false
	for name := range names {
		if strings.HasPrefix(name, "campaigns/") && strings.HasSuffix(name, ".json") {
			foundCampaign = true
		}
	}
	if !foundCampaign {
		t.Fatalf("expected campaign logical file, got %+v", names)
	}
}

func TestExportCacheDownloadLifecycle(t *testing.T) {
	server := &Server{exportCache: exportCache{entries: map[string]cachedExport{}}}
	server.rememberExport("fresh", cachedExport{
		Filename:  "fresh.zip",
		Data:      []byte("zip"),
		CreatedAt: time.Now().UTC(),
	})
	entry, ok := server.cachedExport("fresh")
	if !ok || string(entry.Data) != "zip" {
		t.Fatalf("expected cached export download, got ok=%v entry=%+v", ok, entry)
	}

	server.rememberExport("expired", cachedExport{
		Filename:  "expired.zip",
		Data:      []byte("old"),
		CreatedAt: time.Now().Add(-2 * time.Hour).UTC(),
	})
	if _, ok := server.cachedExport("expired"); ok {
		t.Fatal("expected expired export download to be unavailable")
	}
	if _, exists := server.exportCache.entries["expired"]; exists {
		t.Fatal("expected expired export to be removed from cache")
	}
}

func TestHistoryDownloadStateSurvivesCacheExpiry(t *testing.T) {
	expiresAt := time.Now().UTC().Add(-time.Hour)
	exportID := "expired-history"
	server := &Server{exportCache: exportCache{entries: map[string]cachedExport{
		exportID: {Filename: "expired.zip", Data: []byte("old"), CreatedAt: expiresAt},
	}}}
	record := store.ImportExportHistoryRecord{
		ID:              "history-1",
		Action:          "export",
		BundleType:      "campaign",
		Name:            "expired.zip",
		ExportID:        &exportID,
		DownloadURL:     "/api/import-export/exports/" + exportID + "/download",
		DependencyGraph: store.DependencyGraph{Nodes: []store.DependencyGraphNode{{ID: "campaign:1", Kind: "campaign", Label: "Ash Coast"}}},
	}

	decorated := server.withHistoryDownloadState(record)

	if decorated.DownloadAvailable {
		t.Fatal("expected expired history download to be unavailable")
	}
	if decorated.DependencyGraph.Nodes[0].Label != "Ash Coast" {
		t.Fatalf("expected inspector graph metadata to survive cache expiry, got %+v", decorated.DependencyGraph)
	}
	if !strings.Contains(decorated.DownloadStatus, "expired") {
		t.Fatalf("expected expiry status, got %q", decorated.DownloadStatus)
	}
}

func TestExpiredExportDownloadFailsClearly(t *testing.T) {
	exportID := "expired-download"
	server := &Server{exportCache: exportCache{entries: map[string]cachedExport{
		exportID: {Filename: "expired.zip", Data: []byte("old"), CreatedAt: time.Now().Add(-2 * time.Hour).UTC()},
	}}}
	req := httptest.NewRequest(http.MethodGet, "/api/import-export/exports/"+exportID+"/download", nil)
	req.SetPathValue("exportID", exportID)
	res := httptest.NewRecorder()

	server.downloadImportExportExport(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected not found for expired export, got %d", res.Code)
	}
	if !strings.Contains(res.Body.String(), "expired") {
		t.Fatalf("expected clear expiry message, got %s", res.Body.String())
	}
}

func TestParseImportExportZipReadsSplitArchive(t *testing.T) {
	exportedAt := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	manifest := store.PortableManifest{
		Format:     store.ImportExportFormat,
		Version:    store.ImportExportVersion,
		ExportedAt: exportedAt,
		BundleType: "campaign",
		Campaigns:  []dbmodels.CampaignEntity{{ID: "campaign-1", Name: "Ash Coast"}},
		Locations: []dbmodels.CampaignLocationEntity{
			{ID: "shop-1", CampaignID: "campaign-1", Name: "Moth & Mortar", LocationType: "shop"},
		},
		LocationStock: []dbmodels.CampaignLocationStockEntity{
			{ID: "stock-1", CampaignID: "campaign-1", LocationID: "shop-1", ItemID: "item-1", LibrarySource: "user"},
		},
		Items: []dbmodels.ItemEntity{{ID: "item-1", Name: "Healing Potion"}},
	}
	manifest.DependencyGraph = store.BuildDependencyGraph(manifest)
	data, err := buildImportExportZip(store.ExportPackage{Manifest: manifest})
	if err != nil {
		t.Fatalf("expected ZIP export: %v", err)
	}

	parsed, _, err := parseImportExportZip(data)
	if err != nil {
		t.Fatalf("expected split archive to parse: %v", err)
	}
	if len(parsed.Campaigns) != 1 || parsed.Campaigns[0].Name != "Ash Coast" {
		t.Fatalf("expected campaign to round trip, got %+v", parsed.Campaigns)
	}
	if len(parsed.LocationStock) != 1 {
		t.Fatalf("expected internal stock row to round trip, got %+v", parsed.LocationStock)
	}
}

func TestParseImportExportZipKeepsLegacySingleFileSupport(t *testing.T) {
	manifest := store.PortableManifest{
		Format:     store.ImportExportFormat,
		Version:    store.ImportExportVersion,
		BundleType: "campaign",
		Campaigns:  []dbmodels.CampaignEntity{{ID: "campaign-1", Name: "Legacy Coast"}},
	}
	raw, err := json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	data := zipWithEntries(t, map[string][]byte{"bludm-export.json": raw})

	parsed, _, err := parseImportExportZip(data)
	if err != nil {
		t.Fatalf("expected legacy archive to parse: %v", err)
	}
	if len(parsed.Campaigns) != 1 || parsed.Campaigns[0].Name != "Legacy Coast" {
		t.Fatalf("expected legacy campaign, got %+v", parsed.Campaigns)
	}
}

func TestParseImportExportZipRejectsInvalidSplitArchiveIndex(t *testing.T) {
	manifest := archiveManifest{
		Format:      importExportArchiveFormat,
		Version:     importExportArchiveVersion,
		DataFormat:  store.ImportExportFormat,
		DataVersion: store.ImportExportVersion,
		BundleType:  "campaign",
		Graph:       "graph.json",
		Files: map[string][]string{
			"campaigns": {"campaigns/missing.json"},
			"graph":     {"graph.json"},
			"internal":  {"internal/records.json"},
		},
	}
	raw, err := json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	data := zipWithEntries(t, map[string][]byte{
		"manifest.json":         raw,
		"graph.json":            []byte(`{}`),
		"internal/records.json": []byte(`{}`),
	})
	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected missing indexed logical file to be rejected")
	}

	manifest.Files["campaigns"] = []string{}
	raw, err = json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	data = zipWithEntries(t, map[string][]byte{
		"manifest.json":            raw,
		"graph.json":               []byte(`{}`),
		"internal/records.json":    []byte(`{}`),
		"campaigns/unindexed.json": []byte(`{}`),
	})
	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected unindexed logical file to be rejected")
	}

	data = zipWithEntries(t, map[string][]byte{
		"manifest.json":         raw,
		"graph.json":            []byte(`{`),
		"internal/records.json": []byte(`{}`),
	})
	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected malformed graph JSON to be rejected")
	}
}

func TestParseImportExportZipRejectsMalformedAndUnsafeBundles(t *testing.T) {
	if _, _, err := parseImportExportZip([]byte("not a zip")); err == nil {
		t.Fatal("expected malformed ZIP to be rejected")
	}
	data := zipWithEntries(t, map[string][]byte{
		"../bludm-export.json": []byte("{}"),
	})
	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected unsafe path to be rejected")
	}
	data = zipWithEntries(t, map[string][]byte{
		"bludm-export.json": []byte("{"),
	})
	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected malformed manifest to be rejected")
	}
}

func TestParseImportExportZipValidatesManifestVersion(t *testing.T) {
	manifest := store.PortableManifest{
		Format:     store.ImportExportFormat,
		Version:    999,
		BundleType: "campaign",
	}
	raw, err := json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	data := zipWithEntries(t, map[string][]byte{"bludm-export.json": raw})

	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected unsupported version to be rejected")
	}
}

func TestParseImportExportZipRejectsAssetIntegrityProblems(t *testing.T) {
	manifest := store.PortableManifest{
		Format:     store.ImportExportFormat,
		Version:    store.ImportExportVersion,
		BundleType: "npc",
		Assets: []store.ExportAsset{
			{
				ID:          "asset-1",
				Filename:    "portrait.png",
				ContentType: "image/png",
				ByteSize:    4,
				Path:        "assets/portrait.png",
				SHA256:      "3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7",
			},
		},
	}
	raw, err := json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	data := zipWithEntries(t, map[string][]byte{"bludm-export.json": raw})
	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected missing manifest asset to be rejected")
	}

	data = zipWithEntries(t, map[string][]byte{
		"bludm-export.json":   raw,
		"assets/portrait.png": []byte("data"),
		"assets/extra.png":    []byte("data"),
	})
	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected unlisted asset file to be rejected")
	}

	manifest.Assets[0].SHA256 = "0000000000000000000000000000000000000000000000000000000000000000"
	raw, err = json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	data = zipWithEntries(t, map[string][]byte{
		"bludm-export.json":   raw,
		"assets/portrait.png": []byte("data"),
	})
	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected asset hash mismatch to be rejected")
	}

	manifest.Assets[0].ContentType = "text/plain"
	manifest.Assets[0].SHA256 = "3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7"
	raw, err = json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	data = zipWithEntries(t, map[string][]byte{
		"bludm-export.json":   raw,
		"assets/portrait.png": []byte("data"),
	})
	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected invalid asset MIME type to be rejected")
	}
}

func TestParseImportExportZipRejectsDuplicateFiles(t *testing.T) {
	data := zipWithOrderedEntries(t, []zipEntry{
		{name: "bludm-export.json", data: []byte(`{"format":"bludm.campaign-export","version":1,"bundleType":"npc"}`)},
		{name: "assets/portrait.png", data: []byte("data")},
		{name: "assets/portrait.png", data: []byte("data")},
	})
	if _, _, err := parseImportExportZip(data); err == nil {
		t.Fatal("expected duplicate ZIP entries to be rejected")
	}
}

func zipWithEntries(t *testing.T, entries map[string][]byte) []byte {
	t.Helper()
	ordered := make([]zipEntry, 0, len(entries))
	for name, data := range entries {
		ordered = append(ordered, zipEntry{name: name, data: data})
	}
	return zipWithOrderedEntries(t, ordered)
}

type zipEntry struct {
	name string
	data []byte
}

func zipWithOrderedEntries(t *testing.T, entries []zipEntry) []byte {
	t.Helper()
	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	for _, file := range entries {
		entry, err := writer.Create(file.name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := entry.Write(file.data); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}
