package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5"
)

func (s *Server) seedTestData(w http.ResponseWriter, r *http.Request) {
	campaignID, err := s.seedDemoFixture(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not seed test data")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"campaignId": campaignID,
		"message":    "Demo campaign, player characters, NPCs, enemies, actions, and a starter encounter are ready.",
	})
}

func (s *Server) seedDemoFixture(ctx context.Context) (string, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var campaignID string
	err = tx.QueryRow(ctx, `select id from campaigns where name = 'Demo: Greenhill Ambush' limit 1`).Scan(&campaignID)
	if err != nil && err != pgx.ErrNoRows {
		return "", err
	}
	if err == pgx.ErrNoRows {
		if err := tx.QueryRow(ctx, `
			insert into campaigns (name, description)
			values ('Demo: Greenhill Ambush', 'A ready-made test campaign with heroes, allies, enemies, reusable actions, and a prepared encounter.')
			returning id
		`).Scan(&campaignID); err != nil {
			return "", err
		}
	}

	players := []demoPlayer{
		{name: "Mira Thornvale", player: "Alex", ac: 16, hp: 38, className: "Ranger", level: 4, species: "Wood elf", str: 10, dex: 18, con: 14, intScore: 11, wis: 15, cha: 10},
		{name: "Borin Ashmantle", player: "Sam", ac: 18, hp: 44, className: "Cleric", level: 4, species: "Hill dwarf", str: 14, dex: 10, con: 16, intScore: 10, wis: 17, cha: 12},
		{name: "Nyx Underbough", player: "Jess", ac: 15, hp: 27, className: "Wizard", level: 4, species: "Lightfoot halfling", str: 8, dex: 14, con: 13, intScore: 18, wis: 12, cha: 11},
	}
	for _, player := range players {
		if err := seedDemoPlayer(ctx, tx, campaignID, player); err != nil {
			return "", err
		}
	}

	templates := []demoAction{
		{name: "Shortbow", description: "Ranged weapon attack fired from cover or open ground.", actionType: "ranged_weapon", attack: 4, reach: 0, actionRange: 80, damageType: "piercing", diceCount: 1, dieSize: 6, fixed: 2},
		{name: "Scimitar", description: "Fast curved blade attack.", actionType: "melee_weapon", attack: 4, reach: 5, actionRange: 0, damageType: "slashing", diceCount: 1, dieSize: 6, fixed: 2},
		{name: "Club", description: "Heavy brute-force melee strike.", actionType: "melee_weapon", attack: 6, reach: 5, actionRange: 0, damageType: "bludgeoning", diceCount: 2, dieSize: 8, fixed: 4},
		{name: "Rusty Shortsword", description: "Simple thrusting weapon attack.", actionType: "melee_weapon", attack: 4, reach: 5, actionRange: 0, damageType: "piercing", diceCount: 1, dieSize: 6, fixed: 2},
		{name: "Healing Word", description: "A compact healing spell for testing healing rolls.", actionType: "healing", attack: 0, reach: 0, actionRange: 60, damageType: "healing", diceCount: 1, dieSize: 4, fixed: 3},
	}
	templateIDs := map[string]string{}
	for _, action := range templates {
		id, err := seedDemoActionTemplate(ctx, tx, action)
		if err != nil {
			return "", err
		}
		templateIDs[action.name] = id
	}

	creatures := []demoCreature{
		{name: "Tamsin Reed, Road Warden", description: "A local scout who can join as a friendly NPC.", size: "Medium", creatureType: "Humanoid", alignment: "Neutral good", ac: 15, hp: 22, hitDice: "4d8+4", cr: "1/2", xp: 100, friendly: true, str: 12, dex: 16, con: 12, intScore: 11, wis: 14, cha: 10, actions: []string{"Shortbow", "Scimitar"}},
		{name: "Brother Caldus", description: "A travelling priest with a small reserve of magic.", size: "Medium", creatureType: "Humanoid", alignment: "Lawful good", ac: 13, hp: 18, hitDice: "4d8", cr: "1/4", xp: 50, friendly: true, str: 10, dex: 10, con: 11, intScore: 12, wis: 16, cha: 14, actions: []string{"Healing Word"}},
		{name: "Goblin Thornrunner", description: "Small ambusher inspired by classic goblin skirmishers.", size: "Small", creatureType: "Humanoid", alignment: "Neutral evil", ac: 15, hp: 7, hitDice: "2d6", cr: "1/4", xp: 50, str: 8, dex: 14, con: 10, intScore: 10, wis: 8, cha: 8, actions: []string{"Shortbow", "Scimitar"}},
		{name: "Bone-Rattle Archer", description: "Undead ranged attacker inspired by familiar skeletal archers.", size: "Medium", creatureType: "Undead", alignment: "Lawful evil", ac: 13, hp: 13, hitDice: "2d8+4", cr: "1/4", xp: 50, str: 10, dex: 14, con: 15, intScore: 6, wis: 8, cha: 5, actions: []string{"Shortbow", "Rusty Shortsword"}},
		{name: "Hill Ogre Bruiser", description: "Large club-wielding brute for testing high HP enemies.", size: "Large", creatureType: "Giant", alignment: "Chaotic evil", ac: 11, hp: 59, hitDice: "7d10+21", cr: "2", xp: 450, str: 19, dex: 8, con: 16, intScore: 5, wis: 7, cha: 7, actions: []string{"Club"}},
	}
	creatureIDs := map[string]string{}
	for _, creature := range creatures {
		id, err := seedDemoCreature(ctx, tx, campaignID, templateIDs, creature)
		if err != nil {
			return "", err
		}
		creatureIDs[creature.name] = id
	}

	if err := seedDemoEncounter(ctx, tx, campaignID, creatureIDs); err != nil {
		return "", err
	}
	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return campaignID, nil
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

func seedDemoPlayer(ctx context.Context, tx pgx.Tx, campaignID string, player demoPlayer) error {
	var exists bool
	if err := tx.QueryRow(ctx, `select exists(select 1 from players where campaign_id = $1 and character_name = $2)`, campaignID, player.name).Scan(&exists); err != nil {
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
	_, err = tx.Exec(ctx, `
		insert into players (campaign_id, character_name, player_name, armor_class, max_hit_points, current_hit_points, character_sheet)
		values ($1, $2, $3, $4, $5, $5, $6)
	`, campaignID, player.name, player.player, player.ac, player.hp, sheetJSON)
	return err
}

func seedDemoActionTemplate(ctx context.Context, tx pgx.Tx, action demoAction) (string, error) {
	var id string
	err := tx.QueryRow(ctx, `select id from action_templates where name = $1 limit 1`, action.name).Scan(&id)
	if err != nil && err != pgx.ErrNoRows {
		return "", err
	}
	if err == nil {
		return id, nil
	}
	if err := tx.QueryRow(ctx, `
		insert into action_templates (
			name, description, action_type, attack_modifier, reach, action_range, miss_effect, hit_special_event
		)
		values ($1, $2, $3, $4, $5, $6, 'none', 'none')
		returning id
	`, action.name, action.description, action.actionType, action.attack, action.reach, action.actionRange).Scan(&id); err != nil {
		return "", err
	}
	_, err = tx.Exec(ctx, `
		insert into action_template_roll_parts (action_template_id, sort_order, roll_kind, damage_type, dice_count, die_size, fixed_value)
		values ($1, 0, $2, $3, $4, $5, $6)
	`, id, map[bool]string{true: "healing", false: "damage"}[action.actionType == "healing"], action.damageType, action.diceCount, action.dieSize, action.fixed)
	return id, err
}

func seedDemoCreature(ctx context.Context, tx pgx.Tx, campaignID string, templateIDs map[string]string, creature demoCreature) (string, error) {
	var id string
	err := tx.QueryRow(ctx, `select id from creatures where name = $1 limit 1`, creature.name).Scan(&id)
	if err != nil && err != pgx.ErrNoRows {
		return "", err
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
	if err == pgx.ErrNoRows {
		if err := tx.QueryRow(ctx, `
			insert into creatures (
				name, description, size, creature_type, alignment, armor_class, hit_points, hit_dice, challenge_rating, xp, stat_block
			)
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			returning id
		`, creature.name, creature.description, creature.size, creature.creatureType, creature.alignment, creature.ac, creature.hp, creature.hitDice, creature.cr, creature.xp, statJSON).Scan(&id); err != nil {
			return "", err
		}
	}
	if creature.friendly {
		if _, err := tx.Exec(ctx, `
			insert into campaign_creatures (campaign_id, creature_id, disposition)
			values ($1, $2, 'friendly')
			on conflict (campaign_id, creature_id) do update set disposition = excluded.disposition
		`, campaignID, id); err != nil {
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

func seedCreatureActionFromTemplate(ctx context.Context, tx pgx.Tx, creatureID string, templateID string, sortOrder int) error {
	var exists bool
	if err := tx.QueryRow(ctx, `select exists(select 1 from creature_actions where creature_id = $1 and source_template_id = $2)`, creatureID, templateID).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}
	var actionID string
	if err := tx.QueryRow(ctx, `
		insert into creature_actions (
			creature_id, source_template_id, sort_order, name, description, recharge, limited_uses, limit_type,
			reach, action_range, aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event
		)
		select $1, id, $2, name, description, recharge, limited_uses, limit_type, reach, action_range,
			aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event
		from action_templates
		where id = $3
		returning id
	`, creatureID, sortOrder, templateID).Scan(&actionID); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `
		insert into creature_action_roll_parts (
			creature_action_id, sort_order, roll_kind, damage_type, magical, dice_count, die_size, fixed_value
		)
		select $1, sort_order, roll_kind, damage_type, magical, dice_count, die_size, fixed_value
		from action_template_roll_parts
		where action_template_id = $2
		order by sort_order
	`, actionID, templateID)
	return err
}

func seedDemoEncounter(ctx context.Context, tx pgx.Tx, campaignID string, creatureIDs map[string]string) error {
	var encounterID string
	err := tx.QueryRow(ctx, `select id from encounters where campaign_id = $1 and name = 'Roadside Trouble' limit 1`, campaignID).Scan(&encounterID)
	if err != nil && err != pgx.ErrNoRows {
		return err
	}
	if err == pgx.ErrNoRows {
		if err := tx.QueryRow(ctx, `
			insert into encounters (campaign_id, name, description)
			values ($1, 'Roadside Trouble', 'A mixed encounter for testing player, friendly, and enemy setup.')
			returning id
		`, campaignID).Scan(&encounterID); err != nil {
			return err
		}
	}
	var count int
	if err := tx.QueryRow(ctx, `select count(*) from encounter_combatants where encounter_id = $1`, encounterID).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	rows, err := tx.Query(ctx, `select id from players where campaign_id = $1 order by character_name`, campaignID)
	if err != nil {
		return err
	}
	defer rows.Close()
	sortOrder := 0
	for rows.Next() {
		var playerID string
		if err := rows.Scan(&playerID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			insert into encounter_combatants (
				encounter_id, source_type, player_id, side, display_name, armor_class, max_hit_points, current_hit_points, sort_order, snapshot
			)
			select $1, 'player', id, 'player', character_name, armor_class, max_hit_points, current_hit_points, $2, jsonb_build_object('player', to_jsonb(players))
			from players where id = $3
		`, encounterID, sortOrder, playerID); err != nil {
			return err
		}
		sortOrder++
	}
	if err := rows.Err(); err != nil {
		return err
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
			if _, err := tx.Exec(ctx, `
				insert into encounter_combatants (
					encounter_id, source_type, creature_id, side, display_name, color_label,
					armor_class, max_hit_points, current_hit_points, sort_order, snapshot
				)
				select $1, 'creature', id, $2, $3, $4, armor_class, hit_points, hit_points, $5, jsonb_build_object('creature', to_jsonb(creatures))
				from creatures where id = $6
			`, encounterID, entry.side, encounterDisplayName(entry.name, i, entry.quantity), entry.color, sortOrder, creatureIDs[entry.name]); err != nil {
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
