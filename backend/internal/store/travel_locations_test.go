package store

import (
	"bludm/backend/internal/models"
	"context"
	"errors"
	"testing"
)

func TestCampaignLocationWorldModelNestingPathsAndLinks(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("locations-owner"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "World Campaign"})
	requireNoError(t, err)

	region, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{
		Name:         "Veyrune Reach",
		LocationType: "region",
		Summary:      "A wind-scoured border province.",
		Tags:         []string{"frontier"},
		MapAnchor:    map[string]any{"marker": "region"},
	})
	requireNoError(t, err)
	town, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{
		ParentLocationID: region.ID,
		Name:             "Brindleford",
		LocationType:     "settlement",
		SortOrder:        1,
	})
	requireNoError(t, err)
	shop, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{
		ParentLocationID: town.ID,
		Name:             "Copper Kettle",
		LocationType:     "shop",
		PublicNotes:      "Copper pots hang from the rafters.",
		DMNotes:          "The cellar trapdoor hides a shrine passage.",
		Tags:             []string{"rumor hub", "warm food"},
		Status:           "active",
	})
	requireNoError(t, err)

	locations, err := stores.Travel.LocationsForCampaign(ctx, owner.ID, campaign.ID)
	requireNoError(t, err)
	shop = locationByName(t, locations, "Copper Kettle")
	if shop.ParentLocationID != town.ID {
		t.Fatalf("expected shop parent %q, got %q", town.ID, shop.ParentLocationID)
	}
	if len(shop.Path) != 3 {
		t.Fatalf("expected three path segments, got %+v", shop.Path)
	}
	if shop.Path[0].Name != "Veyrune Reach" || shop.Path[1].Name != "Brindleford" || shop.Path[2].Name != "Copper Kettle" {
		t.Fatalf("expected region/town/shop path, got %+v", shop.Path)
	}
	if len(shop.Tags) != 2 || shop.Tags[0] != "rumor hub" {
		t.Fatalf("expected shop tags to round-trip, got %+v", shop.Tags)
	}

	link, err := stores.Travel.CreateLocationLink(ctx, owner.ID, campaign.ID, LocationLinkInput{
		SourceLocationID: shop.ID,
		TargetLocationID: region.ID,
		LinkType:         "secret-passage",
		Label:            "Cellar route",
		Direction:        "one-way",
		Visibility:       "hidden",
		Notes:            "Only visible after the bronze raven token is shown.",
	})
	requireNoError(t, err)
	if link.SourceLocationID != shop.ID || link.TargetLocationID != region.ID {
		t.Fatalf("expected link to connect shop to region, got %+v", link)
	}
	links, err := stores.Travel.LocationLinksForCampaign(ctx, owner.ID, campaign.ID)
	requireNoError(t, err)
	if len(links) != 1 || links[0].LinkType != "secret-passage" {
		t.Fatalf("expected one secret-passage link, got %+v", links)
	}
}

