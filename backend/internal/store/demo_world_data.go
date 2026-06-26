package store

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type demoLocation struct {
	key, parentKey, name, locationType, summary, publicNotes, dmNotes string
	tags                                                              []string
	sortOrder                                                         int
	mapAnchor                                                         map[string]any
}

type demoMap struct {
	key, parentKey, name, description, mapType string
	width, height, scale                       float64
}

func seedDemoWorld(ctx context.Context, tx *gorm.DB, ownerUserID string, campaignID string, creatureIDs map[string]string) (map[string]string, error) {
	locations := []demoLocation{
		{key: "region", name: "The Verdant March", locationType: "region", summary: "A rain-bright borderland of caravan roads, mossy ruins, and watchful hill forts.", publicNotes: "The party is following rumors of missing caravans and green lantern lights in the old hills.", dmNotes: "The ruined lantern network is waking because the goblins cracked the seal below Greenhill.", tags: []string{"frontier", "trade road"}, sortOrder: 10},
		{key: "town", parentKey: "region", name: "Greenhill Market", locationType: "town", summary: "A practical market town built around a windmill hill and a busy coaching yard.", publicNotes: "Greenhill smells of wet hay, coal smoke, and baking hand pies on market mornings.", dmNotes: "The reeve knows more about the missing caravans than she admits.", tags: []string{"safe haven", "market"}, sortOrder: 10, mapAnchor: map[string]any{"x": 42, "y": 58}},
		{key: "ford", parentKey: "region", name: "Deep Ford Crossing", locationType: "landmark", summary: "A cold river crossing where wagon ruts disappear under black water.", publicNotes: "Old stones mark the safest path when the water is low.", dmNotes: "A submerged waystone points toward the Lantern Vault.", tags: []string{"travel", "hazard"}, sortOrder: 20, mapAnchor: map[string]any{"x": 58, "y": 64}},
		{key: "dungeon", parentKey: "region", name: "Lantern Vault", locationType: "dungeon", summary: "A half-buried hill ruin whose lower halls still glow with old green witchlight.", publicNotes: "Shepherds avoid the ridge after sunset; lights move beneath the cracked stone cap.", dmNotes: "The vault was a signal station and smuggler cache before it became a goblin den.", tags: []string{"dungeon", "session prep"}, sortOrder: 30, mapAnchor: map[string]any{"x": 68, "y": 38}},
		{key: "blacksmith", parentKey: "town", name: "Anvil & Ash", locationType: "blacksmith", summary: "A smoky smithy known for wagon repairs, honest blades, and guarded rumors.", publicNotes: "Master Kelra keeps a dented bell by the counter for customers who arrive while she is shoeing horses.", dmNotes: "Kelra bought a strange green-glass ingot from a frightened carter.", tags: []string{"shop", "weapons"}, sortOrder: 10, mapAnchor: map[string]any{"x": 34, "y": 47}},
		{key: "apothecary", parentKey: "town", name: "Moth & Mortar", locationType: "apothecary", summary: "A narrow herb shop crowded with drying lavender, feverfew, and bottled marsh lights.", publicNotes: "The proprietor trades in poultices, antidotes, gossip, and careful questions.", dmNotes: "Brother Caldus quietly stocks healing draughts here for emergencies.", tags: []string{"shop", "healing"}, sortOrder: 20, mapAnchor: map[string]any{"x": 57, "y": 44}},
		{key: "gate", parentKey: "town", name: "North Road Gate", locationType: "landmark", summary: "The town gate where caravans queue before climbing toward the old ridge road.", publicNotes: "A notice board lists missing wagons, guard postings, and reward offers.", dmNotes: "Tamsin last saw the Thornrunner scouts from this gatehouse.", tags: []string{"quest hook", "travel"}, sortOrder: 30, mapAnchor: map[string]any{"x": 49, "y": 18}},
		{key: "floor", parentKey: "dungeon", name: "Upper Vault", locationType: "floor", summary: "Collapsed halls, cracked signal lenses, and goblin barricades just below the hilltop ruin.", publicNotes: "Green light leaks from seams in the stone when thunder rolls overhead.", dmNotes: "Noise here alerts the lower cistern unless the brass damper is repaired.", tags: []string{"exploration", "level 1"}, sortOrder: 10},
		{key: "entry", parentKey: "floor", name: "Broken Signal Hall", locationType: "room", summary: "A vaulted entry chamber split by fallen masonry and a half-working lantern lens.", publicNotes: "The air hums when metal crosses the old sigil in the floor.", dmNotes: "A goblin lookout hides behind the fractured lens and flees toward the cistern.", tags: []string{"entrance", "lookout"}, sortOrder: 10, mapAnchor: map[string]any{"x": 24, "y": 32}},
		{key: "cistern", parentKey: "floor", name: "Cistern of Echoes", locationType: "room", summary: "A flooded cistern where voices bounce strangely and torchlight vanishes into deep water.", publicNotes: "Stone walkways ring dark water; something clicks below the surface.", dmNotes: "Skeleton archers rise if the party disturbs the submerged waystone.", tags: []string{"hazard", "encounter"}, sortOrder: 20, mapAnchor: map[string]any{"x": 61, "y": 57}},
	}
	locationIDs := map[string]string{}
	for _, location := range locations {
		id, err := seedDemoLocation(ctx, tx, campaignID, location, locationIDs)
		if err != nil {
			return nil, err
		}
		locationIDs[location.key] = id
	}
	if err := seedDemoWorldLinks(ctx, tx, campaignID, locationIDs); err != nil {
		return nil, err
	}
	if err := seedDemoWorldNpcs(ctx, tx, campaignID, creatureIDs, locationIDs); err != nil {
		return nil, err
	}
	itemIDs, err := seedDemoShopItems(ctx, tx, ownerUserID)
	if err != nil {
		return nil, err
	}
	if err := seedDemoStock(ctx, tx, campaignID, itemIDs, locationIDs); err != nil {
		return nil, err
	}
	mapIDs, err := seedDemoMaps(ctx, tx, campaignID, locationIDs)
	if err != nil {
		return nil, err
	}
	if err := seedDemoPins(ctx, tx, campaignID, mapIDs, locationIDs); err != nil {
		return nil, err
	}
	if err := seedDemoJourneys(ctx, tx, campaignID); err != nil {
		return nil, err
	}
	if err := seedDemoLinkedEncounters(ctx, tx, campaignID, locationIDs); err != nil {
		return nil, err
	}
	return locationIDs, nil
}

