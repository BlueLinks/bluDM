package httpapi

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/config"
	"bludm/backend/internal/models"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
)

func TestOIDCAuthorizationCodePKCEFlowProducesValidResourceToken(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	signer, err := jose.NewSigner(
		jose.SigningKey{Algorithm: jose.RS256, Key: key},
		new(jose.SignerOptions).WithType("JWT").WithHeader("kid", "pkce-key"),
	)
	if err != nil {
		t.Fatal(err)
	}
	const (
		code        = "local-test-code"
		clientID    = "codex-local-test"
		audience    = "bludm-mcp"
		redirectURI = "http://client.test/callback"
	)
	var issuer string
	var expectedChallenge string
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeTestJSON(t, w, map[string]any{
				"issuer": issuer, "jwks_uri": issuer + "/jwks",
				"authorization_endpoint":                issuer + "/authorize",
				"token_endpoint":                        issuer + "/token",
				"response_types_supported":              []string{"code"},
				"subject_types_supported":               []string{"public"},
				"id_token_signing_alg_values_supported": []string{"RS256"},
				"code_challenge_methods_supported":      []string{"S256"},
			})
		case "/jwks":
			writeTestJSON(t, w, jose.JSONWebKeySet{Keys: []jose.JSONWebKey{{
				Key: &key.PublicKey, KeyID: "pkce-key", Algorithm: string(jose.RS256), Use: "sig",
			}}})
		case "/authorize":
			query := r.URL.Query()
			if query.Get("response_type") != "code" ||
				query.Get("client_id") != clientID ||
				query.Get("redirect_uri") != redirectURI ||
				query.Get("code_challenge_method") != "S256" ||
				query.Get("resource") != issuer+"/mcp" {
				http.Error(w, "invalid authorization request", http.StatusBadRequest)
				return
			}
			expectedChallenge = query.Get("code_challenge")
			target, _ := url.Parse(redirectURI)
			values := target.Query()
			values.Set("code", code)
			values.Set("state", query.Get("state"))
			target.RawQuery = values.Encode()
			http.Redirect(w, r, target.String(), http.StatusFound)
		case "/token":
			if err := r.ParseForm(); err != nil {
				http.Error(w, "invalid form", http.StatusBadRequest)
				return
			}
			sum := sha256.Sum256([]byte(r.Form.Get("code_verifier")))
			challenge := base64.RawURLEncoding.EncodeToString(sum[:])
			if r.Form.Get("grant_type") != "authorization_code" ||
				r.Form.Get("code") != code ||
				r.Form.Get("redirect_uri") != redirectURI ||
				r.Form.Get("client_id") != clientID ||
				challenge != expectedChallenge {
				http.Error(w, "invalid grant", http.StatusBadRequest)
				return
			}
			now := time.Now()
			raw, err := jwt.Signed(signer).Claims(jwt.Claims{
				Issuer: issuer, Subject: "subject-pkce", Audience: jwt.Audience{audience},
				IssuedAt: jwt.NewNumericDate(now.Add(-time.Minute)),
				Expiry:   jwt.NewNumericDate(now.Add(time.Hour)),
			}).Claims(map[string]any{
				"scope":               "campaigns:read world:read",
				"resource":            issuer + "/mcp",
				"client_id":           clientID,
				"bludm_campaign_mode": "selected",
				"bludm_campaign_ids":  []string{"campaign-1"},
			}).Serialize()
			if err != nil {
				t.Fatal(err)
			}
			writeTestJSON(t, w, map[string]any{
				"access_token": raw, "token_type": "Bearer", "expires_in": 3600,
				"scope": "campaigns:read world:read",
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer provider.Close()
	issuer = provider.URL

	verifierBytes := make([]byte, 48)
	if _, err := rand.Read(verifierBytes); err != nil {
		t.Fatal(err)
	}
	codeVerifier := base64.RawURLEncoding.EncodeToString(verifierBytes)
	sum := sha256.Sum256([]byte(codeVerifier))
	codeChallenge := base64.RawURLEncoding.EncodeToString(sum[:])
	authorizeURL, _ := url.Parse(issuer + "/authorize")
	query := authorizeURL.Query()
	query.Set("response_type", "code")
	query.Set("client_id", clientID)
	query.Set("redirect_uri", redirectURI)
	query.Set("scope", "campaigns:read world:read")
	query.Set("resource", issuer+"/mcp")
	query.Set("state", "state-1")
	query.Set("code_challenge", codeChallenge)
	query.Set("code_challenge_method", "S256")
	authorizeURL.RawQuery = query.Encode()
	client := &http.Client{CheckRedirect: func(
		_ *http.Request,
		_ []*http.Request,
	) error {
		return http.ErrUseLastResponse
	}}
	response, err := client.Get(authorizeURL.String())
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	callback, err := url.Parse(response.Header.Get("Location"))
	if err != nil || callback.Query().Get("state") != "state-1" {
		t.Fatalf("invalid authorization callback: %q (%v)", response.Header.Get("Location"), err)
	}

	tokenResponse, err := http.PostForm(issuer+"/token", url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {callback.Query().Get("code")},
		"redirect_uri":  {redirectURI},
		"client_id":     {clientID},
		"code_verifier": {codeVerifier},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer tokenResponse.Body.Close()
	var token struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
	}
	if err := json.NewDecoder(tokenResponse.Body).Decode(&token); err != nil {
		t.Fatal(err)
	}
	if tokenResponse.StatusCode != http.StatusOK ||
		!strings.EqualFold(token.TokenType, "bearer") {
		t.Fatalf("token exchange failed: status=%d token=%+v", tokenResponse.StatusCode, token)
	}

	resourceVerifier := newOIDCResourceVerifier(
		true, issuer, audience, issuer+"/mcp",
	)
	claims, err := resourceVerifier.verify(context.Background(), token.AccessToken)
	if err != nil {
		t.Fatal(err)
	}
	principal, err := principalFromOIDCClaims(
		models.User{ID: "user-1"}, claims,
	)
	if err != nil {
		t.Fatal(err)
	}
	if principal.Audit["clientName"] != clientID ||
		!principal.AllowsCampaign("campaign-1") ||
		principal.AllowsCampaign("campaign-2") {
		t.Fatalf("unexpected PKCE principal: %+v", principal)
	}
}

func TestOIDCResourceVerifierRejectsInvalidTokenBoundaries(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	signer, err := jose.NewSigner(
		jose.SigningKey{Algorithm: jose.RS256, Key: key},
		new(jose.SignerOptions).WithType("JWT").WithHeader("kid", "test-key"),
	)
	if err != nil {
		t.Fatal(err)
	}
	var issuer string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeTestJSON(t, w, map[string]any{
				"issuer": issuer, "jwks_uri": issuer + "/jwks",
				"authorization_endpoint":                issuer + "/authorize",
				"token_endpoint":                        issuer + "/token",
				"response_types_supported":              []string{"code"},
				"subject_types_supported":               []string{"public"},
				"id_token_signing_alg_values_supported": []string{"RS256"},
				"code_challenge_methods_supported":      []string{"S256"},
			})
		case "/jwks":
			writeTestJSON(t, w, jose.JSONWebKeySet{Keys: []jose.JSONWebKey{{
				Key: &key.PublicKey, KeyID: "test-key", Algorithm: string(jose.RS256), Use: "sig",
			}}})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()
	issuer = server.URL

	now := time.Now()
	valid := jwt.Claims{
		Issuer: issuer, Subject: "subject-1", Audience: jwt.Audience{"bludm-mcp"},
		IssuedAt: jwt.NewNumericDate(now.Add(-time.Minute)),
		Expiry:   jwt.NewNumericDate(now.Add(time.Hour)),
	}
	private := map[string]any{
		"scope":    "campaigns:read world:read",
		"resource": issuer + "/mcp",
	}
	cases := []struct {
		name    string
		claims  jwt.Claims
		private map[string]any
	}{
		{name: "valid", claims: valid, private: private},
		{name: "wrong issuer", claims: withIssuer(valid, issuer+"/other"), private: private},
		{name: "wrong audience", claims: withAudience(valid, "other-audience"), private: private},
		{name: "expired", claims: withExpiry(valid, now.Add(-time.Minute)), private: private},
		{name: "missing resource", claims: valid, private: map[string]any{
			"scope": "campaigns:read",
		}},
		{name: "wrong resource", claims: valid, private: map[string]any{
			"scope": "campaigns:read", "resource": issuer + "/other",
		}},
	}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			raw, err := jwt.Signed(signer).Claims(test.claims).Claims(test.private).Serialize()
			if err != nil {
				t.Fatal(err)
			}
			verifier := newOIDCResourceVerifier(
				true, issuer, "bludm-mcp", issuer+"/mcp",
			)
			_, err = verifier.verify(context.Background(), raw)
			if test.name == "valid" && err != nil {
				t.Fatalf("valid token rejected: %v", err)
			}
			if test.name != "valid" && err == nil {
				t.Fatal("invalid token was accepted")
			}
		})
	}
}

