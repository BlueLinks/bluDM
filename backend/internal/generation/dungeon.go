package generation

import (
	"fmt"
	"sort"
	"strings"
)

type generatedRoom struct {
	X, Y, Width, Height int
	Cells               []Cell
}

var roomColors = []string{"#14b8a6", "#8b5cf6", "#f59e0b", "#22c55e", "#ec4899", "#06b6d4"}

func GenerateDungeon(settings DungeonSettings) DungeonDocument {
	settings = normalizeDungeonSettings(settings)
	rng := newSeededRandom(settings.Seed)
	document := DungeonDocument{
		Version: 1, Kind: "dungeon-studio", Scope: "dungeon", Tileset: settings.Tileset,
		Grid: DungeonGrid{Width: settings.Width, Height: settings.Height, CellSizeFeet: 5},
		Layers: []DungeonLayer{{
			ID: "floor", Name: "Floor", Kind: "cells", Visible: true,
			Opacity: 1, CellKind: "floor", Cells: []Cell{},
		}},
		Edges: []DungeonEdge{}, Rooms: []DungeonRoom{}, Entities: []DungeonEntity{},
	}
	if settings.Type == "cave" {
		document = generateCave(document, settings, rng)
	} else {
		document = generateClassic(document, settings, rng)
	}
	document.Generation = DungeonGeneration{
		Generator: settings.Type, Seed: settings.Seed, Settings: settings,
	}
	return document
}

func normalizeDungeonSettings(settings DungeonSettings) DungeonSettings {
	defaults := DefaultDungeonSettings()
	if settings.Type != "classic" && settings.Type != "cave" {
		settings.Type = defaults.Type
	}
	if strings.TrimSpace(settings.Seed) == "" {
		settings.Seed = defaults.Seed
	}
	if !validTileset(settings.Tileset) {
		settings.Tileset = defaults.Tileset
	}
	settings.Width = bound(settings.Width, 12, 80, defaults.Width)
	settings.Height = bound(settings.Height, 12, 80, defaults.Height)
	settings.RoomCount = bound(settings.RoomCount, 1, 30, defaults.RoomCount)
	settings.Density = bound(settings.Density, 1, 99, defaults.Density)
	return settings
}

func generateClassic(document DungeonDocument, settings DungeonSettings, rng *seededRandom) DungeonDocument {
	rooms := []generatedRoom{}
	for attempt := 0; attempt < settings.RoomCount*8 && len(rooms) < settings.RoomCount; attempt++ {
		width := rng.integer(4, 9)
		height := rng.integer(4, 8)
		x := rng.integer(1, max(2, settings.Width-width-2))
		y := rng.integer(1, max(2, settings.Height-height-2))
		room := generatedRoom{X: x, Y: y, Width: width, Height: height, Cells: rectangleCells(x, y, width, height)}
		overlap := false
		for _, existing := range rooms {
			if rectanglesOverlap(existing, room) {
				overlap = true
				break
			}
		}
		if overlap {
			continue
		}
		rooms = append(rooms, room)
		document = paintFloor(document, room.Cells)
	}
	for index := 1; index < len(rooms); index++ {
		document = paintFloor(document, corridorCells(centerOf(rooms[index-1]), centerOf(rooms[index])))
	}
	document = addOuterWalls(document)
	if settings.CreateRooms {
		for index, room := range rooms {
			document.Rooms = append(document.Rooms, DungeonRoom{
				ID: fmt.Sprintf("generated-room-%d", index+1), Label: fmt.Sprintf("Room %d", index+1),
				Color: roomColors[index%len(roomColors)], Cells: room.Cells,
			})
		}
	}
	anchors := make([]Cell, 0, len(rooms))
	for _, room := range rooms {
		anchors = append(anchors, centerOf(room))
	}
	return dressDungeon(document, settings, anchors, rng)
}

