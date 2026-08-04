package db

import (
	"time"

	"github.com/lib/pq"
)

type APITokenEntity struct {
	ID                      string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID                  string         `gorm:"type:uuid;not null;index:api_tokens_user_id_idx"`
	Name                    string         `gorm:"not null"`
	TokenHash               string         `gorm:"not null;uniqueIndex"`
	TokenPrefix             string         `gorm:"not null"`
	Scopes                  pq.StringArray `gorm:"type:text[];not null;default:'{}'::text[]"`
	CampaignRestrictionMode string         `gorm:"not null;default:'legacy_all'"`
	AuthenticationVersion   int            `gorm:"not null;default:1"`
	LastUsedAt              *time.Time
	ExpiresAt               *time.Time
	RevokedAt               *time.Time
	CreatedAt               time.Time
}

func (APITokenEntity) TableName() string { return "api_tokens" }

type APITokenCampaignEntity struct {
	TokenID    string `gorm:"type:uuid;primaryKey"`
	CampaignID string `gorm:"type:uuid;primaryKey;index:api_token_campaigns_campaign_idx"`
	CreatedAt  time.Time
}

func (APITokenCampaignEntity) TableName() string { return "api_token_campaigns" }

type OIDCSubjectLinkEntity struct {
	ID        string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    string `gorm:"type:uuid;not null;index:oidc_subject_links_user_idx"`
	Issuer    string `gorm:"not null;uniqueIndex:oidc_subject_links_issuer_subject"`
	Subject   string `gorm:"not null;uniqueIndex:oidc_subject_links_issuer_subject"`
	CreatedAt time.Time
}

func (OIDCSubjectLinkEntity) TableName() string { return "oidc_subject_links" }
