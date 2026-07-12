package db

import "time"

type ImportExportHistoryEntity struct {
	ID               string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OwnerUserID      string  `gorm:"type:uuid;not null;index:import_export_history_owner_idx,priority:1"`
	Action           string  `gorm:"not null;index:import_export_history_owner_idx,priority:3"`
	BundleType       string  `gorm:"not null;default:''"`
	Name             string  `gorm:"not null;default:''"`
	ExportID         *string `gorm:"type:text"`
	ImportMode       string  `gorm:"not null;default:''"`
	BundleVersion    int     `gorm:"not null;default:0"`
	SourceAppVersion string  `gorm:"not null;default:''"`
	SizeBytes        int64   `gorm:"not null;default:0"`
	DurationMillis   int64   `gorm:"not null;default:0"`
	Status           string  `gorm:"not null;default:'success'"`
	Warnings         JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	Counts           JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	ManifestSummary  JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	DependencyGraph  JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt        time.Time
}

func (ImportExportHistoryEntity) TableName() string { return "import_export_history" }
