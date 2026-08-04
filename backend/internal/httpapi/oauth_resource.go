package httpapi

import (
	"net/http"

	appdomain "bludm/backend/internal/app"
)

func (s *Server) oauthProtectedResourceMetadata(w http.ResponseWriter, _ *http.Request) {
	authorizationServers := []string{}
	if s.cfg.MCP.OIDCEnabled {
		authorizationServers = append(authorizationServers, s.cfg.MCP.OIDCIssuer)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"resource":                 s.cfg.MCP.ResourceURL,
		"authorization_servers":    authorizationServers,
		"bearer_methods_supported": []string{"header"},
		"scopes_supported":         appdomain.ScopeStrings(appdomain.AllScopes),
		"resource_documentation":   s.cfg.PublicAppURL + "/docs/mcp",
	})
}
