package store

import (
	"fmt"
	"sort"
	"strings"
)

func BuildDependencyGraph(manifest PortableManifest) DependencyGraph {
	builder := dependencyGraphBuilder{nodes: map[string]DependencyGraphNode{}}
	builder.addManifestNodes(manifest)
	builder.addManifestRoots(manifest)
	builder.addManifestEdges(manifest)
	graph := builder.graph()
	graph.Audit = AuditDependencyGraph(graph)
	graph.Warnings = append(graph.Warnings, graph.Audit.Errors...)
	graph.Warnings = append(graph.Warnings, graph.Audit.Warnings...)
	graph.Projection = ProjectDependencyGraph(graph)
	return graph
}

func (builder *dependencyGraphBuilder) addManifestNodes(manifest PortableManifest) {
	for _, campaign := range manifest.Campaigns {
		builder.addNode(nodeID("campaign", campaign.ID), "campaign", campaign.Name, false, false, false, false)
	}
	for _, player := range manifest.Players {
		builder.addNode(nodeID("player", player.ID), "player", player.CharacterName, false, false, false, false)
	}
	for _, creature := range manifest.NPCs {
		builder.addNode(nodeID("npc", creature.ID), "npc", creature.Name, false, false, false, false)
	}
	for _, action := range manifest.CreatureActions {
		builder.addNode(nodeID("creatureAction", action.ID), "creature action", action.Name, false, false, false, false)
	}
	for _, profile := range manifest.Spellcasting {
		builder.addNode(nodeID("spellcasting", profile.CreatureID), "spellcasting", "Spellcasting profile", false, false, false, false)
	}
	for _, spell := range manifest.CreatureSpells {
		builder.addNode(nodeID("creatureSpell", spell.ID), "creature spell", creatureSpellLabel(spell.SpellLevel, spell.StandardSpellID), false, false, false, false)
	}
	for _, spell := range manifest.Spells {
		builder.addNode(nodeID("spell", spell.ID), "spell", spell.Name, false, false, false, false)
	}
	for _, action := range manifest.SpellActions {
		builder.addNode(nodeID("spellAction", action.ID), "spell action", action.Name, false, false, false, false)
	}
	for _, item := range manifest.Items {
		builder.addNode(nodeID("item", item.ID), "item", item.Name, false, false, false, false)
	}
	for _, template := range manifest.ActionTemplates {
		builder.addNode(nodeID("actionTemplate", template.ID), "action template", template.Name, false, false, false, false)
	}
	for _, encounter := range manifest.Encounters {
		builder.addNode(nodeID("encounter", encounter.ID), "encounter", encounter.Name, false, false, false, false)
	}
	for _, combatant := range manifest.Combatants {
		builder.addNode(nodeID("combatant", combatant.ID), "combatant", combatant.DisplayName, false, false, false, false)
	}
	for _, run := range manifest.Runs {
		builder.addNode(nodeID("run", run.ID), "encounter run", run.Status, false, false, false, false)
	}
	for _, combatant := range manifest.RunCombatants {
		builder.addNode(nodeID("runCombatant", combatant.ID), "run combatant", combatant.DisplayName, false, false, false, false)
	}
	for _, location := range manifest.Locations {
		builder.addNode(nodeID("location", location.ID), locationGraphKind(location.LocationType), location.Name, false, false, false, false)
	}
	for _, link := range manifest.LocationLinks {
		builder.addNode(nodeID("locationLink", link.ID), "location link", "Location connection", true, false, false, false)
	}
	for _, link := range manifest.NPCLocationLinks {
		builder.addNode(nodeID("npcLocationLink", link.ID), "NPC location link", "NPC placement", true, false, false, false)
	}
	for _, stock := range manifest.LocationStock {
		builder.addNode(nodeID("locationStock", stock.ID), "location stock", "Location stock", true, false, false, false)
	}
	for _, campaignMap := range manifest.Maps {
		builder.addNode(nodeID("map", campaignMap.ID), "map", campaignMap.Name, false, false, false, false)
	}
	for _, pin := range manifest.MapPins {
		builder.addNode(nodeID("mapPin", pin.ID), "map pin", mapPinLabel(pin.LabelOverride), true, false, false, false)
	}
	for _, journey := range manifest.Journeys {
		builder.addNode(nodeID("journey", journey.ID), "journey", journey.Name, true, false, false, false)
	}
	for _, table := range manifest.RollTables {
		builder.addNode(nodeID("rollTable", table.ID), "roll table", table.Name, true, false, false, false)
	}
	for _, row := range manifest.RollTableRows {
		builder.addNode(nodeID("rollTableRow", row.ID), "roll table row", row.Label, true, false, false, false)
	}
	for _, asset := range manifest.Assets {
		builder.addNode(nodeID("asset", asset.ID), "asset", asset.Filename, false, true, false, false)
	}
}

