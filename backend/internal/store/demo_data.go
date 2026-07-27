package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
)

type DemoStore struct {
	db *gorm.DB
}

func (s DemoStore) SeedFixture(ctx context.Context, ownerUserID string) (string, error) {
	var campaignID string
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		id, err := seedDemoCampaign(ctx, tx, ownerUserID)
		if err != nil {
			return err
		}
		campaignID = id

		players := []demoPlayer{
			{name: "Mira Thornvale", player: "Alex", ac: 16, hp: 38, className: "Wizard", level: 4, species: "Wood elf", str: 10, dex: 18, con: 14, intScore: 11, wis: 15, cha: 10},
			{name: "Borin Ashmantle", player: "Sam", ac: 18, hp: 44, className: "Fighter", level: 4, species: "Hill dwarf", str: 14, dex: 10, con: 16, intScore: 10, wis: 17, cha: 12},
			{name: "Nyx Underbough", player: "Jess", ac: 15, hp: 27, className: "Ranger", level: 4, species: "Lightfoot halfling", str: 8, dex: 14, con: 13, intScore: 18, wis: 12, cha: 11},
		}
		for _, player := range players {
			if err := seedDemoPlayer(ctx, tx, ownerUserID, campaignID, player); err != nil {
				return err
			}
		}

		templates := []demoAction{
			{name: "Shortsword", description: "Melee weapon attack with a short blade.", actionType: "melee_weapon", attack: 4, reach: 5, actionRange: 0, damageType: "piercing", diceCount: 1, dieSize: 6, fixed: 2},
			{name: "Shortbow", description: "Ranged weapon attack fired from cover or open ground.", actionType: "ranged_weapon", attack: 4, reach: 0, actionRange: 80, damageType: "piercing", diceCount: 1, dieSize: 6, fixed: 2},
			{name: "Scimitar", description: "Fast curved blade attack.", actionType: "melee_weapon", attack: 4, reach: 5, actionRange: 0, damageType: "slashing", diceCount: 1, dieSize: 6, fixed: 2},
			{name: "Nimble Escape", description: "Disengage or Hide as a bonus action.", actionType: "feature", attack: 0, reach: 0, actionRange: 0, damageType: "", diceCount: 0, dieSize: 0, fixed: 0},
			{name: "Club", description: "Heavy brute-force melee strike.", actionType: "melee_weapon", attack: 6, reach: 5, actionRange: 0, damageType: "bludgeoning", diceCount: 2, dieSize: 8, fixed: 4},
			{name: "Rusty Shortsword", description: "Simple thrusting weapon attack.", actionType: "melee_weapon", attack: 4, reach: 5, actionRange: 0, damageType: "piercing", diceCount: 1, dieSize: 6, fixed: 2},
			{name: "Healing Word", description: "A compact healing spell for testing healing rolls.", actionType: "healing", attack: 0, reach: 0, actionRange: 60, damageType: "healing", diceCount: 1, dieSize: 4, fixed: 3},
		}
		templateIDs := map[string]string{}
		for _, action := range templates {
			id, err := seedDemoActionTemplate(ctx, tx, ownerUserID, action)
			if err != nil {
				return err
			}
			templateIDs[action.name] = id
		}

		creatures := []demoCreature{
			{name: "Tamsin Reed, Road Warden", description: "A local scout who can join as a friendly NPC.", size: "Medium", creatureType: "Human", alignment: "Neutral good", ac: 15, hp: 22, hitDice: "4d8+4", cr: "1/2", xp: 100, friendly: true, str: 10, dex: 10, con: 10, intScore: 10, wis: 10, cha: 10, actions: []string{"Shortbow", "Scimitar"}},
			{name: "Brother Caldus", description: "A travelling priest with a small reserve of magic.", size: "Medium", creatureType: "Humanoid", alignment: "Lawful good", ac: 13, hp: 18, hitDice: "4d8", cr: "1/4", xp: 50, friendly: true, str: 10, dex: 10, con: 11, intScore: 12, wis: 16, cha: 14, actions: []string{"Healing Word"}},
			{name: "Goblin Thornrunner", description: "Small ambusher inspired by classic goblin skirmishers.", size: "Small", creatureType: "Fey", alignment: "Neutral evil", ac: 15, hp: 7, hitDice: "2d6", cr: "0", xp: 50, str: 10, dex: 10, con: 10, intScore: 10, wis: 10, cha: 10, actions: []string{"Shortsword", "Shortbow", "Nimble Escape"}},
			{name: "Gnoll Warrior", description: "A disciplined gnoll skirmisher used by the deterministic encounter builder demo.", size: "Medium", creatureType: "Fiend", alignment: "Chaotic evil", ac: 15, hp: 27, hitDice: "5d8+5", cr: "1/2", xp: 150, str: 10, dex: 10, con: 10, intScore: 10, wis: 10, cha: 10, actions: []string{"Shortsword", "Shortbow"}},
			{name: "Goblin Boss", description: "A compact goblin leader used by the deterministic encounter builder demo.", size: "Small", creatureType: "Fey", alignment: "Neutral evil", ac: 17, hp: 21, hitDice: "6d6", cr: "1", xp: 200, str: 10, dex: 10, con: 10, intScore: 10, wis: 10, cha: 10, actions: []string{"Shortsword", "Shortbow", "Nimble Escape"}},
			{name: "Bone-Rattle Archer", description: "Undead ranged attacker inspired by familiar skeletal archers.", size: "Medium", creatureType: "Undead", alignment: "Lawful evil", ac: 13, hp: 13, hitDice: "2d8+4", cr: "1/4", xp: 50, str: 10, dex: 14, con: 15, intScore: 6, wis: 8, cha: 5, actions: []string{"Shortbow", "Rusty Shortsword"}},
			{name: "Hill Ogre Bruiser", description: "Large club-wielding brute for testing high HP enemies.", size: "Large", creatureType: "Giant", alignment: "Chaotic evil", ac: 11, hp: 59, hitDice: "7d10+21", cr: "2", xp: 450, str: 19, dex: 8, con: 16, intScore: 5, wis: 7, cha: 7, actions: []string{"Club"}},
		}
		creatureIDs := map[string]string{}
		for _, creature := range creatures {
			id, err := seedDemoCreature(ctx, tx, ownerUserID, campaignID, templateIDs, creature)
			if err != nil {
				return err
			}
			creatureIDs[creature.name] = id
		}
		locationIDs, err := seedDemoWorld(ctx, tx, ownerUserID, campaignID, creatureIDs)
		if err != nil {
			return err
		}
		return seedDemoEncounter(ctx, tx, campaignID, creatureIDs, locationIDs)
	})
	return campaignID, err
}