func TestCampaignLocationRejectsCyclesAndCrossCampaignParents(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("locations-cycles"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Cycle Campaign"})
	requireNoError(t, err)
	otherCampaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Other Campaign"})
	requireNoError(t, err)

	parent, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{Name: "Old Well", LocationType: "dungeon"})
	requireNoError(t, err)
	child, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{
		ParentLocationID: parent.ID,
		Name:             "Lower Floor",
		LocationType:     "floor",
	})
	requireNoError(t, err)
	otherLocation, err := stores.Travel.CreateLocation(ctx, owner.ID, otherCampaign.ID, LocationInput{Name: "Wrong Town"})
	requireNoError(t, err)

	_, err = stores.Travel.UpdateLocation(ctx, owner.ID, campaign.ID, parent.ID, LocationInput{
		ParentLocationID: child.ID,
		Name:             parent.Name,
		LocationType:     parent.LocationType,
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound when creating a parent cycle, got %v", err)
	}

	_, err = stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{
		ParentLocationID: otherLocation.ID,
		Name:             "Invalid Child",
		LocationType:     "room",
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for cross-campaign parent, got %v", err)
	}

	_, err = stores.Travel.CreateLocationLink(ctx, owner.ID, campaign.ID, LocationLinkInput{
		SourceLocationID: parent.ID,
		TargetLocationID: otherLocation.ID,
		LinkType:         "portal",
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for cross-campaign location link, got %v", err)
	}
}

func TestCampaignLocationEncounterAttachmentIsCampaignScoped(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("locations-encounter"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Encounter Campaign"})
	requireNoError(t, err)
	otherCampaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Other Encounter Campaign"})
	requireNoError(t, err)

	location, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{Name: "Copper Kettle", LocationType: "shop"})
	requireNoError(t, err)
	otherLocation, err := stores.Travel.CreateLocation(ctx, owner.ID, otherCampaign.ID, LocationInput{Name: "Wrong Shop", LocationType: "shop"})
	requireNoError(t, err)

	encounter, err := stores.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, CampaignEncounterInput{
		Name:       "Shop Brawl",
		Location:   "Copper Kettle",
		LocationID: location.ID,
	})
	requireNoError(t, err)
	if encounter.LocationID == nil || *encounter.LocationID != location.ID {
		t.Fatalf("expected encounter to attach to location %q, got %+v", location.ID, encounter.LocationID)
	}

	_, err = stores.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, CampaignEncounterInput{
		Name:       "Wrong Shop Brawl",
		LocationID: otherLocation.ID,
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for cross-campaign encounter location, got %v", err)
	}

	requireNoError(t, stores.Travel.DeleteLocation(ctx, owner.ID, campaign.ID, location.ID))
	updated, err := stores.Encounters.ByID(ctx, owner.ID, encounter.ID)
	requireNoError(t, err)
	if updated.LocationID != nil {
		t.Fatalf("expected deleting location to clear structured encounter location, got %+v", updated.LocationID)
	}
	if updated.Location != "Copper Kettle" {
		t.Fatalf("expected free-text encounter location to remain, got %q", updated.Location)
	}
}

