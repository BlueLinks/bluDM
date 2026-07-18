package store

import (
	"context"

	dbmodels "bludm/backend/internal/db"
)

func (s ImportExportStore) exportNPCBundle(ctx context.Context, ownerUserID string, objectIDs []string, manifest *PortableManifest) error {
	return s.exportOwnedObjects(ctx, ownerUserID, objectIDs, &manifest.NPCs, "creatures")
}

func (s ImportExportStore) exportPlayerBundle(ctx context.Context, ownerUserID string, objectIDs []string, manifest *PortableManifest) error {
	if err := s.exportOwnedObjects(ctx, ownerUserID, objectIDs, &manifest.Players, "players"); err != nil {
		return err
	}
	campaignIDs := idsFrom(manifest.Players, func(entity dbmodels.PlayerEntity) string {
		return stringFromPointer(entity.CampaignID)
	})
	return s.exportParentCampaigns(ctx, ownerUserID, campaignIDs, manifest)
}

func (s ImportExportStore) exportItemBundle(ctx context.Context, ownerUserID string, objectIDs []string, manifest *PortableManifest) error {
	return s.exportOwnedObjects(ctx, ownerUserID, objectIDs, &manifest.Items, "items")
}

func (s ImportExportStore) exportSpellBundle(ctx context.Context, ownerUserID string, objectIDs []string, manifest *PortableManifest) error {
	return s.exportOwnedObjects(ctx, ownerUserID, objectIDs, &manifest.Spells, "spells")
}

func (s ImportExportStore) exportOwnedObjects(ctx context.Context, ownerUserID string, objectIDs []string, dest any, table string) error {
	ids := uniqueNonEmpty(objectIDs)
	query := "owner_user_id = ?"
	args := []any{ownerUserID}
	if len(ids) > 0 {
		query += " and id in ?"
		args = append(args, ids)
	}
	if err := s.findWhere(ctx, dest, query, args...); err != nil {
		return err
	}
	return s.assertObjectCount(ctx, table, ownerUserID, ids)
}

func (s ImportExportStore) exportEncounterBundle(ctx context.Context, ownerUserID string, objectIDs []string, manifest *PortableManifest) error {
	ids := uniqueNonEmpty(objectIDs)
	query := "campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null)"
	args := []any{ownerUserID}
	if len(ids) > 0 {
		query += " and id in ?"
		args = append(args, ids)
	}
	if err := s.findWhere(ctx, &manifest.Encounters, query, args...); err != nil {
		return err
	}
	if len(ids) > 0 && len(manifest.Encounters) != len(ids) {
		return ErrNotFound
	}
	campaignIDs := idsFrom(manifest.Encounters, func(entity dbmodels.EncounterEntity) string {
		return entity.CampaignID
	})
	if err := s.exportParentCampaigns(ctx, ownerUserID, campaignIDs, manifest); err != nil {
		return err
	}
	encounterIDs := idsFrom(manifest.Encounters, func(entity dbmodels.EncounterEntity) string {
		return entity.ID
	})
	if err := s.exportEncounterChildren(ctx, encounterIDs, manifest); err != nil {
		return err
	}
	if err := s.exportEncounterLocations(ctx, campaignIDs, manifest); err != nil {
		return err
	}
	return s.exportReferencedLibraries(ctx, ownerUserID, campaignIDs, manifest)
}

func (s ImportExportStore) exportMapBundle(ctx context.Context, ownerUserID string, objectIDs []string, manifest *PortableManifest) error {
	ids := uniqueNonEmpty(objectIDs)
	query := "campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null)"
	args := []any{ownerUserID}
	if len(ids) > 0 {
		query += " and id in ?"
		args = append(args, ids)
	}
	if err := s.findWhere(ctx, &manifest.Maps, query, args...); err != nil {
		return err
	}
	if len(ids) > 0 && len(manifest.Maps) != len(ids) {
		return ErrNotFound
	}
	campaignIDs := idsFrom(manifest.Maps, func(entity dbmodels.CampaignMapEntity) string {
		return entity.CampaignID
	})
	if err := s.exportParentCampaigns(ctx, ownerUserID, campaignIDs, manifest); err != nil {
		return err
	}
	mapIDs := idsFrom(manifest.Maps, func(entity dbmodels.CampaignMapEntity) string { return entity.ID })
	if len(mapIDs) > 0 {
		if err := s.findWhere(ctx, &manifest.MapPins, "map_id in ?", mapIDs); err != nil {
			return err
		}
	}
	return s.exportMapLocations(ctx, campaignIDs, manifest)
}

