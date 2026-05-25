package db

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestParseStandardCreaturesIncludesVersionedSources(t *testing.T) {
	creatures, err := parseStandardCreatures()
	if err != nil {
		t.Fatalf("parse standard creatures: %v", err)
	}
	counts := map[string]int{}
	for _, creature := range creatures {
		counts[creature.SourceKey]++
		if creature.SourceKey == "srd-5-2-1" && len(creature.StatBlock) == 0 {
			t.Fatalf("expected SRD 5.2.1 creature %q to include a stat block", creature.Name)
		}
	}
	if counts["srd-2014"] < 300 {
		t.Fatalf("expected SRD 2014 creatures, got %d", counts["srd-2014"])
	}
	if counts["srd-5-2-1"] < 300 {
		t.Fatalf("expected SRD 5.2.1 creatures, got %d", counts["srd-5-2-1"])
	}
}

func TestParseStandardSpellsIncludesVersionedSources(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}
	counts := map[string]int{}
	for _, spell := range spells {
		counts[spell.SourceKey]++
		if spell.SourceKey == "srd-5-2-1" && spell.Level < 0 {
			t.Fatalf("expected SRD 5.2.1 spell %q to include a valid level", spell.Name)
		}
	}
	if counts["srd-2014"] < 300 {
		t.Fatalf("expected SRD 2014 spells, got %d", counts["srd-2014"])
	}
	if counts["srd-5-2-1"] < 300 {
		t.Fatalf("expected SRD 5.2.1 spells, got %d", counts["srd-5-2-1"])
	}
}

