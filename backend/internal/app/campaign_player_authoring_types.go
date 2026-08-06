package app

import (
	"time"

	"bludm/backend/internal/models"
)

type CampaignCreateCommand struct {
	IdempotencyKey         string   `json:"idempotencyKey"`
	Name                   string   `json:"name"`
	Description            string   `json:"description,omitempty"`
	AllowedStandardSources []string `json:"allowedStandardSources,omitempty"`
	EncounterRuleset       string   `json:"encounterRuleset"`
}

type CampaignUpdateCommand struct {
	IdempotencyKey         string     `json:"idempotencyKey"`
	ExpectedUpdatedAt      *time.Time `json:"expectedUpdatedAt"`
	Name                   *string    `json:"name,omitempty"`
	Description            *string    `json:"description,omitempty"`
	AllowedStandardSources *[]string  `json:"allowedStandardSources,omitempty"`
	EncounterRuleset       *string    `json:"encounterRuleset,omitempty"`
}

type CampaignWriteResult struct {
	models.Campaign
	AuthoringWriteMetadata
}

type PlayerCreateCommand struct {
	IdempotencyKey        string         `json:"idempotencyKey"`
	CharacterName         string         `json:"characterName"`
	PlayerName            string         `json:"playerName,omitempty"`
	AvatarURL             string         `json:"avatarUrl,omitempty"`
	ArmorClass            int            `json:"armorClass,omitempty"`
	MaxHitPoints          int            `json:"maxHitPoints,omitempty"`
	TemporaryHitPoints    int            `json:"temporaryHitPoints,omitempty"`
	TemporaryMaxHitPoints int            `json:"temporaryMaxHitPoints,omitempty"`
	ExperiencePoints      int            `json:"experiencePoints,omitempty"`
	CharacterSheet        map[string]any `json:"characterSheet,omitempty"`
}

type PlayerUpdateCommand struct {
	IdempotencyKey        string          `json:"idempotencyKey"`
	ExpectedUpdatedAt     *time.Time      `json:"expectedUpdatedAt"`
	CharacterName         *string         `json:"characterName,omitempty"`
	PlayerName            *string         `json:"playerName,omitempty"`
	AvatarURL             *string         `json:"avatarUrl,omitempty"`
	ArmorClass            *int            `json:"armorClass,omitempty"`
	MaxHitPoints          *int            `json:"maxHitPoints,omitempty"`
	TemporaryHitPoints    *int            `json:"temporaryHitPoints,omitempty"`
	TemporaryMaxHitPoints *int            `json:"temporaryMaxHitPoints,omitempty"`
	ExperiencePoints      *int            `json:"experiencePoints,omitempty"`
	CharacterSheet        *map[string]any `json:"characterSheet,omitempty"`
}

type PlayerMoveCommand struct {
	IdempotencyKey        string     `json:"idempotencyKey"`
	ExpectedUpdatedAt     *time.Time `json:"expectedUpdatedAt"`
	DestinationCampaignID string     `json:"destinationCampaignId"`
}

type PlayerCloneCommand struct {
	IdempotencyKey    string     `json:"idempotencyKey"`
	ExpectedUpdatedAt *time.Time `json:"expectedUpdatedAt"`
}

type PlayerWriteResult struct {
	models.Player
	AuthoringWriteMetadata
}