func seedDemoLocation(ctx context.Context, tx *gorm.DB, campaignID string, location demoLocation, existing map[string]string) (string, error) {
	var id string
	lookupErr := tx.WithContext(ctx).Raw(`select id from campaign_locations where campaign_id = ? and name = ? limit 1`, campaignID, location.name).Row().Scan(&id)
	if lookupErr != nil && lookupErr != sql.ErrNoRows {
		return "", lookupErr
	}
	parentID := any(nil)
	if location.parentKey != "" {
		parentID = existing[location.parentKey]
	}
	anchorJSON, err := json.Marshal(location.mapAnchor)
	if err != nil {
		return "", err
	}
	if location.mapAnchor == nil {
		anchorJSON = []byte(`{}`)
	}
	if lookupErr == nil {
		return id, tx.WithContext(ctx).Exec(`
			update campaign_locations
			set parent_location_id = ?, location_type = ?, summary = ?, public_notes = ?, dm_notes = ?, tags = ?, sort_order = ?, map_anchor = ?::jsonb
			where id = ?
		`, parentID, location.locationType, location.summary, location.publicNotes, location.dmNotes, pq.Array(location.tags), location.sortOrder, string(anchorJSON), id).Error
	}
	if err := tx.WithContext(ctx).Raw(`
		insert into campaign_locations (campaign_id, parent_location_id, name, location_type, summary, public_notes, dm_notes, tags, sort_order, status, map_anchor)
		values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?::jsonb)
		returning id
	`, campaignID, parentID, location.name, location.locationType, location.summary, location.publicNotes, location.dmNotes, pq.Array(location.tags), location.sortOrder, string(anchorJSON)).Row().Scan(&id); err != nil {
		return "", err
	}
	return id, nil
}

