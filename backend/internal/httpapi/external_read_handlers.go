package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	appdomain "bludm/backend/internal/app"
)

func (s *Server) externalCampaignContext(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.CampaignContext(r.Context(), r.PathValue("campaignID"))
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalListPlayers(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.ListPlayers(r.Context(), r.PathValue("campaignID"))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	start, end, page, err := pageBounds(r, len(result))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"players": result[start:end], "page": page})
}

func (s *Server) externalGetPlayer(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.GetPlayer(
		r.Context(), r.PathValue("campaignID"), r.PathValue("playerID"),
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalListLocations(w http.ResponseWriter, r *http.Request) {
	var parentLocationID *string
	if r.URL.Query().Has("parentLocationId") {
		value := r.URL.Query().Get("parentLocationId")
		parentLocationID = &value
	}
	result, err := s.app.ListLocationsWithFilters(
		r.Context(), r.PathValue("campaignID"), appdomain.LocationFilters{
			Query: r.URL.Query().Get("q"), LocationType: r.URL.Query().Get("type"),
			ParentLocationID: parentLocationID, Status: r.URL.Query().Get("status"),
		},
	)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	start, end, page, err := pageBounds(r, len(result))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"locations": result[start:end], "page": page})
}

func (s *Server) externalGetLocation(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.GetLocation(
		r.Context(), r.PathValue("campaignID"), r.PathValue("locationID"),
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalWorldGraph(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.GetWorldGraph(r.Context(), r.PathValue("campaignID"))
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalListEncounters(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.ListEncountersWithFilters(
		r.Context(), r.PathValue("campaignID"), appdomain.EncounterFilters{
			Query: r.URL.Query().Get("q"), Status: r.URL.Query().Get("status"),
			LocationID: r.URL.Query().Get("locationId"),
		},
	)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	start, end, page, err := pageBounds(r, len(result))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"encounters": result[start:end], "page": page})
}

func (s *Server) externalGetEncounter(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.GetEncounter(
		r.Context(), r.PathValue("campaignID"), r.PathValue("encounterID"),
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalSearchCreatures(w http.ResponseWriter, r *http.Request) {
	minimumCR, err := optionalFloatQuery(r, "minCr")
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	maximumCR, err := optionalFloatQuery(r, "maxCr")
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	result, err := s.app.SearchCreaturesWithFilters(
		r.Context(), r.PathValue("campaignID"), appdomain.CreatureSearchFilters{
			Query: r.URL.Query().Get("q"), CreatureType: r.URL.Query().Get("type"),
			MinimumCR: minimumCR, MaximumCR: maximumCR, SourceKey: r.URL.Query().Get("source"),
		},
	)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	start, end, page, err := pageBounds(r, len(result))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"creatures": result[start:end], "page": page})
}

func (s *Server) externalGetCreature(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.GetCreature(
		r.Context(), r.PathValue("campaignID"), r.PathValue("creatureID"),
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalSearchLibrary(w http.ResponseWriter, r *http.Request) {
	contentType := r.URL.Query().Get("type")
	if contentType == "" {
		contentType = r.URL.Query().Get("category")
	}
	result, err := s.app.SearchLibrary(
		r.Context(), r.PathValue("campaignID"), contentType, r.URL.Query().Get("q"),
	)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	length := max(len(result.Creatures), len(result.Spells), len(result.Items), len(result.Entries))
	start, end, page, err := pageBounds(r, length)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	result.Creatures = pageSlice(result.Creatures, start, end)
	result.Spells = pageSlice(result.Spells, start, end)
	result.Items = pageSlice(result.Items, start, end)
	result.Entries = pageSlice(result.Entries, start, end)
	writeJSON(w, http.StatusOK, struct {
		appdomain.LibrarySearchResult
		Page externalPage `json:"page"`
	}{LibrarySearchResult: result, Page: page})
}

func (s *Server) externalGetLibraryEntry(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.GetLibraryEntry(
		r.Context(), r.PathValue("campaignID"), r.URL.Query().Get("type"),
		r.PathValue("entryID"), r.URL.Query().Get("source"),
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalEvaluateEncounter(w http.ResponseWriter, r *http.Request) {
	var request appdomain.EvaluateEncounterInput
	if !decodeExternalJSON(s, w, r, &request) {
		return
	}
	result, err := s.app.EvaluateEncounter(r.Context(), r.PathValue("campaignID"), request)
	writeExternalResult(w, r, result, err)
}

func writeExternalResult(w http.ResponseWriter, r *http.Request, result any, err error) {
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) externalSearchCampaignContent(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		writeExternalError(w, r, appdomain.ValidationError(
			"missing_query", "q is required", nil,
		))
		return
	}
	entityTypes := []string{}
	for _, value := range r.URL.Query()["entityType"] {
		for _, entityType := range strings.Split(value, ",") {
			if strings.TrimSpace(entityType) != "" {
				entityTypes = append(entityTypes, strings.TrimSpace(entityType))
			}
		}
	}
	result, err := s.app.SearchCampaignContentWithTypes(
		r.Context(), r.PathValue("campaignID"), query, entityTypes,
	)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	start, end, page, err := pageBounds(r, len(result))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"results": result[start:end], "page": page})
}

func (s *Server) externalPrepGaps(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.PrepGaps(r.Context(), r.PathValue("campaignID"))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	start, end, page, err := pageBounds(r, len(result))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"gaps": result[start:end], "page": page})
}

func optionalFloatQuery(r *http.Request, name string) (*float64, error) {
	if !r.URL.Query().Has(name) {
		return nil, nil
	}
	value, err := strconv.ParseFloat(strings.TrimSpace(r.URL.Query().Get(name)), 64)
	if err != nil || value < 0 {
		return nil, appdomain.ValidationError(
			"invalid_query_parameter", name+" must be a non-negative number",
			map[string]any{"parameter": name},
		)
	}
	return &value, nil
}
