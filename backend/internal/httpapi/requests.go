package httpapi

import (
	"errors"
	"strings"

	"bludm/backend/internal/models"
)

type creatureRequest struct {
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	Size            string         `json:"size"`
	CreatureType    string         `json:"creatureType"`
	Alignment       string         `json:"alignment"`
	ArmorClass      int            `json:"armorClass"`
	HitPoints       int            `json:"hitPoints"`
	HitDice         string         `json:"hitDice"`
	ChallengeRating string         `json:"challengeRating"`
	XP              int            `json:"xp"`
	ImageAssetID    string         `json:"imageAssetId"`
	AvatarURL       string         `json:"avatarUrl"`
	StatBlock       map[string]any `json:"statBlock"`
}

type playerRequest struct {
	CampaignID            string         `json:"campaignId"`
	CharacterName         string         `json:"characterName"`
	PlayerName            string         `json:"playerName"`
	AvatarAssetID         string         `json:"avatarAssetId"`
	AvatarURL             string         `json:"avatarUrl"`
	ArmorClass            int            `json:"armorClass"`
	MaxHitPoints          int            `json:"maxHitPoints"`
	TemporaryHitPoints    int            `json:"temporaryHitPoints"`
	TemporaryMaxHitPoints int            `json:"temporaryMaxHitPoints"`
	ExperiencePoints      int            `json:"experiencePoints"`
	CharacterSheet        map[string]any `json:"characterSheet"`
}

type actionRequest struct {
	Name            string                  `json:"name"`
	Description     string                  `json:"description"`
	Recharge        string                  `json:"recharge"`
	LimitedUses     int                     `json:"limitedUses"`
	LimitType       string                  `json:"limitType"`
	Reach           int                     `json:"reach"`
	Range           int                     `json:"range"`
	AOEType         string                  `json:"aoeType"`
	AOESize         int                     `json:"aoeSize"`
	ActionType      string                  `json:"actionType"`
	AttackModifier  int                     `json:"attackModifier"`
	MissEffect      string                  `json:"missEffect"`
	HitSpecialEvent string                  `json:"hitSpecialEvent"`
	Rolls           []actionRollPartRequest `json:"rolls"`
}

type actionRollPartRequest struct {
	RollKind   string `json:"rollKind"`
	DamageType string `json:"damageType"`
	Magical    bool   `json:"magical"`
	DiceCount  int    `json:"diceCount"`
	DieSize    int    `json:"dieSize"`
	FixedValue int    `json:"fixedValue"`
}

type copyTemplateRequest struct {
	TemplateID string `json:"templateId"`
}

type reorderActionsRequest struct {
	ActionIDs []string `json:"actionIds"`
}

type replaceActionsRequest struct {
	Actions []actionRequest `json:"actions"`
}

type addCombatantRequest struct {
	SourceType         string `json:"sourceType"`
	PlayerID           string `json:"playerId"`
	CreatureID         string `json:"creatureId"`
	StandardCreatureID string `json:"standardCreatureId"`
	Side               string `json:"side"`
	DisplayName        string `json:"displayName"`
	ColorLabel         string `json:"colorLabel"`
	AvatarURL          string `json:"avatarUrl"`
	ArmorClass         int    `json:"armorClass"`
	MaxHitPoints       int    `json:"maxHitPoints"`
	CurrentHitPoints   int    `json:"currentHitPoints"`
	RolledHP           bool   `json:"rolledHp"`
	Quantity           int    `json:"quantity"`
}

type updateCombatantRequest struct {
	Side             string `json:"side"`
	DisplayName      string `json:"displayName"`
	ColorLabel       string `json:"colorLabel"`
	AvatarURL        string `json:"avatarUrl"`
	ArmorClass       int    `json:"armorClass"`
	MaxHitPoints     int    `json:"maxHitPoints"`
	CurrentHitPoints int    `json:"currentHitPoints"`
}

