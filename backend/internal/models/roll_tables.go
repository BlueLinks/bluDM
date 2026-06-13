package models

import "time"

type RollTable struct {
	ID            string         `json:"id"`
	CampaignID    string         `json:"campaignId,omitempty"`
	Source        string         `json:"source"`
	Name          string         `json:"name"`
	Description   string         `json:"description"`
	Category      string         `json:"category"`
	Tags          []string       `json:"tags"`
	DieExpression string         `json:"dieExpression"`
	Rows          []RollTableRow `json:"rows"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}

type RollTableRow struct {
	ID         string `json:"id"`
	TableID    string `json:"tableId"`
	MinRoll    int    `json:"minRoll"`
	MaxRoll    int    `json:"maxRoll"`
	Label      string `json:"label"`
	ResultText string `json:"resultText"`
	Notes      string `json:"notes"`
	SortOrder  int    `json:"sortOrder"`
}

type RollTableRollResult struct {
	TableID       string    `json:"tableId"`
	TableName     string    `json:"tableName"`
	DieExpression string    `json:"dieExpression"`
	RolledValue   int       `json:"rolledValue"`
	MatchedRange  string    `json:"matchedRange"`
	Label         string    `json:"label"`
	ResultText    string    `json:"resultText"`
	Notes         string    `json:"notes"`
	RolledAt      time.Time `json:"rolledAt"`
}