func TestParseStandardSpellsInfersCombatAutomation(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}

	burningHands := findStandardSpell(t, spells, "srd-burning-hands")
	if len(burningHands.Actions) != 1 {
		t.Fatalf("expected Burning Hands to include an inferred action, got %d", len(burningHands.Actions))
	}
	if burningHands.Actions[0].ActionType != "save" {
		t.Fatalf("expected Burning Hands to use a saving throw action, got %q", burningHands.Actions[0].ActionType)
	}
	if burningHands.Actions[0].SaveAbility != "dex" {
		t.Fatalf("expected Burning Hands save ability dex, got %q", burningHands.Actions[0].SaveAbility)
	}
	if burningHands.Actions[0].SuccessfulSaveEffect != "half" {
		t.Fatalf("expected Burning Hands half damage on save, got %q", burningHands.Actions[0].SuccessfulSaveEffect)
	}
	if roll := burningHands.Actions[0].Rolls[0]; roll.DiceCount != 3 || roll.DieSize != 6 || roll.ScalingDiceCount != 1 {
		t.Fatalf("expected Burning Hands 3d6 with 1d6 scaling, got %+v", roll)
	}
	burningHands2024 := findStandardSpell(t, spells, "srd-5-2-1-burning-hands")
	if burningHands2024.Actions[0].SaveAbility != "dex" || burningHands2024.Actions[0].SuccessfulSaveEffect != "half" {
		t.Fatalf("expected SRD 5.2.1 Burning Hands to infer dex half-save, got %+v", burningHands2024.Actions[0])
	}

	acidSplash := findStandardSpell(t, spells, "srd-acid-splash")
	if acidSplash.ProjectileScaling == nil || acidSplash.ProjectileScaling.BaseProjectiles != 2 {
		t.Fatalf("expected Acid Splash 2014 to support two nearby targets, got %+v", acidSplash.ProjectileScaling)
	}
	if acidSplash.ProjectileScaling.Description == "" {
		t.Fatalf("expected Acid Splash 2014 targeting constraint description")
	}

	acidSplash2024 := findStandardSpell(t, spells, "srd-5-2-1-acid-splash")
	if acidSplash2024.Actions[0].SaveAbility != "dex" || acidSplash2024.Actions[0].SuccessfulSaveEffect != "none" {
		t.Fatalf("expected SRD 5.2.1 Acid Splash to infer dex save, got %+v", acidSplash2024.Actions[0])
	}
	if acidSplash2024.ProjectileScaling == nil || acidSplash2024.ProjectileScaling.Description == "" {
		t.Fatalf("expected SRD 5.2.1 Acid Splash area targeting description, got %+v", acidSplash2024.ProjectileScaling)
	}

	healingWord := findStandardSpell(t, spells, "srd-healing-word")
	if len(healingWord.Actions) != 1 || len(healingWord.Actions[0].Rolls) != 1 {
		t.Fatalf("expected Healing Word to include a healing roll, got %+v", healingWord.Actions)
	}
	if roll := healingWord.Actions[0].Rolls[0]; roll.RollKind != "healing" || roll.DiceCount != 1 || roll.DieSize != 4 || !roll.AddPrimaryStatModifier {
		t.Fatalf("expected Healing Word 1d4 + spellcasting modifier, got %+v", roll)
	}

	rayOfFrost := findStandardSpell(t, spells, "srd-ray-of-frost")
	assertRayOfFrostSpeedReduction(t, rayOfFrost)
	rayOfFrost2024 := findStandardSpell(t, spells, "srd-5-2-1-ray-of-frost")
	assertRayOfFrostSpeedReduction(t, rayOfFrost2024)

	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-longstrider"), "speed_bonus")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-fly"), "movement_mode")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-shield"), "ac_bonus")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-mage-armor"), "base_ac")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-bless"), "roll_modifier")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-bane"), "roll_modifier")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-protection-from-energy"), "damage_defense")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-chill-touch"), "healing_block")
	assertSpellHasEffectTiming(t, findStandardSpell(t, spells, "srd-chill-touch"), "healing_block", "start_caster_turn_once")
	assertSpellHasEffectTiming(t, findStandardSpell(t, spells, "srd-5-2-1-chill-touch"), "healing_block", "end_caster_turn_once")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-harm"), "max_hp_reduction")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-thunderwave"), "forced_movement")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-5-2-1-hunter-s-mark"), "attack_damage_rider")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-beacon-of-hope"), "healing_maximized")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-5-2-1-power-word-heal"), "heal_to_full")
	assertSpellHasEffectTiming(t, findStandardSpell(t, spells, "srd-regenerate"), "recurring_hp_change", "start_target_turn_each")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-warding-bond"), "damage_transfer")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-haste"), "action_restriction")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-slow"), "saving_throw_repeat")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-freedom-of-movement"), "terrain_effect")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-guiding-bolt"), "advantage_state")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-faerie-fire"), "visibility_effect")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-5-2-1-shining-smite"), "visibility_effect")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-invisibility"), "condition")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-see-invisibility"), "sense_effect")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-darkvision"), "sense_effect")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-sleet-storm"), "area_trigger")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-web"), "terrain_effect")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-spike-growth"), "area_trigger")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-moonbeam"), "area_trigger")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-spirit-guardians"), "area_trigger")
	assertSpellHasEffectTiming(t, findStandardSpell(t, spells, "srd-acid-arrow"), "recurring_hp_change", "end_target_turn_once")
	assertSpellHasEffectTiming(t, findStandardSpell(t, spells, "srd-5-2-1-searing-smite"), "recurring_hp_change", "start_target_turn_each")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-5-2-1-ensnaring-strike"), "condition")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-vampiric-touch"), "linked_healing")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-5-2-1-ray-of-enfeeblement"), "roll_modifier")
	assertSpellHasEffect(t, findStandardSpell(t, spells, "srd-5-2-1-aura-of-life"), "death_protection")

	aid := findStandardSpell(t, spells, "srd-aid")
	if aid.ProjectileScaling == nil || aid.ProjectileScaling.BaseProjectiles != 3 {
		t.Fatalf("expected Aid to target up to three creatures, got %+v", aid.ProjectileScaling)
	}
	if len(aid.Actions[0].Rolls) != 2 {
		t.Fatalf("expected Aid to update max and current HP, got %+v", aid.Actions[0].Rolls)
	}
	if roll := aid.Actions[0].Rolls[0]; roll.RollKind != "max_hp" || roll.FixedValue != 5 || roll.ScalingFromLevel != 2 || roll.ScalingFixedValue != 5 {
		t.Fatalf("expected Aid fixed HP maximum increase with scaling, got %+v", roll)
	}
	if roll := aid.Actions[0].Rolls[1]; roll.RollKind != "healing" || roll.FixedValue != 5 || roll.ScalingFromLevel != 2 || roll.ScalingFixedValue != 5 {
		t.Fatalf("expected Aid fixed current HP increase with scaling, got %+v", roll)
	}

	aid2024 := findStandardSpell(t, spells, "srd-5-2-1-aid")
	if strings.Contains(aid2024.Description, "t aUrgseint") {
		t.Fatalf("expected SRD 5.2.1 Aid description to be cleaned, got %q", aid2024.Description)
	}
	if aid2024.ProjectileScaling == nil || aid2024.ProjectileScaling.BaseProjectiles != 3 {
		t.Fatalf("expected SRD 5.2.1 Aid to target up to three creatures, got %+v", aid2024.ProjectileScaling)
	}
	if len(aid2024.Actions) != 1 || len(aid2024.Actions[0].Rolls) != 2 {
		t.Fatalf("expected SRD 5.2.1 Aid max/current HP effects, got %+v", aid2024.Actions)
	}
	if roll := aid2024.Actions[0].Rolls[0]; roll.ScalingFromLevel != 2 {
		t.Fatalf("expected SRD 5.2.1 Aid to scale above 2nd level, got %+v", roll)
	}

	healingWord2024 := findStandardSpell(t, spells, "srd-5-2-1-healing-word")
	if roll := healingWord2024.Actions[0].Rolls[0]; roll.RollKind != "healing" || roll.DiceCount != 2 || roll.DieSize != 4 || !roll.AddPrimaryStatModifier || roll.ScalingDiceCount != 2 {
		t.Fatalf("expected SRD 5.2.1 Healing Word 2d4 + spellcasting modifier with 2d4 scaling, got %+v", roll)
	}

	heroism2024 := findStandardSpell(t, spells, "srd-5-2-1-heroism")
	if len(heroism2024.Actions) != 1 || len(heroism2024.Actions[0].Rolls) != 2 {
		t.Fatalf("expected SRD 5.2.1 Heroism temp HP and immunity effects, got %+v", heroism2024.Actions)
	}
	if roll := heroism2024.Actions[0].Rolls[0]; roll.RollKind != "temp_hp" || roll.Timing != "start_target_turn_each" || !roll.AddPrimaryStatModifier {
		t.Fatalf("expected SRD 5.2.1 Heroism start-turn temp HP, got %+v", roll)
	}

	elementalism := findStandardSpell(t, spells, "srd-5-2-1-elementalism")
	if elementalism.Duration != "Instantaneous" {
		t.Fatalf("expected SRD 5.2.1 Elementalism duration to be clean, got %q", elementalism.Duration)
	}
	if !strings.Contains(elementalism.Description, "Beckon Air.") || !strings.Contains(elementalism.Description, "Sculpt Element.") {
		t.Fatalf("expected SRD 5.2.1 Elementalism option headings to be readable, got %q", elementalism.Description)
	}
	if len(elementalism.Actions) != 1 || len(elementalism.Actions[0].Rolls) != 1 || elementalism.Actions[0].Rolls[0].RollKind != "custom" {
		t.Fatalf("expected SRD 5.2.1 Elementalism to include a custom utility effect, got %+v", elementalism.Actions)
	}
}

