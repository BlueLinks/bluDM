package httpapi

import (
	"bludm/backend/internal/store"
	"net/http"
	"strings"
)

func (s *Server) listActionTemplates(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	templates, err := s.stores.Actions.ListTemplates(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list action templates")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"actionTemplates": templates})
}

func (s *Server) createActionTemplate(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	var req actionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	template, err := s.stores.Actions.CreateTemplate(r.Context(), user.ID, actionInputFromRequest(req))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create action template")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"actionTemplate": template})
}

func (s *Server) updateActionTemplate(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	templateID := strings.TrimSpace(r.PathValue("templateID"))
	var req actionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	template, err := s.stores.Actions.UpdateTemplate(r.Context(), user.ID, templateID, actionInputFromRequest(req))
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "action template not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update action template")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"actionTemplate": template})
}

func (s *Server) getActionTemplateUsage(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	templateID := strings.TrimSpace(r.PathValue("templateID"))
	usage, err := s.stores.Actions.TemplateUsage(r.Context(), user.ID, templateID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load action template usage")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"usage": usage, "count": len(usage)})
}

func (s *Server) deleteActionTemplate(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	templateID := strings.TrimSpace(r.PathValue("templateID"))
	usage, err := s.stores.Actions.DeleteTemplate(r.Context(), user.ID, templateID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "action template not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete action template")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"removedCreatureActions": len(usage), "usage": usage})
}

func (s *Server) listCreatureActions(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.creatureExists(r.Context(), creatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	user, _ := s.currentUser(r)
	actions, err := s.stores.Actions.ListCreatureActions(r.Context(), user.ID, creatureID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list creature actions")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"actions": actions})
}

func (s *Server) createCreatureAction(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.creatureExists(r.Context(), creatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	var req actionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	user, _ := s.currentUser(r)
	action, err := s.stores.Actions.CreateCreatureAction(r.Context(), user.ID, creatureID, req.SourceTemplateID, actionInputFromRequest(req))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create creature action")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"action": action})
}

func (s *Server) replaceCreatureActions(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.creatureExists(r.Context(), creatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	var req replaceActionsRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	inputs := make([]store.ActionInput, 0, len(req.Actions))
	for _, actionReq := range req.Actions {
		actionReq.normalize()
		if err := actionReq.validate(); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		inputs = append(inputs, actionInputFromRequest(actionReq))
	}
	user, _ := s.currentUser(r)
	actions, err := s.stores.Actions.ReplaceCreatureActions(r.Context(), user.ID, creatureID, inputs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not replace creature actions")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"actions": actions})
}

func (s *Server) copyActionTemplateToCreature(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.creatureExists(r.Context(), creatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	var req copyTemplateRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.TemplateID = strings.TrimSpace(req.TemplateID)
	if req.TemplateID == "" {
		writeError(w, http.StatusBadRequest, "templateId is required")
		return
	}
	user, _ := s.currentUser(r)
	template, err := s.stores.Actions.TemplateByID(r.Context(), user.ID, req.TemplateID)
	if err != nil {
		writeError(w, http.StatusNotFound, "action template not found")
		return
	}

	actionReq := actionRequestFromTemplate(template)
	action, err := s.stores.Actions.CreateCreatureAction(r.Context(), user.ID, creatureID, template.ID, actionInputFromRequest(actionReq))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not copy action template")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"action": action})
}

func (s *Server) reorderCreatureActions(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.creatureExists(r.Context(), creatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	var req reorderActionsRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	user, _ := s.currentUser(r)
	actions, err := s.stores.Actions.ReorderCreatureActions(r.Context(), user.ID, creatureID, req.ActionIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not reorder actions")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"actions": actions})
}
