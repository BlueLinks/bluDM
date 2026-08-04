package httpapi

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	appdomain "bludm/backend/internal/app"
)

type externalErrorEnvelope struct {
	Error externalErrorBody `json:"error"`
}

type externalErrorBody struct {
	Code      appdomain.ErrorCode `json:"code"`
	Message   string              `json:"message"`
	Details   map[string]any      `json:"details,omitempty"`
	RequestID string              `json:"requestId"`
}

type externalPage struct {
	Limit      int    `json:"limit"`
	NextCursor string `json:"nextCursor,omitempty"`
}

func decodeExternalJSON(s *Server, w http.ResponseWriter, r *http.Request, target any) bool {
	return decodeExternalJSONLimit(w, r, target, s.cfg.MCP.MaxRequestBytes)
}

func decodeExternalJSONLimit(
	w http.ResponseWriter,
	r *http.Request,
	target any,
	limit int64,
) bool {
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeExternalError(w, r, appdomain.ValidationError(
			"invalid_json", "invalid JSON body", map[string]any{"error": err.Error()},
		))
		return false
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		writeExternalError(w, r, appdomain.ValidationError(
			"multiple_json_values", "request body must contain exactly one valid JSON value", nil,
		))
		return false
	}
	return true
}

func isExternalRequest(r *http.Request) bool {
	_, ok := r.Context().Value(externalRequestIDKey{}).(string)
	return ok
}

func isScopedExternalRequest(r *http.Request) bool {
	principal, ok := appdomain.PrincipalFromContext(r.Context())
	return isExternalRequest(r) && ok && !principal.LegacyExternalCredentials
}

func writeExternalError(w http.ResponseWriter, r *http.Request, err error) {
	info := appdomain.ErrorInfo(err)
	status := http.StatusInternalServerError
	switch info.Code {
	case appdomain.CodeUnauthorized:
		status = http.StatusUnauthorized
	case appdomain.CodeForbidden:
		status = http.StatusForbidden
	case appdomain.CodeNotFound:
		status = http.StatusNotFound
	case appdomain.CodeValidation:
		status = http.StatusBadRequest
	case appdomain.CodeConflict, appdomain.CodeIdempotencyConflict:
		status = http.StatusConflict
	case appdomain.CodeRateLimited:
		status = http.StatusTooManyRequests
	case appdomain.CodeTimeout:
		status = http.StatusGatewayTimeout
	case appdomain.CodeUnsupported:
		status = http.StatusUnprocessableEntity
	}
	if info.RetryAfter > 0 {
		w.Header().Set("Retry-After", strconv.Itoa(info.RetryAfter))
	}
	writeJSON(w, status, externalErrorEnvelope{Error: externalErrorBody{
		Code: info.Code, Message: info.Message, Details: info.Details,
		RequestID: externalRequestID(r),
	}})
}

func externalRequestID(r *http.Request) string {
	if value, ok := r.Context().Value(externalRequestIDKey{}).(string); ok && value != "" {
		return value
	}
	if value := strings.TrimSpace(r.Header.Get("X-Request-ID")); value != "" {
		return value
	}
	return fmt.Sprintf("req-%d", time.Now().UnixNano())
}

type externalRequestIDKey struct{}

func withExternalRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := strings.TrimSpace(r.Header.Get("X-Request-ID"))
		if requestID == "" || len(requestID) > 128 {
			requestID = fmt.Sprintf("req-%d", time.Now().UnixNano())
		}
		w.Header().Set("X-Request-ID", requestID)
		ctx := context.WithValue(r.Context(), externalRequestIDKey{}, requestID)
		ctx = appdomain.WithRequestID(ctx, requestID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func pageBounds(r *http.Request, length int) (int, int, externalPage, error) {
	limit := 50
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 100 {
			return 0, 0, externalPage{}, appdomain.ValidationError(
				"invalid_limit", "limit must be between 1 and 100", nil,
			)
		}
		limit = parsed
	}
	offset := 0
	if raw := strings.TrimSpace(r.URL.Query().Get("cursor")); raw != "" {
		decoded, err := base64.RawURLEncoding.DecodeString(raw)
		if err != nil {
			return 0, 0, externalPage{}, appdomain.ValidationError(
				"invalid_cursor", "cursor is invalid", nil,
			)
		}
		offset, err = strconv.Atoi(string(decoded))
		if err != nil || offset < 0 || offset > length {
			return 0, 0, externalPage{}, appdomain.ValidationError(
				"invalid_cursor", "cursor is invalid", nil,
			)
		}
	}
	end := min(length, offset+limit)
	page := externalPage{Limit: limit}
	if end < length {
		page.NextCursor = base64.RawURLEncoding.EncodeToString([]byte(strconv.Itoa(end)))
	}
	return offset, end, page, nil
}

func pageSlice[T any](values []T, start, end int) []T {
	start = min(start, len(values))
	end = min(end, len(values))
	if end < start {
		end = start
	}
	return values[start:end]
}

func idempotencyKey(r *http.Request, bodyValue string) string {
	if value := strings.TrimSpace(r.Header.Get("Idempotency-Key")); value != "" {
		return value
	}
	return strings.TrimSpace(bodyValue)
}
