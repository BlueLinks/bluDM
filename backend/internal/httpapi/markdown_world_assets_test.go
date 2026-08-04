package httpapi

import (
	"encoding/base64"
	"testing"
)

func TestDecodeMarkdownAssetsValidatesDetectedImageContent(t *testing.T) {
	pngHeader := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}
	assets, err := decodeMarkdownAssets([]markdownAssetPayload{{
		Path: "Assets/Keeper.png", Filename: "Keeper.png",
		ContentType: "text/plain", DataBase64: base64.StdEncoding.EncodeToString(pngHeader),
	}})
	if err != nil {
		t.Fatalf("decode image asset: %v", err)
	}
	asset, ok := assets["assets/keeper.png"]
	if !ok || asset.ContentType != "image/png" {
		t.Fatalf("expected detected PNG asset, got %+v", assets)
	}

	_, err = decodeMarkdownAssets([]markdownAssetPayload{{
		Path:       "Assets/fake.png",
		DataBase64: base64.StdEncoding.EncodeToString([]byte("not an image")),
	}})
	if err == nil {
		t.Fatal("expected non-image bytes to be rejected")
	}
}

func TestReferencedMarkdownAssetResolvesNoteRelativeAndUniqueBasename(t *testing.T) {
	assets := map[string]decodedMarkdownAsset{
		"locations/assets/keeper.png": {
			Path: "Locations/Assets/Keeper.png", Filename: "Keeper.png",
		},
	}
	asset, ok := referencedMarkdownAsset(
		"Locations/Sunken Keep.md", "Assets/Keeper.png", assets,
	)
	if !ok || asset.Filename != "Keeper.png" {
		t.Fatalf("expected note-relative asset, got %+v, %t", asset, ok)
	}
	asset, ok = referencedMarkdownAsset("manual.md", "Keeper.png", assets)
	if !ok || asset.Filename != "Keeper.png" {
		t.Fatalf("expected unique basename fallback, got %+v, %t", asset, ok)
	}
}