func generateCave(document DungeonDocument, settings DungeonSettings, rng *seededRandom) DungeonDocument {
	open := map[string]Cell{}
	for y := 1; y < settings.Height-1; y++ {
		for x := 1; x < settings.Width-1; x++ {
			if rng.next()*100 < float64(settings.Density) {
				open[cellKey(Cell{X: x, Y: y})] = Cell{X: x, Y: y}
			}
		}
	}
	for step := 0; step < 4; step++ {
		next := map[string]Cell{}
		for y := 1; y < settings.Height-1; y++ {
			for x := 1; x < settings.Width-1; x++ {
				cell := Cell{X: x, Y: y}
				key := cellKey(cell)
				neighbors := neighborOpenCount(open, x, y)
				if neighbors >= 5 || (hasCell(open, key) && neighbors >= 4) {
					next[key] = cell
				}
			}
		}
		open = next
	}
	cells := make([]Cell, 0, len(open))
	for y := 1; y < settings.Height-1; y++ {
		for x := 1; x < settings.Width-1; x++ {
			if cell, ok := open[cellKey(Cell{X: x, Y: y})]; ok {
				cells = append(cells, cell)
			}
		}
	}
	document = addOuterWalls(paintFloor(document, cells))
	if settings.CreateRooms && len(cells) > 0 {
		document.Rooms = append(document.Rooms, DungeonRoom{
			ID: "generated-cavern-1", Label: "Cavern", Color: "#78716c", Cells: cells,
		})
	}
	anchors := []Cell{}
	if len(cells) > 0 {
		anchors = append(anchors, cells[len(cells)/2])
	}
	return dressDungeon(document, settings, anchors, rng)
}

func dressDungeon(document DungeonDocument, settings DungeonSettings, anchors []Cell, rng *seededRandom) DungeonDocument {
	if settings.AddStairs && len(anchors) > 0 {
		document = placeEntity(document, anchors[0], "stairs-up")
		document = placeEntity(document, anchors[len(anchors)-1], "stairs-down")
	}
	if settings.AddFurniture {
		assets := []string{"table", "chair", "chest", "barrel", "crate", "torch"}
		for index, anchor := range anchors {
			if index >= 8 {
				break
			}
			document = placeEntity(document, anchor, assets[rng.integer(0, len(assets)-1)])
		}
	}
	return document
}

func placeEntity(document DungeonDocument, cell Cell, assetKey string) DungeonDocument {
	kind, label := "prop", capitalize(assetKey)
	metadata := map[string]any(nil)
	if assetKey == "torch" {
		kind = "light"
	}
	if assetKey == "stairs-up" || assetKey == "stairs-down" {
		kind = "stairs"
		label = capitalize(assetKey)
		direction := "up"
		if assetKey == "stairs-down" {
			direction = "down"
		}
		metadata = map[string]any{"direction": direction}
	}
	document.Entities = append(document.Entities, DungeonEntity{
		ID:   fmt.Sprintf("%s-%d", assetKey, len(document.Entities)+1),
		Kind: kind, Cell: cell, AssetKey: assetKey, Label: label, Metadata: metadata,
	})
	return document
}

func paintFloor(document DungeonDocument, cells []Cell) DungeonDocument {
	byKey := map[string]Cell{}
	for _, cell := range document.Layers[0].Cells {
		byKey[cellKey(cell)] = cell
	}
	for _, cell := range cells {
		if cell.X >= 0 && cell.Y >= 0 && cell.X < document.Grid.Width && cell.Y < document.Grid.Height {
			byKey[cellKey(cell)] = cell
		}
	}
	merged := make([]Cell, 0, len(byKey))
	for _, cell := range byKey {
		merged = append(merged, cell)
	}
	sort.Slice(merged, func(i, j int) bool {
		return merged[i].Y < merged[j].Y || merged[i].Y == merged[j].Y && merged[i].X < merged[j].X
	})
	document.Layers[0].Cells = merged
	return document
}

func addOuterWalls(document DungeonDocument) DungeonDocument {
	floor := document.Layers[0].Cells
	source := map[string]bool{}
	for _, cell := range floor {
		source[cellKey(cell)] = true
	}
	existing := map[string]bool{}
	for _, edge := range document.Edges {
		existing[edgeKey(edge.Cell, edge.Direction)] = true
	}
	directions := []string{"n", "e", "s", "w"}
	for _, cell := range floor {
		for _, direction := range directions {
			neighbor := neighborCell(cell, direction)
			if neighbor.X >= 0 && neighbor.Y >= 0 && neighbor.X < document.Grid.Width &&
				neighbor.Y < document.Grid.Height && source[cellKey(neighbor)] {
				continue
			}
			edgeCell, edgeDirection := normalizeEdge(cell, direction)
			key := edgeKey(edgeCell, edgeDirection)
			if existing[key] {
				continue
			}
			document.Edges = append(document.Edges, DungeonEdge{
				ID: "wall-" + key, Cell: edgeCell, Direction: edgeDirection, Kind: "wall",
			})
			existing[key] = true
		}
	}
	return document
}

