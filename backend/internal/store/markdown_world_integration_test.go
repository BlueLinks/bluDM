package store

import (
	"context"
	"testing"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/generation"
)

func TestMarkdownWorldImportCreatesAndUpdatesNPCDungeonAndRooms(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("markdown-world"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Vault Campaign"})
	requireNoError(t, err)

	studio := generation.GenerateDungeon(generation.DungeonSettings{
		Type: "classic", Seed: "keep-seed", Tileset: "dungeon",
		Width: 24, Height: 18, RoomCount: 4, Density: 45,
		CreateRooms: true, AddFurniture: true, AddStairs: true,
	})
	input := markdownWorldFixture(studio)
	first, err := stores.MarkdownWorld.Import(
		ctx, owner.ID, campaign.ID, input.NPCs, input.Dungeons,
	)
	requireNoError(t, err)
	if first.NPCs[0].Operation != "create" || first.Dungeons[0].Operation != "create" {
		t.Fatalf("expected create operations, got %+v", first)
	}
	npcID := first.NPCs[0].Creature.ID
	dungeonID := first.Dungeons[0].Location.ID

	input.NPCs[0].Creature.Name = "Keeper Voss, Unmasked"
	input.NPCs[0].AvatarAsset = nil
	input.Dungeons[0].Location.Summary = "Updated from the Vault."
	input.Dungeons[0].Floors = nil
	trimmedStudio := studio
	trimmedStudio.Rooms = append([]generation.DungeonRoom(nil), studio.Rooms[:len(studio.Rooms)-1]...)
	input.Dungeons[0].Map.Studio = &trimmedStudio
	second, err := stores.MarkdownWorld.Import(
		ctx, owner.ID, campaign.ID, input.NPCs, input.Dungeons,
	)
	requireNoError(t, err)
	if second.NPCs[0].Operation != "update" || second.Dungeons[0].Operation != "update" {
		t.Fatalf("expected update operations, got %+v", second)
	}
	if second.NPCs[0].Creature.ID != npcID || second.Dungeons[0].Location.ID != dungeonID {
		t.Fatalf("expected stable source identities, got %+v", second)
	}
	locations, err := stores.Travel.LocationsForCampaign(ctx, owner.ID, campaign.ID)
	requireNoError(t, err)
	roomCount := 0
	for _, location := range locations {
		if location.LocationType == "room" && location.ParentLocationID == dungeonID {
			roomCount++
		}
	}
	if roomCount != len(trimmedStudio.Rooms) {
		t.Fatalf("expected %d source-managed room locations, got %d", len(trimmedStudio.Rooms), roomCount)
	}
	for _, location := range locations {
		if location.LocationType == "floor" {
			t.Fatalf("expected removed source-managed floor to be deleted, got %+v", location)
		}
	}
	npcLinks, err := stores.Travel.NpcLocationLinksForCampaign(ctx, owner.ID, campaign.ID)
	requireNoError(t, err)
	if len(npcLinks) != 1 || npcLinks[0].LocationID != dungeonID {
		t.Fatalf("expected imported NPC to link to imported dungeon, got %+v", npcLinks)
	}
	var sourceAssetCount int64
	requireNoError(t, stores.db.Model(&dbmodels.UploadedAssetEntity{}).
		Where("owner_user_id = ? and metadata ->> 'markdownSourceKey' = ?", owner.ID, input.NPCs[0].SourceKey+"/avatar").
		Count(&sourceAssetCount).Error)
	if sourceAssetCount != 0 {
		t.Fatalf("expected removed source-managed avatar to be deleted, got %d assets", sourceAssetCount)
	}
}

type markdownWorldFixtureInput struct {
	NPCs     []MarkdownNPCImportInput
	Dungeons []MarkdownDungeonImportInput
}

func markdownWorldFixture(studio generation.DungeonDocument) markdownWorldFixtureInput {
	return markdownWorldFixtureInput{
		NPCs: []MarkdownNPCImportInput{{
			SourceKey: "locations/keep.md#npc:voss", SourcePath: "Locations/Keep.md",
			BlockID: "voss", ContentHash: "npc-hash", Disposition: "neutral",
			LocationSourceKey: "locations/keep.md#dungeon:sunken-keep",
			LocationRole:      "keeper", Visibility: "dm",
			AvatarAsset: &MarkdownAssetInput{
				SourceKey: "locations/keep.md#npc:voss/avatar",
				Filename:  "voss.png", ContentType: "image/png", Data: []byte("avatar"),
			},
			Creature: CreatureInput{
				Name: "Keeper Voss", ArmorClass: 13, HitPoints: 22,
				StatBlock: map[string]any{"abilityScores": map[string]any{"charisma": 16}},
			},
		}},
		Dungeons: []MarkdownDungeonImportInput{{
			SourceKey:  "locations/keep.md#dungeon:sunken-keep",
			SourcePath: "Locations/Keep.md", BlockID: "sunken-keep", ContentHash: "dungeon-hash",
			Location: LocationInput{
				Name: "The Sunken Keep", LocationType: "dungeon", Status: "active",
			},
			Map: &MarkdownDungeonMapImportInput{
				SourceKey:       "locations/keep.md#dungeon:sunken-keep/map/root",
				ParentSourceKey: "locations/keep.md#dungeon:sunken-keep",
				SourcePath:      "Locations/Keep.md", BlockID: "sunken-keep",
				Map: CampaignMapInput{
					Name: "The Sunken Keep Studio Map", MapType: "dungeon", Mode: "blank",
					Width: float64(studio.Grid.Width * 20), Height: float64(studio.Grid.Height * 20),
					ScaleDistancePerPixel: 0.25, ScaleDistanceUnit: "feet",
					CalibrationPixelLength: 20, CalibrationDistance: 5,
					Metadata: map[string]any{},
				},
				Studio: &studio,
			},
			Floors: []MarkdownDungeonFloorImportInput{{
				SourceKey: "locations/keep.md#dungeon:sunken-keep/floor/lower",
				Location: LocationInput{
					Name: "Lower Vault", LocationType: "floor", Status: "active",
				},
				Map: &MarkdownDungeonMapImportInput{
					SourceKey:       "locations/keep.md#dungeon:sunken-keep/floor/lower/map",
					ParentSourceKey: "locations/keep.md#dungeon:sunken-keep/floor/lower",
					SourcePath:      "Locations/Keep.md", BlockID: "sunken-keep/lower",
					Map: CampaignMapInput{
						Name: "Lower Vault Studio Map", MapType: "floor", Mode: "blank",
						Width: float64(studio.Grid.Width * 20), Height: float64(studio.Grid.Height * 20),
						ScaleDistancePerPixel: 0.25, ScaleDistanceUnit: "feet",
						CalibrationPixelLength: 20, CalibrationDistance: 5,
						Metadata: map[string]any{},
					},
					Studio: &studio,
				},
			}},
		}},
	}
}
