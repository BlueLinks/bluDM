package httpapi

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"bludm/backend/internal/markdownencounter"
	"bludm/backend/internal/models"
)

var markdownIDCharacters = regexp.MustCompile(`[^a-z0-9._-]+`)

func (s *Server) exportEncounterMarkdown(w http.ResponseWriter, r *http.Request) {
	encounterID := strings.TrimSpace(r.PathValue("encounterID"))
	encounter, err := s.stores.Encounters.ByID(
		r.Context(),
		currentUserIDMust(r.Context()),
		encounterID,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "encounter not found")
		return
	}
	combatants, err := s.stores.Encounters.Combatants(
		r.Context(),
		currentUserIDMust(r.Context()),
		encounterID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load encounter combatants")
		return
	}
	blockID, _, err := s.stores.Encounters.MarkdownSourceInfo(
		r.Context(),
		currentUserIDMust(r.Context()),
		encounterID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load encounter source details")
		return
	}
	document := markdownDocumentFromEncounter(encounter, combatants, blockID)
	rendered, err := markdownencounter.Render(document)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not render encounter Markdown")
		return
	}

	filename := markdownBlockID(encounter.Name, encounter.ID) + ".md"
	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, filename, time.Time{}, strings.NewReader(rendered))
}

func markdownDocumentFromEncounter(
	encounter models.Encounter,
	combatants []models.EncounterCombatant,
	blockID string,
) markdownencounter.Document {
	if blockID == "" {
		blockID = markdownBlockID(encounter.Name, encounter.ID)
	}
	document := markdownencounter.Document{
		Version:     markdownencounter.CurrentVersion,
		ID:          blockID,
		Name:        encounter.Name,
		Description: encounter.Description,
		Status:      encounter.Status,
		Location:    encounter.Location,
		Room:        encounter.RoomNumber,
		Loot:        encounter.LootNotes,
		Combatants:  make([]markdownencounter.Combatant, 0, len(combatants)),
	}
	if encounter.LocationID != nil {
		document.LocationID = *encounter.LocationID
	}
	for _, combatant := range combatants {
		document.Combatants = append(
			document.Combatants,
			markdownCombatantFromEncounter(combatant),
		)
	}
	return document
}

func markdownCombatantFromEncounter(
	combatant models.EncounterCombatant,
) markdownencounter.Combatant {
	spec := markdownencounter.Combatant{
		Name:       combatant.DisplayName,
		Side:       combatant.Side,
		Quantity:   1,
		RolledHP:   combatant.RolledHP,
		Color:      combatant.ColorLabel,
		ArmorClass: combatant.ArmorClass,
		HitPoints:  combatant.MaxHitPoints,
	}
	if combatant.SourceType == "player" && combatant.PlayerID != "" {
		spec.PlayerID = combatant.PlayerID
		return spec
	}
	if combatant.CreatureID != "" {
		spec.CreatureID = combatant.CreatureID
		return spec
	}
	if standardID := snapshotString(combatant.Snapshot, "standardCreatureId"); standardID != "" {
		spec.StandardCreatureID = standardID
		return spec
	}
	return spec
}

func markdownBlockID(name, encounterID string) string {
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = strings.Trim(markdownIDCharacters.ReplaceAllString(slug, "-"), "-._")
	if slug == "" {
		slug = "encounter"
	}
	suffix := strings.ReplaceAll(encounterID, "-", "")
	if len(suffix) > 8 {
		suffix = suffix[:8]
	}
	if suffix != "" {
		slug += "-" + strings.ToLower(suffix)
	}
	if len(slug) > 80 {
		slug = slug[:80]
	}
	return slug
}

func snapshotString(snapshot map[string]any, key string) string {
	value, _ := snapshot[key].(string)
	return strings.TrimSpace(value)
}
