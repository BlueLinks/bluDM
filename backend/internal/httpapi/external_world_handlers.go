package httpapi

import (
	"net/http"

	appdomain "bludm/backend/internal/app"
)

func (s *Server) externalCreateLocation(w http.ResponseWriter, r *http.Request) {
	var command appdomain.LocationCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	command.IdempotencyKey = idempotencyKey(r, command.IdempotencyKey)
	result, err := s.app.CreateLocation(r.Context(), r.PathValue("campaignID"), command)
	writeExternalCreated(w, r, result, err)
}

func (s *Server) externalUpdateLocation(w http.ResponseWriter, r *http.Request) {
	var command appdomain.LocationCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	command.IdempotencyKey = idempotencyKey(r, command.IdempotencyKey)
	result, err := s.app.UpdateLocation(
		r.Context(), r.PathValue("campaignID"), r.PathValue("locationID"), command,
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalCreateNPC(w http.ResponseWriter, r *http.Request) {
	var command appdomain.NPCCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	command.IdempotencyKey = idempotencyKey(r, command.IdempotencyKey)
	result, err := s.app.CreateNPC(r.Context(), r.PathValue("campaignID"), command)
	writeExternalCreated(w, r, result, err)
}

func (s *Server) externalUpdateNPC(w http.ResponseWriter, r *http.Request) {
	var command appdomain.NPCCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	command.IdempotencyKey = idempotencyKey(r, command.IdempotencyKey)
	result, err := s.app.UpdateNPC(
		r.Context(), r.PathValue("campaignID"), r.PathValue("npcID"), command,
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalLinkNPC(w http.ResponseWriter, r *http.Request) {
	var command appdomain.NPCLinkCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	command.IdempotencyKey = idempotencyKey(r, command.IdempotencyKey)
	result, err := s.app.LinkNPCToLocation(r.Context(), r.PathValue("campaignID"), command)
	writeExternalCreated(w, r, result, err)
}

func (s *Server) externalCreateLocationLink(w http.ResponseWriter, r *http.Request) {
	var command appdomain.LocationLinkCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	command.IdempotencyKey = idempotencyKey(r, command.IdempotencyKey)
	result, err := s.app.CreateLocationLink(r.Context(), r.PathValue("campaignID"), command)
	writeExternalCreated(w, r, result, err)
}

func (s *Server) externalCreateRollTable(w http.ResponseWriter, r *http.Request) {
	var command appdomain.RollTableCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	command.IdempotencyKey = idempotencyKey(r, command.IdempotencyKey)
	result, err := s.app.CreateRollTable(r.Context(), r.PathValue("campaignID"), command)
	writeExternalCreated(w, r, result, err)
}

func (s *Server) externalCreateJourney(w http.ResponseWriter, r *http.Request) {
	var command appdomain.JourneyCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	command.IdempotencyKey = idempotencyKey(r, command.IdempotencyKey)
	result, err := s.app.CreateJourney(r.Context(), r.PathValue("campaignID"), command)
	writeExternalCreated(w, r, result, err)
}

func (s *Server) externalPreviewChanges(w http.ResponseWriter, r *http.Request) {
	var command appdomain.CampaignChangesCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	setAuditScopes(w, appdomain.CampaignChangeScopes(command.Changes))
	result, err := s.app.PreviewCampaignChanges(r.Context(), r.PathValue("campaignID"), command)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalApplyChanges(w http.ResponseWriter, r *http.Request) {
	var command appdomain.CampaignChangesCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	setAuditScopes(w, appdomain.CampaignChangeScopes(command.Changes))
	command.IdempotencyKey = idempotencyKey(r, command.IdempotencyKey)
	result, err := s.app.ApplyCampaignChanges(r.Context(), r.PathValue("campaignID"), command)
	writeExternalResult(w, r, result, err)
}

func setAuditScopes(w http.ResponseWriter, scopes []appdomain.Scope) {
	if writer, ok := w.(*auditResponseWriter); ok {
		writer.requiredScopes = append([]appdomain.Scope(nil), scopes...)
	}
}

func writeExternalCreated(w http.ResponseWriter, r *http.Request, result any, err error) {
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, result)
}
