package models

import "time"

type TravelWeather struct {
	Temperature       string              `json:"temperature"`
	TemperatureDeltaF *int                `json:"temperatureDeltaF"`
	Wind              string              `json:"wind"`
	Precipitation     string              `json:"precipitation"`
	Rolls             *TravelWeatherRolls `json:"rolls,omitempty"`
}

type TravelWeatherRolls struct {
	TemperatureD20   *int `json:"temperatureD20,omitempty"`
	TemperatureD4    *int `json:"temperatureD4,omitempty"`
	WindD20          *int `json:"windD20,omitempty"`
	PrecipitationD20 *int `json:"precipitationD20,omitempty"`
}

type CampaignLocation struct {
	ID               string                        `json:"id"`
	CampaignID       string                        `json:"campaignId"`
	ParentLocationID string                        `json:"parentLocationId,omitempty"`
	Name             string                        `json:"name"`
	LocationType     string                        `json:"locationType"`
	CustomTypeLabel  string                        `json:"customTypeLabel"`
	Summary          string                        `json:"summary"`
	Notes            string                        `json:"notes"`
	PublicNotes      string                        `json:"publicNotes"`
	DMNotes          string                        `json:"dmNotes"`
	Tags             []string                      `json:"tags"`
	SortOrder        int                           `json:"sortOrder"`
	Status           string                        `json:"status"`
	MapAnchor        map[string]any                `json:"mapAnchor"`
	Path             []CampaignLocationPathSegment `json:"path"`
	CreatedAt        time.Time                     `json:"createdAt"`
	UpdatedAt        time.Time                     `json:"updatedAt"`
}

type CampaignLocationPathSegment struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	LocationType string `json:"locationType"`
}

type CampaignLocationLink struct {
	ID               string    `json:"id"`
	CampaignID       string    `json:"campaignId"`
	SourceLocationID string    `json:"sourceLocationId"`
	TargetLocationID string    `json:"targetLocationId"`
	LinkType         string    `json:"linkType"`
	Label            string    `json:"label"`
	Direction        string    `json:"direction"`
	Visibility       string    `json:"visibility"`
	Notes            string    `json:"notes"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type CampaignNpcLocationLink struct {
	ID         string    `json:"id"`
	CampaignID string    `json:"campaignId"`
	CreatureID string    `json:"creatureId"`
	LocationID string    `json:"locationId"`
	LinkType   string    `json:"linkType"`
	Visibility string    `json:"visibility"`
	Notes      string    `json:"notes"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type CampaignLocationStock struct {
	ID            string    `json:"id"`
	CampaignID    string    `json:"campaignId"`
	LocationID    string    `json:"locationId"`
	ItemID        string    `json:"itemId"`
	LibrarySource string    `json:"librarySource"`
	Quantity      int       `json:"quantity"`
	PriceAmount   int       `json:"priceAmount"`
	PriceUnit     string    `json:"priceUnit"`
	Availability  string    `json:"availability"`
	Notes         string    `json:"notes"`
	SortOrder     int       `json:"sortOrder"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type CampaignMap struct {
	ID                     string         `json:"id"`
	CampaignID             string         `json:"campaignId"`
	ParentLocationID       string         `json:"parentLocationId,omitempty"`
	Name                   string         `json:"name"`
	Description            string         `json:"description"`
	MapType                string         `json:"mapType"`
	Mode                   string         `json:"mode"`
	ImageAssetID           string         `json:"imageAssetId,omitempty"`
	ImageURL               string         `json:"imageUrl,omitempty"`
	Width                  float64        `json:"width"`
	Height                 float64        `json:"height"`
	ScaleDistancePerPixel  float64        `json:"scaleDistancePerPixel"`
	ScaleDistanceUnit      string         `json:"scaleDistanceUnit"`
	CalibrationPixelLength float64        `json:"calibrationPixelLength"`
	CalibrationDistance    float64        `json:"calibrationDistance"`
	Metadata               map[string]any `json:"metadata"`
	CreatedAt              time.Time      `json:"createdAt"`
	UpdatedAt              time.Time      `json:"updatedAt"`
}

type CampaignMapPin struct {
	ID            string         `json:"id"`
	CampaignID    string         `json:"campaignId"`
	MapID         string         `json:"mapId"`
	LocationID    string         `json:"locationId"`
	X             float64        `json:"x"`
	Y             float64        `json:"y"`
	LabelOverride string         `json:"labelOverride"`
	Visibility    string         `json:"visibility"`
	State         string         `json:"state"`
	Metadata      map[string]any `json:"metadata"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}

type CampaignMapDistance struct {
	MapID              string  `json:"mapId"`
	OriginLocationID   string  `json:"originLocationId"`
	TargetLocationID   string  `json:"targetLocationId"`
	PixelDistance      float64 `json:"pixelDistance"`
	Distance           float64 `json:"distance"`
	DistanceUnit       string  `json:"distanceUnit"`
	TravelDistance     float64 `json:"travelDistance"`
	TravelDistanceUnit string  `json:"travelDistanceUnit"`
}

type CampaignJourney struct {
	ID                    string        `json:"id"`
	CampaignID            string        `json:"campaignId"`
	Name                  string        `json:"name"`
	Origin                string        `json:"origin"`
	Destination           string        `json:"destination"`
	Distance              float64       `json:"distance"`
	DistanceUnit          string        `json:"distanceUnit"`
	Terrain               string        `json:"terrain"`
	Pace                  string        `json:"pace"`
	GoodRoads             bool          `json:"goodRoads"`
	EncounterDistanceFeet *int          `json:"encounterDistanceFeet"`
	Weather               TravelWeather `json:"weather"`
	RouteInputMode        string        `json:"routeInputMode"`
	CreatedAt             time.Time     `json:"createdAt"`
	UpdatedAt             time.Time     `json:"updatedAt"`
}
