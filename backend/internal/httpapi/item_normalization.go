package httpapi

import (
	"bludm/backend/internal/models"
	"strconv"
	"strings"
)

func normalizeStandardItem(item *models.Item, summary string) {
	raw, _ := item.Data["raw"].(map[string]any)
	item.ValueAmount = intFromMap(raw, "cost", "quantity")
	item.ValueUnit = strings.ToLower(stringFromMap(raw, "cost", "unit"))
	if item.ValueUnit == "" {
		item.ValueUnit = "gp"
	}
	item.Weight = floatFromAny(raw["weight"])
	item.Properties = propertyNames(raw["properties"])
	item.Damage = itemDamage(raw)
	item.ArmorClass = normalizedArmorClass(raw)
	item.Rarity = nestedName(raw, "rarity")
	item.Attunement = itemBoolFromAny(raw["requires_attunement"])
	deriveStandardItemTaxonomy(item, raw, summary)
}

func itemDamage(raw map[string]any) map[string]any {
	damage := map[string]any{}
	for _, key := range []string{"damage", "two_handed_damage", "throw_range", "range"} {
		if value, ok := raw[key]; ok {
			damage[key] = value
		}
	}
	return damage
}

func propertyNames(value any) []string {
	list, ok := value.([]any)
	if !ok {
		return []string{}
	}
	properties := make([]string, 0, len(list))
	for _, entry := range list {
		if object, ok := entry.(map[string]any); ok {
			if name := strings.TrimSpace(itemStringFromAny(object["name"])); name != "" {
				properties = append(properties, name)
			}
		}
	}
	return normalizeStringList(properties)
}

func deriveStandardItemTaxonomy(item *models.Item, raw map[string]any, summary string) {
	equipmentCategory := nestedName(raw, "equipment_category")
	gearCategory := nestedName(raw, "gear_category")
	weaponCategory := nestedName(raw, "weapon_category")
	weaponRange := itemStringFromAny(raw["weapon_range"])
	armorCategory := nestedName(raw, "armor_category")
	toolCategory := nestedName(raw, "tool_category")

	switch {
	case equipmentCategory == "Weapon":
		item.Category = "Weapon"
		item.ItemType = weaponItemType(weaponCategory, weaponRange, itemStringFromAny(raw["category_range"]), summary)
		setItemData(item, "weaponCategory", firstNonEmpty(weaponCategory, weaponCategoryFromType(item.ItemType)))
		setItemData(item, "weaponRange", firstNonEmpty(weaponRange, weaponRangeFromType(item.ItemType)))
		setItemData(item, "mastery", itemStringFromAny(raw["mastery"]))
	case equipmentCategory == "Armor":
		item.Category = "Armor"
		item.ItemType = armorItemType(armorCategory, summary)
		setItemData(item, "armorCategory", item.ItemType)
	case equipmentCategory == "Tools":
		item.Category = "Tool"
		item.ItemType = firstNonEmpty(toolCategory, "Other Tools")
		setItemData(item, "toolCategory", item.ItemType)
	case equipmentCategory == "Mounts and Vehicles":
		deriveMountVehicleTaxonomy(item, raw)
	case gearCategory == "Ammunition":
		item.Category = "Ammunition"
		item.ItemType = ammunitionType(item.Name)
		setItemData(item, "quantity", raw["quantity"])
		setItemData(item, "compatible_weapon", compatibleAmmunitionWeapon(item.Name))
	case gearCategory == "Equipment Packs":
		item.Category = "Equipment Pack"
		item.ItemType = "Equipment Pack"
		setItemData(item, "contents", raw["contents"])
	case isFocusGear(gearCategory):
		item.Category = "Focus"
		item.ItemType = focusItemType(gearCategory)
		setItemData(item, "focusFamily", focusFamily(gearCategory))
		setItemData(item, "variant", item.Name)
		setItemData(item, "focus_usage", "Spellcasting focus")
	case isFoodLodgingName(item.Name):
		item.Category = "Food and Lodging"
		item.ItemType = foodLodgingType(item.Name)
		setFoodLodgingData(item)
	default:
		item.Category = firstNonEmpty(equipmentCategory, "Adventuring Gear")
		item.ItemType = firstNonEmpty(gearCategory, summary, "Standard Gear")
	}
}

func normalizedArmorClass(raw map[string]any) map[string]any {
	armorClass := itemMapFromAny(raw["armor_class"])
	if len(armorClass) == 0 {
		return armorClass
	}
	result := map[string]any{}
	armorCategory := strings.ToLower(nestedName(raw, "armor_category"))
	if armorCategory == "shield" {
		result["bonus"] = armorClass["base"]
		result["shield"] = true
	} else {
		for _, key := range []string{"base", "dex_bonus", "max_bonus"} {
			if value, ok := armorClass[key]; ok {
				result[key] = value
			}
		}
	}
	if strMinimum, ok := raw["str_minimum"]; ok && floatFromAny(strMinimum) > 0 {
		result["str_minimum"] = strMinimum
	}
	if stealth, ok := raw["stealth_disadvantage"]; ok {
		result["stealth_disadvantage"] = stealth
	}
	return result
}

