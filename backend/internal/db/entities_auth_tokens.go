package db

import "time"

type APITokenEntity struct {
	ID          string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID      string `gorm:"type:uuid;not null;index:api_tokens_user_id_idx"`
	Name        string `gorm:"not null"`
	TokenHash   string `gorm:"not null;uniqueIndex"`
	TokenPrefix string `gorm:"not null"`
	LastUsedAt  *time.Time
	ExpiresAt   *time.Time
	CreatedAt   time.Time
}

func (APITokenEntity) TableName() string { return "api_tokens" }
