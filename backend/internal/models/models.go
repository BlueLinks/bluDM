package models

import "time"

type User struct {
	ID            string    `json:"id"`
	Email         string    `json:"email"`
	PasswordHash  string    `json:"-"`
	AvatarAssetID string    `json:"avatarAssetId,omitempty"`
	AvatarURL     string    `json:"avatarUrl"`
	CreatedAt     time.Time `json:"createdAt"`
}

type Session struct {
	ID        string
	UserID    string
	ExpiresAt time.Time
}

type Campaign struct {
	ID                     string    `json:"id"`
	Name                   string    `json:"name"`
	Description            string    `json:"description"`
	AllowedStandardSources []string  `json:"allowedStandardSources"`
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}

type TravelWeather struct {
	Temperature       string              `json:"temperature"`
	TemperatureDeltaF *int                `json:"temperatureDeltaF"`
	Wind              string              `json:"wind"`
	Precipitation     string              `json:"precipitation"`
	Rolls             *TravelWeatherRolls `json:"rolls,omitempty"`
}

type TravelWeatherRolls struct {
	TemperatureD20   *int `json:"temperatureD20,omitempty"`
	TemperatureD4    *int `json:"temperatureD4,omitempty"`
	WindD20          *int `json:"windD20,omitempty"`
	PrecipitationD20 *int `json:"precipitationD20,omitempty"`
}