func deriveMountVehicleTaxonomy(item *models.Item, raw map[string]any) {
	switch {
	case isFoodLodgingName(item.Name):
		item.Category = "Food and Lodging"
		item.ItemType = foodLodgingType(item.Name)
		setFoodLodgingData(item)
	case isMountName(item.Name):
		item.Category = "Mount"
		item.ItemType = "Mount"
		setItemData(item, "mountType", "Mount")
		setMountVehicleData(item, raw)
	case isTackHarnessName(item.Name):
		item.Category = "Mount"
		item.ItemType = "Tack and Harness"
		setItemData(item, "mountType", "Tack and Harness")
	case isWaterVehicleName(item.Name):
		item.Category = "Vehicle"
		item.ItemType = "Waterborne Vehicle"
		setItemData(item, "vehicleType", "Waterborne Vehicle")
		setMountVehicleData(item, raw)
	default:
		item.Category = "Vehicle"
		item.ItemType = "Land Vehicle"
		setItemData(item, "vehicleType", "Land Vehicle")
		setMountVehicleData(item, raw)
	}
}

func weaponItemType(category string, weaponRange string, categoryRange string, summary string) string {
	text := strings.ToLower(firstNonEmpty(categoryRange, summary, strings.Join([]string{category, weaponRange}, " ")))
	weaponClass := "Simple"
	if strings.Contains(text, "martial") || strings.EqualFold(category, "Martial") {
		weaponClass = "Martial"
	}
	rangeKind := "Melee"
	if strings.Contains(text, "ranged") || strings.EqualFold(weaponRange, "Ranged") {
		rangeKind = "Ranged"
	}
	return weaponClass + " " + rangeKind + " Weapons"
}

func weaponCategoryFromType(itemType string) string {
	if strings.Contains(strings.ToLower(itemType), "martial") {
		return "Martial"
	}
	return "Simple"
}

func weaponRangeFromType(itemType string) string {
	if strings.Contains(strings.ToLower(itemType), "ranged") {
		return "Ranged"
	}
	return "Melee"
}

func armorItemType(category string, summary string) string {
	text := strings.ToLower(firstNonEmpty(category, summary))
	switch {
	case strings.Contains(text, "shield"):
		return "Shield"
	case strings.Contains(text, "heavy"):
		return "Heavy Armor"
	case strings.Contains(text, "medium"):
		return "Medium Armor"
	case strings.Contains(text, "light"):
		return "Light Armor"
	default:
		return "Armor"
	}
}

func isFocusGear(gearCategory string) bool {
	normalized := strings.ToLower(gearCategory)
	return strings.Contains(normalized, "foci") || strings.Contains(normalized, "holy symbol")
}

func focusItemType(gearCategory string) string {
	switch focusFamily(gearCategory) {
	case "Druidic":
		return "Druidic Focus"
	case "Holy symbol":
		return "Holy Symbol"
	default:
		return "Arcane Focus"
	}
}

func focusFamily(gearCategory string) string {
	normalized := strings.ToLower(gearCategory)
	if strings.Contains(normalized, "druidic") {
		return "Druidic"
	}
	if strings.Contains(normalized, "holy") {
		return "Holy symbol"
	}
	return "Arcane"
}

func ammunitionType(name string) string {
	normalized := strings.ToLower(name)
	switch {
	case strings.Contains(normalized, "bolt"):
		return "Crossbow Bolts"
	case strings.Contains(normalized, "needle"):
		return "Blowgun Needles"
	case strings.Contains(normalized, "bullet"):
		return "Sling Bullets"
	default:
		return "Arrows"
	}
}

func compatibleAmmunitionWeapon(name string) string {
	normalized := strings.ToLower(name)
	switch {
	case strings.Contains(normalized, "bolt"):
		return "Crossbow"
	case strings.Contains(normalized, "needle"):
		return "Blowgun"
	case strings.Contains(normalized, "bullet"):
		return "Sling"
	default:
		return "Bow"
	}
}

func setMountVehicleData(item *models.Item, raw map[string]any) {
	if speed := itemMapFromAny(raw["speed"]); len(speed) > 0 {
		setItemData(item, "speed", speedLabel(speed))
	}
	setItemData(item, "carrying_capacity", itemStringFromAny(raw["capacity"]))
}

func speedLabel(speed map[string]any) string {
	quantity := itemStringFromAny(speed["quantity"])
	unit := itemStringFromAny(speed["unit"])
	if quantity == "" {
		return ""
	}
	if unit == "" {
		unit = "ft"
	}
	return strings.TrimSpace(quantity + " " + unit)
}

