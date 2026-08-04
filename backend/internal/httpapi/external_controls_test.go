package httpapi

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"bludm/backend/internal/config"
)

func TestMCPRateLimitsUseToolSemanticsInsteadOfHTTPMethod(t *testing.T) {
	server := &Server{cfg: config.Config{MCP: config.MCPConfig{
		ReadRequestsPerMinute: 90, WriteRequestsPerMinute: 30,
		GenerationRequestsPerMinute: 10, MaxRequestBytes: 1 << 20,
	}}}
	tests := []struct {
		name      string
		tool      string
		wantClass string
		wantLimit int
	}{
		{name: "read", tool: "list_campaigns", wantClass: "read", wantLimit: 90},
		{name: "write", tool: "update_encounter", wantClass: "write", wantLimit: 30},
		{name: "generation", tool: "create_generated_encounter", wantClass: "generation", wantLimit: 10},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			body := `{"jsonrpc":"2.0","method":"tools/call","params":{"name":"` +
				test.tool + `","arguments":{}},"id":1}`
			request := httptest.NewRequest("POST", "/mcp", strings.NewReader(body))
			class, limit := server.externalRateClass(request)
			if class != test.wantClass || limit != test.wantLimit {
				t.Fatalf("got %s/%d, want %s/%d", class, limit, test.wantClass, test.wantLimit)
			}
			restored, err := io.ReadAll(request.Body)
			if err != nil || string(restored) != body {
				t.Fatalf("MCP body was not restored: %q (%v)", restored, err)
			}
		})
	}
}