type startEncounterRequest struct {
	Test bool `json:"test"`
}

type spellcastingRequest struct {
	SpellcastingAbility       string                 `json:"spellcastingAbility"`
	InnateSpellcastingAbility string                 `json:"innateSpellcastingAbility"`
	CasterLevel               int                    `json:"casterLevel"`
	SpellSaveDC               int                    `json:"spellSaveDC"`
	SpellAttackBonus          int                    `json:"spellAttackBonus"`
	Slots                     map[string]any         `json:"slots"`
	Spells                    []creatureSpellRequest `json:"spells"`
}

type creatureSpellRequest struct {
	SpellID    string `json:"spellId"`
	SpellLevel int    `json:"spellLevel"`
	Prepared   bool   `json:"prepared"`
	Innate     bool   `json:"innate"`
}

type damageDefenseRequest struct {
	Vulnerabilities []string `json:"vulnerabilities"`
	Resistances     []string `json:"resistances"`
	Immunities      []string `json:"immunities"`
}

type executeActionRequest struct {
	ActorID        string               `json:"actorId"`
	TargetID       string               `json:"targetId"`
	TargetName     string               `json:"targetName"`
	TargetAC       int                  `json:"targetAc"`
	TargetDefenses damageDefenseRequest `json:"targetDefenses"`
	ActionID       string               `json:"actionId"`
	RollMode       string               `json:"rollMode"`
}

type resolveDamageRequest struct {
	ActorID    string `json:"actorId"`
	TargetID   string `json:"targetId"`
	TargetName string `json:"targetName"`
	Damage     int    `json:"damage"`
	Override   string `json:"override"`
}

type rollInitiativeRequest struct {
	Sides []string `json:"sides"`
}

type setInitiativeRequest struct {
	CombatantID string `json:"combatantId"`
	Initiative  int    `json:"initiative"`
}

type reorderInitiativeRequest struct {
	CombatantIDs []string `json:"combatantIds"`
}

type manualHPRequest struct {
	ActorID    string `json:"actorId"`
	TargetID   string `json:"targetId"`
	Amount     int    `json:"amount"`
	Mode       string `json:"mode"`
	DamageType string `json:"damageType"`
}

type updateRunCombatantRequest struct {
	Initiative               int      `json:"initiative"`
	InitiativeSet            bool     `json:"initiativeSet"`
	ArmorClassBonus          int      `json:"armorClassBonus"`
	TemporaryHitPoints       int      `json:"temporaryHitPoints"`
	MaxHitPointsModifier     int      `json:"maxHitPointsModifier"`
	ArmorClassOverride       int      `json:"armorClassOverride"`
	MaxHitPointsOverride     int      `json:"maxHitPointsOverride"`
	CurrentHitPointsOverride int      `json:"currentHitPointsOverride"`
	CurrentHitPoints         int      `json:"currentHitPoints"`
	Conditions               []string `json:"conditions"`
	Defeated                 bool     `json:"defeated"`
}

type rollCheckRequest struct {
	ActorID  string `json:"actorId"`
	Label    string `json:"label"`
	Ability  string `json:"ability"`
	Bonus    int    `json:"bonus"`
	RollMode string `json:"rollMode"`
}

type addRunCombatantRequest struct {
	CreatureID         string `json:"creatureId"`
	StandardCreatureID string `json:"standardCreatureId"`
	Side               string `json:"side"`
	Quantity           int    `json:"quantity"`
	RolledHP           bool   `json:"rolledHp"`
	Initiative         int    `json:"initiative"`
	InitiativeSet      bool   `json:"initiativeSet"`
	DisplayName        string `json:"displayName"`
	ColorLabel         string `json:"colorLabel"`
	AvatarURL          string `json:"avatarUrl"`
}

type deathSaveRequest struct {
	CombatantID string `json:"combatantId"`
	Action      string `json:"action"`
}

