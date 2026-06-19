package store

import (
	"context"
	"errors"
	"math"
	"testing"
)

func TestCampaignMapsPinsAndDistancesAreCampaignScoped(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("maps-owner"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Map Campaign"})
	requireNoError(t, err)
	otherCampaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Other Map Campaign"})
	requireNoError(t, err)

	region, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{Name: "Veyrune Reach", LocationType: "region"})
	requireNoError(t, err)
	town, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{ParentLocationID: region.ID, Name: "Brindleford", LocationType: "settlement"})
	requireNoError(t, err)
	dungeon, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{ParentLocationID: region.ID, Name: "Old Well", LocationType: "dungeon"})
	requireNoError(t, err)
	otherLocation, err := stores.Travel.CreateLocation(ctx, owner.ID, otherCampaign.ID, LocationInput{Name: "Wrong Town"})
	requireNoError(t, err)

	campaignMap, err := stores.Travel.CreateMap(ctx, owner.ID, campaign.ID, CampaignMapInput{
		ParentLocationID:      region.ID,
		Name:                  "Reach Map",
		MapType:               "region",
		Mode:                  "blank",
		Width:                 1000,
		Height:                1000,
		ScaleDistancePerPixel: 0.5,
		ScaleDistanceUnit:     "miles",
	})
	requireNoError(t, err)
	if campaignMap.ParentLocationID != region.ID || campaignMap.ImageURL != "" {
		t.Fatalf("expected region blank map, got %+v", campaignMap)
	}

	_, err = stores.Travel.CreateMap(ctx, owner.ID, campaign.ID, CampaignMapInput{
		ParentLocationID:      otherLocation.ID,
		Name:                  "Bad Map",
		MapType:               "region",
		Mode:                  "blank",
		Width:                 100,
		Height:                100,
		ScaleDistancePerPixel: 1,
		ScaleDistanceUnit:     "miles",
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for cross-campaign map parent, got %v", err)
	}

	_, err = stores.Travel.CreateMapPin(ctx, owner.ID, campaign.ID, campaignMap.ID, CampaignMapPinInput{LocationID: otherLocation.ID, X: 10, Y: 10})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for cross-campaign pin location, got %v", err)
	}
	_, err = stores.Travel.CreateMapPin(ctx, owner.ID, campaign.ID, campaignMap.ID, CampaignMapPinInput{LocationID: town.ID, X: 1200, Y: 10})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for out-of-bounds pin, got %v", err)
	}

	pinA, err := stores.Travel.CreateMapPin(ctx, owner.ID, campaign.ID, campaignMap.ID, CampaignMapPinInput{LocationID: town.ID, X: 0, Y: 0, Visibility: "dm"})
	requireNoError(t, err)
	pinB, err := stores.Travel.CreateMapPin(ctx, owner.ID, campaign.ID, campaignMap.ID, CampaignMapPinInput{LocationID: dungeon.ID, X: 3, Y: 4, Visibility: "dm"})
	requireNoError(t, err)
	if pinA.MapID != campaignMap.ID || pinB.LocationID != dungeon.ID {
		t.Fatalf("expected pins to round-trip, got %+v %+v", pinA, pinB)
	}

	distance, err := stores.Travel.DistanceBetweenLocationPins(ctx, owner.ID, campaign.ID, campaignMap.ID, town.ID, dungeon.ID)
	requireNoError(t, err)
	if math.Abs(distance.PixelDistance-5) > 0.001 || math.Abs(distance.Distance-2.5) > 0.001 || distance.TravelDistanceUnit != "miles" {
		t.Fatalf("expected 5px / 2.5 miles distance, got %+v", distance)
	}

	pins, err := stores.Travel.PinsForMap(ctx, owner.ID, campaign.ID, campaignMap.ID)
	requireNoError(t, err)
	if len(pins) != 2 {
		t.Fatalf("expected two pins, got %+v", pins)
	}
	requireNoError(t, stores.Travel.DeleteMap(ctx, owner.ID, campaign.ID, campaignMap.ID))
	pins, err = stores.Travel.PinsForMap(ctx, owner.ID, campaign.ID, campaignMap.ID)
	if !errors.Is(err, ErrNotFound) || len(pins) != 0 {
		t.Fatalf("expected map deletion to remove pin access, got pins=%+v err=%v", pins, err)
	}
}
