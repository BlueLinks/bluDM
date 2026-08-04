package httpapi

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/app/statblocks"
)

func (s *Server) externalGenerateEncounter(w http.ResponseWriter, r *http.Request) {
	var request appdomain.GenerateEncounterCommand
	if !decodeExternalJSON(s, w, r, &request) {
		return
	}
	request.IdempotencyKey = idempotencyKey(r, request.IdempotencyKey)
	result, err := s.app.CreateGeneratedEncounter(
		r.Context(), r.PathValue("campaignID"), request,
	)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, result)
}

func (s *Server) externalCreateEncounter(w http.ResponseWriter, r *http.Request) {
	var request appdomain.EncounterCommand
	if !decodeExternalJSON(s, w, r, &request) {
		return
	}
	request.IdempotencyKey = idempotencyKey(r, request.IdempotencyKey)
	result, err := s.app.CreateEncounter(r.Context(), r.PathValue("campaignID"), request)
	writeExternalCreated(w, r, result, err)
}

func (s *Server) externalUpdateEncounter(w http.ResponseWriter, r *http.Request) {
	var request appdomain.UpdateEncounterCommand
	if !decodeExternalJSON(s, w, r, &request) {
		return
	}
	request.IdempotencyKey = idempotencyKey(r, request.IdempotencyKey)
	result, err := s.app.UpdateEncounter(
		r.Context(), r.PathValue("campaignID"), r.PathValue("encounterID"), request,
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalRegenerateEncounter(w http.ResponseWriter, r *http.Request) {
	var request appdomain.RegenerateEncounterCommand
	if !decodeExternalJSON(s, w, r, &request) {
		return
	}
	request.IdempotencyKey = idempotencyKey(r, request.IdempotencyKey)
	result, err := s.app.RegenerateEncounter(
		r.Context(), r.PathValue("campaignID"), r.PathValue("encounterID"), request,
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalListEncounterRevisions(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.ListEncounterRevisions(
		r.Context(), r.PathValue("campaignID"), r.PathValue("encounterID"),
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
	writeJSON(w, http.StatusOK, map[string]any{"revisions": result[start:end], "page": page})
}

func (s *Server) externalRestoreEncounterRevision(w http.ResponseWriter, r *http.Request) {
	revision, err := strconv.Atoi(r.PathValue("revision"))
	if err != nil || revision < 1 {
		writeExternalError(w, r, appdomain.ValidationError(
			"invalid_revision", "revision must be a positive integer", nil,
		))
		return
	}
	var request appdomain.RestoreRevisionCommand
	if !decodeExternalJSON(s, w, r, &request) {
		return
	}
	request.IdempotencyKey = idempotencyKey(r, request.IdempotencyKey)
	result, err := s.app.RestoreEncounterRevision(
		r.Context(), r.PathValue("campaignID"), r.PathValue("encounterID"), revision, request,
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalCreatureStatblockCompatibility(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.ExportCreature(
		r.Context(), r.PathValue("campaignID"), r.PathValue("creatureID"),
		r.URL.Query().Get("vaultImagePath"), true,
	)
	writeExternalResult(w, r, result.Compatibility, err)
}

func (s *Server) externalCreatureStatblock(w http.ResponseWriter, r *http.Request) {
	output, allowPartial, err := externalExportOptions(r, false)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	result, err := s.app.ExportCreature(
		r.Context(), r.PathValue("campaignID"), r.PathValue("creatureID"),
		r.URL.Query().Get("vaultImagePath"), allowPartial,
	)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	result.Output = output
	if output == "yaml" {
		writeExternalTextExport(w, r, "application/yaml; charset=utf-8", "statblock.yaml", result.YAML)
		return
	}
	if output == "markdown" || wantsMarkdown(r) {
		writeExternalTextExport(w, r, "text/markdown; charset=utf-8", "statblock.md", result.Markdown)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) externalEncounterStatblocks(w http.ResponseWriter, r *http.Request) {
	output, allowPartial, err := externalExportOptions(r, true)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	result, err := s.app.ExportEncounterWithCreatureData(
		r.Context(), r.PathValue("campaignID"), r.PathValue("encounterID"),
		r.URL.Query().Get("creatureData"), allowPartial,
	)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	result.Output = output
	if output == "markdown" || output == "obsidian-bundle" || wantsMarkdown(r) {
		markdown := result.Markdown
		filename := "encounter-statblocks.md"
		if strings.HasSuffix(r.URL.Path, "/exports/obsidian-bundle") || output == "obsidian-bundle" {
			markdown = result.BundleMarkdown
			filename = "encounter-obsidian-bundle.md"
		}
		writeExternalTextExport(w, r, "text/markdown; charset=utf-8", filename, markdown)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) externalEncounterCompatibility(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.ExportEncounterWithCreatureData(
		r.Context(), r.PathValue("campaignID"), r.PathValue("encounterID"),
		r.URL.Query().Get("creatureData"), true,
	)
	writeExternalResult(w, r, result.Compatibility, err)
}

func wantsMarkdown(r *http.Request) bool {
	return strings.Contains(r.Header.Get("Accept"), "text/markdown") ||
		r.URL.Query().Get("output") == "markdown"
}

func writeExternalTextExport(
	w http.ResponseWriter,
	r *http.Request,
	contentType string,
	filename string,
	content string,
) {
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, filename, time.Time{}, strings.NewReader(content))
}

func externalExportOptions(r *http.Request, encounter bool) (string, bool, error) {
	profile := strings.TrimSpace(r.URL.Query().Get("profile"))
	if profile != "" && profile != statblocks.Profile {
		return "", false, appdomain.ValidationError("unsupported_profile", "unsupported export profile", nil)
	}
	layout := strings.TrimSpace(r.URL.Query().Get("layout"))
	if layout != "" && layout != "Basic 5e Layout" {
		return "", false, appdomain.ValidationError("unsupported_layout", "layout must be Basic 5e Layout", nil)
	}
	output := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("output")))
	if output == "" {
		output = "structured"
		if strings.Contains(r.Header.Get("Accept"), "text/markdown") {
			output = "markdown"
		}
		if strings.HasSuffix(r.URL.Path, "/exports/obsidian-bundle") {
			output = "obsidian-bundle"
		}
	}
	allowed := map[string]bool{"structured": true, "markdown": true}
	if encounter {
		allowed["obsidian-bundle"] = true
	} else {
		allowed["yaml"] = true
	}
	if !allowed[output] {
		return "", false, appdomain.ValidationError("unsupported_output", "unsupported export output", nil)
	}
	strict := true
	if r.URL.Query().Has("strict") {
		value, err := strconv.ParseBool(r.URL.Query().Get("strict"))
		if err != nil {
			return "", false, appdomain.ValidationError("invalid_strict", "strict must be true or false", nil)
		}
		strict = value
	}
	if r.URL.Query().Has("allowPartial") {
		value, err := strconv.ParseBool(r.URL.Query().Get("allowPartial"))
		if err != nil {
			return "", false, appdomain.ValidationError("invalid_allow_partial", "allowPartial must be true or false", nil)
		}
		if r.URL.Query().Has("strict") && strict == value {
			return "", false, appdomain.ValidationError(
				"conflicting_strictness", "strict and allowPartial specify conflicting modes", nil,
			)
		}
		strict = !value
	}
	return output, !strict, nil
}