type longRestUndoRequest struct {
	Players []longRestPlayerSnapshot `json:"players"`
}

type longRestPlayerSnapshot struct {
	ID                    string `json:"id"`
	CurrentHitPoints      int    `json:"currentHitPoints"`
	TemporaryHitPoints    int    `json:"temporaryHitPoints"`
	TemporaryMaxHitPoints int    `json:"temporaryMaxHitPoints"`
}

type endEncounterRequest struct {
	XPAwards        map[string]int      `json:"xpAwards"`
	LootPool        []string            `json:"lootPool"`
	LootAssignments map[string][]string `json:"lootAssignments"`
}

func (req *actionRequest) normalize() {
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	if len(req.Description) > 2000 {
		req.Description = req.Description[:2000]
	}
	req.Recharge = strings.TrimSpace(req.Recharge)
	req.LimitType = strings.TrimSpace(req.LimitType)
	if req.LimitType == "" {
		req.LimitType = "day"
	}
	req.AOEType = strings.TrimSpace(req.AOEType)
	req.ActionType = strings.TrimSpace(req.ActionType)
	if req.ActionType == "" {
		req.ActionType = "melee_weapon"
	}
	req.MissEffect = strings.TrimSpace(req.MissEffect)
	if req.MissEffect == "" {
		req.MissEffect = "none"
	}
	req.HitSpecialEvent = strings.TrimSpace(req.HitSpecialEvent)
	if req.HitSpecialEvent == "" {
		req.HitSpecialEvent = "none"
	}
	if len(req.Rolls) == 0 {
		req.Rolls = []actionRollPartRequest{{RollKind: "damage", DamageType: "bludgeoning", DiceCount: 1, DieSize: 6}}
	}
	for index := range req.Rolls {
		req.Rolls[index].normalize(index)
	}
}

func (req actionRequest) validate() error {
	if req.Name == "" {
		return errors.New("name is required")
	}
	if req.LimitedUses < 0 || req.Reach < 0 || req.Range < 0 || req.AOESize < 0 {
		return errors.New("action numeric fields cannot be negative")
	}
	if req.LimitType != "day" && req.LimitType != "turn" {
		return errors.New("limitType must be day or turn")
	}
	if req.MissEffect != "none" && req.MissEffect != "half" && req.MissEffect != "full" {
		return errors.New("missEffect must be none, half, or full")
	}
	return nil
}

func (req *actionRollPartRequest) normalize(_ int) {
	req.RollKind = strings.TrimSpace(req.RollKind)
	if req.RollKind == "" {
		req.RollKind = "damage"
	}
	req.DamageType = strings.TrimSpace(strings.ToLower(req.DamageType))
	if req.DamageType == "" {
		req.DamageType = "bludgeoning"
	}
	if req.DiceCount < 1 {
		req.DiceCount = 1
	}
	if req.DieSize < 2 {
		req.DieSize = 6
	}
}

func (req actionRequest) toModelRolls() []models.ActionRollPart {
	rolls := make([]models.ActionRollPart, 0, len(req.Rolls))
	for index, roll := range req.Rolls {
		roll.normalize(index)
		rolls = append(rolls, models.ActionRollPart{
			SortOrder:  index,
			RollKind:   roll.RollKind,
			DamageType: roll.DamageType,
			Magical:    roll.Magical,
			DiceCount:  roll.DiceCount,
			DieSize:    roll.DieSize,
			FixedValue: roll.FixedValue,
		})
	}
	return rolls
}

func (req *spellcastingRequest) normalize() {
	req.SpellcastingAbility = strings.TrimSpace(req.SpellcastingAbility)
	req.InnateSpellcastingAbility = strings.TrimSpace(req.InnateSpellcastingAbility)
	if req.CasterLevel < 0 {
		req.CasterLevel = 0
	}
	if req.SpellSaveDC < 0 {
		req.SpellSaveDC = 0
	}
	if req.SpellAttackBonus < 0 {
		req.SpellAttackBonus = 0
	}
	if req.Slots == nil {
		req.Slots = map[string]any{}
	}
}

