package httpapi

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"path"
	"path/filepath"
	"strings"
)

type decodedMarkdownAsset struct {
	Path        string
	Filename    string
	ContentType string
	Data        []byte
}

func decodeMarkdownAssets(payloads []markdownAssetPayload) (map[string]decodedMarkdownAsset, error) {
	result := map[string]decodedMarkdownAsset{}
	for _, payload := range payloads {
		assetPath := normalizeMarkdownAssetPath(payload.Path)
		if assetPath == "" {
			return nil, fmt.Errorf("asset path is required")
		}
		data, err := base64.StdEncoding.DecodeString(payload.DataBase64)
		if err != nil || len(data) == 0 || len(data) > maxImageBytes {
			return nil, fmt.Errorf("asset %q must contain a base64 image up to 5 MB", assetPath)
		}
		detected := http.DetectContentType(data)
		if detected != "image/png" && detected != "image/jpeg" &&
			detected != "image/gif" && detected != "image/webp" {
			return nil, fmt.Errorf("asset %q must be PNG, JPEG, GIF, or WebP", assetPath)
		}
		filename := filepath.Base(payload.Filename)
		if filename == "." || filename == "" {
			filename = filepath.Base(assetPath)
		}
		result[strings.ToLower(assetPath)] = decodedMarkdownAsset{
			Path: assetPath, Filename: filename, ContentType: detected, Data: data,
		}
	}
	return result, nil
}

func referencedMarkdownAsset(
	sourcePath string,
	reference string,
	assets map[string]decodedMarkdownAsset,
) (decodedMarkdownAsset, bool) {
	reference = strings.TrimSpace(strings.ReplaceAll(reference, "\\", "/"))
	candidates := []string{normalizeMarkdownAssetPath(reference)}
	if !strings.HasPrefix(reference, "/") {
		candidates = append(candidates, normalizeMarkdownAssetPath(path.Join(path.Dir(sourcePath), reference)))
	}
	for _, candidate := range candidates {
		if asset, ok := assets[strings.ToLower(candidate)]; ok {
			return asset, true
		}
	}
	var basenameMatch *decodedMarkdownAsset
	for _, asset := range assets {
		if !strings.EqualFold(path.Base(asset.Path), path.Base(reference)) {
			continue
		}
		if basenameMatch != nil {
			return decodedMarkdownAsset{}, false
		}
		candidate := asset
		basenameMatch = &candidate
	}
	if basenameMatch != nil {
		return *basenameMatch, true
	}
	return decodedMarkdownAsset{}, false
}

func normalizeMarkdownAssetPath(value string) string {
	value = strings.TrimSpace(strings.ReplaceAll(value, "\\", "/"))
	value = strings.TrimPrefix(path.Clean("/"+value), "/")
	if value == "." {
		return ""
	}
	return value
}