func (builder *dependencyGraphBuilder) addManifestRoots(manifest PortableManifest) {
	switch manifest.BundleType {
	case "campaign":
		for _, campaign := range manifest.Campaigns {
			builder.addRoot(nodeID("campaign", campaign.ID))
		}
	case "everything":
		for _, campaign := range manifest.Campaigns {
			builder.addRoot(nodeID("campaign", campaign.ID))
		}
		for _, player := range manifest.Players {
			builder.addRoot(nodeID("player", player.ID))
		}
		for _, creature := range manifest.NPCs {
			builder.addRoot(nodeID("npc", creature.ID))
		}
		for _, spell := range manifest.Spells {
			builder.addRoot(nodeID("spell", spell.ID))
		}
		for _, item := range manifest.Items {
			builder.addRoot(nodeID("item", item.ID))
		}
		for _, template := range manifest.ActionTemplates {
			builder.addRoot(nodeID("actionTemplate", template.ID))
		}
	case "npc":
		for _, creature := range manifest.NPCs {
			builder.addRoot(nodeID("npc", creature.ID))
		}
	case "player":
		for _, campaign := range manifest.Campaigns {
			builder.addRoot(nodeID("campaign", campaign.ID))
		}
		for _, player := range manifest.Players {
			builder.addRoot(nodeID("player", player.ID))
		}
	case "item":
		for _, item := range manifest.Items {
			builder.addRoot(nodeID("item", item.ID))
		}
	case "spell":
		for _, spell := range manifest.Spells {
			builder.addRoot(nodeID("spell", spell.ID))
		}
	case "encounter":
		for _, campaign := range manifest.Campaigns {
			builder.addRoot(nodeID("campaign", campaign.ID))
		}
		for _, encounter := range manifest.Encounters {
			builder.addRoot(nodeID("encounter", encounter.ID))
		}
	case "map":
		for _, campaign := range manifest.Campaigns {
			builder.addRoot(nodeID("campaign", campaign.ID))
		}
		for _, campaignMap := range manifest.Maps {
			builder.addRoot(nodeID("map", campaignMap.ID))
		}
	case "shop", "dungeon":
		for _, campaign := range manifest.Campaigns {
			builder.addRoot(nodeID("campaign", campaign.ID))
		}
		for _, location := range manifest.Locations {
			if locationGraphKind(location.LocationType) == manifest.BundleType {
				builder.addRoot(nodeID("location", location.ID))
			}
		}
	case "journey":
		for _, campaign := range manifest.Campaigns {
			builder.addRoot(nodeID("campaign", campaign.ID))
		}
		for _, journey := range manifest.Journeys {
			builder.addRoot(nodeID("journey", journey.ID))
		}
	case "roll-table":
		for _, campaign := range manifest.Campaigns {
			builder.addRoot(nodeID("campaign", campaign.ID))
		}
		for _, table := range manifest.RollTables {
			builder.addRoot(nodeID("rollTable", table.ID))
		}
	}
	if len(builder.roots) == 0 {
		root := "bundle:root"
		builder.addNode(root, "bundle", bundleRootLabel(manifest.BundleType), false, false, false, false)
		builder.addRoot(root)
		for id := range builder.nodes {
			if id != root {
				builder.addEdge(root, id, "contains", true)
			}
		}
	}
}

