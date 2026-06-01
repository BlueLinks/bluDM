package httpapi

import (
	"bludm/backend/internal/models"
	"testing"
)

func TestItemRequestNormalizeAndValidateForCreateUpdate(t *testing.T) {
	req := itemRequest{
		Name:        "  Moonblade  ",
		Category:    " Weapon ",
		ItemType:    " Martial Melee Weapons ",
		Rarity:      " Rare ",
		ValueUnit:   " GP ",
		Description: "  A silvered campaign blade.  ",
		Properties:  []string{" Finesse ", "Finesse", "", "Light"},
	}

	req.normalize()

	if err := req.validate(); err != nil {
		t.Fatalf("expected normalized request to validate: %v", err)
	}
	if req.Name != "Moonblade" || req.Category != "Weapon" || req.ItemType != "Martial Melee Weapons" {
		t.Fatalf("expected text fields to be trimmed, got %+v", req)
	}
	if req.ValueUnit != "gp" {
		t.Fatalf("expected value unit to lower-case, got %q", req.ValueUnit)
	}
	if len(req.Properties) != 2 || req.Properties[0] != "Finesse" || req.Properties[1] != "Light" {
		t.Fatalf("expected properties to be trimmed and deduped, got %+v", req.Properties)
	}
	if req.Damage == nil || req.ArmorClass == nil || req.Data == nil {
		t.Fatalf("expected nil maps to normalize to empty maps, got damage=%v armor=%v data=%v", req.Damage, req.ArmorClass, req.Data)
	}
}

