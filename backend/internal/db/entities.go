package db

import (
	"time"

	"github.com/lib/pq"
)

type UserEntity struct {
	ID            string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email         string `gorm:"not null;unique"`
	PasswordHash  string
	AvatarAssetID *string `gorm:"type:uuid"`
	AvatarURL     string  `gorm:"not null;default:''"`
	CreatedAt     time.Time
}

func (UserEntity) TableName() string { return "users" }

type AuthIdentityEntity struct {
	ID              string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID          string `gorm:"type:uuid;not null;index;uniqueIndex:auth_identity_provider_subject"`
	Provider        string `gorm:"not null;uniqueIndex:auth_identity_provider_subject"`
	ProviderSubject string `gorm:"not null;uniqueIndex:auth_identity_provider_subject"`
	Email           string `gorm:"not null;default:''"`
	EmailVerified   bool   `gorm:"not null;default:false"`
	CreatedAt       time.Time
	LastLoginAt     time.Time
}

func (AuthIdentityEntity) TableName() string { return "auth_identities" }

type OAuthStateEntity struct {
	ID           string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	StateHash    string  `gorm:"not null;unique"`
	Provider     string  `gorm:"not null"`
	Nonce        string  `gorm:"not null"`
	PKCEVerifier string  `gorm:"column:pkce_verifier;not null"`
	Purpose      string  `gorm:"not null;default:'login'"`
	UserID       *string `gorm:"type:uuid;index"`
	ReturnTo     string  `gorm:"not null;default:'/'"`
	ExpiresAt    time.Time
	CreatedAt    time.Time
}

func (OAuthStateEntity) TableName() string { return "oauth_states" }

type SessionEntity struct {
	ID        string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    string `gorm:"type:uuid;not null;index"`
	TokenHash string `gorm:"not null;unique"`
	ExpiresAt time.Time
	CreatedAt time.Time
}

func (SessionEntity) TableName() string { return "sessions" }