func (req *playerRequest) normalize() {
	req.CampaignID = strings.TrimSpace(req.CampaignID)
	req.CharacterName = strings.TrimSpace(req.CharacterName)
	req.PlayerName = strings.TrimSpace(req.PlayerName)
	req.AvatarAssetID = strings.TrimSpace(req.AvatarAssetID)
	req.AvatarURL = strings.TrimSpace(req.AvatarURL)
	if req.ArmorClass == 0 {
		req.ArmorClass = 10
	}
	if req.MaxHitPoints == 0 {
		req.MaxHitPoints = 1
	}
}

func (req playerRequest) validate() error {
	if req.CharacterName == "" {
		return errors.New("characterName is required")
	}
	if req.ArmorClass < 0 || req.ArmorClass > 40 {
		return errors.New("armorClass must be between 0 and 40")
	}
	if req.MaxHitPoints < 1 {
		return errors.New("maxHitPoints must be at least 1")
	}
	if req.TemporaryHitPoints < 0 || req.TemporaryMaxHitPoints < 0 {
		return errors.New("temporary hit point values cannot be negative")
	}
	if req.ExperiencePoints < 0 {
		return errors.New("experiencePoints cannot be negative")
	}
	return nil
}

func (req *creatureRequest) normalize() {
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.Size = strings.TrimSpace(req.Size)
	req.CreatureType = strings.TrimSpace(req.CreatureType)
	req.Alignment = strings.TrimSpace(req.Alignment)
	req.HitDice = strings.TrimSpace(req.HitDice)
	req.ChallengeRating = strings.TrimSpace(req.ChallengeRating)
	req.ImageAssetID = strings.TrimSpace(req.ImageAssetID)
	req.AvatarURL = strings.TrimSpace(req.AvatarURL)
	if req.ArmorClass == 0 {
		req.ArmorClass = 10
	}
	if req.HitPoints == 0 {
		req.HitPoints = 1
	}
}

func (req creatureRequest) validate() error {
	if req.Name == "" {
		return errors.New("name is required")
	}
	if req.ArmorClass < 0 || req.ArmorClass > 40 {
		return errors.New("armorClass must be between 0 and 40")
	}
	if req.HitPoints < 1 {
		return errors.New("hitPoints must be at least 1")
	}
	if req.XP < 0 {
		return errors.New("xp cannot be negative")
	}
	return nil
}

type spellRequest struct {
	Name          string         `json:"name"`
	Level         int            `json:"level"`
	School        string         `json:"school"`
	CastingTime   string         `json:"castingTime"`
	Range         string         `json:"range"`
	Components    map[string]any `json:"components"`
	Duration      string         `json:"duration"`
	Ritual        bool           `json:"ritual"`
	Concentration bool           `json:"concentration"`
	Description   string         `json:"description"`
	HigherLevel   string         `json:"higherLevel"`
	SourceNote    string         `json:"sourceNote"`
	Mechanics     map[string]any `json:"mechanics"`
}

func (req *spellRequest) normalize() {
	req.Name = strings.TrimSpace(req.Name)
	req.School = strings.TrimSpace(req.School)
	req.CastingTime = strings.TrimSpace(req.CastingTime)
	req.Range = strings.TrimSpace(req.Range)
	req.Duration = strings.TrimSpace(req.Duration)
	req.Description = strings.TrimSpace(req.Description)
	req.HigherLevel = strings.TrimSpace(req.HigherLevel)
	req.SourceNote = strings.TrimSpace(req.SourceNote)
}

func (req spellRequest) validate() error {
	if req.Name == "" {
		return errors.New("name is required")
	}
	if req.Level < 0 || req.Level > 9 {
		return errors.New("level must be between 0 and 9")
	}
	return nil
}
