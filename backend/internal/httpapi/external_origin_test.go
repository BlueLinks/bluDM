package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"bludm/backend/internal/config"
)

func TestRemoteOIDCRequiresConfiguredForwardedPublicOrigin(t *testing.T) {
	server := &Server{cfg: config.Config{
		PublicAppURL: "https://bludm.example",
		MCP: config.MCPConfig{
			OIDCEnabled: true, TrustForwardedHeaders: true,
		},
	}}
	handler := server.withExternalPublicOrigin(http.HandlerFunc(
		func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) },
	))
	valid := httptest.NewRequest(http.MethodPost, "http://bludm.example/mcp", nil)
	valid.Host = "bludm.example"
	valid.Header.Set("X-Forwarded-Proto", "https")
	validResponse := httptest.NewRecorder()
	handler.ServeHTTP(validResponse, valid)
	if validResponse.Code != http.StatusNoContent {
		t.Fatalf("trusted public origin was rejected: %d %s",
			validResponse.Code, validResponse.Body.String())
	}

	spoofed := httptest.NewRequest(http.MethodPost, "http://attacker.example/mcp", nil)
	spoofed.Host = "attacker.example"
	spoofed.Header.Set("X-Forwarded-Proto", "https")
	spoofedResponse := httptest.NewRecorder()
	handler.ServeHTTP(spoofedResponse, spoofed)
	if spoofedResponse.Code != http.StatusForbidden {
		t.Fatalf("wrong public host was accepted: %d", spoofedResponse.Code)
	}
}