func (builder *dependencyGraphBuilder) addManifestEdges(manifest PortableManifest) {
	for _, player := range manifest.Players {
		if player.CampaignID != nil {
			builder.addEdge(nodeID("campaign", *player.CampaignID), nodeID("player", player.ID), "players", true)
		}
		if player.ImageAssetID != nil {
			builder.addAssetEdge(nodeID("player", player.ID), *player.ImageAssetID, "portrait")
		}
	}
	for _, link := range manifest.CreatureLinks {
		linkID := nodeID("creatureLink", link.CampaignID+":"+link.CreatureID)
		builder.addNode(linkID, "campaign NPC link", "Campaign NPC link", true, false, false, false)
		builder.addEdge(nodeID("campaign", link.CampaignID), linkID, "NPC links", false)
		builder.addEdge(linkID, nodeID("npc", link.CreatureID), "linked NPC", false)
	}
	for _, creature := range manifest.NPCs {
		if creature.ImageAssetID != nil {
			builder.addAssetEdge(nodeID("npc", creature.ID), *creature.ImageAssetID, "portrait")
		}
	}
	for _, action := range manifest.CreatureActions {
		builder.addEdge(nodeID("npc", action.CreatureID), nodeID("creatureAction", action.ID), "actions", true)
		if action.SourceTemplateID != nil {
			builder.addEdge(nodeID("creatureAction", action.ID), nodeID("actionTemplate", *action.SourceTemplateID), "source template", false)
		}
		if action.IconAssetID != nil {
			builder.addAssetEdge(nodeID("creatureAction", action.ID), *action.IconAssetID, "icon")
		}
	}
	for _, part := range manifest.CreatureRollParts {
		rollID := nodeID("creatureRollPart", part.ID)
		builder.addNode(rollID, "roll part", rollPartLabel(part.DiceCount, part.DieSize, part.FixedValue), false, false, false, false)
		builder.addEdge(nodeID("creatureAction", part.CreatureActionID), rollID, "roll parts", true)
	}
	for _, profile := range manifest.Spellcasting {
		builder.addEdge(nodeID("npc", profile.CreatureID), nodeID("spellcasting", profile.CreatureID), "spellcasting", true)
	}
	for _, spell := range manifest.CreatureSpells {
		builder.addEdge(nodeID("npc", spell.CreatureID), nodeID("creatureSpell", spell.ID), "prepared spell", true)
		if spell.LibrarySource == "user" && spell.SpellID != nil {
			builder.addEdge(nodeID("creatureSpell", spell.ID), nodeID("spell", *spell.SpellID), "user spell", true)
		}
		if spell.LibrarySource != "user" && spell.StandardSpellID != nil {
			standardID := nodeID("standardSpell", *spell.StandardSpellID)
			builder.addNode(standardID, "standard spell", creatureSpellLabel(spell.SpellLevel, spell.StandardSpellID), false, false, true, false)
			builder.addEdge(nodeID("creatureSpell", spell.ID), standardID, "standard reference", true)
		}
	}
	for _, scaling := range manifest.SpellScaling {
		scalingID := nodeID("spellScaling", scaling.SpellID)
		builder.addNode(scalingID, "spell scaling", "Projectile scaling", true, false, false, false)
		builder.addEdge(nodeID("spell", scaling.SpellID), scalingID, "scaling", true)
	}
	for _, action := range manifest.SpellActions {
		builder.addEdge(nodeID("spell", action.SpellID), nodeID("spellAction", action.ID), "automation", true)
	}
	for _, part := range manifest.SpellRollParts {
		rollID := nodeID("spellRollPart", part.ID)
		builder.addNode(rollID, "roll part", rollPartLabel(part.DiceCount, part.DieSize, part.FixedValue), false, false, false, false)
		builder.addEdge(nodeID("spellAction", part.SpellActionID), rollID, "roll parts", true)
	}
	for _, template := range manifest.ActionTemplates {
		if template.IconAssetID != nil {
			builder.addAssetEdge(nodeID("actionTemplate", template.ID), *template.IconAssetID, "icon")
		}
	}
	for _, part := range manifest.ActionRollParts {
		rollID := nodeID("actionRollPart", part.ID)
		builder.addNode(rollID, "roll part", rollPartLabel(part.DiceCount, part.DieSize, part.FixedValue), false, false, false, false)
		builder.addEdge(nodeID("actionTemplate", part.ActionTemplateID), rollID, "roll parts", true)
	}
	for _, encounter := range manifest.Encounters {
		builder.addEdge(nodeID("campaign", encounter.CampaignID), nodeID("encounter", encounter.ID), "encounters", true)
		if encounter.LocationID != nil {
			builder.addEdge(nodeID("encounter", encounter.ID), nodeID("location", *encounter.LocationID), "location", false)
		}
		if encounter.BackgroundAssetID != nil {
			builder.addAssetEdge(nodeID("encounter", encounter.ID), *encounter.BackgroundAssetID, "background")
		}
	}
	for _, combatant := range manifest.Combatants {
		builder.addEdge(nodeID("encounter", combatant.EncounterID), nodeID("combatant", combatant.ID), "combatants", true)
		if combatant.PlayerID != nil {
			builder.addEdge(nodeID("combatant", combatant.ID), nodeID("player", *combatant.PlayerID), "player", true)
		}
		if combatant.CreatureID != nil {
			builder.addEdge(nodeID("combatant", combatant.ID), nodeID("npc", *combatant.CreatureID), "NPC", true)
		}
	}
	builder.addRunEdges(manifest)
	builder.addWorldEdges(manifest)
}

