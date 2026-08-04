package httpapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/mcpserver"
)

type requestRateLimiter struct {
	mu      sync.Mutex
	windows map[string]rateWindow
}

type rateWindow struct {
	start time.Time
	count int
}

func (s *Server) external(next http.Handler) http.Handler {
	return withExternalRequestID(s.withExternalPublicOrigin(
		s.requireExternalAuth(
			s.withExternalRateLimit(s.withExternalAudit(next)),
		),
	))
}

func (s *Server) externalWithScopes(
	next http.Handler,
	scopes ...appdomain.Scope,
) http.Handler {
	return s.external(s.withExternalAuthorization(next, scopes...))
}

func (s *Server) withExternalAuthorization(
	next http.Handler,
	scopes ...appdomain.Scope,
) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if writer, ok := w.(*auditResponseWriter); ok {
			writer.requiredScopes = append([]appdomain.Scope(nil), scopes...)
		}
		principal, ok := appdomain.PrincipalFromContext(r.Context())
		if !ok {
			writeExternalError(
				w, r, appdomain.NewError(appdomain.CodeUnauthorized, "authentication required", nil),
			)
			return
		}
		if principal.LegacyExternalCredentials {
			next.ServeHTTP(w, r)
			return
		}
		campaignID := strings.TrimSpace(r.PathValue("campaignID"))
		if campaignID == "" && r.PathValue("encounterID") != "" {
			encounter, err := s.stores.Encounters.ByID(
				r.Context(), principal.UserID, r.PathValue("encounterID"),
			)
			if err != nil {
				writeExternalError(
					w, r, appdomain.NewError(appdomain.CodeNotFound, "encounter not found", nil),
				)
				return
			}
			campaignID = encounter.CampaignID
		}
		if err := appdomain.Require(principal, campaignID, scopes...); err != nil {
			writeExternalError(w, r, err)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) withExternalRateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal, _ := appdomain.PrincipalFromContext(r.Context())
		class, limit := s.externalRateClass(r)
		key := principal.Key() + ":" + class
		if !s.externalLimiter.allow(key, limit, time.Now()) {
			writeExternalError(w, r, &appdomain.DomainError{
				Code:       appdomain.CodeRateLimited,
				Message:    "request rate limit exceeded",
				Details:    map[string]any{"class": class},
				RetryAfter: 60,
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) externalRateClass(r *http.Request) (string, int) {
	if r.URL.Path == "/mcp" {
		switch mcpRateClass(r, s.cfg.MCP.MaxRequestBytes) {
		case "generation":
			return "generation", configuredRateLimit(
				s.cfg.MCP.GenerationRequestsPerMinute, 20,
			)
		case "write":
			return "write", configuredRateLimit(s.cfg.MCP.WriteRequestsPerMinute, 60)
		default:
			return "read", configuredRateLimit(s.cfg.MCP.ReadRequestsPerMinute, 240)
		}
	}
	if strings.Contains(r.URL.Path, "/generation/") ||
		strings.HasSuffix(r.URL.Path, "/generate") ||
		strings.HasSuffix(r.URL.Path, "/regenerate") {
		return "generation", configuredRateLimit(s.cfg.MCP.GenerationRequestsPerMinute, 20)
	}
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return "write", configuredRateLimit(s.cfg.MCP.WriteRequestsPerMinute, 60)
	}
	return "read", configuredRateLimit(s.cfg.MCP.ReadRequestsPerMinute, 240)
}

func configuredRateLimit(configured, fallback int) int {
	if configured > 0 {
		return configured
	}
	return fallback
}

func mcpRateClass(r *http.Request, configuredMaxBytes int64) string {
	if r.Body == nil {
		return "read"
	}
	if configuredMaxBytes <= 0 {
		configuredMaxBytes = 4 << 20
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, configuredMaxBytes+1))
	if err != nil {
		return "write"
	}
	r.Body = io.NopCloser(bytes.NewReader(body))
	var request struct {
		Method string `json:"method"`
		Params struct {
			Name string `json:"name"`
		} `json:"params"`
	}
	if len(body) > int(configuredMaxBytes) || json.Unmarshal(body, &request) != nil ||
		request.Method != "tools/call" {
		return "read"
	}
	return mcpserver.ToolRateClass(request.Params.Name)
}