func seedDemoCampaign(ctx context.Context, tx *gorm.DB, ownerUserID string) (string, error) {
	var campaignID string
	err := tx.WithContext(ctx).Raw(`select id from campaigns where owner_user_id = ? and name = 'Demo: Greenhill Ambush' limit 1`, ownerUserID).Row().Scan(&campaignID)
	if err != nil && err != sql.ErrNoRows {
		return "", err
	}
	if err == nil {
		return campaignID, nil
	}
	err = tx.WithContext(ctx).Raw(`
		insert into campaigns (owner_user_id, name, description)
		values (?, 'Demo: Greenhill Ambush', 'A ready-made test campaign with heroes, allies, enemies, reusable actions, and a prepared encounter.')
		returning id
	`, ownerUserID).Row().Scan(&campaignID)
	return campaignID, err
}

type demoPlayer struct {
	name, player, className, species  string
	ac, hp, level                     int
	str, dex, con, intScore, wis, cha int
}

type demoAction struct {
	name, description, actionType, damageType string
	attack, reach, actionRange, diceCount     int
	dieSize, fixed                            int
}

type demoCreature struct {
	name, description, size, creatureType, alignment, hitDice, cr string
	ac, hp, xp                                                    int
	friendly                                                      bool
	str, dex, con, intScore, wis, cha                             int
	actions                                                       []string
}

func seedDemoPlayer(ctx context.Context, tx *gorm.DB, ownerUserID string, campaignID string, player demoPlayer) error {
	var exists bool
	if err := tx.WithContext(ctx).Raw(`select exists(select 1 from players where campaign_id = ? and character_name = ?)`, campaignID, player.name).Row().Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}
	sheet := map[string]any{
		"className":  player.className,
		"level":      player.level,
		"species":    player.species,
		"background": "Demo adventurer",
		"speed":      30,
		"abilityScores": map[string]int{
			"str": player.str, "dex": player.dex, "con": player.con, "int": player.intScore, "wis": player.wis, "cha": player.cha,
		},
		"passivePerception":    12,
		"passiveInvestigation": 11,
		"passiveInsight":       12,
	}
	sheetJSON, err := json.Marshal(sheet)
	if err != nil {
		return err
	}
	return tx.WithContext(ctx).Exec(`
		insert into players (owner_user_id, campaign_id, character_name, player_name, armor_class, max_hit_points, current_hit_points, character_sheet)
		values (?, ?, ?, ?, ?, ?, ?, ?)
	`, ownerUserID, campaignID, player.name, player.player, player.ac, player.hp, player.hp, sheetJSON).Error
}