func assertSpellHasEffect(t *testing.T, spell standardSpellSeed, rollKind string) {
	t.Helper()
	for _, action := range spell.Actions {
		for _, roll := range action.Rolls {
			if roll.RollKind == rollKind {
				return
			}
		}
	}
	t.Fatalf("expected %s to include %s effect, got %+v", spell.Slug, rollKind, spell.Actions)
}

func assertSpellHasEffectTiming(t *testing.T, spell standardSpellSeed, rollKind string, timing string) {
	t.Helper()
	for _, action := range spell.Actions {
		for _, roll := range action.Rolls {
			if roll.RollKind == rollKind && roll.Timing == timing {
				return
			}
		}
	}
	t.Fatalf("expected %s to include %s effect with timing %s, got %+v", spell.Slug, rollKind, timing, spell.Actions)
}

func assertRayOfFrostSpeedReduction(t *testing.T, spell standardSpellSeed) {
	t.Helper()
	if len(spell.Actions) != 1 {
		t.Fatalf("expected %s to include one spell action, got %+v", spell.Slug, spell.Actions)
	}
	if spell.Actions[0].ActionType != "spell_attack" {
		t.Fatalf("expected %s to be inferred as a spell attack, got %q", spell.Slug, spell.Actions[0].ActionType)
	}
	var foundDamage bool
	var foundSlow bool
	for _, roll := range spell.Actions[0].Rolls {
		if roll.RollKind == "damage" && roll.DamageType == "cold" && roll.DiceCount == 1 && roll.DieSize == 8 {
			foundDamage = true
		}
		if roll.RollKind == "speed_reduction" && roll.FixedValue == 10 && roll.Timing == "start_caster_turn_once" {
			foundSlow = true
		}
	}
	if !foundDamage || !foundSlow {
		t.Fatalf("expected %s to include cold damage and speed reduction, got %+v", spell.Slug, spell.Actions[0].Rolls)
	}
}

