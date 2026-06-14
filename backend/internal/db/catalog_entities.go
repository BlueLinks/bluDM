package db

import (
	"time"

	"github.com/lib/pq"
)

type ItemEntity struct {
	ID          string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OwnerUserID string         `gorm:"type:uuid;not null;index:items_owner_user_id_idx,sort:desc;index:items_owner_category_name_idx,priority:1"`
	Name        string         `gorm:"not null;index:items_owner_category_name_idx,priority:3"`
	Category    string         `gorm:"not null;default:'';index:items_owner_category_name_idx,priority:2"`
	ItemType    string         `gorm:"not null;default:''"`
	Rarity      string         `gorm:"not null;default:''"`
	Attunement  bool           `gorm:"not null;default:false"`
	ValueAmount int            `gorm:"not null;default:0"`
	ValueUnit   string         `gorm:"not null;default:'gp'"`
	Weight      float64        `gorm:"not null;default:0"`
	Description string         `gorm:"not null;default:''"`
	Properties  pq.StringArray `gorm:"type:text[];not null;default:array[]::text[]"`
	Damage      JSONMap        `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	ArmorClass  JSONMap        `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	Data        JSONMap        `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (ItemEntity) TableName() string { return "items" }

type CampaignLocationEntity struct {
	ID         string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CampaignID string `gorm:"type:uuid;not null;index:campaign_locations_campaign_id_idx,priority:1"`
	Name       string `gorm:"not null;index:campaign_locations_campaign_id_idx,priority:2"`
	Notes      string `gorm:"not null;default:''"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (CampaignLocationEntity) TableName() string { return "campaign_locations" }

type CampaignJourneyEntity struct {
	ID                    string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CampaignID            string  `gorm:"type:uuid;not null;index:campaign_journeys_campaign_id_idx,sort:desc"`
	Name                  string  `gorm:"not null"`
	Origin                string  `gorm:"not null;default:''"`
	Destination           string  `gorm:"not null;default:''"`
	Distance              float64 `gorm:"not null"`
	DistanceUnit          string  `gorm:"not null"`
	Terrain               string  `gorm:"not null"`
	Pace                  string  `gorm:"not null"`
	GoodRoads             bool    `gorm:"not null;default:false"`
	EncounterDistanceFeet *int
	Weather               JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	RouteInputMode        string  `gorm:"not null;default:'route'"`
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

func (CampaignJourneyEntity) TableName() string { return "campaign_journeys" }

type RollTableEntity struct {
	ID            string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CampaignID    *string        `gorm:"type:uuid;index:roll_tables_campaign_id_idx,sort:desc"`
	Source        string         `gorm:"not null;default:'campaign';index:roll_tables_source_idx,priority:1"`
	Name          string         `gorm:"not null;index:roll_tables_source_idx,priority:3"`
	Description   string         `gorm:"not null;default:''"`
	Category      string         `gorm:"not null;default:'custom';index:roll_tables_source_idx,priority:2"`
	Tags          pq.StringArray `gorm:"type:text[];not null;default:'{}'::text[]"`
	DieExpression string         `gorm:"not null"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (RollTableEntity) TableName() string { return "roll_tables" }

type RollTableRowEntity struct {
	ID         string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	TableID    string `gorm:"type:uuid;not null;index:roll_table_rows_table_id_idx,priority:1"`
	MinRoll    int    `gorm:"not null;index:roll_table_rows_table_id_idx,priority:2"`
	MaxRoll    int    `gorm:"not null;index:roll_table_rows_table_id_idx,priority:3"`
	Label      string `gorm:"not null"`
	ResultText string `gorm:"not null"`
	Notes      string `gorm:"not null;default:''"`
	SortOrder  int    `gorm:"not null;default:0"`
}

func (RollTableRowEntity) TableName() string { return "roll_table_rows" }