func seedDemoActionTemplate(ctx context.Context, tx *gorm.DB, ownerUserID string, action demoAction) (string, error) {
	var id string
	err := tx.WithContext(ctx).Raw(`select id from action_templates where owner_user_id = ? and name = ? limit 1`, ownerUserID, action.name).Row().Scan(&id)
	if err != nil && err != sql.ErrNoRows {
		return "", err
	}
	if err == nil {
		return id, nil
	}
	if err := tx.WithContext(ctx).Raw(`
		insert into action_templates (
			owner_user_id, name, description, action_type, attack_modifier, reach, action_range, miss_effect, hit_special_event
		)
		values (?, ?, ?, ?, ?, ?, ?, 'none', 'none')
		returning id
	`, ownerUserID, action.name, action.description, action.actionType, action.attack, action.reach, action.actionRange).Row().Scan(&id); err != nil {
		return "", err
	}
	if action.diceCount <= 0 && action.fixed <= 0 {
		return id, nil
	}
	err = tx.WithContext(ctx).Exec(`
		insert into action_template_roll_parts (action_template_id, sort_order, roll_kind, damage_type, dice_count, die_size, fixed_value)
		values (?, 0, ?, ?, ?, ?, ?)
	`, id, map[bool]string{true: "healing", false: "damage"}[action.actionType == "healing"], action.damageType, action.diceCount, action.dieSize, action.fixed).Error
	return id, err
}

func seedDemoCreature(ctx context.Context, tx *gorm.DB, ownerUserID string, campaignID string, templateIDs map[string]string, creature demoCreature) (string, error) {
	var id string
	lookupErr := tx.WithContext(ctx).Raw(`select id from creatures where owner_user_id = ? and name = ? limit 1`, ownerUserID, creature.name).Row().Scan(&id)
	if lookupErr != nil && lookupErr != sql.ErrNoRows {
		return "", lookupErr
	}
	statBlock := map[string]any{
		"abilityScores": map[string]int{
			"str": creature.str, "dex": creature.dex, "con": creature.con, "int": creature.intScore, "wis": creature.wis, "cha": creature.cha,
		},
		"passivePerception": 10,
	}
	statJSON, err := json.Marshal(statBlock)
	if err != nil {
		return "", err
	}
	if lookupErr == sql.ErrNoRows {
		if err := tx.WithContext(ctx).Raw(`
			insert into creatures (
				owner_user_id, name, description, size, creature_type, alignment, armor_class, hit_points, hit_dice, challenge_rating, xp, stat_block
			)
			values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			returning id
		`, ownerUserID, creature.name, creature.description, creature.size, creature.creatureType, creature.alignment, creature.ac, creature.hp, creature.hitDice, creature.cr, creature.xp, statJSON).Row().Scan(&id); err != nil {
			return "", err
		}
	}
	if creature.friendly {
		if err := tx.WithContext(ctx).Exec(`
			insert into campaign_creatures (campaign_id, creature_id, disposition)
			values (?, ?, 'friendly')
			on conflict (campaign_id, creature_id) do update set disposition = excluded.disposition
		`, campaignID, id).Error; err != nil {
			return "", err
		}
	}
	for index, actionName := range creature.actions {
		templateID := templateIDs[actionName]
		if templateID == "" {
			continue
		}
		if err := seedCreatureActionFromTemplate(ctx, tx, id, templateID, index); err != nil {
			return "", err
		}
	}
	return id, nil
}

