package db

import "time"

type EncounterRevisionEntity struct {
	ID               string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EncounterID      string  `gorm:"type:uuid;not null;uniqueIndex:encounter_revisions_encounter_revision,priority:1;index"`
	Revision         int     `gorm:"not null;uniqueIndex:encounter_revisions_encounter_revision,priority:2"`
	Snapshot         JSONMap `gorm:"type:jsonb;not null"`
	GenerationInput  JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	GenerationOutput JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	ChangeReason     string  `gorm:"not null"`
	ActorUserID      string  `gorm:"type:uuid;not null"`
	ActorTokenID     *string `gorm:"type:uuid"`
	CreatedAt        time.Time
}

func (EncounterRevisionEntity) TableName() string { return "encounter_revisions" }

type IdempotencyRecordEntity struct {
	ID             string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	PrincipalKey   string  `gorm:"not null;uniqueIndex:idempotency_principal_operation_key,priority:1"`
	Operation      string  `gorm:"not null;uniqueIndex:idempotency_principal_operation_key,priority:2"`
	IdempotencyKey string  `gorm:"not null;uniqueIndex:idempotency_principal_operation_key,priority:3"`
	InputHash      string  `gorm:"not null"`
	Response       JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt      time.Time
	ExpiresAt      time.Time
}

func (IdempotencyRecordEntity) TableName() string { return "idempotency_records" }

type AuthoringPreviewEntity struct {
	ID             string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	TokenHash      string  `gorm:"not null;uniqueIndex"`
	PrincipalKey   string  `gorm:"not null;index"`
	CampaignID     string  `gorm:"type:uuid;not null;index"`
	OperationsHash string  `gorm:"not null"`
	Operations     JSONMap `gorm:"type:jsonb;not null"`
	EntityVersions JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	Result         JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	ExpiresAt      time.Time
	AppliedAt      *time.Time
	CreatedAt      time.Time
}

func (AuthoringPreviewEntity) TableName() string { return "authoring_previews" }

type ExternalAuditRecordEntity struct {
	ID                string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	RequestID         string  `gorm:"not null;index"`
	UserID            string  `gorm:"type:uuid;not null;index"`
	TokenID           *string `gorm:"type:uuid"`
	Authentication    string  `gorm:"not null"`
	ClientName        string  `gorm:"not null;default:''"`
	Operation         string  `gorm:"not null;index"`
	CampaignID        *string `gorm:"type:uuid;index"`
	TargetEntityID    *string `gorm:"type:uuid"`
	RequiredScopes    JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	Authorization     string  `gorm:"not null"`
	ResultClass       string  `gorm:"not null"`
	IdempotencyReplay bool    `gorm:"not null;default:false"`
	EncounterRevision int
	GeneratorVersion  string `gorm:"not null;default:''"`
	Seed              string `gorm:"not null;default:''"`
	DurationMS        int64
	CreatedAt         time.Time
}

func (ExternalAuditRecordEntity) TableName() string { return "external_audit_records" }