func TestPrincipalFromOIDCClaimsRejectsScopesAndCampaignRestrictions(t *testing.T) {
	user := models.User{ID: "user-1"}
	valid := oidcResourceClaims{
		Subject: "subject-1", Scope: "campaigns:read world:read",
		CampaignMode: "selected", CampaignIDs: []string{"campaign-1"},
		ClientID: "codex",
	}
	principal, err := principalFromOIDCClaims(user, valid)
	if err != nil {
		t.Fatal(err)
	}
	if !principal.AllowsCampaign("campaign-1") || principal.AllowsCampaign("campaign-2") {
		t.Fatalf("unexpected campaign restriction: %+v", principal)
	}
	for name, mutate := range map[string]func(*oidcResourceClaims){
		"missing scope":            func(claims *oidcResourceClaims) { claims.Scope = "" },
		"unknown scope":            func(claims *oidcResourceClaims) { claims.Scope = "unknown:scope" },
		"bad campaign mode":        func(claims *oidcResourceClaims) { claims.CampaignMode = "some" },
		"empty selected campaigns": func(claims *oidcResourceClaims) { claims.CampaignIDs = nil },
	} {
		t.Run(name, func(t *testing.T) {
			claims := valid
			mutate(&claims)
			if _, err := principalFromOIDCClaims(user, claims); err == nil {
				t.Fatal("invalid claims were accepted")
			}
		})
	}
}

