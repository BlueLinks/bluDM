package httpapi

import (
	"bludm/backend/internal/store"
	"net/http"
	"strings"
)

func (s *Server) findActionTemplateConflict(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if name == "" {
		writeJSON(w, http.StatusOK, map[string]any{"conflict": false})
		return
	}

	user, _ := s.currentUser(r)
	conflict, err := s.stores.Actions.FindTemplateConflict(r.Context(), user.ID, name)
	if store.IsNotFound(err) {
		writeJSON(w, http.StatusOK, map[string]any{"conflict": false})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not check action template name")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"conflict":       true,
		"actionTemplate": map[string]string{"id": conflict.ID, "name": conflict.Name},
	})
}

func (s *Server) createActionTemplateFromCreatureAction(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	var req actionTemplateFromCreatureActionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.CreatureActionID = strings.TrimSpace(req.CreatureActionID)
	action, err := s.stores.Actions.CreatureActionByID(r.Context(), user.ID, req.CreatureActionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "creature action not found")
		return
	}
	actionReq := actionRequestFromCreatureAction(action)
	if strings.TrimSpace(req.Name) != "" {
		actionReq.Name = strings.TrimSpace(req.Name)
	}

	template, err := s.stores.Actions.CreateTemplate(r.Context(), user.ID, actionInputFromRequest(actionReq))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save action template")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"actionTemplate": template})
}

func (s *Server) overwriteActionTemplateFromCreatureAction(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	templateID := strings.TrimSpace(r.PathValue("templateID"))
	var req actionTemplateFromCreatureActionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	action, err := s.stores.Actions.CreatureActionByID(r.Context(), user.ID, strings.TrimSpace(req.CreatureActionID))
	if err != nil {
		writeError(w, http.StatusNotFound, "creature action not found")
		return
	}
	actionReq := actionRequestFromCreatureAction(action)
	if strings.TrimSpace(req.Name) != "" {
		actionReq.Name = strings.TrimSpace(req.Name)
	}
	if _, err := s.stores.Actions.UpdateTemplate(r.Context(), user.ID, templateID, actionInputFromRequest(actionReq)); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "action template not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not overwrite action template")
		return
	}
	template, err := s.stores.Actions.TemplateByID(r.Context(), user.ID, templateID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load action template")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"actionTemplate": template})
}

func (s *Server) updateCreatureActionSourceTemplate(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	actionID := strings.TrimSpace(r.PathValue("actionID"))
	var req updateCreatureActionSourceTemplateRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.SourceTemplateID = strings.TrimSpace(req.SourceTemplateID)
	if req.SourceTemplateID != "" {
		user, _ := s.currentUser(r)
		if _, err := s.stores.Actions.TemplateByID(r.Context(), user.ID, req.SourceTemplateID); err != nil {
			writeError(w, http.StatusNotFound, "action template not found")
			return
		}
	}
	user, _ := s.currentUser(r)
	action, err := s.stores.Actions.UpdateCreatureActionSourceTemplate(r.Context(), user.ID, creatureID, actionID, req.SourceTemplateID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "creature action not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update action source")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"action": action})
}
