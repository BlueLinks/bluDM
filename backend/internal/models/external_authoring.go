package models

import "time"

type EncounterRevision struct {
	ID               string         `json:"id"`
	EncounterID      string         `json:"encounterId"`
	Revision         int            `json:"revision"`
	Snapshot         map[string]any `json:"snapshot,omitempty"`
	GenerationInput  map[string]any `json:"generationInput,omitempty"`
	GenerationOutput map[string]any `json:"generationOutput,omitempty"`
	ChangeReason     string         `json:"changeReason"`
	ActorUserID      string         `json:"actorUserId"`
	ActorTokenID     string         `json:"actorTokenId,omitempty"`
	CreatedAt        time.Time      `json:"createdAt"`
}