func (limiter *requestRateLimiter) allow(key string, limit int, now time.Time) bool {
	if limit <= 0 {
		return false
	}
	limiter.mu.Lock()
	defer limiter.mu.Unlock()
	if limiter.windows == nil {
		limiter.windows = map[string]rateWindow{}
	}
	window := limiter.windows[key]
	if window.start.IsZero() || now.Sub(window.start) >= time.Minute {
		window = rateWindow{start: now}
	}
	if window.count >= limit {
		limiter.windows[key] = window
		return false
	}
	window.count++
	limiter.windows[key] = window
	return true
}

type auditResponseWriter struct {
	http.ResponseWriter
	status            int
	requiredScopes    []appdomain.Scope
	idempotencyReplay bool
	encounterRevision int
	generatorVersion  string
	seed              string
}

func (writer *auditResponseWriter) WriteHeader(status int) {
	writer.status = status
	writer.ResponseWriter.WriteHeader(status)
}

func (writer *auditResponseWriter) Flush() {
	if flusher, ok := writer.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (writer *auditResponseWriter) Unwrap() http.ResponseWriter {
	return writer.ResponseWriter
}

func (s *Server) withExternalAudit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		writer := &auditResponseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(writer, r)
		principal, ok := appdomain.PrincipalFromContext(r.Context())
		if !ok {
			return
		}
		resultClass := "success"
		authorization := "allowed"
		switch {
		case writer.status == http.StatusForbidden || writer.status == http.StatusUnauthorized:
			resultClass = "forbidden"
			authorization = "denied"
		case writer.status == http.StatusConflict:
			resultClass = "conflict"
		case writer.status == http.StatusTooManyRequests:
			resultClass = "rate_limited"
		case writer.status == http.StatusGatewayTimeout:
			resultClass = "timeout"
		case writer.status >= 400 && writer.status < 500:
			resultClass = "validation_failure"
		case writer.status >= 500:
			resultClass = "internal_error"
		}
		_ = s.app.RecordAudit(r.Context(), principal, appdomain.AuditRecord{
			RequestID: externalRequestID(r), Operation: r.Method + " " + r.URL.Path,
			CampaignID: r.PathValue("campaignID"), TargetEntityID: externalTargetID(r),
			RequiredScopes: writer.requiredScopes, Authorization: authorization,
			ResultClass: resultClass, Duration: time.Since(start),
			IdempotencyReplay: writer.idempotencyReplay,
			EncounterRevision: writer.encounterRevision,
			GeneratorVersion:  writer.generatorVersion, Seed: writer.seed,
		})
	})
}

func (writer *auditResponseWriter) captureAuthoringMetadata(payload any) {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return
	}
	fields := map[string]any{}
	if json.Unmarshal(encoded, &fields) != nil {
		return
	}
	writer.idempotencyReplay, _ = fields["idempotencyReplay"].(bool)
	if revision, ok := fields["revision"].(float64); ok {
		writer.encounterRevision = int(revision)
	} else if encounter, ok := fields["encounter"].(map[string]any); ok {
		if revision, ok := encounter["revision"].(float64); ok {
			writer.encounterRevision = int(revision)
		}
	}
	writer.generatorVersion, _ = fields["generatorVersion"].(string)
	if seed, ok := fields["seed"].(float64); ok {
		writer.seed = fmt.Sprintf("%.0f", seed)
	}
}

func externalTargetID(r *http.Request) string {
	for _, name := range []string{"encounterID", "creatureID", "locationID", "playerID"} {
		if value := r.PathValue(name); value != "" {
			return value
		}
	}
	return ""
}