func rectangleCells(x, y, width, height int) []Cell {
	cells := make([]Cell, 0, width*height)
	for index := 0; index < width*height; index++ {
		cells = append(cells, Cell{X: x + index%width, Y: y + index/width})
	}
	return cells
}

func corridorCells(from, to Cell) []Cell {
	cells := []Cell{}
	step := 1
	if from.X > to.X {
		step = -1
	}
	for x := from.X; x != to.X; x += step {
		cells = append(cells, Cell{X: x, Y: from.Y})
	}
	step = 1
	if from.Y > to.Y {
		step = -1
	}
	for y := from.Y; y != to.Y; y += step {
		cells = append(cells, Cell{X: to.X, Y: y})
	}
	return append(cells, to)
}

func rectanglesOverlap(left, right generatedRoom) bool {
	return !(left.X+left.Width+1 < right.X ||
		right.X+right.Width+1 < left.X ||
		left.Y+left.Height+1 < right.Y ||
		right.Y+right.Height+1 < left.Y)
}

func centerOf(room generatedRoom) Cell {
	return Cell{X: room.X + room.Width/2, Y: room.Y + room.Height/2}
}

func neighborOpenCount(open map[string]Cell, x, y int) int {
	count := 0
	for dy := -1; dy <= 1; dy++ {
		for dx := -1; dx <= 1; dx++ {
			if (dx != 0 || dy != 0) && hasCell(open, cellKey(Cell{X: x + dx, Y: y + dy})) {
				count++
			}
		}
	}
	return count
}

func neighborCell(cell Cell, direction string) Cell {
	switch direction {
	case "n":
		return Cell{X: cell.X, Y: cell.Y - 1}
	case "e":
		return Cell{X: cell.X + 1, Y: cell.Y}
	case "s":
		return Cell{X: cell.X, Y: cell.Y + 1}
	default:
		return Cell{X: cell.X - 1, Y: cell.Y}
	}
}

func normalizeEdge(cell Cell, direction string) (Cell, string) {
	if direction == "e" {
		return Cell{X: cell.X + 1, Y: cell.Y}, "w"
	}
	if direction == "s" {
		return Cell{X: cell.X, Y: cell.Y + 1}, "n"
	}
	return cell, direction
}

func cellKey(cell Cell) string { return fmt.Sprintf("%d,%d", cell.X, cell.Y) }
func edgeKey(cell Cell, direction string) string {
	normalizedCell, normalizedDirection := normalizeEdge(cell, direction)
	return fmt.Sprintf("%d,%d,%s", normalizedCell.X, normalizedCell.Y, normalizedDirection)
}
func hasCell(cells map[string]Cell, key string) bool { _, ok := cells[key]; return ok }

type seededRandom struct{ value uint32 }

func newSeededRandom(seed string) *seededRandom {
	value := uint32(2166136261)
	for index := 0; index < len(seed); index++ {
		value = (value ^ uint32(seed[index])) * 16777619
	}
	return &seededRandom{value: value}
}

func (rng *seededRandom) next() float64 {
	rng.value += 0x6d2b79f5
	next := rng.value
	next = (next ^ (next >> 15)) * (next | 1)
	next ^= next + (next^(next>>7))*(next|61)
	return float64(next^(next>>14)) / 4294967296
}

func (rng *seededRandom) integer(minimum, maximum int) int {
	return int(rng.next()*float64(maximum-minimum+1)) + minimum
}

func validTileset(value string) bool {
	switch value {
	case "dungeon", "stone", "cave", "castle", "cellar", "forest", "sewer",
		"house", "ruins", "temple", "crypt", "shop", "home", "town":
		return true
	default:
		return false
	}
}

func bound(value, minimum, maximum, fallback int) int {
	if value == 0 {
		value = fallback
	}
	return max(minimum, min(maximum, value))
}
