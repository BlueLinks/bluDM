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

func TestWriteExternalTextExportUsesSafeDownloadHeaders(t *testing.T) {
	request := httptest.NewRequest("GET", "/api/external/v1/export", nil)
	response := httptest.NewRecorder()
	content := "name: <script>alert('untrusted')</script>\n"

	writeExternalTextExport(response, request, "application/yaml; charset=utf-8", "statblock.yaml", content)

	result := response.Result()
	defer result.Body.Close()
	if got := result.Header.Get("Content-Type"); got != "application/yaml; charset=utf-8" {
		t.Fatalf("unexpected content type: %q", got)
	}
	if got := result.Header.Get("Content-Disposition"); got != `attachment; filename="statblock.yaml"` {
		t.Fatalf("unexpected content disposition: %q", got)
	}
	if got := result.Header.Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("unexpected content type protection: %q", got)
	}
	body, err := io.ReadAll(result.Body)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	if string(body) != content {
		t.Fatalf("export content changed: %q", body)
	}
}
