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
	ID               string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CampaignID       string         `gorm:"type:uuid;not null;index:campaign_locations_campaign_id_idx,priority:1"`
	ParentLocationID *string        `gorm:"type:uuid;index"`
	Name             string         `gorm:"not null;index:campaign_locations_campaign_id_idx,priority:2"`
	LocationType     string         `gorm:"not null;default:'custom'"`
	CustomTypeLabel  string         `gorm:"not null;default:''"`
	Summary          string         `gorm:"not null;default:''"`
	Notes            string         `gorm:"not null;default:''"`
	PublicNotes      string         `gorm:"not null;default:''"`
	DMNotes          string         `gorm:"column:dm_notes;not null;default:''"`
	Tags             pq.StringArray `gorm:"type:text[];not null;default:'{}'::text[]"`
	SortOrder        int            `gorm:"not null;default:0"`
	Status           string         `gorm:"not null;default:'active'"`
	MapAnchor        JSONMap        `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

func (CampaignLocationEntity) TableName() string { return "campaign_locations" }

type CampaignLocationLinkEntity struct {
	ID               string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CampaignID       string `gorm:"type:uuid;not null;index:campaign_location_links_campaign_idx,priority:1"`
	SourceLocationID string `gorm:"type:uuid;not null;index:campaign_location_links_source_idx"`
	TargetLocationID string `gorm:"type:uuid;not null;index:campaign_location_links_target_idx"`
	LinkType         string `gorm:"not null;default:'link'"`
	Label            string `gorm:"not null;default:''"`
	Direction        string `gorm:"not null;default:'two-way'"`
	Visibility       string `gorm:"not null;default:'public'"`
	Notes            string `gorm:"not null;default:''"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

func (CampaignLocationLinkEntity) TableName() string { return "campaign_location_links" }

type CampaignNpcLocationLinkEntity struct {
	ID         string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CampaignID string `gorm:"type:uuid;not null;index;uniqueIndex:campaign_npc_location_links_unique"`
	CreatureID string `gorm:"type:uuid;not null;index;uniqueIndex:campaign_npc_location_links_unique"`
	LocationID string `gorm:"type:uuid;not null;index;uniqueIndex:campaign_npc_location_links_unique"`
	LinkType   string `gorm:"not null;default:'frequents';uniqueIndex:campaign_npc_location_links_unique"`
	Visibility string `gorm:"not null;default:'dm'"`
	Notes      string `gorm:"not null;default:''"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (CampaignNpcLocationLinkEntity) TableName() string { return "campaign_npc_location_links" }

type CampaignLocationStockEntity struct {
	ID            string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CampaignID    string `gorm:"type:uuid;not null;index;uniqueIndex:campaign_location_stock_unique"`
	LocationID    string `gorm:"type:uuid;not null;index;uniqueIndex:campaign_location_stock_unique"`
	ItemID        string `gorm:"type:uuid;not null;index;uniqueIndex:campaign_location_stock_unique"`
	LibrarySource string `gorm:"not null;default:'user';uniqueIndex:campaign_location_stock_unique"`
	Quantity      int    `gorm:"not null;default:1"`
	PriceAmount   int    `gorm:"not null;default:0"`
	PriceUnit     string `gorm:"not null;default:'gp'"`
	Availability  string `gorm:"not null;default:'in-stock'"`
	Notes         string `gorm:"not null;default:''"`
	SortOrder     int    `gorm:"not null;default:0"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (CampaignLocationStockEntity) TableName() string { return "campaign_location_stock" }

type CampaignMapEntity struct {
	ID                     string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CampaignID             string  `gorm:"type:uuid;not null;index:campaign_maps_campaign_id_idx,priority:1"`
	ParentLocationID       *string `gorm:"type:uuid;index:campaign_maps_parent_location_id_idx"`
	Name                   string  `gorm:"not null;index:campaign_maps_campaign_id_idx,priority:2"`
	Description            string  `gorm:"not null;default:''"`
	MapType                string  `gorm:"not null;default:'custom'"`
	Mode                   string  `gorm:"not null;default:'blank'"`
	ImageAssetID           *string `gorm:"type:uuid"`
	Width                  float64 `gorm:"not null;default:1000"`
	Height                 float64 `gorm:"not null;default:700"`
	ScaleDistancePerPixel  float64 `gorm:"not null;default:1"`
	ScaleDistanceUnit      string  `gorm:"not null;default:'miles'"`
	CalibrationPixelLength float64 `gorm:"not null;default:0"`
	CalibrationDistance    float64 `gorm:"not null;default:0"`
	Metadata               JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

func (CampaignMapEntity) TableName() string { return "campaign_maps" }

type CampaignMapPinEntity struct {
	ID            string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CampaignID    string  `gorm:"type:uuid;not null;index:campaign_map_pins_campaign_idx"`
	MapID         string  `gorm:"type:uuid;not null;index:campaign_map_pins_map_idx"`
	LocationID    string  `gorm:"type:uuid;not null;index:campaign_map_pins_location_idx"`
	X             float64 `gorm:"not null"`
	Y             float64 `gorm:"not null"`
	LabelOverride string  `gorm:"not null;default:''"`
	Visibility    string  `gorm:"not null;default:'dm'"`
	State         string  `gorm:"not null;default:'active'"`
	Metadata      JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (CampaignMapPinEntity) TableName() string { return "campaign_map_pins" }

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
