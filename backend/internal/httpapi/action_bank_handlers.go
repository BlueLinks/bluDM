package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Server) findActionTemplateConflict(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if name == "" {
		writeJSON(w, http.StatusOK, map[string]any{"conflict": false})
		return
	}

	row := s.db.QueryRow(r.Context(), `
		select id, name
		from action_templates
		where owner_user_id = $1 and lower(name) = lower($2)
		order by updated_at desc
		limit 1
	`, currentUserIDMust(r.Context()), name)
	var id, foundName string
	if err := row.Scan(&id, &foundName); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusOK, map[string]any{"conflict": false})
			return
		}
		writeError(w, http.StatusInternalServerError, "could not check action template name")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"conflict":       true,
		"actionTemplate": map[string]string{"id": id, "name": foundName},
	})
}

func (s *Server) createActionTemplateFromCreatureAction(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	var req actionTemplateFromCreatureActionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.CreatureActionID = strings.TrimSpace(req.CreatureActionID)
	action, err := s.creatureActionByID(r.Context(), req.CreatureActionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "creature action not found")
		return
	}
	actionReq := actionRequestFromCreatureAction(action)
	if strings.TrimSpace(req.Name) != "" {
		actionReq.Name = strings.TrimSpace(req.Name)
	}

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save action template")
		return
	}
	defer tx.Rollback(r.Context())

	template, err := insertActionTemplate(r.Context(), tx, user.ID, actionReq)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save action template")
		return
	}
	if err := insertActionTemplateRolls(r.Context(), tx, template.ID, actionReq.Rolls); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save action template rolls")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save action template")
		return
	}
	template.Rolls = actionReq.toModelRolls()
	writeJSON(w, http.StatusCreated, map[string]any{"actionTemplate": template})
}

func (s *Server) overwriteActionTemplateFromCreatureAction(w http.ResponseWriter, r *http.Request) {
	templateID := strings.TrimSpace(r.PathValue("templateID"))
	var req actionTemplateFromCreatureActionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	action, err := s.creatureActionByID(r.Context(), strings.TrimSpace(req.CreatureActionID))
	if err != nil {
		writeError(w, http.StatusNotFound, "creature action not found")
		return
	}
	actionReq := actionRequestFromCreatureAction(action)
	if strings.TrimSpace(req.Name) != "" {
		actionReq.Name = strings.TrimSpace(req.Name)
	}
	if err := s.replaceActionTemplate(r.Context(), templateID, actionReq); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "action template not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not overwrite action template")
		return
	}
	template, err := s.actionTemplateByID(r.Context(), templateID)
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
		if _, err := s.actionTemplateByID(r.Context(), req.SourceTemplateID); err != nil {
			writeError(w, http.StatusNotFound, "action template not found")
			return
		}
	}
	tag, err := s.db.Exec(r.Context(), `
		update creature_actions
		set source_template_id = nullif($3, '')::uuid, updated_at = now()
		from creatures
		where creature_actions.creature_id = creatures.id
			and creature_actions.creature_id = $1
			and creature_actions.id = $2
			and creatures.owner_user_id = $4
	`, creatureID, actionID, req.SourceTemplateID, currentUserIDMust(r.Context()))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update action source")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "creature action not found")
		return
	}
	action, err := s.creatureActionByID(r.Context(), actionID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load creature action")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"action": action})
}