func TestParseStandardSpellsCleansPDFTextArtifacts(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}
	corruptMarkers := []string{
		"Uinsitns",
		"t aUrgseint",
		"PoUinsitns",
		"Hail gtho",
		"brav- ery",
		"Ha iHt",
		"Gsarveae",
		"pUlassinhegs",
		"gtahregre",
		"hBuettcekrosn",
		"oBue",
		"ccakuosne",
		"igBhetc",
		"itShceurl",
		"spCealln",
		"Cflaan",
		"System Reference Document",
	}
	for _, spell := range spells {
		if spell.SourceKey != "srd-5-2-1" {
			continue
		}
		if strings.TrimSpace(spell.Description) == "" {
			t.Fatalf("expected %s to include a readable description", spell.Slug)
		}
		if len(spell.Duration) > 80 {
			t.Fatalf("expected %s duration to contain only duration text, got %q", spell.Slug, spell.Duration)
		}
		mechanics := map[string]any{}
		_ = json.Unmarshal(spell.Mechanics, &mechanics)
		text := spell.Description + "\n" + spell.HigherLevel + "\n" + stringValue(mechanics["rawText"])
		for _, marker := range corruptMarkers {
			if strings.Contains(text, marker) {
				t.Fatalf("expected %s to be free of PDF artifact %q, got %q", spell.Slug, marker, text)
			}
		}
	}
}

func TestStandardSpellEffectAuditCoversDeterministicPhrases(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}
	checks := []struct {
		phrase string
		kind   string
	}{
		{"can't regain hit points", "healing_block"},
		{"can’t regain Hit Points", "healing_block"},
		{"regains the maximum number of hit points", "healing_maximized"},
		{"regains the maximum number of Hit Points", "healing_maximized"},
		{"regains all its Hit Points", "heal_to_full"},
		{"speed increases by 10 feet", "speed_bonus"},
		{"Speed is doubled", "speed_multiplier"},
		{"speed is doubled", "speed_multiplier"},
		{"Speed is halved", "speed_multiplier"},
		{"speed is halved", "speed_multiplier"},
		{"bonus to AC", "ac_bonus"},
		{"bonus to Armor Class", "ac_bonus"},
		{"flying speed of 60 feet", "movement_mode"},
		{"has darkvision out to", "sense_effect"},
		{"willing creature you touch has Darkvision", "sense_effect"},
		{"see invisible creatures", "sense_effect"},
		{"see creatures and objects that have the Invisible condition", "sense_effect"},
		{"2d4 Acid damage at the end of its next turn", "recurring_hp_change"},
		{"regains 1 Hit Point at the start of each of its turns", "recurring_hp_change"},
		{"can't take reactions", "action_restriction"},
		{"can’t take Reactions", "action_restriction"},
	}
	for _, spell := range spells {
		text := spell.Description + "\n" + spell.HigherLevel
		for _, check := range checks {
			if !strings.Contains(text, check.phrase) {
				continue
			}
			if deterministicAuditAllowlist[spell.Slug] {
				continue
			}
			if !spellHasEffect(spell, check.kind) {
				t.Fatalf("expected %s containing %q to infer %s, got %+v", spell.Slug, check.phrase, check.kind, spell.Actions)
			}
		}
	}
}

var deterministicAuditAllowlist = map[string]bool{
	"srd-confusion":            true,
	"srd-5-2-1-confusion":      true,
	"srd-wish":                 true,
	"srd-5-2-1-wish":           true,
	"srd-prismatic-wall":       true,
	"srd-5-2-1-prismatic-wall": true,
}

func findStandardSpell(t *testing.T, spells []standardSpellSeed, slug string) standardSpellSeed {
	t.Helper()
	for _, spell := range spells {
		if spell.Slug == slug {
			return spell
		}
	}
	t.Fatalf("standard spell %q not found", slug)
	return standardSpellSeed{}
}

func spellHasEffect(spell standardSpellSeed, rollKind string) bool {
	for _, action := range spell.Actions {
		for _, roll := range action.Rolls {
			if roll.RollKind == rollKind {
				return true
			}
		}
	}
	return false
}
