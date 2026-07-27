package httpapi

import (
	"context"
	"fmt"
	"strings"

	"bludm/backend/internal/generation"
	"bludm/backend/internal/markdownworld"
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

func (s *Server) prepareMarkdownWorldImport(
	ctx context.Context,
	campaignID string,
	request markdownWorldRequest,
) (preparedMarkdownWorldImport, error) {
	if _, err := s.campaignByID(ctx, campaignID); err != nil {
		return preparedMarkdownWorldImport{}, err
	}
	blocks, err := markdownworld.Parse(request.Markdown)
	if err != nil {
		return preparedMarkdownWorldImport{}, fmt.Errorf("%w: %v", errInvalidMarkdownWorld, err)
	}
	sourcePath := normalizeMarkdownSourcePath(request.SourcePath)
	if len(sourcePath) > 500 {
		return preparedMarkdownWorldImport{}, fmt.Errorf("%w: sourcePath must be 500 characters or fewer", errInvalidMarkdownWorld)
	}
	locations, err := s.stores.Travel.LocationsForCampaign(ctx, currentUserIDMust(ctx), campaignID)
	if err != nil {
		return preparedMarkdownWorldImport{}, err
	}
	assets, err := decodeMarkdownAssets(request.Assets)
	if err != nil {
		return preparedMarkdownWorldImport{}, fmt.Errorf("%w: %v", errInvalidMarkdownWorld, err)
	}
	prepared := preparedMarkdownWorldImport{
		Preview: markdownWorldPreview{
			SourcePath: sourcePath, CanImport: true,
			NPCs: []markdownWorldNPCChange{}, Dungeons: []markdownDungeonChange{},
		},
		NPCs: []store.MarkdownNPCImportInput{}, Dungeons: []store.MarkdownDungeonImportInput{},
	}
	seen := map[string]bool{}
	authoredLocations := markdownAuthoredLocations(sourcePath, blocks)
	for _, block := range blocks.NPCs {
		change, input := s.prepareMarkdownNPC(
			ctx, campaignID, sourcePath, block, locations, authoredLocations, assets,
		)
		if seen[input.SourceKey] {
			change.Errors = append(change.Errors, "duplicate NPC id in this Markdown file")
		}
		seen[input.SourceKey] = true
		if len(change.Errors) > 0 {
			prepared.Preview.CanImport = false
		}
		prepared.Preview.NPCs = append(prepared.Preview.NPCs, change)
		prepared.NPCs = append(prepared.NPCs, input)
	}
	for _, block := range blocks.Dungeons {
		change, input := s.prepareMarkdownDungeon(
			ctx, campaignID, sourcePath, block, locations, assets,
		)
		if seen[input.SourceKey] {
			change.Errors = append(change.Errors, "duplicate dungeon id in this Markdown file")
		}
		seen[input.SourceKey] = true
		if len(change.Errors) > 0 {
			prepared.Preview.CanImport = false
		}
		prepared.Preview.Dungeons = append(prepared.Preview.Dungeons, change)
		prepared.Dungeons = append(prepared.Dungeons, input)
	}
	return prepared, nil
}

func (s *Server) prepareMarkdownNPC(
	ctx context.Context,
	campaignID string,
	sourcePath string,
	block markdownworld.NPCBlock,
	locations []models.CampaignLocation,
	authoredLocations map[string][]string,
	assets map[string]decodedMarkdownAsset,
) (markdownWorldNPCChange, store.MarkdownNPCImportInput) {
	document := block.Document
	sourceKey := strings.ToLower(sourcePath) + "#npc:" + document.ID
	change := markdownWorldNPCChange{
		BlockID: document.ID, Line: block.Line, Name: document.Name, Operation: "create",
		Location: document.Location, AvatarPath: document.Avatar,
		Warnings: []string{}, Errors: []string{},
	}
	input := store.MarkdownNPCImportInput{
		SourceKey: sourceKey, SourcePath: sourcePath, BlockID: document.ID,
		ContentHash: markdownBlockHash(block.Raw),
		Disposition: document.Disposition, LocationRole: document.LocationRole,
		Visibility: document.Visibility, LocationNotes: document.LocationNotes,
		Creature: store.CreatureInput{
			Name: document.Name, Description: document.Description, Size: document.Size,
			CreatureType: document.CreatureType, Alignment: document.Alignment,
			ArmorClass: document.ArmorClass, HitPoints: document.HitPoints,
			HitDice: document.HitDice, ChallengeRating: document.ChallengeRating,
			XP: document.XP, StatBlock: document.StatBlock,
		},
	}
	if existing, err := s.stores.MarkdownWorld.NPCBySourceKey(
		ctx, currentUserIDMust(ctx), sourceKey,
	); err == nil {
		change.Operation = "update"
		change.ExistingCreatureID = existing.ID
	} else if !store.IsNotFound(err) {
		change.Errors = append(change.Errors, "could not check for an existing imported NPC")
	}
	location, resolutionError := resolveRequiredMarkdownLocation(
		document.LocationID, document.Location, locations,
	)
	if resolutionError != "" {
		authoredMatches := authoredLocations[strings.ToLower(strings.TrimSpace(document.Location))]
		if document.LocationID == "" && len(authoredMatches) == 1 {
			input.LocationSourceKey = authoredMatches[0]
			change.Warnings = append(change.Warnings, "location will link to the dungeon imported from this note")
		} else {
			change.Errors = append(change.Errors, resolutionError)
		}
	} else if location != nil {
		change.Location = location.Name
		change.LocationID = location.ID
		input.LocationID = location.ID
	}
	if document.Avatar != "" {
		if strings.HasPrefix(document.Avatar, "https://") || strings.HasPrefix(document.Avatar, "http://") {
			input.Creature.AvatarURL = document.Avatar
		} else if asset, ok := referencedMarkdownAsset(sourcePath, document.Avatar, assets); ok {
			input.AvatarAsset = &store.MarkdownAssetInput{
				SourceKey: sourceKey + "/avatar", Filename: asset.Filename,
				ContentType: asset.ContentType, Data: asset.Data,
			}
		} else {
			change.Errors = append(change.Errors, fmt.Sprintf("avatar image %q was not supplied", document.Avatar))
		}
	}
	_ = campaignID
	return change, input
}

func (s *Server) prepareMarkdownDungeon(
	ctx context.Context,
	campaignID string,
	sourcePath string,
	block markdownworld.DungeonBlock,
	locations []models.CampaignLocation,
	assets map[string]decodedMarkdownAsset,
) (markdownDungeonChange, store.MarkdownDungeonImportInput) {
	document := block.Document
	sourceKey := strings.ToLower(sourcePath) + "#dungeon:" + document.ID
	change := markdownDungeonChange{
		BlockID: document.ID, Line: block.Line, Name: document.Name, Operation: "create",
		ParentLocation: document.ParentLocation, FloorCount: len(document.Floors),
		Maps: []markdownDungeonMapChange{}, Warnings: []string{}, Errors: []string{},
	}
	parent, resolutionError := resolveOptionalMarkdownLocation(
		document.ParentLocationID, document.ParentLocation, locations,
	)
	if resolutionError != "" {
		change.Errors = append(change.Errors, resolutionError)
	}
	parentID := ""
	if parent != nil {
		parentID = parent.ID
		change.ParentLocation = parent.Name
		change.ParentLocationID = parent.ID
	}
	input := store.MarkdownDungeonImportInput{
		SourceKey: sourceKey, SourcePath: sourcePath, BlockID: document.ID,
		ContentHash: markdownBlockHash(block.Raw),
		Location:    markdownDungeonLocationInput(document, parentID),
		Floors:      []store.MarkdownDungeonFloorImportInput{},
	}
	if existing, err := s.stores.MarkdownWorld.LocationBySourceKey(
		ctx, currentUserIDMust(ctx), campaignID, sourceKey,
	); err == nil {
		change.Operation = "update"
		change.ExistingLocationID = existing.ID
	} else if !store.IsNotFound(err) {
		change.Errors = append(change.Errors, "could not check for an existing imported dungeon")
	}
	if document.Map != nil {
		mapInput, mapChange, mapErrors := prepareMarkdownDungeonMap(
			sourcePath, sourceKey+"/map/root", document.ID, document.Name,
			"dungeon", document.Map, assets,
		)
		input.Map = &mapInput
		change.Maps = append(change.Maps, mapChange)
		change.Errors = append(change.Errors, mapErrors...)
	}
	for _, floor := range document.Floors {
		floorSourceKey := sourceKey + "/floor/" + floor.ID
		floorInput := store.MarkdownDungeonFloorImportInput{
			SourceKey: floorSourceKey,
			Location: store.LocationInput{
				Name: floor.Name, LocationType: "floor", Summary: floor.Summary,
				Notes: floor.Notes, PublicNotes: floor.PublicNotes, DMNotes: floor.DMNotes,
				Tags: floor.Tags, Status: floor.Status,
			},
		}
		if floor.Map != nil {
			mapInput, mapChange, mapErrors := prepareMarkdownDungeonMap(
				sourcePath, floorSourceKey+"/map", document.ID+"/"+floor.ID,
				floor.Name, "floor", floor.Map, assets,
			)
			floorInput.Map = &mapInput
			change.Maps = append(change.Maps, mapChange)
			change.Errors = append(change.Errors, mapErrors...)
		}
		input.Floors = append(input.Floors, floorInput)
	}
	return change, input
}

func prepareMarkdownDungeonMap(
	sourcePath string,
	sourceKey string,
	blockID string,
	locationName string,
	scope string,
	document *markdownworld.DungeonMap,
	assets map[string]decodedMarkdownAsset,
) (store.MarkdownDungeonMapImportInput, markdownDungeonMapChange, []string) {
	errors := []string{}
	mapName := strings.TrimSpace(document.Name)
	if mapName == "" {
		mapName = locationName + " Studio Map"
	}
	mapType := strings.TrimSpace(document.MapType)
	if mapType == "" {
		mapType = scope
	}
	input := store.MarkdownDungeonMapImportInput{
		SourceKey:       sourceKey,
		ParentSourceKey: markdownMapParentSourceKey(sourceKey),
		SourcePath:      sourcePath,
		BlockID:         blockID,
		Map: store.CampaignMapInput{
			Name: mapName, Description: document.Description, MapType: mapType, Mode: "blank",
			Width: document.Width, Height: document.Height,
			ScaleDistancePerPixel:  document.ScaleDistancePerPixel,
			ScaleDistanceUnit:      document.ScaleDistanceUnit,
			CalibrationPixelLength: document.CalibrationPixelLength,
			CalibrationDistance:    document.CalibrationDistance, Metadata: map[string]any{},
		},
	}
	var studio *generation.DungeonDocument
	if document.Generator != nil && document.Studio != nil {
		errors = append(errors, "map must use either generator or studio, not both")
	} else if document.Generator != nil {
		generated := generation.GenerateDungeon(document.Generator.Settings())
		generated.Scope = scope
		studio = &generated
	} else if document.Studio != nil {
		copied := *document.Studio
		if validationError := validateMarkdownStudioDocument(&copied, scope); validationError != "" {
			errors = append(errors, validationError)
		} else {
			studio = &copied
		}
	}
	if studio != nil {
		input.Studio = studio
		input.Map.Width = float64(studio.Grid.Width * 20)
		input.Map.Height = float64(studio.Grid.Height * 20)
		input.Map.ScaleDistancePerPixel = float64(studio.Grid.CellSizeFeet) / 20
		input.Map.ScaleDistanceUnit = "feet"
		input.Map.CalibrationPixelLength = 20
		input.Map.CalibrationDistance = float64(studio.Grid.CellSizeFeet)
	}
	kind := "dungeon-studio"
	if document.Image != "" {
		kind = "image"
		if studio != nil {
			errors = append(errors, "image maps cannot also contain generator or studio")
		} else if asset, ok := referencedMarkdownAsset(sourcePath, document.Image, assets); ok {
			input.ImageAsset = &store.MarkdownAssetInput{
				SourceKey: sourceKey + "/image", Filename: asset.Filename,
				ContentType: asset.ContentType, Data: asset.Data,
			}
			if input.Map.Width <= 0 {
				input.Map.Width = 1000
			}
			if input.Map.Height <= 0 {
				input.Map.Height = 700
			}
			if input.Map.ScaleDistanceUnit == "" {
				input.Map.ScaleDistanceUnit = "feet"
			}
		} else {
			errors = append(errors, fmt.Sprintf("map image %q was not supplied", document.Image))
		}
	}
	if document.Image == "" && studio == nil {
		errors = append(errors, "map requires image, generator, or studio")
	}
	return input, markdownDungeonMapChange{
		Name: mapName, Kind: kind, RoomCount: studioRoomCount(studio), ImagePath: document.Image,
	}, errors
}

func markdownDungeonLocationInput(
	document markdownworld.DungeonDocument,
	parentLocationID string,
) store.LocationInput {
	return store.LocationInput{
		ParentLocationID: parentLocationID, Name: document.Name, LocationType: "dungeon",
		Summary: document.Summary, Notes: document.Notes, PublicNotes: document.PublicNotes,
		DMNotes: document.DMNotes, Tags: document.Tags, Status: document.Status,
	}
}

func validateMarkdownStudioDocument(document *generation.DungeonDocument, scope string) string {
	if document.Version != 1 || document.Kind != "dungeon-studio" {
		return "studio must be a version 1 dungeon-studio document"
	}
	if document.Grid.Width < 1 || document.Grid.Width > 80 ||
		document.Grid.Height < 1 || document.Grid.Height > 80 {
		return "studio grid width and height must be between 1 and 80"
	}
	if document.Grid.CellSizeFeet < 1 || document.Grid.CellSizeFeet > 100 {
		document.Grid.CellSizeFeet = 5
	}
	document.Scope = scope
	roomIDs := map[string]bool{}
	for _, room := range document.Rooms {
		if strings.TrimSpace(room.ID) == "" || roomIDs[room.ID] {
			return "studio room ids must be present and unique"
		}
		roomIDs[room.ID] = true
		for _, cell := range room.Cells {
			if cell.X < 0 || cell.Y < 0 || cell.X >= document.Grid.Width || cell.Y >= document.Grid.Height {
				return fmt.Sprintf("studio room %q contains a cell outside the grid", room.ID)
			}
		}
	}
	return ""
}

func resolveRequiredMarkdownLocation(
	locationID string,
	locationName string,
	locations []models.CampaignLocation,
) (*models.CampaignLocation, string) {
	if strings.TrimSpace(locationID) == "" && strings.TrimSpace(locationName) == "" {
		return nil, ""
	}
	return resolveOptionalMarkdownLocation(locationID, locationName, locations)
}

func resolveOptionalMarkdownLocation(
	locationID string,
	locationName string,
	locations []models.CampaignLocation,
) (*models.CampaignLocation, string) {
	locationID = strings.TrimSpace(locationID)
	locationName = strings.TrimSpace(locationName)
	if locationID != "" {
		for index := range locations {
			if locations[index].ID == locationID {
				return &locations[index], ""
			}
		}
		return nil, fmt.Sprintf("location_id %q was not found in this campaign", locationID)
	}
	if locationName == "" {
		return nil, ""
	}
	matches := []*models.CampaignLocation{}
	for index := range locations {
		location := &locations[index]
		pathLabel := []string{}
		for _, segment := range location.Path {
			pathLabel = append(pathLabel, segment.Name)
		}
		if strings.EqualFold(location.Name, locationName) ||
			strings.EqualFold(strings.Join(pathLabel, " / "), locationName) {
			matches = append(matches, location)
		}
	}
	if len(matches) == 1 {
		return matches[0], ""
	}
	if len(matches) > 1 {
		return nil, fmt.Sprintf("location %q is ambiguous; use location_id or its full path", locationName)
	}
	return nil, fmt.Sprintf("location %q was not found in this campaign", locationName)
}

func studioRoomCount(document *generation.DungeonDocument) int {
	if document == nil {
		return 0
	}
	return len(document.Rooms)
}

func markdownMapParentSourceKey(sourceKey string) string {
	if strings.HasSuffix(sourceKey, "/map/root") {
		return strings.TrimSuffix(sourceKey, "/map/root")
	}
	return strings.TrimSuffix(sourceKey, "/map")
}

func markdownAuthoredLocations(
	sourcePath string,
	blocks markdownworld.Blocks,
) map[string][]string {
	result := map[string][]string{}
	for _, block := range blocks.Dungeons {
		sourceKey := strings.ToLower(sourcePath) + "#dungeon:" + block.Document.ID
		nameKey := strings.ToLower(strings.TrimSpace(block.Document.Name))
		result[nameKey] = append(result[nameKey], sourceKey)
		for _, floor := range block.Document.Floors {
			floorKey := strings.ToLower(strings.TrimSpace(floor.Name))
			result[floorKey] = append(result[floorKey], sourceKey+"/floor/"+floor.ID)
		}
	}
	return result
}
