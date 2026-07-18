package httpapi

type applyResolutionRequest struct {
	ActorID    string                     `json:"actorId"`
	Kind       string                     `json:"kind"`
	SourceName string                     `json:"sourceName"`
	Notes      string                     `json:"notes"`
	Targets    []resolutionTargetRequest  `json:"targets"`
	Resource   *resolutionResourceRequest `json:"resource"`
}

type resolutionTargetRequest struct {
	TargetID         string                             `json:"targetId"`
	Outcome          string                             `json:"outcome"`
	SaveAbility      string                             `json:"saveAbility"`
	DC               int                                `json:"dc"`
	RollMode         string                             `json:"rollMode"`
	RollSource       string                             `json:"rollSource"`
	D20Rolls         []int                              `json:"d20Rolls"`
	RollTotal        int                                `json:"rollTotal"`
	DamageMultiplier float64                            `json:"damageMultiplier"`
	DamageComponents []resolutionDamageComponentRequest `json:"damageComponents"`
	Healing          int                                `json:"healing"`
	TemporaryHP      *int                               `json:"temporaryHitPoints"`
	TemporaryHPMode  string                             `json:"temporaryHitPointsMode"`
	DirectHP         *int                               `json:"directHitPoints"`
	Conditions       []resolutionConditionRequest       `json:"conditions"`
}

type resolutionDamageComponentRequest struct {
	ID                  string `json:"id"`
	Source              string `json:"source"`
	Formula             string `json:"formula"`
	Amount              int    `json:"amount"`
	DamageType          string `json:"damageType"`
	RolledValue         int    `json:"rolledValue"`
	CriticalRolledValue int    `json:"criticalRolledValue"`
	Modifier            int    `json:"modifier"`
	CriticalBehavior    string `json:"criticalBehavior"`
	Mitigation          string `json:"mitigation"`
	ManualOverride      bool   `json:"manualOverride"`
}

type resolutionConditionRequest struct {
	Name        string `json:"name"`
	Duration    string `json:"duration"`
	Expiry      string `json:"expiry"`
	SaveAbility string `json:"saveAbility"`
	SaveDC      int    `json:"saveDC"`
	Note        string `json:"note"`
}

type resolutionResourceRequest struct {
	Kind       string `json:"kind"`
	SpellLevel int    `json:"spellLevel"`
}