func (s ImportExportStore) exportLocationKindBundle(ctx context.Context, ownerUserID string, objectIDs []string, kind string, manifest *PortableManifest) error {
	ids := uniqueNonEmpty(objectIDs)
	kinds := locationTypeAliases(kind)
	query := "campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null) and location_type in ?"
	args := []any{ownerUserID, kinds}
	if len(ids) > 0 {
		query += " and id in ?"
		args = append(args, ids)
	}
	if err := s.findWhere(ctx, &manifest.Locations, query, args...); err != nil {
		return err
	}
	if len(ids) > 0 && len(manifest.Locations) != len(ids) {
		return ErrNotFound
	}
	locationIDs := idsFrom(manifest.Locations, func(entity dbmodels.CampaignLocationEntity) string { return entity.ID })
	campaignIDs := idsFrom(manifest.Locations, func(entity dbmodels.CampaignLocationEntity) string { return entity.CampaignID })
	if err := s.exportParentCampaigns(ctx, ownerUserID, campaignIDs, manifest); err != nil {
		return err
	}
	if kind == "dungeon" {
		childIDs, err := s.exportDungeonChildren(ctx, campaignIDs, locationIDs, manifest)
		if err != nil {
			return err
		}
		locationIDs = append(locationIDs, childIDs...)
	}
	if err := s.exportLocationInternals(ctx, uniqueNonEmpty(locationIDs), manifest); err != nil {
		return err
	}
	if err := s.exportMapLocations(ctx, campaignIDs, manifest); err != nil {
		return err
	}
	if err := s.exportReferencedLibraries(ctx, ownerUserID, campaignIDs, manifest); err != nil {
		return err
	}
	return s.exportLibraryChildren(ctx, manifest)
}

func (s ImportExportStore) exportJourneyBundle(ctx context.Context, ownerUserID string, objectIDs []string, manifest *PortableManifest) error {
	ids := uniqueNonEmpty(objectIDs)
	query := "campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null)"
	args := []any{ownerUserID}
	if len(ids) > 0 {
		query += " and id in ?"
		args = append(args, ids)
	}
	if err := s.findWhere(ctx, &manifest.Journeys, query, args...); err != nil {
		return err
	}
	if len(ids) > 0 && len(manifest.Journeys) != len(ids) {
		return ErrNotFound
	}
	campaignIDs := idsFrom(manifest.Journeys, func(entity dbmodels.CampaignJourneyEntity) string { return entity.CampaignID })
	return s.exportParentCampaigns(ctx, ownerUserID, campaignIDs, manifest)
}

func (s ImportExportStore) exportRollTableBundle(ctx context.Context, ownerUserID string, objectIDs []string, manifest *PortableManifest) error {
	ids := uniqueNonEmpty(objectIDs)
	query := "campaign_id in (select id from campaigns where owner_user_id = ? and archived_at is null) and source = 'campaign'"
	args := []any{ownerUserID}
	if len(ids) > 0 {
		query += " and id in ?"
		args = append(args, ids)
	}
	if err := s.findWhere(ctx, &manifest.RollTables, query, args...); err != nil {
		return err
	}
	if len(ids) > 0 && len(manifest.RollTables) != len(ids) {
		return ErrNotFound
	}
	campaignIDs := idsFrom(manifest.RollTables, func(entity dbmodels.RollTableEntity) string {
		return stringFromPointer(entity.CampaignID)
	})
	if err := s.exportParentCampaigns(ctx, ownerUserID, campaignIDs, manifest); err != nil {
		return err
	}
	tableIDs := idsFrom(manifest.RollTables, func(entity dbmodels.RollTableEntity) string { return entity.ID })
	if len(tableIDs) > 0 {
		return s.findWhere(ctx, &manifest.RollTableRows, "table_id in ?", tableIDs)
	}
	return nil
}

