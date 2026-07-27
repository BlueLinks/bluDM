package markdownworld

import (
	"errors"
	"fmt"
	"regexp"
	"strings"

	"bludm/backend/internal/generation"
)

const (
	CurrentVersion   = 1
	MaxDocumentBytes = 2 << 20
	MaxBlocks        = 50
)

var blockIDPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]*$`)

type NPCDocument struct {
	Version         int            `json:"version" yaml:"version"`
	ID              string         `json:"id" yaml:"id"`
	Name            string         `json:"name" yaml:"name"`
	Description     string         `json:"description,omitempty" yaml:"description,omitempty"`
	Size            string         `json:"size,omitempty" yaml:"size,omitempty"`
	CreatureType    string         `json:"creatureType,omitempty" yaml:"creature_type,omitempty"`
	Alignment       string         `json:"alignment,omitempty" yaml:"alignment,omitempty"`
	ArmorClass      int            `json:"armorClass" yaml:"armor_class"`
	HitPoints       int            `json:"hitPoints" yaml:"hit_points"`
	HitDice         string         `json:"hitDice,omitempty" yaml:"hit_dice,omitempty"`
	ChallengeRating string         `json:"challengeRating,omitempty" yaml:"challenge_rating,omitempty"`
	XP              int            `json:"xp,omitempty" yaml:"xp,omitempty"`
	Disposition     string         `json:"disposition,omitempty" yaml:"disposition,omitempty"`
	Location        string         `json:"location,omitempty" yaml:"location,omitempty"`
	LocationID      string         `json:"locationId,omitempty" yaml:"location_id,omitempty"`
	LocationRole    string         `json:"locationRole,omitempty" yaml:"location_role,omitempty"`
	Visibility      string         `json:"visibility,omitempty" yaml:"visibility,omitempty"`
	LocationNotes   string         `json:"locationNotes,omitempty" yaml:"location_notes,omitempty"`
	Avatar          string         `json:"avatar,omitempty" yaml:"avatar,omitempty"`
	StatBlock       map[string]any `json:"statBlock,omitempty" yaml:"stat_block,omitempty"`
}

type DungeonDocument struct {
	Version          int            `json:"version" yaml:"version"`
	ID               string         `json:"id" yaml:"id"`
	Name             string         `json:"name" yaml:"name"`
	Summary          string         `json:"summary,omitempty" yaml:"summary,omitempty"`
	Notes            string         `json:"notes,omitempty" yaml:"notes,omitempty"`
	PublicNotes      string         `json:"publicNotes,omitempty" yaml:"public_notes,omitempty"`
	DMNotes          string         `json:"dmNotes,omitempty" yaml:"dm_notes,omitempty"`
	Tags             []string       `json:"tags,omitempty" yaml:"tags,omitempty"`
	Status           string         `json:"status,omitempty" yaml:"status,omitempty"`
	ParentLocation   string         `json:"parentLocation,omitempty" yaml:"parent_location,omitempty"`
	ParentLocationID string         `json:"parentLocationId,omitempty" yaml:"parent_location_id,omitempty"`
	Map              *DungeonMap    `json:"map,omitempty" yaml:"map,omitempty"`
	Floors           []DungeonFloor `json:"floors,omitempty" yaml:"floors,omitempty"`
}

type DungeonFloor struct {
	ID          string      `json:"id" yaml:"id"`
	Name        string      `json:"name" yaml:"name"`
	Summary     string      `json:"summary,omitempty" yaml:"summary,omitempty"`
	Notes       string      `json:"notes,omitempty" yaml:"notes,omitempty"`
	PublicNotes string      `json:"publicNotes,omitempty" yaml:"public_notes,omitempty"`
	DMNotes     string      `json:"dmNotes,omitempty" yaml:"dm_notes,omitempty"`
	Tags        []string    `json:"tags,omitempty" yaml:"tags,omitempty"`
	Status      string      `json:"status,omitempty" yaml:"status,omitempty"`
	Map         *DungeonMap `json:"map,omitempty" yaml:"map,omitempty"`
}

type DungeonMap struct {
	Name                   string                      `json:"name,omitempty" yaml:"name,omitempty"`
	Description            string                      `json:"description,omitempty" yaml:"description,omitempty"`
	Image                  string                      `json:"image,omitempty" yaml:"image,omitempty"`
	MapType                string                      `json:"mapType,omitempty" yaml:"map_type,omitempty"`
	Width                  float64                     `json:"width,omitempty" yaml:"width,omitempty"`
	Height                 float64                     `json:"height,omitempty" yaml:"height,omitempty"`
	ScaleDistancePerPixel  float64                     `json:"scaleDistancePerPixel,omitempty" yaml:"scale_distance_per_pixel,omitempty"`
	ScaleDistanceUnit      string                      `json:"scaleDistanceUnit,omitempty" yaml:"scale_distance_unit,omitempty"`
	CalibrationPixelLength float64                     `json:"calibrationPixelLength,omitempty" yaml:"calibration_pixel_length,omitempty"`
	CalibrationDistance    float64                     `json:"calibrationDistance,omitempty" yaml:"calibration_distance,omitempty"`
	Generator              *DungeonGenerator           `json:"generator,omitempty" yaml:"generator,omitempty"`
	Studio                 *generation.DungeonDocument `json:"studio,omitempty" yaml:"studio,omitempty"`
}

type DungeonGenerator struct {
	Type         string `json:"type,omitempty" yaml:"type,omitempty"`
	Seed         string `json:"seed,omitempty" yaml:"seed,omitempty"`
	Tileset      string `json:"tileset,omitempty" yaml:"tileset,omitempty"`
	Width        int    `json:"width,omitempty" yaml:"width,omitempty"`
	Height       int    `json:"height,omitempty" yaml:"height,omitempty"`
	RoomCount    int    `json:"roomCount,omitempty" yaml:"room_count,omitempty"`
	Density      int    `json:"density,omitempty" yaml:"density,omitempty"`
	CreateRooms  *bool  `json:"createRooms,omitempty" yaml:"create_rooms,omitempty"`
	AddFurniture *bool  `json:"addFurniture,omitempty" yaml:"add_furniture,omitempty"`
	AddStairs    *bool  `json:"addStairs,omitempty" yaml:"add_stairs,omitempty"`
}

type NPCBlock struct {
	Document NPCDocument `json:"document"`
	Line     int         `json:"line"`
	Raw      string      `json:"-"`
}

type DungeonBlock struct {
	Document DungeonDocument `json:"document"`
	Line     int             `json:"line"`
	Raw      string          `json:"-"`
}

type Blocks struct {
	NPCs     []NPCBlock
	Dungeons []DungeonBlock
}

func (document *NPCDocument) NormalizeAndValidate() error {
	document.ID = normalizeID(document.ID)
	document.Name = strings.TrimSpace(document.Name)
	document.Description = strings.TrimSpace(document.Description)
	document.Size = strings.TrimSpace(document.Size)
	document.CreatureType = strings.TrimSpace(document.CreatureType)
	document.Alignment = strings.TrimSpace(document.Alignment)
	document.HitDice = strings.TrimSpace(document.HitDice)
	document.ChallengeRating = strings.TrimSpace(document.ChallengeRating)
	document.Disposition = strings.ToLower(strings.TrimSpace(document.Disposition))
	document.Location = strings.TrimSpace(document.Location)
	document.LocationID = strings.TrimSpace(document.LocationID)
	document.LocationRole = strings.TrimSpace(document.LocationRole)
	document.Visibility = strings.ToLower(strings.TrimSpace(document.Visibility))
	document.LocationNotes = strings.TrimSpace(document.LocationNotes)
	document.Avatar = strings.TrimSpace(document.Avatar)
	if document.Disposition == "" {
		document.Disposition = "neutral"
	}
	if document.LocationRole == "" {
		document.LocationRole = "frequents"
	}
	if document.Visibility == "" {
		document.Visibility = "dm"
	}
	if document.StatBlock == nil {
		document.StatBlock = map[string]any{}
	}
	switch {
	case document.Version != CurrentVersion:
		return fmt.Errorf("version must be %d", CurrentVersion)
	case !validBlockID(document.ID):
		return errors.New("id must be 1-80 lowercase letters, numbers, dots, hyphens, or underscores")
	case document.Name == "" || len(document.Name) > 160:
		return errors.New("name must be 1-160 characters")
	case document.ArmorClass < 0:
		return errors.New("armor_class cannot be negative")
	case document.HitPoints < 1:
		return errors.New("hit_points must be at least 1")
	case document.XP < 0:
		return errors.New("xp cannot be negative")
	case document.Disposition != "friendly" && document.Disposition != "neutral" && document.Disposition != "hostile":
		return errors.New("disposition must be friendly, neutral, or hostile")
	case document.Visibility != "dm" && document.Visibility != "public":
		return errors.New("visibility must be dm or public")
	}
	return nil
}

func (document *DungeonDocument) NormalizeAndValidate() error {
	document.ID = normalizeID(document.ID)
	document.Name = strings.TrimSpace(document.Name)
	document.Summary = strings.TrimSpace(document.Summary)
	document.Notes = strings.TrimSpace(document.Notes)
	document.PublicNotes = strings.TrimSpace(document.PublicNotes)
	document.DMNotes = strings.TrimSpace(document.DMNotes)
	document.Status = strings.ToLower(strings.TrimSpace(document.Status))
	document.ParentLocation = strings.TrimSpace(document.ParentLocation)
	document.ParentLocationID = strings.TrimSpace(document.ParentLocationID)
	if document.Status == "" {
		document.Status = "active"
	}
	switch {
	case document.Version != CurrentVersion:
		return fmt.Errorf("version must be %d", CurrentVersion)
	case !validBlockID(document.ID):
		return errors.New("id must be 1-80 lowercase letters, numbers, dots, hyphens, or underscores")
	case document.Name == "" || len(document.Name) > 160:
		return errors.New("name must be 1-160 characters")
	}
	seenFloors := map[string]bool{}
	for index := range document.Floors {
		floor := &document.Floors[index]
		floor.ID = normalizeID(floor.ID)
		floor.Name = strings.TrimSpace(floor.Name)
		floor.Status = strings.ToLower(strings.TrimSpace(floor.Status))
		if floor.Status == "" {
			floor.Status = "active"
		}
		if !validBlockID(floor.ID) || floor.Name == "" {
			return fmt.Errorf("floor %d requires a valid id and name", index+1)
		}
		if seenFloors[floor.ID] {
			return fmt.Errorf("duplicate floor id %q", floor.ID)
		}
		seenFloors[floor.ID] = true
	}
	if document.Map == nil && len(document.Floors) == 0 {
		return errors.New("dungeon requires map or floors")
	}
	return nil
}

func (generator DungeonGenerator) Settings() generation.DungeonSettings {
	settings := generation.DefaultDungeonSettings()
	if generator.Type != "" {
		settings.Type = generator.Type
	}
	if generator.Seed != "" {
		settings.Seed = generator.Seed
	}
	if generator.Tileset != "" {
		settings.Tileset = generator.Tileset
	}
	if generator.Width != 0 {
		settings.Width = generator.Width
	}
	if generator.Height != 0 {
		settings.Height = generator.Height
	}
	if generator.RoomCount != 0 {
		settings.RoomCount = generator.RoomCount
	}
	if generator.Density != 0 {
		settings.Density = generator.Density
	}
	if generator.CreateRooms != nil {
		settings.CreateRooms = *generator.CreateRooms
	}
	if generator.AddFurniture != nil {
		settings.AddFurniture = *generator.AddFurniture
	}
	if generator.AddStairs != nil {
		settings.AddStairs = *generator.AddStairs
	}
	return settings
}

func normalizeID(value string) string { return strings.ToLower(strings.TrimSpace(value)) }
func validBlockID(value string) bool {
	return len(value) <= 80 && blockIDPattern.MatchString(value)
}