func TestOAuthProtectedResourceMetadataAndChallengeUseMCPResourcePath(t *testing.T) {
	server := &Server{
		cfg: config.Config{
			PublicAppURL: "https://bludm.example",
			MCP: config.MCPConfig{
				ResourceURL: "https://bludm.example/mcp",
				OIDCEnabled: true,
				OIDCIssuer:  "https://identity.example",
			},
		},
		externalLimiter: requestRateLimiter{windows: map[string]rateWindow{}},
	}
	for _, path := range []string{
		"/.well-known/oauth-protected-resource",
		"/.well-known/oauth-protected-resource/mcp",
	} {
		response := httptest.NewRecorder()
		server.oauthProtectedResourceMetadata(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != http.StatusOK {
			t.Fatalf("%s returned %d", path, response.Code)
		}
		var metadata struct {
			Resource             string   `json:"resource"`
			AuthorizationServers []string `json:"authorization_servers"`
			Scopes               []string `json:"scopes_supported"`
		}
		if err := json.NewDecoder(response.Body).Decode(&metadata); err != nil {
			t.Fatal(err)
		}
		if metadata.Resource != "https://bludm.example/mcp" ||
			len(metadata.AuthorizationServers) != 1 ||
			len(metadata.Scopes) != len(appdomain.AllScopes) {
			t.Fatalf("incomplete protected-resource metadata: %+v", metadata)
		}
	}
	challenge := httptest.NewRecorder()
	server.writeBearerUnauthorized(
		challenge, httptest.NewRequest(http.MethodPost, "https://bludm.example/mcp", nil),
		"bearer token required",
	)
	if !strings.Contains(
		challenge.Header().Get("WWW-Authenticate"),
		"/.well-known/oauth-protected-resource/mcp",
	) {
		t.Fatalf("challenge omitted path-specific resource metadata: %q", challenge.Header().Get("WWW-Authenticate"))
	}
}

func writeTestJSON(t *testing.T, w http.ResponseWriter, value any) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Fatal(err)
	}
}

func withIssuer(claims jwt.Claims, issuer string) jwt.Claims {
	claims.Issuer = issuer
	return claims
}

func withAudience(claims jwt.Claims, audience string) jwt.Claims {
	claims.Audience = jwt.Audience{audience}
	return claims
}

func withExpiry(claims jwt.Claims, expiry time.Time) jwt.Claims {
	claims.Expiry = jwt.NewNumericDate(expiry)
	return claims
}
