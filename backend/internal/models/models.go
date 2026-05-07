package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Session struct {
	ID        string
	UserID    string
	ExpiresAt time.Time
}

type Campaign struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Encounter struct {
	ID             string               `json:"id"`
	CampaignID     string               `json:"campaignId"`
	Name           string               `json:"name"`
	Description    string               `json:"description"`
	Status         string               `json:"status"`
	Location       string               `json:"location"`
	RoomNumber     string               `json:"roomNumber"`
	LootNotes      string               `json:"lootNotes"`
	Combatants     []EncounterCombatant `json:"combatants,omitempty"`
	CombatantCount int                  `json:"combatantCount"`
	EnemyCount     int                  `json:"enemyCount"`
	CreatedAt      time.Time            `json:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt"`
}

type EncounterCombatant struct {
	ID               string         `json:"id"`
	EncounterID      string         `json:"encounterId"`
	SourceType       string         `json:"sourceType"`
	PlayerID         string         `json:"playerId,omitempty"`
	CreatureID       string         `json:"creatureId,omitempty"`
	Side             string         `json:"side"`
	DisplayName      string         `json:"displayName"`
	ColorLabel       string         `json:"colorLabel"`
	AvatarURL        string         `json:"avatarUrl"`
	ArmorClass       int            `json:"armorClass"`
	MaxHitPoints     int            `json:"maxHitPoints"`
	CurrentHitPoints int            `json:"currentHitPoints"`
	RolledHP         bool           `json:"rolledHp"`
	SortOrder        int            `json:"sortOrder"`
	Snapshot         map[string]any `json:"snapshot"`
	CreatedAt        time.Time      `json:"createdAt"`
	UpdatedAt        time.Time      `json:"updatedAt"`
}

type EncounterRun struct {
	ID               string                  `json:"id"`
	EncounterID      string                  `json:"encounterId"`
	Status           string                  `json:"status"`
	IsTest           bool                    `json:"isTest"`
	CurrentRound     int                     `json:"currentRound"`
	CurrentTurnIndex int                     `json:"currentTurnIndex"`
	StartedAt        time.Time               `json:"startedAt"`
	EndedAt          *time.Time              `json:"endedAt,omitempty"`
	Summary          map[string]any          `json:"summary"`
	Combatants       []EncounterRunCombatant `json:"combatants,omitempty"`
	Events           []CombatLogEvent        `json:"events,omitempty"`
}

type EncounterRunCombatant struct {
	ID                       string         `json:"id"`
	EncounterRunID           string         `json:"encounterRunId"`
	SourceCombatantID        string         `json:"sourceCombatantId,omitempty"`
	SourceType               string         `json:"sourceType"`
	PlayerID                 string         `json:"playerId,omitempty"`
	CreatureID               string         `json:"creatureId,omitempty"`
	Side                     string         `json:"side"`
	DisplayName              string         `json:"displayName"`
	ColorLabel               string         `json:"colorLabel"`
	AvatarURL                string         `json:"avatarUrl"`
	ArmorClass               int            `json:"armorClass"`
	MaxHitPoints             int            `json:"maxHitPoints"`
	CurrentHitPoints         int            `json:"currentHitPoints"`
	TemporaryHitPoints       int            `json:"temporaryHitPoints"`
	MaxHitPointsModifier     int            `json:"maxHitPointsModifier"`
	ArmorClassBonus          int            `json:"armorClassBonus"`
	ArmorClassOverride       int            `json:"armorClassOverride"`
	MaxHitPointsOverride     int            `json:"maxHitPointsOverride"`
	CurrentHitPointsOverride int            `json:"currentHitPointsOverride"`
	Initiative               int            `json:"initiative"`
	InitiativeSet            bool           `json:"initiativeSet"`
	SortOrder                int            `json:"sortOrder"`
	Defeated                 bool           `json:"defeated"`
	Conditions               []string       `json:"conditions"`
	DamageDealt              int            `json:"damageDealt"`
	DamageTaken              int            `json:"damageTaken"`
	HealingDone              int            `json:"healingDone"`
	HealingReceived          int            `json:"healingReceived"`
	Kills                    int            `json:"kills"`
	DeathSaveSuccesses       int            `json:"deathSaveSuccesses"`
	DeathSaveFailures        int            `json:"deathSaveFailures"`
	Stable                   bool           `json:"stable"`
	Snapshot                 map[string]any `json:"snapshot"`
}

type CombatLogEvent struct {
	ID             string         `json:"id"`
	EncounterRunID string         `json:"encounterRunId"`
	Sequence       int64          `json:"sequence"`
	EventType      string         `json:"eventType"`
	ActorID        string         `json:"actorId,omitempty"`
	TargetID       string         `json:"targetId,omitempty"`
	Payload        map[string]any `json:"payload"`
	CreatedAt      time.Time      `json:"createdAt"`
}