func setFoodLodgingData(item *models.Item) {
	setItemData(item, "serviceDuration", serviceDuration(item.Name))
	setItemData(item, "quality", foodLodgingQuality(item.Name))
	setItemData(item, "consumeBehavior", "Consumed on use")
	if strings.TrimSpace(item.Description) != "" {
		setItemData(item, "effect", item.Description)
	}
}

func foodLodgingType(name string) string {
	normalized := strings.ToLower(name)
	switch {
	case strings.Contains(normalized, "ration") || strings.Contains(normalized, "feed"):
		return "Ration"
	case strings.Contains(normalized, "stabling") || strings.Contains(normalized, "lodging") || strings.Contains(normalized, "inn"):
		return "Service"
	case strings.Contains(normalized, "wine") || strings.Contains(normalized, "ale"):
		return "Drink"
	default:
		return "Meal"
	}
}

func serviceDuration(name string) string {
	if strings.Contains(strings.ToLower(name), "1 day") {
		return "1 day"
	}
	return ""
}

func foodLodgingQuality(name string) string {
	normalized := strings.ToLower(name)
	for _, quality := range []string{"squalid", "poor", "modest", "comfortable", "wealthy", "aristocratic"} {
		if strings.Contains(normalized, quality) {
			return strings.Title(quality)
		}
	}
	return ""
}

func isFoodLodgingName(name string) bool {
	normalized := strings.ToLower(name)
	return strings.Contains(normalized, "ration") ||
		strings.Contains(normalized, "feed") ||
		strings.Contains(normalized, "meal") ||
		strings.Contains(normalized, "lodging") ||
		strings.Contains(normalized, "inn stay") ||
		strings.Contains(normalized, "stabling")
}

func isMountName(name string) bool {
	return stringInSet(name, []string{
		"Camel",
		"Donkey",
		"Draft horse",
		"Elephant",
		"Horse, Draft",
		"Horse, Riding",
		"Mastiff",
		"Mule",
		"Pony",
		"Riding horse",
		"Warhorse",
	})
}

func isTackHarnessName(name string) bool {
	normalized := strings.ToLower(name)
	return strings.Contains(normalized, "barding") ||
		strings.Contains(normalized, "bit and bridle") ||
		strings.Contains(normalized, "saddle") ||
		strings.Contains(normalized, "saddlebags")
}

func isWaterVehicleName(name string) bool {
	normalized := strings.ToLower(name)
	return strings.Contains(normalized, "ship") ||
		strings.Contains(normalized, "boat") ||
		strings.Contains(normalized, "galley") ||
		strings.Contains(normalized, "keelboat")
}

func stringInSet(value string, values []string) bool {
	for _, candidate := range values {
		if strings.EqualFold(value, candidate) {
			return true
		}
	}
	return false
}

func setItemData(item *models.Item, key string, value any) {
	if isEmptyItemValue(value) {
		return
	}
	if item.Data == nil {
		item.Data = map[string]any{}
	}
	item.Data[key] = value
}

func isEmptyItemValue(value any) bool {
	switch typed := value.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(typed) == ""
	case []any:
		return len(typed) == 0
	case map[string]any:
		return len(typed) == 0
	default:
		return false
	}
}

func normalizeStringList(values []string) []string {
	seen := map[string]bool{}
	result := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[strings.ToLower(value)] {
			continue
		}
		seen[strings.ToLower(value)] = true
		result = append(result, value)
	}
	return result
}

func nestedName(parent map[string]any, key string) string {
	if value := strings.TrimSpace(itemStringFromAny(parent[key])); value != "" {
		return value
	}
	return stringFromMap(parent, key, "name")
}

func stringFromMap(parent map[string]any, key string, child string) string {
	object, _ := parent[key].(map[string]any)
	return strings.TrimSpace(itemStringFromAny(object[child]))
}

func intFromMap(parent map[string]any, key string, child string) int {
	object, _ := parent[key].(map[string]any)
	return int(floatFromAny(object[child]))
}

func itemMapFromAny(value any) map[string]any {
	object, ok := value.(map[string]any)
	if !ok {
		return map[string]any{}
	}
	return object
}

func itemStringFromAny(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case float64:
		return strconv.FormatFloat(typed, 'f', -1, 64)
	case int:
		return strconv.Itoa(typed)
	default:
		return ""
	}
}

func floatFromAny(value any) float64 {
	switch typed := value.(type) {
	case float64:
		return typed
	case int:
		return float64(typed)
	case string:
		parsed, _ := strconv.ParseFloat(typed, 64)
		return parsed
	default:
		return 0
	}
}

func itemBoolFromAny(value any) bool {
	typed, _ := value.(bool)
	return typed
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func copyName(name string) string {
	if strings.HasPrefix(strings.ToLower(name), "copy of ") {
		return name
	}
	return "Copy of " + name
}
