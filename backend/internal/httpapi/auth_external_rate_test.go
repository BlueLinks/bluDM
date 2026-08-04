package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"bludm/backend/internal/config"
)

func TestExternalAuthenticationFailuresHaveDedicatedRateLimit(t *testing.T) {
	server := &Server{
		cfg: config.Config{
			PublicAppURL: "https://bludm.example",
			MCP:          config.MCPConfig{AuthFailuresPerMinute: 2},
		},
		externalLimiter: requestRateLimiter{windows: map[string]rateWindow{}},
	}
	handler := server.requireExternalAuth(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("unauthenticated request reached protected handler")
	}))
	for attempt, expected := range []int{
		http.StatusUnauthorized, http.StatusUnauthorized, http.StatusTooManyRequests,
	} {
		request := httptest.NewRequest(http.MethodGet, "/api/external/v1/campaigns", nil)
		request.RemoteAddr = "192.0.2.10:4567"
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != expected {
			t.Fatalf("attempt %d returned %d, expected %d", attempt+1, response.Code, expected)
		}
		if attempt == 0 && response.Header().Get("WWW-Authenticate") == "" {
			t.Fatal("initial authentication challenge omitted protected-resource metadata")
		}
		if attempt == 2 && response.Header().Get("Retry-After") != "60" {
			t.Fatal("rate-limited authentication failure omitted retry guidance")
		}
	}
}