func (builder *dependencyGraphBuilder) addRunEdges(manifest PortableManifest) {
	for _, run := range manifest.Runs {
		builder.addEdge(nodeID("encounter", run.EncounterID), nodeID("run", run.ID), "combat runs", true)
	}
	for _, combatant := range manifest.RunCombatants {
		builder.addEdge(nodeID("run", combatant.EncounterRunID), nodeID("runCombatant", combatant.ID), "run combatants", true)
		if combatant.PlayerID != nil {
			builder.addEdge(nodeID("runCombatant", combatant.ID), nodeID("player", *combatant.PlayerID), "player", true)
		}
		if combatant.CreatureID != nil {
			builder.addEdge(nodeID("runCombatant", combatant.ID), nodeID("npc", *combatant.CreatureID), "NPC", true)
		}
		if combatant.SourceCombatantID != nil {
			builder.addEdge(nodeID("runCombatant", combatant.ID), nodeID("combatant", *combatant.SourceCombatantID), "source combatant", false)
		}
	}
	for _, slot := range manifest.RunSpellSlots {
		slotID := nodeID("runSpellSlot", slot.ID)
		builder.addNode(slotID, "spell slot", fmt.Sprintf("Level %d spell slots", slot.SpellLevel), true, false, false, false)
		builder.addEdge(nodeID("run", slot.EncounterRunID), slotID, "spell slots", true)
		builder.addEdge(slotID, nodeID("runCombatant", slot.CombatantID), "combatant", true)
	}
	for _, effect := range manifest.RunEffects {
		effectID := nodeID("runEffect", effect.ID)
		builder.addNode(effectID, "active effect", blankDefault(effect.SpellName, effect.EffectKind, "Active effect"), true, false, false, false)
		builder.addEdge(nodeID("run", effect.EncounterRunID), effectID, "effects", true)
		builder.addEdge(effectID, nodeID("runCombatant", effect.CasterID), "caster", false)
		builder.addEdge(effectID, nodeID("runCombatant", effect.TargetID), "target", false)
		if effect.LibrarySource == "user" && effect.SpellID != nil {
			builder.addEdge(effectID, nodeID("spell", *effect.SpellID), "spell", false)
		}
	}
	for _, alert := range manifest.RunAlerts {
		alertID := nodeID("runAlert", alert.ID)
		builder.addNode(alertID, "run alert", blankDefault(alert.Title, alert.AlertType, "Run alert"), true, false, false, false)
		builder.addEdge(nodeID("run", alert.EncounterRunID), alertID, "alerts", true)
	}
	for _, event := range manifest.CombatLog {
		eventID := nodeID("combatLog", event.ID)
		builder.addNode(eventID, "combat log", event.EventType, true, false, false, false)
		builder.addEdge(nodeID("run", event.EncounterRunID), eventID, "combat log", true)
	}
}

