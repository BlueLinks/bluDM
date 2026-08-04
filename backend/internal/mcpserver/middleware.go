package mcpserver

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	appdomain "bludm/backend/internal/app"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func toolAuditAndErrorMiddleware(
	service *appdomain.Service,
	principal appdomain.Principal,
	toolTimeout time.Duration,
) mcp.Middleware {
	return func(next mcp.MethodHandler) mcp.MethodHandler {
		return func(
			ctx context.Context,
			method string,
			request mcp.Request,
		) (mcp.Result, error) {
			started := time.Now()
			callContext := ctx
			cancel := func() {}
			if method == "tools/call" && toolTimeout > 0 {
				callContext, cancel = context.WithTimeout(ctx, toolTimeout)
			}
			result, err := next(callContext, method, request)
			cancel()
			if method == "tools/call" && errors.Is(err, context.DeadlineExceeded) {
				timeoutError := appdomain.NewError(
					appdomain.CodeTimeout, "tool execution timed out", nil,
				)
				callResult := &mcp.CallToolResult{}
				callResult.SetError(timeoutError)
				result, err = callResult, nil
			}
			if method != "tools/call" {
				return result, err
			}
			params, _ := request.GetParams().(*mcp.CallToolParamsRaw)
			if params == nil {
				return result, err
			}
			arguments := map[string]any{}
			_ = json.Unmarshal(params.Arguments, &arguments)
			campaignID := stringArgument(arguments, "campaignId")
			targetID := firstStringArgument(arguments,
				"encounterId", "creatureId", "locationId", "playerId", "tableId", "runId",
			)
			resultClass := "success"
			authorization := "allowed"
			var idempotencyReplay bool
			var encounterRevision int
			var generatorVersion string
			var seed string
			if callResult, ok := result.(*mcp.CallToolResult); ok && callResult.GetError() != nil {
				info := mcpToolErrorInfo(callResult.GetError())
				callResult.StructuredContent = map[string]any{"error": info}
				callResult.Content = []mcp.Content{&mcp.TextContent{
					Text: fmt.Sprintf("%s: %s", info.Code, info.Message),
				}}
				resultClass = auditResultClass(info.Code)
				if info.Code == appdomain.CodeForbidden || info.Code == appdomain.CodeUnauthorized {
					authorization = "denied"
				}
			} else if ok {
				idempotencyReplay, encounterRevision, generatorVersion, seed =
					authoringAuditFields(callResult.StructuredContent)
			}
			_ = service.RecordAudit(ctx, principal, appdomain.AuditRecord{
				RequestID: requestID(ctx),
				Operation: params.Name, CampaignID: campaignID, TargetEntityID: targetID,
				RequiredScopes: scopeValues(requiredScopesForCall(params.Name, arguments)),
				Authorization:  authorization, ResultClass: resultClass,
				IdempotencyReplay: idempotencyReplay, EncounterRevision: encounterRevision,
				GeneratorVersion: generatorVersion, Seed: seed, Duration: time.Since(started),
			})
			return result, err
		}
	}
}

func requestID(ctx context.Context) string {
	if value := appdomain.RequestIDFromContext(ctx); value != "" {
		return value
	}
	return fmt.Sprintf("mcp-%d", time.Now().UnixNano())
}

func mcpToolErrorInfo(err error) *appdomain.DomainError {
	info := appdomain.ErrorInfo(err)
	if info.Code != appdomain.CodeInternal {
		return info
	}
	message := err.Error()
	if strings.HasPrefix(message, `validating "arguments":`) ||
		strings.HasPrefix(message, "json: unknown field") ||
		strings.Contains(message, "unmarshaling arguments") {
		if len(message) > 1000 {
			message = message[:1000]
		}
		return &appdomain.DomainError{
			Code:    appdomain.CodeValidation,
			Message: "tool arguments do not match the declared input schema",
			Details: map[string]any{
				"reason": "invalid_tool_arguments", "validation": message,
				"remediation": "Call tools/list and retry with only declared fields and all required values.",
			},
		}
	}
	return info
}

func authoringAuditFields(value any) (bool, int, string, string) {
	encoded, err := json.Marshal(value)
	if err != nil {
		return false, 0, "", ""
	}
	fields := map[string]any{}
	if err := json.Unmarshal(encoded, &fields); err != nil {
		return false, 0, "", ""
	}
	replay, _ := fields["idempotencyReplay"].(bool)
	revision, _ := fields["revision"].(float64)
	version, _ := fields["generatorVersion"].(string)
	seedValue := ""
	if seed, ok := fields["seed"].(float64); ok {
		seedValue = fmt.Sprintf("%.0f", seed)
	}
	return replay, int(revision), version, seedValue
}

func stringArgument(arguments map[string]any, name string) string {
	value, _ := arguments[name].(string)
	return value
}

func firstStringArgument(arguments map[string]any, names ...string) string {
	for _, name := range names {
		if value := stringArgument(arguments, name); value != "" {
			return value
		}
	}
	return ""
}

func scopeValues(values []string) []appdomain.Scope {
	result := make([]appdomain.Scope, 0, len(values))
	for _, value := range values {
		result = append(result, appdomain.Scope(value))
	}
	return result
}

func auditResultClass(code appdomain.ErrorCode) string {
	switch code {
	case appdomain.CodeUnauthorized, appdomain.CodeForbidden:
		return "forbidden"
	case appdomain.CodeConflict, appdomain.CodeIdempotencyConflict:
		return "conflict"
	case appdomain.CodeValidation, appdomain.CodeNotFound, appdomain.CodeUnsupported:
		return "validation_failure"
	case appdomain.CodeRateLimited:
		return "rate_limited"
	case appdomain.CodeTimeout:
		return "timeout"
	default:
		return "internal_error"
	}
}
