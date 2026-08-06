package app

import (
	"context"
	"slices"
	"strings"
	"time"
)

type Scope string

const (
	ScopeCampaignsRead   Scope = "campaigns:read"
	ScopeCampaignsWrite  Scope = "campaigns:write"
	ScopePartyRead       Scope = "party:read"
	ScopePartyWrite      Scope = "party:write"
	ScopeWorldRead       Scope = "world:read"
	ScopeWorldWrite      Scope = "world:write"
	ScopeLibraryRead     Scope = "library:read"
	ScopeLibraryWrite    Scope = "library:write"
	ScopeEncountersRead  Scope = "encounters:read"
	ScopeEncountersWrite Scope = "encounters:write"
	ScopeGenerationRun   Scope = "generation:run"
	ScopeContentImport   Scope = "content:import"
	ScopeSessionsRead    Scope = "sessions:read"
)

var AllScopes = []Scope{
	ScopeCampaignsRead,
	ScopeCampaignsWrite,
	ScopePartyRead,
	ScopePartyWrite,
	ScopeWorldRead,
	ScopeWorldWrite,
	ScopeLibraryRead,
	ScopeLibraryWrite,
	ScopeEncountersRead,
	ScopeEncountersWrite,
	ScopeGenerationRun,
	ScopeContentImport,
	ScopeSessionsRead,
}

var ReadOnlyScopes = []Scope{
	ScopeCampaignsRead,
	ScopePartyRead,
	ScopeWorldRead,
	ScopeLibraryRead,
	ScopeEncountersRead,
	ScopeSessionsRead,
}

type AuthenticationMethod string

const (
	AuthenticationSession  AuthenticationMethod = "session"
	AuthenticationAPIToken AuthenticationMethod = "api_token"
	AuthenticationOIDC     AuthenticationMethod = "oidc"
)

type Principal struct {
	UserID                    string
	TokenID                   string
	SessionID                 string
	AuthenticationMethod      AuthenticationMethod
	Scopes                    []Scope
	AllowedCampaignIDs        []string
	CampaignRestrictionMode   string
	ExpiresAt                 *time.Time
	LegacyExternalCredentials bool
	Audit                     map[string]string
}

func (p Principal) Key() string {
	if p.TokenID != "" {
		return "user:" + p.UserID + ":token:" + p.TokenID
	}
	if p.SessionID != "" {
		return "user:" + p.UserID + ":session:" + p.SessionID
	}
	return "user:" + p.UserID + ":" + string(p.AuthenticationMethod)
}

func (p Principal) HasScope(scope Scope) bool {
	return slices.Contains(p.Scopes, scope)
}

func (p Principal) AllowsCampaign(campaignID string) bool {
	switch p.CampaignRestrictionMode {
	case "", "all", "legacy_all":
		return true
	case "selected":
		return slices.Contains(p.AllowedCampaignIDs, strings.TrimSpace(campaignID))
	default:
		return false
	}
}

type principalContextKey struct{}
type requestIDContextKey struct{}

func WithPrincipal(ctx context.Context, principal Principal) context.Context {
	return context.WithValue(ctx, principalContextKey{}, principal)
}

func PrincipalFromContext(ctx context.Context) (Principal, bool) {
	principal, ok := ctx.Value(principalContextKey{}).(Principal)
	return principal, ok && principal.UserID != ""
}

func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDContextKey{}, strings.TrimSpace(requestID))
}

func RequestIDFromContext(ctx context.Context) string {
	requestID, _ := ctx.Value(requestIDContextKey{}).(string)
	return strings.TrimSpace(requestID)
}

func ScopeStrings(scopes []Scope) []string {
	result := make([]string, 0, len(scopes))
	for _, scope := range scopes {
		result = append(result, string(scope))
	}
	return result
}

func ParseScopes(values []string) ([]Scope, error) {
	result := make([]Scope, 0, len(values))
	for _, value := range values {
		scope := Scope(strings.TrimSpace(value))
		if !slices.Contains(AllScopes, scope) {
			return nil, ValidationError("unknown_scope", "unknown token scope", map[string]any{
				"scope": value,
			})
		}
		if !slices.Contains(result, scope) {
			result = append(result, scope)
		}
	}
	slices.Sort(result)
	return result, nil
}

func LegacyReadScopes() []Scope {
	return append([]Scope(nil),
		ScopeCampaignsRead,
		ScopePartyRead,
		ScopeWorldRead,
		ScopeLibraryRead,
		ScopeEncountersRead,
		ScopeGenerationRun,
	)
}
