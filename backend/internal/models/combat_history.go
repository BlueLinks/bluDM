package models

import "time"

// EncounterRunTurn combines resumed segments of the same round and combatant.
type EncounterRunTurn struct {
	CombatantID string    `json:"combatantId"`
	Round       int       `json:"round"`
	StartedAt   time.Time `json:"startedAt"`
	EndedAt     time.Time `json:"endedAt"`
	DurationMs  int64     `json:"durationMs"`
	Completed   bool      `json:"completed"`
}

type CombatHistoryEntry struct {
	ID            string     `json:"id"`
	EncounterID   string     `json:"encounterId"`
	EncounterName string     `json:"encounterName"`
	Status        string     `json:"status"`
	IsTest        bool       `json:"isTest"`
	StartedAt     time.Time  `json:"startedAt"`
	EndedAt       *time.Time `json:"endedAt,omitempty"`
	Rounds        int        `json:"rounds"`
	DamageDone    int        `json:"damageDone"`
	HealingDone   int        `json:"healingDone"`
	ActiveTimeMs  *int64     `json:"activeTimeMs"`
}

type CombatHistory struct {
	Runs  []CombatHistoryEntry `json:"runs"`
	Total int64                `json:"total"`
}

type CombatReport struct {
	Run           EncounterRun `json:"run"`
	CampaignID    string       `json:"campaignId"`
	EncounterName string       `json:"encounterName"`
}
