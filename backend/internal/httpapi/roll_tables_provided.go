package httpapi

import (
	"bludm/backend/internal/models"
	"fmt"
	"time"
)

func providedRollTableByID(tableID string) (models.RollTable, bool) {
	for _, table := range providedRollTables() {
		if table.ID == tableID {
			return table, true
		}
	}
	return models.RollTable{}, false
}

func providedRollTables() []models.RollTable {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return []models.RollTable{
		providedRollTable("provided-weather-prompts", "Weather Prompts", "Small open prompts for travel weather color.", "weather", []string{"weather", "travel"}, "1d6", []models.RollTableRow{
			providedRollTableRow(1, 1, "Clear break", "Clouds open long enough to reveal a useful landmark."),
			providedRollTableRow(2, 2, "Low mist", "Mist gathers in ditches and hollows, muffling distant sound."),
			providedRollTableRow(3, 3, "Cold snap", "The air bites hard enough to make metal and wet cloth unpleasant."),
			providedRollTableRow(4, 4, "Restless wind", "Wind tugs at cloaks, smoke, loose canvas, and unsecured gear."),
			providedRollTableRow(5, 5, "Hard rain", "Rain turns tracks soft and makes every indoor rumor sound warmer."),
			providedRollTableRow(6, 6, "Strange calm", "The weather stills suddenly, making small noises feel too loud."),
		}, now),
		providedRollTable("provided-tavern-rumors", "Tavern Rumors", "Short rumor starters for social scenes.", "rumor", []string{"tavern", "rumor"}, "1d6", []models.RollTableRow{
			providedRollTableRow(1, 1, "Missing shipment", "A merchant paid twice for guards and still lost the cargo."),
			providedRollTableRow(2, 2, "Quiet noble", "A minor noble has been drinking alone and asking about old maps."),
			providedRollTableRow(3, 3, "False badge", "Someone wearing a guard badge has been collecting unofficial tolls."),
			providedRollTableRow(4, 4, "Locked room", "The innkeeper refuses to rent the top room after sunset."),
			providedRollTableRow(5, 5, "Lucky coin", "A cardsharp claims a bent coin has never let them lose twice."),
			providedRollTableRow(6, 6, "Old song", "A sailor hums a song that names a place missing from modern charts."),
		}, now),
		providedRollTable("provided-npc-mannerisms", "NPC Mannerisms", "Quick behavior prompts for improvised NPCs.", "npc", []string{"npc", "roleplay"}, "1d6", []models.RollTableRow{
			providedRollTableRow(1, 1, "Door watcher", "Keeps checking exits before answering direct questions."),
			providedRollTableRow(2, 2, "Careful hands", "Arranges every cup, coin, and paper edge into neat lines."),
			providedRollTableRow(3, 3, "Names everyone", "Uses names constantly, even for people they just met."),
			providedRollTableRow(4, 4, "Half whisper", "Speaks softly enough that listeners lean closer."),
			providedRollTableRow(5, 5, "Borrowed bravado", "Acts confident until challenged, then laughs too quickly."),
			providedRollTableRow(6, 6, "Collector", "Pockets harmless scraps as if each might matter later."),
		}, now),
		providedRollTable("provided-travel-complications", "Travel Complications", "Small complications that add texture without forcing combat.", "travel", []string{"travel", "complication"}, "1d6", []models.RollTableRow{
			providedRollTableRow(1, 1, "Washed marker", "A trail marker has been knocked down or moved by weather."),
			providedRollTableRow(2, 2, "Crowded crossing", "A bridge, ford, or gate is blocked by travelers arguing over priority."),
			providedRollTableRow(3, 3, "Sick animal", "A pack animal nearby is frightened, ill, or refusing to move."),
			providedRollTableRow(4, 4, "Old warning", "A scratched warning sign names a danger no one nearby remembers."),
			providedRollTableRow(5, 5, "Broken wheel", "Someone needs help with a mundane repair and has useful gossip."),
			providedRollTableRow(6, 6, "Fresh tracks", "Tracks cross the route and suggest someone passed in a hurry."),
		}, now),
	}
}

func providedRollTable(id string, name string, description string, category string, tags []string, dieExpression string, rows []models.RollTableRow, timestamp time.Time) models.RollTable {
	for index := range rows {
		rows[index].TableID = id
		rows[index].SortOrder = index
	}
	return models.RollTable{
		ID:            id,
		Source:        "provided",
		Name:          name,
		Description:   description,
		Category:      category,
		Tags:          tags,
		DieExpression: dieExpression,
		Rows:          rows,
		CreatedAt:     timestamp,
		UpdatedAt:     timestamp,
	}
}

func providedRollTableRow(minRoll int, maxRoll int, label string, resultText string) models.RollTableRow {
	return models.RollTableRow{
		ID:         fmt.Sprintf("provided-row-%d-%d-%s", minRoll, maxRoll, normalizeRollTableOption(label)),
		MinRoll:    minRoll,
		MaxRoll:    maxRoll,
		Label:      label,
		ResultText: resultText,
	}
}