func seedCreatureActionFromTemplate(ctx context.Context, tx *gorm.DB, creatureID string, templateID string, sortOrder int) error {
	var exists bool
	if err := tx.WithContext(ctx).Raw(`select exists(select 1 from creature_actions where creature_id = ? and source_template_id = ?)`, creatureID, templateID).Row().Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}
	var actionID string
	if err := tx.WithContext(ctx).Raw(`
		insert into creature_actions (
			creature_id, source_template_id, sort_order, name, description, recharge, limited_uses, limit_type,
			reach, action_range, aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event
		)
		select ?, id, ?, name, description, recharge, limited_uses, limit_type, reach, action_range,
			aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event
		from action_templates
		where id = ?
		returning id
	`, creatureID, sortOrder, templateID).Row().Scan(&actionID); err != nil {
		return err
	}
	return tx.WithContext(ctx).Exec(`
		insert into creature_action_roll_parts (
			creature_action_id, sort_order, roll_kind, damage_type, magical, dice_count, die_size, fixed_value
		)
		select ?, sort_order, roll_kind, damage_type, magical, dice_count, die_size, fixed_value
		from action_template_roll_parts
		where action_template_id = ?
		order by sort_order
	`, actionID, templateID).Error
}

func seedDemoEncounter(ctx context.Context, tx *gorm.DB, campaignID string, creatureIDs map[string]string, locationIDs map[string]string) error {
	var encounterID string
	err := tx.WithContext(ctx).Raw(`select id from encounters where campaign_id = ? and name = 'Roadside Trouble' limit 1`, campaignID).Row().Scan(&encounterID)
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	if err == sql.ErrNoRows {
		if err := tx.WithContext(ctx).Raw(`
			insert into encounters (campaign_id, name, description, status)
			values (?, 'Roadside Trouble', 'A mixed encounter for testing player, friendly, and enemy setup.', 'planned')
			returning id
		`, campaignID).Row().Scan(&encounterID); err != nil {
			return err
		}
	}
	if gateID := locationIDs["gate"]; gateID != "" {
		if err := tx.WithContext(ctx).Exec(`update encounters set status = 'planned', location_id = ?, location = 'North Road Gate', room_number = 'Gate road' where id = ?`, gateID, encounterID).Error; err != nil {
			return err
		}
	}
	var count int
	if err := tx.WithContext(ctx).Raw(`select count(*) from encounter_combatants where encounter_id = ?`, encounterID).Row().Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	rows, err := tx.WithContext(ctx).Raw(`select id from players where campaign_id = ? order by character_name`, campaignID).Rows()
	if err != nil {
		return err
	}
	playerIDs := []string{}
	for rows.Next() {
		var playerID string
		if err := rows.Scan(&playerID); err != nil {
			_ = rows.Close()
			return err
		}
		playerIDs = append(playerIDs, playerID)
	}
	if err := rows.Err(); err != nil {
		_ = rows.Close()
		return err
	}
	if err := rows.Close(); err != nil {
		return err
	}
	sortOrder := 0
	for _, playerID := range playerIDs {
		if err := tx.WithContext(ctx).Exec(`
			insert into encounter_combatants (
				encounter_id, source_type, player_id, side, display_name, armor_class, max_hit_points, current_hit_points, sort_order, snapshot
			)
			select ?, 'player', id, 'player', character_name, armor_class, max_hit_points, current_hit_points, ?, jsonb_build_object('player', to_jsonb(players))
			from players where id = ?
		`, encounterID, sortOrder, playerID).Error; err != nil {
			return err
		}
		sortOrder++
	}
	entries := []struct {
		name, side, color string
		quantity          int
	}{
		{name: "Tamsin Reed, Road Warden", side: "friendly", color: "#16a34a", quantity: 1},
		{name: "Goblin Thornrunner", side: "enemy", color: "#dc2626", quantity: 3},
		{name: "Hill Ogre Bruiser", side: "enemy", color: "#d97706", quantity: 1},
	}
	for _, entry := range entries {
		for i := 0; i < entry.quantity; i++ {
			if err := tx.WithContext(ctx).Exec(`
				insert into encounter_combatants (
					encounter_id, source_type, creature_id, side, display_name, color_label,
					armor_class, max_hit_points, current_hit_points, sort_order, snapshot
				)
				select ?, 'creature', id, ?, ?, ?, armor_class, hit_points, hit_points, ?, jsonb_build_object('creature', to_jsonb(creatures))
				from creatures where id = ?
			`, encounterID, entry.side, encounterDisplayName(entry.name, i, entry.quantity), entry.color, sortOrder, creatureIDs[entry.name]).Error; err != nil {
				return err
			}
			sortOrder++
		}
	}
	return nil
}

func encounterDisplayName(name string, index int, quantity int) string {
	if quantity <= 1 {
		return name
	}
	return fmt.Sprintf("%s (%d)", name, index+1)
}