func TestItemRequestValidationRejectsInvalidCrudPayloads(t *testing.T) {
	tests := []struct {
		name string
		req  itemRequest
	}{
		{name: "missing name", req: itemRequest{}},
		{name: "negative value", req: itemRequest{Name: "Cursed Coin", ValueAmount: -1}},
		{name: "negative weight", req: itemRequest{Name: "Heavy Feather", Weight: -0.5}},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			test.req.normalize()
			if err := test.req.validate(); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}

func TestCloneItemRequestCopiesSourceForEditableCustomItem(t *testing.T) {
	source := models.Item{
		ID:            "standard-1",
		Name:          "Longsword",
		Category:      "Weapon",
		ItemType:      "Martial Melee Weapons",
		Rarity:        "Common",
		ValueAmount:   15,
		ValueUnit:     "GP",
		Weight:        3,
		Description:   "A versatile blade.",
		Properties:    []string{"Versatile"},
		Damage:        map[string]any{"damage": map[string]any{"damage_dice": "1d8"}},
		ArmorClass:    map[string]any{},
		Data:          map[string]any{"weaponCategory": "Martial"},
		LibrarySource: "standard",
		ReadOnly:      true,
		SourceKey:     "srd-2014",
		SourceLabel:   "SRD 2014",
	}

	req := cloneItemRequest(source)

	if req.Name != "Copy of Longsword" {
		t.Fatalf("expected copy name, got %q", req.Name)
	}
	if req.Category != source.Category || req.ItemType != source.ItemType || req.ValueAmount != source.ValueAmount {
		t.Fatalf("expected source item fields to copy, got %+v", req)
	}
	if req.ValueUnit != "gp" {
		t.Fatalf("expected clone request to normalize value unit, got %q", req.ValueUnit)
	}
	clonedFrom, ok := req.Data["clonedFrom"].(map[string]any)
	if !ok {
		t.Fatalf("expected clonedFrom metadata, got %+v", req.Data)
	}
	if clonedFrom["id"] != source.ID || clonedFrom["librarySource"] != source.LibrarySource || clonedFrom["sourceKey"] != source.SourceKey {
		t.Fatalf("expected clone metadata to reference source, got %+v", clonedFrom)
	}
	if req.Data["sourceData"] == nil || req.Data["weaponCategory"] != "Martial" {
		t.Fatalf("expected source data to be preserved, got %+v", req.Data)
	}
}

func TestCloneItemRequestUsesNextCopyName(t *testing.T) {
	req := cloneItemRequest(models.Item{Name: "Copy of Longsword", Data: map[string]any{}})

	if req.Name != "Copy of Longsword" {
		t.Fatalf("expected clone name to avoid duplicate copy prefix, got %q", req.Name)
	}
}

func TestNormalizeStandardItemFromSRDEquipment(t *testing.T) {
	item := testStandardItem("Longsword", "Weapon · Martial", map[string]any{
		"equipment_category": map[string]any{"name": "Weapon"},
		"weapon_category":    "Martial",
		"weapon_range":       "Melee",
		"category_range":     "Martial Melee",
		"mastery":            "Sap",
		"cost":               map[string]any{"quantity": float64(10), "unit": "gp"},
		"weight":             float64(3),
		"properties": []any{
			map[string]any{"name": "Versatile"},
			map[string]any{"name": "Versatile"},
			map[string]any{"name": "Thrown"},
		},
		"damage": map[string]any{
			"damage_dice": "1d8",
			"damage_type": map[string]any{"name": "Slashing"},
		},
		"two_handed_damage": map[string]any{"damage_dice": "1d10"},
	})

	if item.Category != "Weapon" || item.ItemType != "Martial Melee Weapons" {
		t.Fatalf("expected weapon category/type, got %q/%q", item.Category, item.ItemType)
	}
	if item.ValueAmount != 10 || item.ValueUnit != "gp" || item.Weight != 3 {
		t.Fatalf("expected cost and weight to normalize, got %+v", item)
	}
	if len(item.Properties) != 2 || item.Properties[0] != "Versatile" || item.Properties[1] != "Thrown" {
		t.Fatalf("expected deduped properties, got %+v", item.Properties)
	}
	if item.Damage["damage"] == nil || item.Damage["two_handed_damage"] == nil {
		t.Fatalf("expected damage fields to be preserved, got %+v", item.Damage)
	}
	if item.Data["weaponCategory"] != "Martial" || item.Data["weaponRange"] != "Melee" {
		t.Fatalf("expected weapon subtype data, got %+v", item.Data)
	}
	if item.Data["mastery"] != "Sap" {
		t.Fatalf("expected weapon mastery data, got %+v", item.Data)
	}
}

func TestNormalizeStandardItemFromSRDArmor(t *testing.T) {
	item := testStandardItem("Chain Mail", "Armor · Heavy", map[string]any{
		"equipment_category":   map[string]any{"name": "Armor"},
		"armor_category":       "Heavy",
		"cost":                 map[string]any{"quantity": float64(1500), "unit": "gp"},
		"armor_class":          map[string]any{"base": float64(18), "dex_bonus": false},
		"str_minimum":          float64(15),
		"stealth_disadvantage": true,
	})

	if item.Category != "Armor" || item.ItemType != "Heavy Armor" {
		t.Fatalf("expected armor category/type, got %q/%q", item.Category, item.ItemType)
	}
	if item.ArmorClass["base"] != float64(18) {
		t.Fatalf("expected armor class data, got %+v", item.ArmorClass)
	}
	if item.ArmorClass["str_minimum"] != float64(15) || item.ArmorClass["stealth_disadvantage"] != true {
		t.Fatalf("expected armor constraints, got %+v", item.ArmorClass)
	}
	if item.Data["armorCategory"] != "Heavy Armor" {
		t.Fatalf("expected armor subtype data, got %+v", item.Data)
	}
}

func TestNormalizeStandardItemFromAdventuringGear(t *testing.T) {
	item := testStandardItem("Abacus", "Adventuring Gear · Standard Gear", map[string]any{
		"equipment_category": map[string]any{"name": "Adventuring Gear"},
		"gear_category":      map[string]any{"name": "Standard Gear"},
		"cost":               map[string]any{"quantity": float64(2), "unit": "sp"},
	})

	if item.Category != "Adventuring Gear" || item.ItemType != "Standard Gear" {
		t.Fatalf("expected gear category/type, got %q/%q", item.Category, item.ItemType)
	}
	if item.ValueAmount != 2 || item.ValueUnit != "sp" {
		t.Fatalf("expected gear cost to normalize, got %d %s", item.ValueAmount, item.ValueUnit)
	}
}

func TestNormalizeStandardItemArmorShield(t *testing.T) {
	item := testStandardItem("Shield", "Armor · Shield", map[string]any{
		"equipment_category": map[string]any{"name": "Armor"},
		"armor_category":     "Shield",
		"armor_class":        map[string]any{"base": float64(2), "dex_bonus": false},
	})

	if item.Category != "Armor" || item.ItemType != "Shield" {
		t.Fatalf("expected shield category/type, got %q/%q", item.Category, item.ItemType)
	}
	if item.ArmorClass["bonus"] != float64(2) || item.ArmorClass["shield"] != true {
		t.Fatalf("expected shield AC bonus behavior, got %+v", item.ArmorClass)
	}
}

func TestNormalizeStandardItemWeaponSubtypes(t *testing.T) {
	cases := []struct {
		name         string
		weaponClass  string
		weaponRange  string
		expectedType string
	}{
		{"Longsword", "Martial", "Melee", "Martial Melee Weapons"},
		{"Shortbow", "Simple", "Ranged", "Simple Ranged Weapons"},
		{"Dagger", "Simple", "Melee", "Simple Melee Weapons"},
	}

	for _, test := range cases {
		item := testStandardItem(test.name, "Weapon", map[string]any{
			"equipment_category": map[string]any{"name": "Weapon"},
			"weapon_category":    test.weaponClass,
			"weapon_range":       test.weaponRange,
			"category_range":     test.weaponClass + " " + test.weaponRange,
		})
		if item.ItemType != test.expectedType {
			t.Fatalf("expected %s to normalize to %q, got %q", test.name, test.expectedType, item.ItemType)
		}
		if item.Data["weaponCategory"] != test.weaponClass || item.Data["weaponRange"] != test.weaponRange {
			t.Fatalf("expected weapon data for %s, got %+v", test.name, item.Data)
		}
	}
}

func TestNormalizeStandardItemToolFocusAmmunitionAndPack(t *testing.T) {
	tool := testStandardItem("Alchemist's Supplies", "Tools", map[string]any{
		"equipment_category": map[string]any{"name": "Tools"},
		"tool_category":      "Artisan's Tools",
	})
	if tool.Category != "Tool" || tool.ItemType != "Artisan's Tools" || tool.Data["toolCategory"] != "Artisan's Tools" {
		t.Fatalf("expected tool taxonomy, got %+v", tool)
	}

	focus := testStandardItem("Amulet", "Adventuring Gear · Holy Symbols", map[string]any{
		"equipment_category": map[string]any{"name": "Adventuring Gear"},
		"gear_category":      map[string]any{"name": "Holy Symbols"},
	})
	if focus.Category != "Focus" || focus.ItemType != "Holy Symbol" || focus.Data["focusFamily"] != "Holy symbol" {
		t.Fatalf("expected focus taxonomy, got %+v", focus)
	}

	arcane := testStandardItem("Wand", "Adventuring Gear · Arcane Foci", map[string]any{
		"equipment_category": map[string]any{"name": "Adventuring Gear"},
		"gear_category":      map[string]any{"name": "Arcane Foci"},
	})
	if arcane.Category != "Focus" || arcane.ItemType != "Arcane Focus" || arcane.Data["focusFamily"] != "Arcane" {
		t.Fatalf("expected arcane focus taxonomy, got %+v", arcane)
	}

	druidic := testStandardItem("Yew wand", "Adventuring Gear · Druidic Foci", map[string]any{
		"equipment_category": map[string]any{"name": "Adventuring Gear"},
		"gear_category":      map[string]any{"name": "Druidic Foci"},
	})
	if druidic.Category != "Focus" || druidic.ItemType != "Druidic Focus" || druidic.Data["focusFamily"] != "Druidic" {
		t.Fatalf("expected druidic focus taxonomy, got %+v", druidic)
	}

	arrow := testStandardItem("Arrow", "Adventuring Gear · Ammunition", map[string]any{
		"equipment_category": map[string]any{"name": "Adventuring Gear"},
		"gear_category":      map[string]any{"name": "Ammunition"},
		"quantity":           float64(20),
	})
	if arrow.Category != "Ammunition" || arrow.ItemType != "Arrows" || arrow.Data["quantity"] != float64(20) {
		t.Fatalf("expected ammunition taxonomy, got %+v", arrow)
	}

	pack := testStandardItem("Burglar's Pack", "Adventuring Gear · Equipment Packs", map[string]any{
		"equipment_category": map[string]any{"name": "Adventuring Gear"},
		"gear_category":      map[string]any{"name": "Equipment Packs"},
		"contents": []any{
			map[string]any{"item": map[string]any{"name": "Backpack"}, "quantity": float64(1)},
		},
	})
	if pack.Category != "Equipment Pack" || pack.ItemType != "Equipment Pack" || pack.Data["contents"] == nil {
		t.Fatalf("expected pack taxonomy, got %+v", pack)
	}
}

func TestNormalizeStandardItemMountVehicleAndFood(t *testing.T) {
	camel := testStandardItem("Camel", "Mounts and Vehicles", map[string]any{
		"equipment_category": map[string]any{"name": "Mounts and Vehicles"},
		"speed":              map[string]any{"quantity": float64(50), "unit": "ft/round"},
		"capacity":           "480 lb.",
	})
	if camel.Category != "Mount" || camel.ItemType != "Mount" || camel.Data["speed"] != "50 ft/round" {
		t.Fatalf("expected mount taxonomy, got %+v", camel)
	}

	cart := testStandardItem("Cart", "Mounts and Vehicles", map[string]any{
		"equipment_category": map[string]any{"name": "Mounts and Vehicles"},
	})
	if cart.Category != "Vehicle" || cart.ItemType != "Land Vehicle" {
		t.Fatalf("expected cart vehicle taxonomy, got %+v", cart)
	}

	ship := testStandardItem("Sailing ship", "Mounts and Vehicles", map[string]any{
		"equipment_category": map[string]any{"name": "Mounts and Vehicles"},
		"speed":              map[string]any{"quantity": float64(2), "unit": "mph"},
	})
	if ship.Category != "Vehicle" || ship.ItemType != "Waterborne Vehicle" || ship.Data["speed"] != "2 mph" {
		t.Fatalf("expected ship vehicle taxonomy, got %+v", ship)
	}

	rations := testStandardItem("Rations (1 day)", "Adventuring Gear · Standard Gear", map[string]any{
		"equipment_category": map[string]any{"name": "Adventuring Gear"},
		"gear_category":      map[string]any{"name": "Standard Gear"},
	})
	if rations.Category != "Food and Lodging" || rations.ItemType != "Ration" {
		t.Fatalf("expected ration taxonomy, got %+v", rations)
	}

	stabling := testStandardItem("Stabling (1 day)", "Mounts and Vehicles", map[string]any{
		"equipment_category": map[string]any{"name": "Mounts and Vehicles"},
	})
	if stabling.Category != "Food and Lodging" || stabling.ItemType != "Service" {
		t.Fatalf("expected stabling taxonomy, got %+v", stabling)
	}
}

func TestStandardItemSearchMatchesDerivedFields(t *testing.T) {
	item := testStandardItem("Chain Mail", "Armor · Heavy", map[string]any{
		"equipment_category": map[string]any{"name": "Armor"},
		"armor_category":     "Heavy",
		"armor_class":        map[string]any{"base": float64(16), "dex_bonus": false},
	})

	for _, query := range []string{"Heavy Armor", "armorCategory", "base:16"} {
		if !itemMatchesQuery(item, query) {
			t.Fatalf("expected query %q to match derived item %+v", query, item)
		}
	}

	focus := testStandardItem("Amulet", "Adventuring Gear · Holy Symbols", map[string]any{
		"equipment_category": map[string]any{"name": "Adventuring Gear"},
		"gear_category":      map[string]any{"name": "Holy Symbols"},
	})
	if !itemMatchesQuery(focus, "Holy Symbol") {
		t.Fatalf("expected holy symbol search to match %+v", focus)
	}
}

func testStandardItem(name string, summary string, raw map[string]any) models.Item {
	item := models.Item{
		Name: name,
		Data: map[string]any{"raw": raw},
	}
	normalizeStandardItem(&item, summary)
	return item
}
