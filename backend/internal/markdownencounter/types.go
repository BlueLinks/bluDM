package markdownencounter

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

const (
	CurrentVersion   = 1
	MaxDocumentBytes = 1 << 20
	MaxEncounters    = 50
	MaxCombatants    = 100
)

var encounterIDPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]*$`)

type Document struct {
	Version     int         `json:"version" yaml:"version"`
	ID          string      `json:"id" yaml:"id"`
	Name        string      `json:"name" yaml:"name"`
	Description string      `json:"description,omitempty" yaml:"description,omitempty"`
	Status      string      `json:"status" yaml:"status"`
	Location    string      `json:"location,omitempty" yaml:"location,omitempty"`
	LocationID  string      `json:"locationId,omitempty" yaml:"location_id,omitempty"`
	Room        string      `json:"room,omitempty" yaml:"room,omitempty"`
	Loot        string      `json:"loot,omitempty" yaml:"loot,omitempty"`
	AddParty    bool        `json:"addParty" yaml:"add_party,omitempty"`
	Combatants  []Combatant `json:"combatants" yaml:"combatants,omitempty"`
}

type Combatant struct {
	PlayerID           string `json:"playerId,omitempty" yaml:"player_id,omitempty"`
	Player             string `json:"player,omitempty" yaml:"player,omitempty"`
	CreatureID         string `json:"creatureId,omitempty" yaml:"creature_id,omitempty"`
	StandardCreatureID string `json:"standardCreatureId,omitempty" yaml:"standard_creature_id,omitempty"`
	Creature           string `json:"creature,omitempty" yaml:"creature,omitempty"`
	Name               string `json:"name,omitempty" yaml:"name,omitempty"`
	Side               string `json:"side" yaml:"side,omitempty"`
	Quantity           int    `json:"quantity" yaml:"quantity,omitempty"`
	RolledHP           bool   `json:"rolledHp" yaml:"rolled_hp,omitempty"`
	ArmorClass         int    `json:"armorClass,omitempty" yaml:"armor_class,omitempty"`
	HitPoints          int    `json:"hitPoints,omitempty" yaml:"hit_points,omitempty"`
	Color              string `json:"color,omitempty" yaml:"color,omitempty"`
	AvatarURL          string `json:"avatarUrl,omitempty" yaml:"avatar_url,omitempty"`
}

type Block struct {
	Document  Document `json:"document"`
	Line      int      `json:"line"`
	Raw       string   `json:"-"`
	SourceKey string   `json:"sourceKey,omitempty"`
}

func (d *Document) NormalizeAndValidate() ([]string, error) {
	d.ID = strings.ToLower(strings.TrimSpace(d.ID))
	d.Name = strings.TrimSpace(d.Name)
	d.Description = strings.TrimSpace(d.Description)
	d.Status = strings.ToLower(strings.TrimSpace(d.Status))
	d.Location = strings.TrimSpace(d.Location)
	d.LocationID = strings.TrimSpace(d.LocationID)
	d.Room = strings.TrimSpace(d.Room)
	d.Loot = strings.TrimSpace(d.Loot)
	if d.Status == "" {
		d.Status = "planned"
	}

	switch {
	case d.Version != CurrentVersion:
		return nil, fmt.Errorf("version must be %d", CurrentVersion)
	case !encounterIDPattern.MatchString(d.ID) || len(d.ID) > 80:
		return nil, errors.New("id must be 1-80 lowercase letters, numbers, dots, hyphens, or underscores")
	case d.Name == "" || len(d.Name) > 160:
		return nil, errors.New("name must be 1-160 characters")
	case d.Status != "planned" && d.Status != "completed" && d.Status != "skipped":
		return nil, errors.New("status must be planned, completed, or skipped")
	}

	warnings := []string{}
	total := 0
	enemyCount := 0
	for index := range d.Combatants {
		combatantWarnings, err := d.Combatants[index].normalizeAndValidate()
		if err != nil {
			return nil, fmt.Errorf("combatant %d: %w", index+1, err)
		}
		warnings = append(warnings, combatantWarnings...)
		total += d.Combatants[index].Quantity
		if d.Combatants[index].Side == "enemy" {
			enemyCount += d.Combatants[index].Quantity
		}
	}
	if total > MaxCombatants {
		return nil, fmt.Errorf("encounter expands to %d combatants; maximum is %d", total, MaxCombatants)
	}
	if total == 0 && !d.AddParty {
		warnings = append(warnings, "encounter has no combatants")
	}
	if enemyCount == 0 {
		warnings = append(warnings, "encounter has no enemy combatants")
	}
	return warnings, nil
}

func (c *Combatant) normalizeAndValidate() ([]string, error) {
	c.PlayerID = strings.TrimSpace(c.PlayerID)
	c.Player = strings.TrimSpace(c.Player)
	c.CreatureID = strings.TrimSpace(c.CreatureID)
	c.StandardCreatureID = strings.TrimSpace(c.StandardCreatureID)
	c.Creature = strings.TrimSpace(c.Creature)
	c.Name = strings.TrimSpace(c.Name)
	c.Side = strings.ToLower(strings.TrimSpace(c.Side))
	c.Color = strings.TrimSpace(c.Color)
	c.AvatarURL = strings.TrimSpace(c.AvatarURL)
	if c.Quantity == 0 {
		c.Quantity = 1
	}
	if c.Side == "" {
		c.Side = "enemy"
	}

	references := 0
	for _, value := range []string{c.PlayerID, c.Player, c.CreatureID, c.StandardCreatureID, c.Creature} {
		if value != "" {
			references++
		}
	}
	switch {
	case references > 1:
		return nil, errors.New("use only one player or creature reference")
	case c.Quantity < 1 || c.Quantity > 25:
		return nil, errors.New("quantity must be between 1 and 25")
	case c.Side != "player" && c.Side != "friendly" && c.Side != "enemy":
		return nil, errors.New("side must be player, friendly, or enemy")
	case (c.PlayerID != "" || c.Player != "") && c.Quantity != 1:
		return nil, errors.New("player references cannot have a quantity greater than 1")
	case references == 0 && c.Name == "":
		return nil, errors.New("inline combatants require a name")
	case references == 0 && c.HitPoints < 1:
		return nil, errors.New("inline combatants require hit_points of at least 1")
	case c.ArmorClass < 0:
		return nil, errors.New("armor_class cannot be negative")
	}

	warnings := []string{}
	if references == 0 && c.ArmorClass == 0 {
		c.ArmorClass = 10
		warnings = append(warnings, fmt.Sprintf("%s uses default armor_class 10", c.Name))
	}
	if c.PlayerID != "" || c.Player != "" {
		c.Side = "player"
	}
	return warnings, nil
}