type CampaignEntity struct {
	ID                     string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OwnerUserID            string         `gorm:"type:uuid;not null;index:campaigns_owner_user_id_idx,sort:desc"`
	Name                   string         `gorm:"not null"`
	Description            string         `gorm:"not null;default:''"`
	AllowedStandardSources pq.StringArray `gorm:"type:text[];not null;default:array['srd-2014']::text[]"`
	EncounterRuleset       string         `gorm:"not null;default:''"`
	Metadata               JSONMap        `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	ArchivedAt             *time.Time
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

func (CampaignEntity) TableName() string { return "campaigns" }

type UploadedAssetEntity struct {
	ID          string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OwnerUserID string  `gorm:"type:uuid;not null;index:uploaded_assets_owner_user_id_idx,sort:desc"`
	Filename    string  `gorm:"not null"`
	ContentType string  `gorm:"not null"`
	ByteSize    int64   `gorm:"not null"`
	Data        []byte  `gorm:"not null"`
	Metadata    JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt   time.Time
}

func (UploadedAssetEntity) TableName() string { return "uploaded_assets" }

type CreatureEntity struct {
	ID              string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OwnerUserID     string  `gorm:"type:uuid;not null;index:creatures_owner_user_id_idx,sort:desc"`
	Name            string  `gorm:"not null"`
	Description     string  `gorm:"not null;default:''"`
	Size            string  `gorm:"not null;default:''"`
	CreatureType    string  `gorm:"not null;default:''"`
	Alignment       string  `gorm:"not null;default:''"`
	ArmorClass      int     `gorm:"not null;default:10"`
	HitPoints       int     `gorm:"not null;default:1"`
	HitDice         string  `gorm:"not null;default:''"`
	ChallengeRating string  `gorm:"not null;default:''"`
	XP              int     `gorm:"not null;default:0"`
	ImageAssetID    *string `gorm:"type:uuid"`
	AvatarURL       string  `gorm:"not null;default:''"`
	StatBlock       JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (CreatureEntity) TableName() string { return "creatures" }

type SpellEntity struct {
	ID                 string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OwnerUserID        string         `gorm:"type:uuid;not null;index:spells_owner_user_id_idx,priority:1"`
	Name               string         `gorm:"not null;index:spells_owner_user_id_idx,priority:3"`
	Level              int            `gorm:"not null;default:0;index:spells_owner_user_id_idx,priority:2"`
	School             string         `gorm:"not null;default:''"`
	CastingTime        string         `gorm:"not null;default:''"`
	CastType           string         `gorm:"not null;default:''"`
	SpellRange         string         `gorm:"not null;default:''"`
	RangeType          string         `gorm:"not null;default:''"`
	RangeFeet          int            `gorm:"not null;default:0"`
	Components         JSONMap        `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	MaterialComponents string         `gorm:"not null;default:''"`
	Classes            pq.StringArray `gorm:"type:text[];not null;default:'{}'::text[]"`
	Duration           string         `gorm:"not null;default:''"`
	DurationType       string         `gorm:"not null;default:''"`
	DurationValue      int            `gorm:"not null;default:0"`
	DurationScale      string         `gorm:"not null;default:''"`
	AOEType            string         `gorm:"column:aoe_type;not null;default:''"`
	AOESize            int            `gorm:"column:aoe_size;not null;default:0"`
	Ritual             bool           `gorm:"not null;default:false"`
	Concentration      bool           `gorm:"not null;default:false"`
	ScalingType        string         `gorm:"not null;default:'none'"`
	Description        string         `gorm:"not null;default:''"`
	HigherLevel        string         `gorm:"not null;default:''"`
	SourceNote         string         `gorm:"not null;default:''"`
	SourceMaterial     string         `gorm:"not null;default:''"`
	Mechanics          JSONMap        `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

func (SpellEntity) TableName() string { return "spells" }

type SpellProjectileScalingEntity struct {
	SpellID               string  `gorm:"type:uuid;primaryKey"`
	BaseProjectiles       int     `gorm:"not null;default:1"`
	ScalingType           string  `gorm:"not null;default:'none'"`
	ScaleFromLevel        int     `gorm:"not null;default:0"`
	AdditionalProjectiles int     `gorm:"not null;default:0"`
	StepSize              int     `gorm:"not null;default:1"`
	Description           string  `gorm:"not null;default:''"`
	CantripScaling        JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
}

func (SpellProjectileScalingEntity) TableName() string { return "spell_projectile_scaling" }

type SpellActionEntity struct {
	ID                    string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SpellID               string         `gorm:"type:uuid;not null;index"`
	Name                  string         `gorm:"not null;default:''"`
	SortOrder             int            `gorm:"not null;default:0"`
	ActionType            string         `gorm:"not null;default:'damage'"`
	SaveAbility           string         `gorm:"not null;default:''"`
	SuccessfulSaveEffect  string         `gorm:"not null;default:'none'"`
	AttackModifier        int            `gorm:"not null;default:0"`
	HitSpecialEvent       string         `gorm:"not null;default:'none'"`
	WeaponSource          string         `gorm:"not null;default:''"`
	AttackAbilityOverride string         `gorm:"not null;default:''"`
	DamageAbilityOverride string         `gorm:"not null;default:''"`
	DamageTypeChoice      string         `gorm:"not null;default:''"`
	DamageTypeOptions     pq.StringArray `gorm:"type:text[];not null;default:'{}'::text[]"`
}

func (SpellActionEntity) TableName() string { return "spell_actions" }

type SpellActionRollPartEntity struct {
	ID                     string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SpellActionID          string  `gorm:"type:uuid;not null;index"`
	SortOrder              int     `gorm:"not null;default:0"`
	RollKind               string  `gorm:"not null;default:'damage'"`
	DamageType             string  `gorm:"not null;default:''"`
	Magical                bool    `gorm:"not null;default:false"`
	DiceCount              int     `gorm:"not null;default:1"`
	DieSize                int     `gorm:"not null;default:6"`
	FixedValue             int     `gorm:"not null;default:0"`
	AddPrimaryStatModifier bool    `gorm:"not null;default:false"`
	ConditionName          string  `gorm:"not null;default:''"`
	EffectConfig           JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	Timing                 string  `gorm:"not null;default:'immediate'"`
	ScalingType            string  `gorm:"not null;default:'none'"`
	ScalingFromLevel       int     `gorm:"not null;default:0"`
	ScalingDiceCount       int     `gorm:"not null;default:0"`
	ScalingDieSize         int     `gorm:"not null;default:6"`
	ScalingFixedValue      int     `gorm:"not null;default:0"`
	ScalingStepSize        int     `gorm:"not null;default:1"`
	CantripScaling         JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
}

func (SpellActionRollPartEntity) TableName() string { return "spell_action_roll_parts" }

type ActionTemplateEntity struct {
	ID              string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OwnerUserID     string  `gorm:"type:uuid;not null;index:action_templates_owner_user_id_idx,priority:1"`
	Name            string  `gorm:"not null;index:action_templates_owner_user_id_idx,priority:2"`
	Description     string  `gorm:"not null;default:''"`
	Recharge        string  `gorm:"not null;default:''"`
	LimitedUses     int     `gorm:"not null;default:0"`
	LimitType       string  `gorm:"not null;default:'day'"`
	Reach           int     `gorm:"not null;default:0"`
	ActionRange     int     `gorm:"not null;default:0"`
	AOEType         string  `gorm:"column:aoe_type;not null;default:''"`
	AOESize         int     `gorm:"column:aoe_size;not null;default:0"`
	ActionType      string  `gorm:"not null;default:'melee_weapon'"`
	DisplaySection  string  `gorm:"not null;default:'action'"`
	AttackModifier  int     `gorm:"not null;default:0"`
	MissEffect      string  `gorm:"not null;default:'none'"`
	HitSpecialEvent string  `gorm:"not null;default:'none'"`
	IconSource      string  `gorm:"not null;default:'none'"`
	IconKey         string  `gorm:"not null;default:''"`
	IconAssetID     *string `gorm:"type:uuid"`
	IconURL         string  `gorm:"not null;default:''"`
	IconAttribution string  `gorm:"not null;default:''"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (ActionTemplateEntity) TableName() string { return "action_templates" }

type ActionTemplateRollPartEntity struct {
	ID               string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ActionTemplateID string `gorm:"type:uuid;not null;index:action_template_roll_parts_template_idx,priority:1"`
	SortOrder        int    `gorm:"not null;default:0;index:action_template_roll_parts_template_idx,priority:2"`
	RollKind         string `gorm:"not null;default:'damage'"`
	DamageType       string `gorm:"not null;default:''"`
	Magical          bool   `gorm:"not null;default:false"`
	DiceCount        int    `gorm:"not null;default:1"`
	DieSize          int    `gorm:"not null;default:6"`
	FixedValue       int    `gorm:"not null;default:0"`
}

func (ActionTemplateRollPartEntity) TableName() string { return "action_template_roll_parts" }

type CreatureActionEntity struct {
	ID               string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CreatureID       string  `gorm:"type:uuid;not null;index:creature_actions_creature_idx,priority:1"`
	SourceTemplateID *string `gorm:"type:uuid"`
	SortOrder        int     `gorm:"not null;default:0;index:creature_actions_creature_idx,priority:2"`
	Name             string  `gorm:"not null"`
	Description      string  `gorm:"not null;default:''"`
	Recharge         string  `gorm:"not null;default:''"`
	LimitedUses      int     `gorm:"not null;default:0"`
	LimitType        string  `gorm:"not null;default:'day'"`
	Reach            int     `gorm:"not null;default:0"`
	ActionRange      int     `gorm:"not null;default:0"`
	AOEType          string  `gorm:"column:aoe_type;not null;default:''"`
	AOESize          int     `gorm:"column:aoe_size;not null;default:0"`
	ActionType       string  `gorm:"not null;default:'melee_weapon'"`
	DisplaySection   string  `gorm:"not null;default:'action'"`
	AttackModifier   int     `gorm:"not null;default:0"`
	MissEffect       string  `gorm:"not null;default:'none'"`
	HitSpecialEvent  string  `gorm:"not null;default:'none'"`
	IconSource       string  `gorm:"not null;default:'none'"`
	IconKey          string  `gorm:"not null;default:''"`
	IconAssetID      *string `gorm:"type:uuid"`
	IconURL          string  `gorm:"not null;default:''"`
	IconAttribution  string  `gorm:"not null;default:''"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

func (CreatureActionEntity) TableName() string { return "creature_actions" }

type CreatureActionRollPartEntity struct {
	ID               string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CreatureActionID string `gorm:"type:uuid;not null;index:creature_action_roll_parts_action_idx,priority:1"`
	SortOrder        int    `gorm:"not null;default:0;index:creature_action_roll_parts_action_idx,priority:2"`
	RollKind         string `gorm:"not null;default:'damage'"`
	DamageType       string `gorm:"not null;default:''"`
	Magical          bool   `gorm:"not null;default:false"`
	DiceCount        int    `gorm:"not null;default:1"`
	DieSize          int    `gorm:"not null;default:6"`
	FixedValue       int    `gorm:"not null;default:0"`
}

func (CreatureActionRollPartEntity) TableName() string { return "creature_action_roll_parts" }

type CreatureSpellcastingProfileEntity struct {
	CreatureID                string  `gorm:"type:uuid;primaryKey"`
	SpellcastingAbility       string  `gorm:"not null;default:''"`
	InnateSpellcastingAbility string  `gorm:"not null;default:''"`
	CasterLevel               int     `gorm:"not null;default:0"`
	SpellSaveDC               int     `gorm:"column:spell_save_dc;not null;default:0"`
	SpellAttackBonus          int     `gorm:"not null;default:0"`
	Slots                     JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
}

func (CreatureSpellcastingProfileEntity) TableName() string { return "creature_spellcasting_profiles" }

type CreatureSpellEntity struct {
	ID              string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CreatureID      string  `gorm:"type:uuid;not null;index:creature_spells_creature_level_idx,priority:1"`
	SpellID         *string `gorm:"type:uuid"`
	StandardSpellID *string `gorm:"type:uuid"`
	LibrarySource   string  `gorm:"not null;default:'user'"`
	SpellLevel      int     `gorm:"not null;default:0;index:creature_spells_creature_level_idx,priority:2"`
	Prepared        bool    `gorm:"not null;default:true"`
	Innate          bool    `gorm:"not null;default:false"`
	SortOrder       int     `gorm:"not null;default:0;index:creature_spells_creature_level_idx,priority:3"`
}

func (CreatureSpellEntity) TableName() string { return "creature_spells" }

type PlayerEntity struct {
	ID                    string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OwnerUserID           string  `gorm:"type:uuid;not null;index:players_owner_user_id_idx,sort:desc"`
	CampaignID            *string `gorm:"type:uuid;index"`
	CharacterName         string  `gorm:"not null"`
	PlayerName            string  `gorm:"not null;default:''"`
	ArmorClass            int     `gorm:"not null;default:10"`
	MaxHitPoints          int     `gorm:"not null;default:1"`
	CurrentHitPoints      int     `gorm:"not null;default:1"`
	TemporaryHitPoints    int     `gorm:"not null;default:0"`
	TemporaryMaxHitPoints int     `gorm:"not null;default:0"`
	ExperiencePoints      int     `gorm:"not null;default:0"`
	CharacterSheet        JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	ImageAssetID          *string `gorm:"type:uuid"`
	AvatarURL             string  `gorm:"not null;default:''"`
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

func (PlayerEntity) TableName() string { return "players" }

type CampaignCreatureEntity struct {
	CampaignID  string `gorm:"type:uuid;primaryKey"`
	CreatureID  string `gorm:"type:uuid;primaryKey;index:campaign_creatures_creature_id_idx"`
	Disposition string `gorm:"not null;default:'neutral'"`
	CreatedAt   time.Time
}

func (CampaignCreatureEntity) TableName() string { return "campaign_creatures" }

type EncounterEntity struct {
	ID                string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CampaignID        string  `gorm:"type:uuid;not null;index"`
	Name              string  `gorm:"not null"`
	Description       string  `gorm:"not null;default:''"`
	Status            string  `gorm:"not null;default:'planned'"`
	Location          string  `gorm:"not null;default:''"`
	LocationID        *string `gorm:"type:uuid;index"`
	RoomNumber        string  `gorm:"not null;default:''"`
	LootNotes         string  `gorm:"not null;default:''"`
	DifficultyRuleset string  `gorm:"not null;default:'dnd-5e-2014-xp-v1'"`
	BackgroundAssetID *string `gorm:"type:uuid"`
	Metadata          JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	Revision          int     `gorm:"not null;default:1"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

func (EncounterEntity) TableName() string { return "encounters" }

type EncounterCombatantEntity struct {
	ID               string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EncounterID      string  `gorm:"type:uuid;not null;index:encounter_combatants_encounter_side_idx,priority:1"`
	SourceType       string  `gorm:"not null"`
	PlayerID         *string `gorm:"type:uuid"`
	CreatureID       *string `gorm:"type:uuid"`
	Side             string  `gorm:"not null;default:'enemy';index:encounter_combatants_encounter_side_idx,priority:2"`
	DisplayName      string  `gorm:"not null"`
	ColorLabel       string  `gorm:"not null;default:'slate'"`
	AvatarURL        string  `gorm:"not null;default:''"`
	ArmorClass       int     `gorm:"not null;default:10"`
	MaxHitPoints     int     `gorm:"not null;default:1"`
	CurrentHitPoints int     `gorm:"not null;default:1"`
	RolledHP         bool    `gorm:"column:rolled_hp;not null;default:false"`
	SortOrder        int     `gorm:"not null;default:0;index:encounter_combatants_encounter_side_idx,priority:3"`
	Snapshot         JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

func (EncounterCombatantEntity) TableName() string { return "encounter_combatants" }

type EncounterRunEntity struct {
	ID               string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EncounterID      string `gorm:"type:uuid;not null;index"`
	Status           string `gorm:"not null;default:'setup'"`
	IsTest           bool   `gorm:"not null;default:false"`
	CurrentRound     int    `gorm:"not null;default:0"`
	CurrentTurnIndex int    `gorm:"not null;default:0"`
	StartedAt        time.Time
	EndedAt          *time.Time
	Summary          JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
}

func (EncounterRunEntity) TableName() string { return "encounter_runs" }

type EncounterRunCombatantEntity struct {
	ID                       string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EncounterRunID           string  `gorm:"type:uuid;not null;index:encounter_run_combatants_run_idx,priority:1"`
	SourceCombatantID        *string `gorm:"type:uuid"`
	SourceType               string  `gorm:"not null;default:'creature'"`
	PlayerID                 *string `gorm:"type:uuid"`
	CreatureID               *string `gorm:"type:uuid"`
	Side                     string  `gorm:"not null;default:'enemy'"`
	DisplayName              string  `gorm:"not null"`
	ColorLabel               string  `gorm:"not null;default:'slate'"`
	AvatarURL                string  `gorm:"not null;default:''"`
	ArmorClass               int     `gorm:"not null;default:10"`
	MaxHitPoints             int     `gorm:"not null;default:1"`
	CurrentHitPoints         int     `gorm:"not null;default:1"`
	TemporaryHitPoints       int     `gorm:"not null;default:0"`
	MaxHitPointsModifier     int     `gorm:"not null;default:0"`
	ArmorClassBonus          int     `gorm:"not null;default:0"`
	ArmorClassOverride       int     `gorm:"not null;default:0"`
	MaxHitPointsOverride     int     `gorm:"not null;default:0"`
	CurrentHitPointsOverride int     `gorm:"not null;default:0"`
	Initiative               *int
	InitiativeSet            bool      `gorm:"not null;default:false"`
	SortOrder                int       `gorm:"not null;default:0;index:encounter_run_combatants_run_idx,priority:2"`
	Defeated                 bool      `gorm:"not null;default:false"`
	Conditions               JSONBytes `gorm:"type:jsonb;not null;default:'[]'::jsonb"`
	DamageDealt              int       `gorm:"not null;default:0"`
	DamageTaken              int       `gorm:"not null;default:0"`
	HealingDone              int       `gorm:"not null;default:0"`
	HealingReceived          int       `gorm:"not null;default:0"`
	Kills                    int       `gorm:"not null;default:0"`
	DeathSaveSuccesses       int       `gorm:"not null;default:0"`
	DeathSaveFailures        int       `gorm:"not null;default:0"`
	Stable                   bool      `gorm:"not null;default:false"`
	Snapshot                 JSONMap   `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
}

func (EncounterRunCombatantEntity) TableName() string { return "encounter_run_combatants" }

type EncounterRunSpellSlotEntity struct {
	ID             string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EncounterRunID string `gorm:"type:uuid;not null;index"`
	CombatantID    string `gorm:"type:uuid;not null;uniqueIndex:encounter_run_spell_slots_combatant_level"`
	SpellLevel     int    `gorm:"not null;uniqueIndex:encounter_run_spell_slots_combatant_level"`
	MaxSlots       int    `gorm:"not null;default:0"`
	RemainingSlots int    `gorm:"not null;default:0"`
}

func (EncounterRunSpellSlotEntity) TableName() string { return "encounter_run_spell_slots" }

type EncounterRunActiveEffectEntity struct {
	ID             string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EncounterRunID string  `gorm:"type:uuid;not null;index"`
	CasterID       string  `gorm:"type:uuid;not null"`
	TargetID       string  `gorm:"type:uuid;not null"`
	SpellID        *string `gorm:"type:uuid"`
	LibrarySource  string  `gorm:"not null;default:'user'"`
	SpellName      string  `gorm:"not null;default:''"`
	CastLevel      int     `gorm:"not null;default:0"`
	Concentration  bool    `gorm:"not null;default:false"`
	Timing         string  `gorm:"not null;default:'immediate'"`
	EffectKind     string  `gorm:"not null;default:''"`
	ConditionName  string  `gorm:"not null;default:''"`
	Amount         int     `gorm:"not null;default:0"`
	Payload        JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	Active         bool    `gorm:"not null;default:true"`
	CreatedAt      time.Time
}

func (EncounterRunActiveEffectEntity) TableName() string { return "encounter_run_active_effects" }

type EncounterRunAlertEntity struct {
	ID             string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EncounterRunID string  `gorm:"type:uuid;not null;index"`
	AlertType      string  `gorm:"not null"`
	ActorID        *string `gorm:"type:uuid"`
	TargetID       *string `gorm:"type:uuid"`
	Title          string  `gorm:"not null;default:''"`
	Message        string  `gorm:"not null;default:''"`
	DC             int     `gorm:"column:dc;not null;default:0"`
	Payload        JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	Resolved       bool    `gorm:"not null;default:false"`
	CreatedAt      time.Time
}

func (EncounterRunAlertEntity) TableName() string { return "encounter_run_alerts" }

type CombatLogEventEntity struct {
	ID             string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EncounterRunID string  `gorm:"type:uuid;not null;index:combat_log_events_run_sequence_idx,priority:1"`
	Sequence       int64   `gorm:"not null;autoIncrement;index:combat_log_events_run_sequence_idx,priority:2"`
	EventType      string  `gorm:"not null"`
	ActorID        *string `gorm:"type:uuid"`
	TargetID       *string `gorm:"type:uuid"`
	Payload        JSONMap `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt      time.Time
}

func (CombatLogEventEntity) TableName() string { return "combat_log_events" }
