package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSanitizeReturnTo(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "empty", input: "", want: "/"},
		{name: "relative path", input: "/campaigns/123", want: "/campaigns/123"},
		{name: "external absolute URL", input: "https://evil.example/campaigns", want: "/"},
		{name: "protocol relative URL", input: "//evil.example/campaigns", want: "/"},
		{name: "plain text", input: "campaigns", want: "/"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := sanitizeReturnTo(test.input); got != test.want {
				t.Fatalf("sanitizeReturnTo(%q) = %q, want %q", test.input, got, test.want)
			}
		})
	}
}

func TestRedirectToSanitizedReturnTo(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/auth/google/callback", nil)
	rec := httptest.NewRecorder()

	redirectToSanitizedReturnTo(rec, req, "https://evil.example/campaigns")

	if rec.Code != http.StatusFound {
		t.Fatalf("expected redirect status, got %d", rec.Code)
	}
	if location := rec.Header().Get("Location"); location != "/" {
		t.Fatalf("expected unsafe returnTo to redirect to root, got %q", location)
	}
}

func TestEmailVerifiedBool(t *testing.T) {
	if !emailVerifiedBool(true) {
		t.Fatal("bool true should be verified")
	}
	if !emailVerifiedBool("true") {
		t.Fatal("string true should be verified")
	}
	if emailVerifiedBool("false") {
		t.Fatal("string false should not be verified")
	}
}

func TestValidatePassword(t *testing.T) {
	if err := validatePassword("twelve-chars"); err != nil {
		t.Fatalf("expected password to be valid: %v", err)
	}
	if err := validatePassword("too-short"); err == nil {
		t.Fatal("expected short password to be rejected")
	}
}