func seedDemoWorldLinks(ctx context.Context, tx *gorm.DB, campaignID string, locationIDs map[string]string) error {
	links := []struct{ source, target, linkType, label, notes string }{
		{source: "town", target: "gate", linkType: "road", label: "North gate road", notes: "The caravan road climbs toward the Lantern Vault ridge."},
		{source: "gate", target: "ford", linkType: "road", label: "Old river road", notes: "Washed out after storms; wagons move at half speed."},
		{source: "floor", target: "entry", linkType: "passage", label: "Cracked stair", notes: "Loose stones make stealth difficult."},
		{source: "entry", target: "cistern", linkType: "door", label: "Bronze service door", notes: "Stuck, noisy, and barred from the cistern side."},
	}
	for _, link := range links {
		var exists bool
		if err := tx.WithContext(ctx).Raw(`select exists(select 1 from campaign_location_links where campaign_id = ? and source_location_id = ? and target_location_id = ? and link_type = ?)`, campaignID, locationIDs[link.source], locationIDs[link.target], link.linkType).Row().Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}
		if err := tx.WithContext(ctx).Exec(`
			insert into campaign_location_links (campaign_id, source_location_id, target_location_id, link_type, label, direction, visibility, notes)
			values (?, ?, ?, ?, ?, 'bidirectional', 'dm', ?)
		`, campaignID, locationIDs[link.source], locationIDs[link.target], link.linkType, link.label, link.notes).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedDemoWorldNpcs(ctx context.Context, tx *gorm.DB, campaignID string, creatureIDs map[string]string, locationIDs map[string]string) error {
	links := []struct{ creature, location, linkType, notes string }{
		{creature: "Tamsin Reed, Road Warden", location: "gate", linkType: "warden", notes: "Tracks caravan departures and can guide the party to Deep Ford."},
		{creature: "Tamsin Reed, Road Warden", location: "blacksmith", linkType: "customer", notes: "Trades route warnings with Kelra while her bow is repaired."},
		{creature: "Brother Caldus", location: "apothecary", linkType: "merchant", notes: "Quietly sells temple-approved healing draughts at cost to caravan guards."},
	}
	for _, link := range links {
		creatureID := creatureIDs[link.creature]
		locationID := locationIDs[link.location]
		if creatureID == "" || locationID == "" {
			continue
		}
		if err := tx.WithContext(ctx).Exec(`
			insert into campaign_npc_location_links (campaign_id, creature_id, location_id, link_type, visibility, notes)
			values (?, ?, ?, ?, 'dm', ?)
			on conflict (campaign_id, creature_id, location_id, link_type) do update set notes = excluded.notes
		`, campaignID, creatureID, locationID, link.linkType, link.notes).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedDemoShopItems(ctx context.Context, tx *gorm.DB, ownerUserID string) (map[string]string, error) {
	items := []struct {
		key, name, category, itemType, rarity, description string
		value                                              int
	}{
		{key: "lanternOil", name: "Stormproof Lantern Oil", category: "Adventuring Gear", itemType: "gear", rarity: "common", value: 8, description: "A thick greenish oil that resists rain and guttering wind."},
		{key: "coldIron", name: "Cold-Iron Prybar", category: "Tools", itemType: "tool", rarity: "uncommon", value: 25, description: "A heavy prybar useful against old vault doors and stubborn grates."},
		{key: "healingDraught", name: "Bitterroot Healing Draught", category: "Potion", itemType: "consumable", rarity: "common", value: 50, description: "A pungent local restorative brewed by Moth & Mortar."},
		{key: "antitoxin", name: "Marsh Antitoxin", category: "Potion", itemType: "consumable", rarity: "common", value: 45, description: "A cloudy vial used by river wardens after leech and spider bites."},
	}
	ids := map[string]string{}
	for _, item := range items {
		var id string
		err := tx.WithContext(ctx).Raw(`select id from items where owner_user_id = ? and name = ? limit 1`, ownerUserID, item.name).Row().Scan(&id)
		if err != nil && err != sql.ErrNoRows {
			return nil, err
		}
		if err == sql.ErrNoRows {
			if err := tx.WithContext(ctx).Raw(`
				insert into items (owner_user_id, name, category, item_type, rarity, value_amount, value_unit, description, properties, damage, armor_class, data)
				values (?, ?, ?, ?, ?, ?, 'gp', ?, '{}', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
				returning id
			`, ownerUserID, item.name, item.category, item.itemType, item.rarity, item.value, item.description).Row().Scan(&id); err != nil {
				return nil, err
			}
		}
		ids[item.key] = id
	}
	return ids, nil
}

func seedDemoStock(ctx context.Context, tx *gorm.DB, campaignID string, itemIDs map[string]string, locationIDs map[string]string) error {
	stock := []struct {
		location, item, availability, notes, unit string
		quantity, price                           int
	}{
		{location: "blacksmith", item: "lanternOil", quantity: 6, price: 10, unit: "gp", availability: "limited", notes: "Kept behind the counter for trusted caravan guards."},
		{location: "blacksmith", item: "coldIron", quantity: 2, price: 35, unit: "gp", availability: "in-stock", notes: "Kelra can modify one into a door hook overnight."},
		{location: "apothecary", item: "healingDraught", quantity: 4, price: 45, unit: "gp", availability: "limited", notes: "Discounted if Brother Caldus vouches for the buyer."},
		{location: "apothecary", item: "antitoxin", quantity: 8, price: 35, unit: "gp", availability: "in-stock", notes: "Popular with river scouts and mushroom cutters."},
	}
	for _, entry := range stock {
		if itemIDs[entry.item] == "" || locationIDs[entry.location] == "" {
			continue
		}
		if err := tx.WithContext(ctx).Exec(`
			insert into campaign_location_stock (campaign_id, location_id, item_id, library_source, quantity, price_amount, price_unit, availability, notes)
			values (?, ?, ?, 'user', ?, ?, ?, ?, ?)
			on conflict (campaign_id, location_id, item_id, library_source) do update set quantity = excluded.quantity, price_amount = excluded.price_amount, price_unit = excluded.price_unit, availability = excluded.availability, notes = excluded.notes
		`, campaignID, locationIDs[entry.location], itemIDs[entry.item], entry.quantity, entry.price, entry.unit, entry.availability, entry.notes).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedDemoMaps(ctx context.Context, tx *gorm.DB, campaignID string, locationIDs map[string]string) (map[string]string, error) {
	maps := []demoMap{
		{key: "region", parentKey: "region", name: "Verdant March Regional Map", description: "Blank regional planning map for roads, towns, hazards, and dungeon entrances.", mapType: "region", width: 1000, height: 700, scale: 0.25},
		{key: "town", parentKey: "town", name: "Greenhill Market Sketch", description: "Town-center sketch for shops, gates, and social scenes.", mapType: "settlement", width: 900, height: 650, scale: 0.02},
		{key: "floor", parentKey: "floor", name: "Lantern Vault Upper Level", description: "Dungeon-floor sketch for placing rooms and calculating short tactical distances.", mapType: "floor", width: 800, height: 600, scale: 5},
	}
	ids := map[string]string{}
	for _, demoMap := range maps {
		var id string
		err := tx.WithContext(ctx).Raw(`select id from campaign_maps where campaign_id = ? and name = ? limit 1`, campaignID, demoMap.name).Row().Scan(&id)
		if err != nil && err != sql.ErrNoRows {
			return nil, err
		}
		parentID := locationIDs[demoMap.parentKey]
		if err == nil {
			if err := tx.WithContext(ctx).Exec(`
				update campaign_maps set parent_location_id = ?, description = ?, map_type = ?, mode = 'blank', width = ?, height = ?, scale_distance_per_pixel = ?, scale_distance_unit = 'miles'
				where id = ?
			`, parentID, demoMap.description, demoMap.mapType, demoMap.width, demoMap.height, demoMap.scale, id).Error; err != nil {
				return nil, err
			}
		} else if err := tx.WithContext(ctx).Raw(`
			insert into campaign_maps (campaign_id, parent_location_id, name, description, map_type, mode, width, height, scale_distance_per_pixel, scale_distance_unit, metadata)
			values (?, ?, ?, ?, ?, 'blank', ?, ?, ?, 'miles', '{}'::jsonb)
			returning id
		`, campaignID, parentID, demoMap.name, demoMap.description, demoMap.mapType, demoMap.width, demoMap.height, demoMap.scale).Row().Scan(&id); err != nil {
			return nil, err
		}
		ids[demoMap.key] = id
	}
	return ids, nil
}

func seedDemoPins(ctx context.Context, tx *gorm.DB, campaignID string, mapIDs map[string]string, locationIDs map[string]string) error {
	pins := []struct {
		mapKey, locationKey string
		x, y                float64
	}{
		{mapKey: "region", locationKey: "town", x: 420, y: 406},
		{mapKey: "region", locationKey: "ford", x: 580, y: 448},
		{mapKey: "region", locationKey: "dungeon", x: 680, y: 266},
		{mapKey: "town", locationKey: "blacksmith", x: 306, y: 306},
		{mapKey: "town", locationKey: "apothecary", x: 513, y: 286},
		{mapKey: "town", locationKey: "gate", x: 441, y: 117},
		{mapKey: "floor", locationKey: "entry", x: 192, y: 192},
		{mapKey: "floor", locationKey: "cistern", x: 488, y: 342},
	}
	for _, pin := range pins {
		mapID := mapIDs[pin.mapKey]
		locationID := locationIDs[pin.locationKey]
		if mapID == "" || locationID == "" {
			continue
		}
		var exists bool
		if err := tx.WithContext(ctx).Raw(`select exists(select 1 from campaign_map_pins where map_id = ? and location_id = ?)`, mapID, locationID).Row().Scan(&exists); err != nil {
			return err
		}
		if exists {
			if err := tx.WithContext(ctx).Exec(`update campaign_map_pins set x = ?, y = ? where map_id = ? and location_id = ?`, pin.x, pin.y, mapID, locationID).Error; err != nil {
				return err
			}
		} else if err := tx.WithContext(ctx).Exec(`
			insert into campaign_map_pins (campaign_id, map_id, location_id, x, y, visibility, state, metadata)
			values (?, ?, ?, ?, ?, 'dm', 'active', '{}'::jsonb)
		`, campaignID, mapID, locationID, pin.x, pin.y).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedDemoJourneys(ctx context.Context, tx *gorm.DB, campaignID string) error {
	journeys := []struct {
		name, origin, destination, terrain, pace string
		distance                                 float64
		goodRoads                                bool
	}{
		{name: "Greenhill to Deep Ford", origin: "The Verdant March / Greenhill Market", destination: "The Verdant March / Deep Ford Crossing", distance: 14, terrain: "forest", pace: "normal", goodRoads: true},
		{name: "Ridge Road to Lantern Vault", origin: "The Verdant March / Greenhill Market / North Road Gate", destination: "The Verdant March / Lantern Vault", distance: 8, terrain: "hills", pace: "slow", goodRoads: false},
	}
	for _, journey := range journeys {
		var exists bool
		if err := tx.WithContext(ctx).Raw(`select exists(select 1 from campaign_journeys where campaign_id = ? and name = ?)`, campaignID, journey.name).Row().Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}
		if err := tx.WithContext(ctx).Exec(`
			insert into campaign_journeys (campaign_id, name, origin, destination, distance, distance_unit, terrain, pace, good_roads, weather, route_input_mode)
			values (?, ?, ?, ?, ?, 'miles', ?, ?, ?, '{}'::jsonb, 'route')
		`, campaignID, journey.name, journey.origin, journey.destination, journey.distance, journey.terrain, journey.pace, journey.goodRoads).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedDemoLinkedEncounters(ctx context.Context, tx *gorm.DB, campaignID string, locationIDs map[string]string) error {
	encounters := []struct{ name, description, status, locationKey, room string }{
		{name: "Lantern Vault Lookout", description: "Goblin scouts test whether the party can be lured deeper before the alarm horn sounds.", status: "planned", locationKey: "entry", room: "Broken Signal Hall"},
		{name: "Cistern Bone-Rattle", description: "Undead archers rise from the water if the submerged waystone is disturbed.", status: "ready", locationKey: "cistern", room: "Cistern of Echoes"},
	}
	for _, encounter := range encounters {
		locationID := locationIDs[encounter.locationKey]
		if locationID == "" {
			continue
		}
		var exists bool
		if err := tx.WithContext(ctx).Raw(`select exists(select 1 from encounters where campaign_id = ? and name = ?)`, campaignID, encounter.name).Row().Scan(&exists); err != nil {
			return err
		}
		if exists {
			if err := tx.WithContext(ctx).Exec(`update encounters set status = ?, location_id = ?, location = ?, room_number = ? where campaign_id = ? and name = ?`, encounter.status, locationID, encounter.room, encounter.room, campaignID, encounter.name).Error; err != nil {
				return err
			}
			continue
		}
		if err := tx.WithContext(ctx).Exec(`
			insert into encounters (campaign_id, name, description, status, location, location_id, room_number)
			values (?, ?, ?, ?, ?, ?, ?)
		`, campaignID, encounter.name, encounter.description, encounter.status, encounter.room, locationID, encounter.room).Error; err != nil {
			return err
		}
	}
	return nil
}