func TestCampaignNpcLocationLinksAreCampaignScoped(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("locations-npc-links"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "NPC Link Campaign"})
	requireNoError(t, err)
	otherCampaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Other NPC Link Campaign"})
	requireNoError(t, err)

	location, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{Name: "Copper Kettle", LocationType: "shop"})
	requireNoError(t, err)
	otherLocation, err := stores.Travel.CreateLocation(ctx, owner.ID, otherCampaign.ID, LocationInput{Name: "Wrong Shop", LocationType: "shop"})
	requireNoError(t, err)
	npc, err := stores.Creatures.Create(ctx, owner.ID, CreatureInput{
		Name:            "Mara Vell",
		Description:     "Innkeeper and rumormonger.",
		Size:            "Medium",
		CreatureType:    "humanoid",
		Alignment:       "neutral",
		ArmorClass:      12,
		HitPoints:       9,
		HitDice:         "2d8",
		ChallengeRating: "0",
		StatBlock:       map[string]any{},
	})
	requireNoError(t, err)

	_, err = stores.Travel.CreateNpcLocationLink(ctx, owner.ID, campaign.ID, NpcLocationLinkInput{
		CreatureID: npc.ID,
		LocationID: location.ID,
		LinkType:   "works-here",
		Notes:      "Knows which shelves hide contraband.",
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound before NPC is linked to campaign, got %v", err)
	}
	requireNoError(t, stores.Campaigns.LinkCreature(ctx, owner.ID, campaign.ID, npc.ID, "ally"))

	link, err := stores.Travel.CreateNpcLocationLink(ctx, owner.ID, campaign.ID, NpcLocationLinkInput{
		CreatureID: npc.ID,
		LocationID: location.ID,
		LinkType:   "works-here",
		Visibility: "dm",
		Notes:      "Knows which shelves hide contraband.",
	})
	requireNoError(t, err)
	if link.CreatureID != npc.ID || link.LocationID != location.ID || link.LinkType != "works-here" {
		t.Fatalf("expected NPC location link to round-trip, got %+v", link)
	}

	links, err := stores.Travel.NpcLocationLinksForCampaign(ctx, owner.ID, campaign.ID)
	requireNoError(t, err)
	if len(links) != 1 || links[0].Notes != "Knows which shelves hide contraband." {
		t.Fatalf("expected one NPC location link, got %+v", links)
	}

	_, err = stores.Travel.CreateNpcLocationLink(ctx, owner.ID, campaign.ID, NpcLocationLinkInput{
		CreatureID: npc.ID,
		LocationID: otherLocation.ID,
		LinkType:   "visits",
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for cross-campaign NPC location link, got %v", err)
	}

	requireNoError(t, stores.Campaigns.UnlinkCreature(ctx, owner.ID, campaign.ID, npc.ID))
	links, err = stores.Travel.NpcLocationLinksForCampaign(ctx, owner.ID, campaign.ID)
	requireNoError(t, err)
	if len(links) != 0 {
		t.Fatalf("expected unlinking campaign NPC to clear location links, got %+v", links)
	}
}

func TestCampaignLocationStockLinksItemsToShops(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("locations-stock"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Stock Campaign"})
	requireNoError(t, err)
	otherCampaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Other Stock Campaign"})
	requireNoError(t, err)

	shop, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{Name: "Copper Kettle", LocationType: "shop"})
	requireNoError(t, err)
	otherShop, err := stores.Travel.CreateLocation(ctx, owner.ID, otherCampaign.ID, LocationInput{Name: "Wrong Kettle", LocationType: "shop"})
	requireNoError(t, err)
	item, err := stores.Items.Create(ctx, owner.ID, ItemInput{
		Name:        "Healing Draught",
		Category:    "Potion",
		ItemType:    "Consumable",
		ValueAmount: 50,
		ValueUnit:   "gp",
		Description: "A bitter red tonic.",
	})
	requireNoError(t, err)

	stock, err := stores.Travel.UpsertLocationStock(ctx, owner.ID, campaign.ID, LocationStockInput{
		LocationID:    shop.ID,
		ItemID:        item.ID,
		LibrarySource: "user",
		Quantity:      3,
		PriceAmount:   60,
		PriceUnit:     "GP",
		Availability:  "limited",
		Notes:         "Two more arrive next tenday.",
	})
	requireNoError(t, err)
	if stock.ItemID != item.ID || stock.LocationID != shop.ID || stock.PriceUnit != "gp" {
		t.Fatalf("expected stock to round-trip item/location/price unit, got %+v", stock)
	}

	updated, err := stores.Travel.UpsertLocationStock(ctx, owner.ID, campaign.ID, LocationStockInput{
		LocationID:    shop.ID,
		ItemID:        item.ID,
		LibrarySource: "user",
		Quantity:      7,
		PriceAmount:   55,
		PriceUnit:     "gp",
		Availability:  "in-stock",
	})
	requireNoError(t, err)
	if updated.ID != stock.ID || updated.Quantity != 7 || updated.PriceAmount != 55 {
		t.Fatalf("expected stock upsert to update existing row, got before=%+v after=%+v", stock, updated)
	}

	stockList, err := stores.Travel.LocationStockForCampaign(ctx, owner.ID, campaign.ID)
	requireNoError(t, err)
	if len(stockList) != 1 || stockList[0].ID != stock.ID {
		t.Fatalf("expected one stock row after upsert, got %+v", stockList)
	}

	_, err = stores.Travel.UpsertLocationStock(ctx, owner.ID, campaign.ID, LocationStockInput{
		LocationID:    otherShop.ID,
		ItemID:        item.ID,
		LibrarySource: "user",
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for cross-campaign stock location, got %v", err)
	}

	requireNoError(t, stores.Travel.DeleteLocationStock(ctx, owner.ID, campaign.ID, stock.ID))
	stockList, err = stores.Travel.LocationStockForCampaign(ctx, owner.ID, campaign.ID)
	requireNoError(t, err)
	if len(stockList) != 0 {
		t.Fatalf("expected deleting stock to clear row, got %+v", stockList)
	}
}

func locationByName(t *testing.T, locations []models.CampaignLocation, name string) models.CampaignLocation {
	t.Helper()
	for _, location := range locations {
		if location.Name == name {
			return location
		}
	}
	t.Fatalf("location %q not found in %+v", name, locations)
	return models.CampaignLocation{}
}