func (s ImportExportStore) exportLocationInternals(ctx context.Context, locationIDs []string, manifest *PortableManifest) error {
	if len(locationIDs) == 0 {
		return nil
	}
	if err := s.findWhere(ctx, &manifest.LocationStock, "location_id in ?", locationIDs); err != nil {
		return err
	}
	if err := s.findWhere(ctx, &manifest.NPCLocationLinks, "location_id in ?", locationIDs); err != nil {
		return err
	}
	if err := s.findWhere(ctx, &manifest.Maps, "parent_location_id in ?", locationIDs); err != nil {
		return err
	}
	mapIDs := idsFrom(manifest.Maps, func(entity dbmodels.CampaignMapEntity) string { return entity.ID })
	if len(mapIDs) > 0 {
		if err := s.findWhere(ctx, &manifest.MapPins, "map_id in ?", mapIDs); err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) exportDungeonChildren(ctx context.Context, campaignIDs, rootLocationIDs []string, manifest *PortableManifest) ([]string, error) {
	if len(rootLocationIDs) == 0 {
		return nil, nil
	}
	seen := map[string]struct{}{}
	for _, id := range rootLocationIDs {
		seen[id] = struct{}{}
	}
	frontier := uniqueNonEmpty(rootLocationIDs)
	descendantIDs := []string{}
	for len(frontier) > 0 {
		var children []dbmodels.CampaignLocationEntity
		if err := s.findWhere(ctx, &children, "parent_location_id in ? and campaign_id in ?", frontier, campaignIDs); err != nil {
			return nil, err
		}
		next := []string{}
		for _, child := range children {
			if _, ok := seen[child.ID]; ok {
				continue
			}
			seen[child.ID] = struct{}{}
			next = append(next, child.ID)
			descendantIDs = append(descendantIDs, child.ID)
		}
		manifest.Locations = mergeByID(manifest.Locations, children, func(entity dbmodels.CampaignLocationEntity) string { return entity.ID })
		frontier = next
	}
	if len(descendantIDs) > 0 {
		if err := s.findWhere(ctx, &manifest.Encounters, "location_id in ? and campaign_id in ?", descendantIDs, campaignIDs); err != nil {
			return nil, err
		}
		if err := s.exportEncounterChildren(ctx, idsFrom(manifest.Encounters, func(entity dbmodels.EncounterEntity) string { return entity.ID }), manifest); err != nil {
			return nil, err
		}
	}
	return descendantIDs, nil
}

func (s ImportExportStore) assertObjectCount(ctx context.Context, table, ownerUserID string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	var count int64
	if err := s.db.WithContext(ctx).Table(table).
		Where("owner_user_id = ? and id in ?", ownerUserID, ids).
		Count(&count).Error; err != nil {
		return err
	}
	if count != int64(len(ids)) {
		return ErrNotFound
	}
	return nil
}

func (s ImportExportStore) exportParentCampaigns(ctx context.Context, ownerUserID string, campaignIDs []string, manifest *PortableManifest) error {
	if len(campaignIDs) == 0 {
		return nil
	}
	return s.findWhere(ctx, &manifest.Campaigns, "id in ? and owner_user_id = ? and archived_at is null", campaignIDs, ownerUserID)
}

func (s ImportExportStore) exportEncounterLocations(ctx context.Context, campaignIDs []string, manifest *PortableManifest) error {
	locationIDs := stringSet{}
	for _, encounter := range manifest.Encounters {
		if encounter.LocationID != nil {
			locationIDs.add(*encounter.LocationID)
		}
	}
	if ids := locationIDs.values(); len(ids) > 0 {
		return s.findWhere(ctx, &manifest.Locations, "id in ? and campaign_id in ?", ids, campaignIDs)
	}
	return nil
}

func (s ImportExportStore) exportMapLocations(ctx context.Context, campaignIDs []string, manifest *PortableManifest) error {
	locationIDs := stringSet{}
	for _, campaignMap := range manifest.Maps {
		if campaignMap.ParentLocationID != nil {
			locationIDs.add(*campaignMap.ParentLocationID)
		}
	}
	for _, pin := range manifest.MapPins {
		locationIDs.add(pin.LocationID)
	}
	seen := stringSet{}
	for _, location := range manifest.Locations {
		seen.add(location.ID)
	}
	for ids := locationIDs.values(); len(ids) > 0; ids = locationIDs.values() {
		locationIDs = stringSet{}
		var locations []dbmodels.CampaignLocationEntity
		if err := s.findWhere(ctx, &locations, "id in ? and campaign_id in ?", ids, campaignIDs); err != nil {
			return err
		}
		manifest.Locations = mergeByID(manifest.Locations, locations, func(entity dbmodels.CampaignLocationEntity) string { return entity.ID })
		for _, location := range locations {
			seen.add(location.ID)
			if location.ParentLocationID != nil {
				if _, ok := seen[*location.ParentLocationID]; !ok {
					locationIDs.add(*location.ParentLocationID)
				}
			}
		}
	}
	return nil
}

func locationTypeAliases(kind string) []string {
	switch kind {
	case "shop":
		return []string{"shop", "market", "vendor", "merchant", "blacksmith", "apothecary", "general-store", "armoury", "armory", "potion-store", "tavern", "inn", "magic-shop", "black-market", "stable"}
	case "dungeon":
		return []string{"dungeon", "lair", "cave", "mine", "tomb", "crypt", "ruin-interior", "fortress-interior", "stronghold-dungeon"}
	default:
		return []string{kind}
	}
}