func (builder *dependencyGraphBuilder) addWorldEdges(manifest PortableManifest) {
	for _, location := range manifest.Locations {
		if location.ParentLocationID != nil {
			builder.addEdge(nodeID("location", *location.ParentLocationID), nodeID("location", location.ID), "child location", false)
		} else {
			builder.addEdge(nodeID("campaign", location.CampaignID), nodeID("location", location.ID), "locations", true)
		}
	}
	for _, link := range manifest.LocationLinks {
		builder.addEdge(nodeID("campaign", link.CampaignID), nodeID("locationLink", link.ID), "location links", false)
		builder.addEdge(nodeID("locationLink", link.ID), nodeID("location", link.SourceLocationID), "from", true)
		builder.addEdge(nodeID("locationLink", link.ID), nodeID("location", link.TargetLocationID), "to", true)
	}
	for _, link := range manifest.NPCLocationLinks {
		builder.addEdge(nodeID("campaign", link.CampaignID), nodeID("npcLocationLink", link.ID), "NPC placements", false)
		builder.addEdge(nodeID("npcLocationLink", link.ID), nodeID("location", link.LocationID), "location", true)
		builder.addEdge(nodeID("npcLocationLink", link.ID), nodeID("npc", link.CreatureID), "NPC", false)
	}
	for _, stock := range manifest.LocationStock {
		builder.addEdge(nodeID("campaign", stock.CampaignID), nodeID("locationStock", stock.ID), "stock", false)
		builder.addEdge(nodeID("locationStock", stock.ID), nodeID("location", stock.LocationID), "location", true)
		if stock.LibrarySource == "user" {
			builder.addEdge(nodeID("locationStock", stock.ID), nodeID("item", stock.ItemID), "item", false)
		} else {
			standardID := nodeID("standardItem", stock.ItemID)
			builder.addNode(standardID, "standard item", "Standard item reference", false, false, true, false)
			builder.addEdge(nodeID("locationStock", stock.ID), standardID, "standard reference", false)
		}
	}
	for _, campaignMap := range manifest.Maps {
		builder.addEdge(nodeID("campaign", campaignMap.CampaignID), nodeID("map", campaignMap.ID), "maps", true)
		if campaignMap.ParentLocationID != nil {
			builder.addEdge(nodeID("map", campaignMap.ID), nodeID("location", *campaignMap.ParentLocationID), "parent location", false)
		}
		if campaignMap.ImageAssetID != nil {
			builder.addAssetEdge(nodeID("map", campaignMap.ID), *campaignMap.ImageAssetID, "map image")
		}
	}
	for _, pin := range manifest.MapPins {
		builder.addEdge(nodeID("map", pin.MapID), nodeID("mapPin", pin.ID), "pins", true)
		builder.addEdge(nodeID("mapPin", pin.ID), nodeID("location", pin.LocationID), "location", true)
	}
	for _, journey := range manifest.Journeys {
		builder.addEdge(nodeID("campaign", journey.CampaignID), nodeID("journey", journey.ID), "journeys", false)
	}
	for _, table := range manifest.RollTables {
		if table.CampaignID != nil {
			builder.addEdge(nodeID("campaign", *table.CampaignID), nodeID("rollTable", table.ID), "roll tables", false)
		}
	}
	for _, row := range manifest.RollTableRows {
		builder.addEdge(nodeID("rollTable", row.TableID), nodeID("rollTableRow", row.ID), "rows", true)
	}
}

