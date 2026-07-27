package generation

type DungeonSettings struct {
	Type         string `json:"type" yaml:"type"`
	Seed         string `json:"seed" yaml:"seed"`
	Tileset      string `json:"tileset" yaml:"tileset"`
	Width        int    `json:"width" yaml:"width"`
	Height       int    `json:"height" yaml:"height"`
	RoomCount    int    `json:"roomCount" yaml:"room_count"`
	Density      int    `json:"density" yaml:"density"`
	CreateRooms  bool   `json:"createRooms" yaml:"create_rooms"`
	AddFurniture bool   `json:"addFurniture" yaml:"add_furniture"`
	AddStairs    bool   `json:"addStairs" yaml:"add_stairs"`
}

type Cell struct {
	X int `json:"x" yaml:"x"`
	Y int `json:"y" yaml:"y"`
}

type DungeonGrid struct {
	Width        int `json:"width" yaml:"width"`
	Height       int `json:"height" yaml:"height"`
	CellSizeFeet int `json:"cellSizeFeet" yaml:"cell_size_feet"`
}

type DungeonLayer struct {
	ID       string  `json:"id" yaml:"id"`
	Name     string  `json:"name" yaml:"name"`
	Kind     string  `json:"kind" yaml:"kind"`
	Visible  bool    `json:"visible" yaml:"visible"`
	Opacity  float64 `json:"opacity" yaml:"opacity"`
	CellKind string  `json:"cellKind" yaml:"cell_kind"`
	ThemeKey string  `json:"themeKey,omitempty" yaml:"theme_key,omitempty"`
	Cells    []Cell  `json:"cells" yaml:"cells"`
}

type DungeonEdge struct {
	ID        string `json:"id" yaml:"id"`
	Cell      Cell   `json:"cell" yaml:"cell"`
	Direction string `json:"direction" yaml:"direction"`
	Kind      string `json:"kind" yaml:"kind"`
	State     string `json:"state,omitempty" yaml:"state,omitempty"`
}

type DungeonRoom struct {
	ID         string `json:"id" yaml:"id"`
	LocationID string `json:"locationId,omitempty" yaml:"location_id,omitempty"`
	Label      string `json:"label" yaml:"label"`
	Color      string `json:"color" yaml:"color"`
	ThemeKey   string `json:"themeKey,omitempty" yaml:"theme_key,omitempty"`
	Cells      []Cell `json:"cells" yaml:"cells"`
}

type DungeonEntity struct {
	ID       string         `json:"id" yaml:"id"`
	Kind     string         `json:"kind" yaml:"kind"`
	Cell     Cell           `json:"cell" yaml:"cell"`
	XOffset  *float64       `json:"xOffset,omitempty" yaml:"x_offset,omitempty"`
	YOffset  *float64       `json:"yOffset,omitempty" yaml:"y_offset,omitempty"`
	Rotation int            `json:"rotation,omitempty" yaml:"rotation,omitempty"`
	LinkedID string         `json:"linkedId,omitempty" yaml:"linked_id,omitempty"`
	AssetKey string         `json:"assetKey,omitempty" yaml:"asset_key,omitempty"`
	Label    string         `json:"label,omitempty" yaml:"label,omitempty"`
	Metadata map[string]any `json:"metadata,omitempty" yaml:"metadata,omitempty"`
}

type DungeonGeneration struct {
	Generator string          `json:"generator" yaml:"generator"`
	Seed      string          `json:"seed,omitempty" yaml:"seed,omitempty"`
	Settings  DungeonSettings `json:"settings" yaml:"settings"`
}

type DungeonDocument struct {
	Version      int               `json:"version" yaml:"version"`
	Kind         string            `json:"kind" yaml:"kind"`
	Scope        string            `json:"scope" yaml:"scope"`
	Tileset      string            `json:"tileset" yaml:"tileset"`
	Grid         DungeonGrid       `json:"grid" yaml:"grid"`
	Layers       []DungeonLayer    `json:"layers" yaml:"layers"`
	Edges        []DungeonEdge     `json:"edges" yaml:"edges"`
	Rooms        []DungeonRoom     `json:"rooms" yaml:"rooms"`
	Entities     []DungeonEntity   `json:"entities" yaml:"entities"`
	CustomAssets []map[string]any  `json:"customAssets,omitempty" yaml:"custom_assets,omitempty"`
	Generation   DungeonGeneration `json:"generation" yaml:"generation"`
}

func DefaultDungeonSettings() DungeonSettings {
	return DungeonSettings{
		Type: "classic", Seed: "bludm-dungeon", Tileset: "dungeon",
		Width: 40, Height: 30, RoomCount: 8, Density: 45,
		CreateRooms: true, AddFurniture: true, AddStairs: true,
	}
}