type CampaignLocation struct {
	ID         string    `json:"id"`
	CampaignID string    `json:"campaignId"`
	Name       string    `json:"name"`
	Notes      string    `json:"notes"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
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
	SpellSlots       []EncounterRunSpellSlot `json:"spellSlots,omitempty"`
	ActiveEffects    []EncounterRunEffect    `json:"activeEffects,omitempty"`
	Alerts           []EncounterRunAlert     `json:"alerts,omitempty"`
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

type EncounterRunSpellSlot struct {
	ID             string `json:"id"`
	EncounterRunID string `json:"encounterRunId"`
	CombatantID    string `json:"combatantId"`
	SpellLevel     int    `json:"spellLevel"`
	MaxSlots       int    `json:"maxSlots"`
	RemainingSlots int    `json:"remainingSlots"`
}

type EncounterRunEffect struct {
	ID             string         `json:"id"`
	EncounterRunID string         `json:"encounterRunId"`
	CasterID       string         `json:"casterId"`
	TargetID       string         `json:"targetId"`
	SpellID        string         `json:"spellId,omitempty"`
	LibrarySource  string         `json:"librarySource"`
	SpellName      string         `json:"spellName"`
	CastLevel      int            `json:"castLevel"`
	Concentration  bool           `json:"concentration"`
	Timing         string         `json:"timing"`
	EffectKind     string         `json:"effectKind"`
	ConditionName  string         `json:"conditionName"`
	Amount         int            `json:"amount"`
	Payload        map[string]any `json:"payload"`
	Active         bool           `json:"active"`
	CreatedAt      time.Time      `json:"createdAt"`
}

type EncounterRunAlert struct {
	ID             string         `json:"id"`
	EncounterRunID string         `json:"encounterRunId"`
	AlertType      string         `json:"alertType"`
	ActorID        string         `json:"actorId,omitempty"`
	TargetID       string         `json:"targetId,omitempty"`
	Title          string         `json:"title"`
	Message        string         `json:"message"`
	DC             int            `json:"dc"`
	Payload        map[string]any `json:"payload"`
	Resolved       bool           `json:"resolved"`
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
	LibrarySource   string         `json:"librarySource"`
	ReadOnly        bool           `json:"readOnly"`
	SourceKey       string         `json:"sourceKey"`
	SourceLabel     string         `json:"sourceLabel"`
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
	IconSource      string           `json:"iconSource"`
	IconKey         string           `json:"iconKey"`
	IconAssetID     string           `json:"iconAssetId,omitempty"`
	IconURL         string           `json:"iconUrl"`
	IconAttribution string           `json:"iconAttribution"`
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
	IconSource       string           `json:"iconSource"`
	IconKey          string           `json:"iconKey"`
	IconAssetID      string           `json:"iconAssetId,omitempty"`
	IconURL          string           `json:"iconUrl"`
	IconAttribution  string           `json:"iconAttribution"`
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
	ID            string `json:"id"`
	CreatureID    string `json:"creatureId"`
	SpellID       string `json:"spellId"`
	SpellName     string `json:"spellName,omitempty"`
	LibrarySource string `json:"librarySource"`
	SourceKey     string `json:"sourceKey"`
	SourceLabel   string `json:"sourceLabel"`
	SpellLevel    int    `json:"spellLevel"`
	Prepared      bool   `json:"prepared"`
	Innate        bool   `json:"innate"`
	SortOrder     int    `json:"sortOrder"`
}

type Spell struct {
	ID                string                  `json:"id"`
	Name              string                  `json:"name"`
	Level             int                     `json:"level"`
	School            string                  `json:"school"`
	CastingTime       string                  `json:"castingTime"`
	CastType          string                  `json:"castType"`
	Range             string                  `json:"range"`
	RangeType         string                  `json:"rangeType"`
	RangeFeet         int                     `json:"rangeFeet"`
	Components        map[string]any          `json:"components"`
	Material          string                  `json:"materialComponents"`
	Classes           []string                `json:"classes"`
	Duration          string                  `json:"duration"`
	DurationType      string                  `json:"durationType"`
	DurationValue     int                     `json:"durationValue"`
	DurationScale     string                  `json:"durationScale"`
	AOEType           string                  `json:"aoeType"`
	AOESize           int                     `json:"aoeSize"`
	Ritual            bool                    `json:"ritual"`
	Concentration     bool                    `json:"concentration"`
	ScalingType       string                  `json:"scalingType"`
	Description       string                  `json:"description"`
	HigherLevel       string                  `json:"higherLevel"`
	SourceNote        string                  `json:"sourceNote"`
	SourceMaterial    string                  `json:"sourceMaterial"`
	LibrarySource     string                  `json:"librarySource"`
	ReadOnly          bool                    `json:"readOnly"`
	SourceKey         string                  `json:"sourceKey"`
	SourceLabel       string                  `json:"sourceLabel"`
	Mechanics         map[string]any          `json:"mechanics"`
	ProjectileScaling *SpellProjectileScaling `json:"projectileScaling,omitempty"`
	Actions           []SpellAction           `json:"actions"`
	CreatedAt         time.Time               `json:"createdAt"`
	UpdatedAt         time.Time               `json:"updatedAt"`
}

type SpellProjectileScaling struct {
	BaseProjectiles       int            `json:"baseProjectiles"`
	ScalingType           string         `json:"scalingType"`
	ScaleFromLevel        int            `json:"scaleFromLevel"`
	AdditionalProjectiles int            `json:"additionalProjectiles"`
	StepSize              int            `json:"stepSize"`
	Description           string         `json:"description"`
	CantripScaling        map[string]any `json:"cantripScaling,omitempty"`
}

type SpellAction struct {
	ID                    string                `json:"id"`
	Name                  string                `json:"name"`
	SortOrder             int                   `json:"sortOrder"`
	ActionType            string                `json:"actionType"`
	SaveAbility           string                `json:"saveAbility"`
	SuccessfulSaveEffect  string                `json:"successfulSaveEffect"`
	AttackModifier        int                   `json:"attackModifier"`
	HitSpecialEvent       string                `json:"hitSpecialEvent"`
	WeaponSource          string                `json:"weaponSource"`
	AttackAbilityOverride string                `json:"attackAbilityOverride"`
	DamageAbilityOverride string                `json:"damageAbilityOverride"`
	DamageTypeChoice      string                `json:"damageTypeChoice"`
	DamageTypeOptions     []string              `json:"damageTypeOptions"`
	Rolls                 []SpellActionRollPart `json:"rolls"`
}

type SpellActionRollPart struct {
	ID                     string         `json:"id"`
	SortOrder              int            `json:"sortOrder"`
	RollKind               string         `json:"rollKind"`
	DamageType             string         `json:"damageType"`
	Magical                bool           `json:"magical"`
	DiceCount              int            `json:"diceCount"`
	DieSize                int            `json:"dieSize"`
	FixedValue             int            `json:"fixedValue"`
	AddPrimaryStatModifier bool           `json:"addPrimaryStatModifier"`
	ConditionName          string         `json:"conditionName"`
	EffectConfig           map[string]any `json:"effectConfig,omitempty"`
	Timing                 string         `json:"timing"`
	ScalingType            string         `json:"scalingType"`
	ScalingFromLevel       int            `json:"scalingFromLevel"`
	ScalingDiceCount       int            `json:"scalingDiceCount"`
	ScalingDieSize         int            `json:"scalingDieSize"`
	ScalingFixedValue      int            `json:"scalingFixedValue"`
	ScalingStepSize        int            `json:"scalingStepSize"`
	CantripScaling         map[string]any `json:"cantripScaling,omitempty"`
}

type Item struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	Category      string         `json:"category"`
	ItemType      string         `json:"itemType"`
	Rarity        string         `json:"rarity"`
	Attunement    bool           `json:"attunement"`
	ValueAmount   int            `json:"valueAmount"`
	ValueUnit     string         `json:"valueUnit"`
	Weight        float64        `json:"weight"`
	Description   string         `json:"description"`
	Properties    []string       `json:"properties"`
	Damage        map[string]any `json:"damage"`
	ArmorClass    map[string]any `json:"armorClass"`
	Data          map[string]any `json:"data"`
	LibrarySource string         `json:"librarySource"`
	ReadOnly      bool           `json:"readOnly"`
	SourceKey     string         `json:"sourceKey"`
	SourceLabel   string         `json:"sourceLabel"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}

type StandardSource struct {
	Key         string    `json:"key"`
	Label       string    `json:"label"`
	Ruleset     string    `json:"ruleset"`
	LicenseName string    `json:"licenseName"`
	SourceURL   string    `json:"sourceUrl"`
	Attribution string    `json:"attribution"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type StandardLibraryEntry struct {
	ID          string         `json:"id"`
	SourceKey   string         `json:"sourceKey"`
	SourceLabel string         `json:"sourceLabel"`
	Category    string         `json:"category"`
	Slug        string         `json:"slug"`
	Name        string         `json:"name"`
	Summary     string         `json:"summary"`
	Description string         `json:"description"`
	ReadOnly    bool           `json:"readOnly"`
	Data        map[string]any `json:"data"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}
