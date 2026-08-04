package models

import "time"

type APIToken struct {
	ID                      string     `json:"id"`
	Name                    string     `json:"name"`
	TokenPrefix             string     `json:"tokenPrefix"`
	Scopes                  []string   `json:"scopes"`
	CampaignRestrictionMode string     `json:"campaignRestrictionMode"`
	AllowedCampaignIDs      []string   `json:"allowedCampaignIds"`
	AuthenticationVersion   int        `json:"authenticationVersion"`
	LastUsedAt              *time.Time `json:"lastUsedAt,omitempty"`
	ExpiresAt               *time.Time `json:"expiresAt,omitempty"`
	RevokedAt               *time.Time `json:"revokedAt,omitempty"`
	CreatedAt               time.Time  `json:"createdAt"`
}