func (builder *dependencyGraphBuilder) addNode(id, kind, label string, optional, asset, standard, missing bool) {
	if strings.TrimSpace(id) == "" {
		return
	}
	if label = strings.TrimSpace(label); label == "" {
		label = kind
	}
	if existing, ok := builder.nodes[id]; ok {
		existing.Optional = existing.Optional && optional
		existing.Missing = existing.Missing || missing
		existing.Asset = existing.Asset || asset
		existing.Standard = existing.Standard || standard
		builder.nodes[id] = existing
		return
	}
	builder.nodes[id] = DependencyGraphNode{
		ID:       id,
		Kind:     kind,
		Label:    label,
		Optional: optional,
		Asset:    asset,
		Standard: standard,
		Missing:  missing,
	}
}

func (builder *dependencyGraphBuilder) addRoot(id string) {
	if _, ok := builder.nodes[id]; !ok {
		return
	}
	for _, root := range builder.roots {
		if root == id {
			return
		}
	}
	builder.roots = append(builder.roots, id)
}

func (builder *dependencyGraphBuilder) addAssetEdge(from, assetID, relation string) {
	builder.addEdge(from, nodeID("asset", assetID), relation, true)
}

func (builder *dependencyGraphBuilder) addEdge(from, to, relation string, required bool) {
	if strings.TrimSpace(from) == "" || strings.TrimSpace(to) == "" || from == to {
		return
	}
	if _, ok := builder.nodes[from]; !ok {
		builder.addMissingNode(from, required)
	}
	if _, ok := builder.nodes[to]; !ok {
		builder.addMissingNode(to, required)
	}
	for _, edge := range builder.edges {
		if edge.From == from && edge.To == to && edge.Relation == relation {
			return
		}
	}
	builder.edges = append(builder.edges, DependencyGraphEdge{
		From:     from,
		To:       to,
		Relation: relation,
		Required: required,
	})
}

func (builder *dependencyGraphBuilder) addMissingNode(id string, required bool) {
	kind := "missing"
	if parts := strings.SplitN(id, ":", 2); len(parts) == 2 {
		kind = parts[0]
	}
	builder.addNode(id, kind, "Missing "+kind, !required, false, false, true)
	builder.warnings = append(builder.warnings, fmt.Sprintf("Missing %s referenced by bundle", kind))
}

func (builder *dependencyGraphBuilder) graph() DependencyGraph {
	nodes := make([]DependencyGraphNode, 0, len(builder.nodes))
	for _, node := range builder.nodes {
		nodes = append(nodes, node)
	}
	sort.Slice(nodes, func(left, right int) bool {
		if nodes[left].Kind == nodes[right].Kind {
			return nodes[left].Label < nodes[right].Label
		}
		return nodes[left].Kind < nodes[right].Kind
	})
	sort.Slice(builder.edges, func(left, right int) bool {
		if builder.edges[left].From == builder.edges[right].From {
			return builder.edges[left].To < builder.edges[right].To
		}
		return builder.edges[left].From < builder.edges[right].From
	})
	sort.Strings(builder.roots)
	warnings := uniqueStrings(builder.warnings)
	return DependencyGraph{
		Roots:        builder.roots,
		Order:        graphTraversalOrder(builder.roots, builder.edges),
		Nodes:        nodes,
		Edges:        builder.edges,
		ReverseEdges: reverseGraphEdges(builder.edges),
		Counts:       graphCounts(nodes, builder.edges),
		Warnings:     warnings,
	}
}
