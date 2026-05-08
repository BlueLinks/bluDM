package httpapi

import (
	"bludm/backend/internal/models"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Server) listActionTemplates(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	rows, err := s.db.Query(r.Context(), `
		select id, name, description, recharge, limited_uses, limit_type, reach, action_range,
			aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event,
			created_at, updated_at
		from action_templates
		where owner_user_id = $1
		order by name asc
	`, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list action templates")
		return
	}
	defer rows.Close()

	templates := []models.ActionTemplate{}
	for rows.Next() {
		template, err := scanActionTemplate(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not read action templates")
			return
		}
		rolls, err := s.actionTemplateRolls(r.Context(), template.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not read action template rolls")
			return
		}
		template.Rolls = rolls
		templates = append(templates, template)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "could not read action templates")
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

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create action template")
		return
	}
	defer tx.Rollback(r.Context())

	template, err := insertActionTemplate(r.Context(), tx, user.ID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create action template")
		return
	}
	if err := insertActionTemplateRolls(r.Context(), tx, template.ID, req.Rolls); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create action template rolls")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create action template")
		return
	}
	template.Rolls = req.toModelRolls()

	writeJSON(w, http.StatusCreated, map[string]any{"actionTemplate": template})
}

func (s *Server) updateActionTemplate(w http.ResponseWriter, r *http.Request) {
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
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update action template")
		return
	}
	defer tx.Rollback(r.Context())
	row := tx.QueryRow(r.Context(), `
		update action_templates
		set name = $2, description = $3, recharge = $4, limited_uses = $5,
			limit_type = $6, reach = $7, action_range = $8, aoe_type = $9,
			aoe_size = $10, action_type = $11, attack_modifier = $12,
			miss_effect = $13, hit_special_event = $14
		where id = $1 and owner_user_id = $15
		returning id, name, description, recharge, limited_uses, limit_type, reach, action_range,
			aoe_type, aoe_size, action_type, attack_modifier, miss_effect, hit_special_event,
			created_at, updated_at
	`, templateID, req.Name, req.Description, req.Recharge, req.LimitedUses, req.LimitType, req.Reach, req.Range,
		req.AOEType, req.AOESize, req.ActionType, req.AttackModifier, req.MissEffect, req.HitSpecialEvent, currentUserIDMust(r.Context()))
	template, err := scanActionTemplate(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "action template not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update action template")
		return
	}
	if _, err := tx.Exec(r.Context(), `delete from action_template_roll_parts where action_template_id = $1`, templateID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update action template rolls")
		return
	}
	if err := insertActionTemplateRolls(r.Context(), tx, templateID, req.Rolls); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update action template rolls")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update action template")
		return
	}
	template.Rolls = req.toModelRolls()
	writeJSON(w, http.StatusOK, map[string]any{"actionTemplate": template})
}

func (s *Server) getActionTemplateUsage(w http.ResponseWriter, r *http.Request) {
	templateID := strings.TrimSpace(r.PathValue("templateID"))
	usage, err := s.actionTemplateUsage(r.Context(), templateID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load action template usage")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"usage": usage, "count": len(usage)})
}

func (s *Server) deleteActionTemplate(w http.ResponseWriter, r *http.Request) {
	templateID := strings.TrimSpace(r.PathValue("templateID"))
	usage, err := s.actionTemplateUsage(r.Context(), templateID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load action template usage")
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete action template")
		return
	}
	defer tx.Rollback(r.Context())
	if _, err := tx.Exec(r.Context(), `
		delete from creature_actions
		using creatures
		where creature_actions.creature_id = creatures.id
			and creature_actions.source_template_id = $1
			and creatures.owner_user_id = $2
	`, templateID, currentUserIDMust(r.Context())); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete copied creature actions")
		return
	}
	tag, err := tx.Exec(r.Context(), `delete from action_templates where id = $1 and owner_user_id = $2`, templateID, currentUserIDMust(r.Context()))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete action template")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "action template not found")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
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
	actions, err := s.creatureActions(r.Context(), creatureID)
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

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create creature action")
		return
	}
	defer tx.Rollback(r.Context())

	action, err := insertCreatureAction(r.Context(), tx, creatureID, "", req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create creature action")
		return
	}
	if err := insertCreatureActionRolls(r.Context(), tx, action.ID, req.Rolls); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create creature action rolls")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create creature action")
		return
	}
	action.Rolls = req.toModelRolls()

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
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not replace creature actions")
		return
	}
	defer tx.Rollback(r.Context())
	if _, err := tx.Exec(r.Context(), `delete from creature_actions where creature_id = $1`, creatureID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not replace creature actions")
		return
	}
	for _, actionReq := range req.Actions {
		actionReq.normalize()
		if err := actionReq.validate(); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		action, err := insertCreatureAction(r.Context(), tx, creatureID, "", actionReq)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not replace creature action")
			return
		}
		if err := insertCreatureActionRolls(r.Context(), tx, action.ID, actionReq.Rolls); err != nil {
			writeError(w, http.StatusInternalServerError, "could not replace creature action rolls")
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not replace creature actions")
		return
	}
	actions, err := s.creatureActions(r.Context(), creatureID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list creature actions")
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
	template, err := s.actionTemplateByID(r.Context(), req.TemplateID)
	if err != nil {
		writeError(w, http.StatusNotFound, "action template not found")
		return
	}

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not copy action template")
		return
	}
	defer tx.Rollback(r.Context())

	actionReq := actionRequestFromTemplate(template)
	action, err := insertCreatureAction(r.Context(), tx, creatureID, template.ID, actionReq)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not copy action template")
		return
	}
	if err := insertCreatureActionRolls(r.Context(), tx, action.ID, actionReq.Rolls); err != nil {
		writeError(w, http.StatusInternalServerError, "could not copy action rolls")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not copy action template")
		return
	}
	action.Rolls = actionReq.toModelRolls()

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
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not reorder actions")
		return
	}
	defer tx.Rollback(r.Context())
	for index, id := range req.ActionIDs {
		if _, err := tx.Exec(r.Context(), `
			update creature_actions set sort_order = $1 where creature_id = $2 and id = $3
		`, index, creatureID, strings.TrimSpace(id)); err != nil {
			writeError(w, http.StatusInternalServerError, "could not reorder actions")
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not reorder actions")
		return
	}
	actions, err := s.creatureActions(r.Context(), creatureID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list creature actions")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"actions": actions})
}