type Player struct {
	ID                    string         `json:"id"`
	CampaignID            string         `json:"campaignId"`
	CampaignName          string         `json:"campaignName,omitempty"`
	CharacterName         string         `json:"characterName"`
	PlayerName            string         `json:"playerName"`
	AvatarAssetID         string         `json:"avatarAssetId,omitempty"`
	AvatarURL             string         `json:"avatarUrl"`
	ArmorClass            int            `json:"armorClass"`
	MaxHitPoints          int            `json:"maxHitPoints"`
	CurrentHitPoints      int            `json:"currentHitPoints"`
	TemporaryHitPoints    int            `json:"temporaryHitPoints"`
	TemporaryMaxHitPoints int            `json:"temporaryMaxHitPoints"`
	ExperiencePoints      int            `json:"experiencePoints"`
	CharacterSheet        map[string]any `json:"characterSheet"`
	CreatedAt             time.Time      `json:"createdAt"`
	UpdatedAt             time.Time      `json:"updatedAt"`
}

type Creature struct {
	ID              string         `json:"id"`
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
	ImageAssetID    string         `json:"imageAssetId,omitempty"`
	AvatarURL       string         `json:"avatarUrl"`
	StatBlock       map[string]any `json:"statBlock"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
}

type ActionRollPart struct {
	ID                  string `json:"id"`
	SortOrder           int    `json:"sortOrder"`
	RollKind            string `json:"rollKind"`
	DamageType          string `json:"damageType"`
	Magical             bool   `json:"magical"`
	DiceCount           int    `json:"diceCount"`
	DieSize             int    `json:"dieSize"`
	FixedValue          int    `json:"fixedValue"`
	RolledValue         int    `json:"rolledValue,omitempty"`
	CriticalRolledValue int    `json:"criticalRolledValue,omitempty"`
	Total               int    `json:"total,omitempty"`
}

type ActionTemplate struct {
	ID              string           `json:"id"`
	Name            string           `json:"name"`
	Description     string           `json:"description"`
	Recharge        string           `json:"recharge"`
	LimitedUses     int              `json:"limitedUses"`
	LimitType       string           `json:"limitType"`
	Reach           int              `json:"reach"`
	Range           int              `json:"range"`
	AOEType         string           `json:"aoeType"`
	AOESize         int              `json:"aoeSize"`
	ActionType      string           `json:"actionType"`
	AttackModifier  int              `json:"attackModifier"`
	MissEffect      string           `json:"missEffect"`
	HitSpecialEvent string           `json:"hitSpecialEvent"`
	Rolls           []ActionRollPart `json:"rolls"`
	CreatedAt       time.Time        `json:"createdAt"`
	UpdatedAt       time.Time        `json:"updatedAt"`
}

type CreatureAction struct {
	ID               string           `json:"id"`
	CreatureID       string           `json:"creatureId"`
	SourceTemplateID string           `json:"sourceTemplateId,omitempty"`
	SortOrder        int              `json:"sortOrder"`
	Name             string           `json:"name"`
	Description      string           `json:"description"`
	Recharge         string           `json:"recharge"`
	LimitedUses      int              `json:"limitedUses"`
	LimitType        string           `json:"limitType"`
	Reach            int              `json:"reach"`
	Range            int              `json:"range"`
	AOEType          string           `json:"aoeType"`
	AOESize          int              `json:"aoeSize"`
	ActionType       string           `json:"actionType"`
	AttackModifier   int              `json:"attackModifier"`
	MissEffect       string           `json:"missEffect"`
	HitSpecialEvent  string           `json:"hitSpecialEvent"`
	Rolls            []ActionRollPart `json:"rolls"`
	CreatedAt        time.Time        `json:"createdAt"`
	UpdatedAt        time.Time        `json:"updatedAt"`
}

type CreatureSpellcastingProfile struct {
	CreatureID                string          `json:"creatureId"`
	SpellcastingAbility       string          `json:"spellcastingAbility"`
	InnateSpellcastingAbility string          `json:"innateSpellcastingAbility"`
	CasterLevel               int             `json:"casterLevel"`
	SpellSaveDC               int             `json:"spellSaveDC"`
	SpellAttackBonus          int             `json:"spellAttackBonus"`
	Slots                     map[string]any  `json:"slots"`
	Spells                    []CreatureSpell `json:"spells"`
	CreatedAt                 time.Time       `json:"createdAt"`
	UpdatedAt                 time.Time       `json:"updatedAt"`
}

type CreatureSpell struct {
	ID         string `json:"id"`
	CreatureID string `json:"creatureId"`
	SpellID    string `json:"spellId"`
	SpellName  string `json:"spellName,omitempty"`
	SpellLevel int    `json:"spellLevel"`
	Prepared   bool   `json:"prepared"`
	Innate     bool   `json:"innate"`
	SortOrder  int    `json:"sortOrder"`
}

type Spell struct {
	ID            string         `json:"id"`
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
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}
