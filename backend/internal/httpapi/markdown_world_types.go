package httpapi

import (
	"errors"

	"bludm/backend/internal/store"
)

var errInvalidMarkdownWorld = errors.New("invalid Markdown campaign content")

type markdownWorldRequest struct {
	Markdown   string                 `json:"markdown"`
	SourcePath string                 `json:"sourcePath"`
	Assets     []markdownAssetPayload `json:"assets,omitempty"`
}

type markdownAssetPayload struct {
	Path        string `json:"path"`
	Filename    string `json:"filename,omitempty"`
	ContentType string `json:"contentType,omitempty"`
	DataBase64  string `json:"dataBase64"`
}

type markdownWorldPreview struct {
	SourcePath string                   `json:"sourcePath"`
	CanImport  bool                     `json:"canImport"`
	NPCs       []markdownWorldNPCChange `json:"npcs"`
	Dungeons   []markdownDungeonChange  `json:"dungeons"`
}

type markdownWorldNPCChange struct {
	BlockID            string   `json:"blockId"`
	Line               int      `json:"line"`
	Name               string   `json:"name"`
	Operation          string   `json:"operation"`
	ExistingCreatureID string   `json:"existingCreatureId,omitempty"`
	Location           string   `json:"location,omitempty"`
	LocationID         string   `json:"locationId,omitempty"`
	AvatarPath         string   `json:"avatarPath,omitempty"`
	Warnings           []string `json:"warnings"`
	Errors             []string `json:"errors"`
}

type markdownDungeonMapChange struct {
	Name      string `json:"name"`
	Kind      string `json:"kind"`
	RoomCount int    `json:"roomCount"`
	ImagePath string `json:"imagePath,omitempty"`
}

type markdownDungeonChange struct {
	BlockID            string                     `json:"blockId"`
	Line               int                        `json:"line"`
	Name               string                     `json:"name"`
	Operation          string                     `json:"operation"`
	ExistingLocationID string                     `json:"existingLocationId,omitempty"`
	ParentLocation     string                     `json:"parentLocation,omitempty"`
	ParentLocationID   string                     `json:"parentLocationId,omitempty"`
	FloorCount         int                        `json:"floorCount"`
	Maps               []markdownDungeonMapChange `json:"maps"`
	Warnings           []string                   `json:"warnings"`
	Errors             []string                   `json:"errors"`
}

type preparedMarkdownWorldImport struct {
	Preview  markdownWorldPreview
	NPCs     []store.MarkdownNPCImportInput
	Dungeons []store.MarkdownDungeonImportInput
}
