package app

import (
	"errors"
	"fmt"
)

type ErrorCode string

const (
	CodeUnauthorized        ErrorCode = "unauthorized"
	CodeForbidden           ErrorCode = "forbidden"
	CodeNotFound            ErrorCode = "not_found"
	CodeValidation          ErrorCode = "validation_failed"
	CodeConflict            ErrorCode = "conflict"
	CodeIdempotencyConflict ErrorCode = "idempotency_conflict"
	CodeRateLimited         ErrorCode = "rate_limited"
	CodeTimeout             ErrorCode = "timeout"
	CodeUnsupported         ErrorCode = "unsupported"
	CodeInternal            ErrorCode = "internal_error"
)

type DomainError struct {
	Code       ErrorCode      `json:"code"`
	Message    string         `json:"message"`
	Details    map[string]any `json:"details,omitempty"`
	RetryAfter int            `json:"retryAfterSeconds,omitempty"`
}

func (e *DomainError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func NewError(code ErrorCode, message string, details map[string]any) error {
	return &DomainError{Code: code, Message: message, Details: details}
}

func ValidationError(reason string, message string, details map[string]any) error {
	if details == nil {
		details = map[string]any{}
	}
	details["reason"] = reason
	return NewError(CodeValidation, message, details)
}

func ErrorInfo(err error) *DomainError {
	var domain *DomainError
	if errors.As(err, &domain) {
		return domain
	}
	return &DomainError{Code: CodeInternal, Message: "internal server error"}
}

func Require(principal Principal, campaignID string, scopes ...Scope) error {
	if principal.UserID == "" {
		return NewError(CodeUnauthorized, "authentication required", nil)
	}
	for _, scope := range scopes {
		if !principal.HasScope(scope) {
			return NewError(CodeForbidden, "token does not grant the required scope", map[string]any{
				"requiredScope": scope,
			})
		}
	}
	if campaignID != "" && !principal.AllowsCampaign(campaignID) {
		return NewError(CodeForbidden, "token is not allowed to access this campaign", map[string]any{
			"campaignId": campaignID,
		})
	}
	return nil
}
