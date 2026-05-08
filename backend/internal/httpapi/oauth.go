package httpapi

import (
	"context"
	"crypto/ecdsa"
	crand "crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

const (
	oauthGoogle = "google"
	oauthApple  = "apple"
)

type authProviderInfo struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	URL   string `json:"url"`
}

func (s *Server) authProviders(w http.ResponseWriter, r *http.Request) {
	providers := []authProviderInfo{}
	for _, provider := range s.enabledOAuthProviders() {
		providers = append(providers, authProviderInfo{
			ID:    provider,
			Label: providerLabel(provider),
			URL:   "/api/auth/" + provider + "/start",
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"providers":        providers,
		"localAuthEnabled": s.cfg.LocalAuthEnabled,
	})
}

func (s *Server) oauthStart(w http.ResponseWriter, r *http.Request) {
	providerName := strings.TrimSpace(strings.ToLower(r.PathValue("provider")))
	oauthConfig, verifier, err := s.oauthConfig(r.Context(), providerName)
	if err != nil {
		writeError(w, http.StatusNotFound, "auth provider is not configured")
		return
	}
	state, err := randomToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start sign-in")
		return
	}
	nonce, err := randomToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start sign-in")
		return
	}
	returnTo := sanitizeReturnTo(r.URL.Query().Get("returnTo"))
	if _, err := s.db.Exec(r.Context(), `
		delete from oauth_states where expires_at < now();
		insert into oauth_states (state_hash, provider, nonce, pkce_verifier, return_to, expires_at)
		values ($1, $2, $3, $4, $5, now() + interval '10 minutes')
	`, hashToken(state), providerName, nonce, verifier, returnTo); err != nil {
		writeError(w, http.StatusInternalServerError, "could not start sign-in")
		return
	}
	http.Redirect(w, r, oauthConfig.AuthCodeURL( // #nosec G710 -- Redirect target is the configured Google/Apple authorization endpoint, not user-controlled input.
		state,
		oauth2.AccessTypeOnline,
		oauth2.SetAuthURLParam("nonce", nonce),
		oauth2.SetAuthURLParam("code_challenge", pkceChallenge(verifier)),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
	), http.StatusFound)
}

func (s *Server) oauthCallback(w http.ResponseWriter, r *http.Request) {
	providerName := strings.TrimSpace(strings.ToLower(r.PathValue("provider")))
	if err := r.ParseForm(); err != nil {
		writeError(w, http.StatusBadRequest, "invalid callback")
		return
	}
	if errText := strings.TrimSpace(r.Form.Get("error")); errText != "" {
		writeError(w, http.StatusBadRequest, "sign-in failed: "+errText)
		return
	}
	code := strings.TrimSpace(r.Form.Get("code"))
	state := strings.TrimSpace(r.Form.Get("state"))
	if code == "" || state == "" {
		writeError(w, http.StatusBadRequest, "invalid callback")
		return
	}
	var saved struct {
		Provider string
		Nonce    string
		Verifier string
		ReturnTo string
	}
	err := s.db.QueryRow(r.Context(), `
		delete from oauth_states
		where state_hash = $1 and expires_at > now()
		returning provider, nonce, pkce_verifier, return_to
	`, hashToken(state)).Scan(&saved.Provider, &saved.Nonce, &saved.Verifier, &saved.ReturnTo)
	if err != nil || saved.Provider != providerName {
		writeError(w, http.StatusBadRequest, "sign-in session expired")
		return
	}
	oauthConfig, _, err := s.oauthConfigWithVerifier(r.Context(), providerName, saved.Verifier)
	if err != nil {
		writeError(w, http.StatusNotFound, "auth provider is not configured")
		return
	}
	token, err := oauthConfig.Exchange(r.Context(), code, oauth2.SetAuthURLParam("code_verifier", saved.Verifier))
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not exchange sign-in code")
		return
	}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		writeError(w, http.StatusBadRequest, "provider did not return an identity token")
		return
	}
	identity, err := s.verifyOAuthIdentity(r.Context(), providerName, rawIDToken, oauthConfig.ClientID, saved.Nonce)
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not verify identity")
		return
	}
	user, err := s.findOrCreateOAuthUser(r.Context(), providerName, identity.Subject, identity.Email, identity.EmailVerified)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create user")
		return
	}
	if err := s.startSession(w, r, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not start session")
		return
	}
	http.Redirect(w, r, saved.ReturnTo, http.StatusFound)
}

type oauthIdentity struct {
	Subject       string
	Email         string
	EmailVerified bool
}

func (s *Server) verifyOAuthIdentity(ctx context.Context, providerName, rawIDToken, clientID, nonce string) (oauthIdentity, error) {
	issuer := "https://accounts.google.com"
	if providerName == oauthApple {
		issuer = "https://appleid.apple.com"
	}
	provider, err := oidc.NewProvider(ctx, issuer)
	if err != nil {
		return oauthIdentity{}, err
	}
	idToken, err := provider.Verifier(&oidc.Config{ClientID: clientID}).Verify(ctx, rawIDToken)
	if err != nil {
		return oauthIdentity{}, err
	}
	if idToken.Nonce != nonce {
		return oauthIdentity{}, errors.New("nonce mismatch")
	}
	var claims struct {
		Subject       string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified any    `json:"email_verified"`
	}
	if err := idToken.Claims(&claims); err != nil {
		return oauthIdentity{}, err
	}
	email := strings.TrimSpace(strings.ToLower(claims.Email))
	if claims.Subject == "" || email == "" || !strings.Contains(email, "@") {
		return oauthIdentity{}, errors.New("provider identity is missing a usable email")
	}
	return oauthIdentity{
		Subject:       claims.Subject,
		Email:         email,
		EmailVerified: emailVerifiedBool(claims.EmailVerified),
	}, nil
}

func (s *Server) oauthConfig(ctx context.Context, providerName string) (*oauth2.Config, string, error) {
	verifier, err := randomToken()
	if err != nil {
		return nil, "", err
	}
	config, _, err := s.oauthConfigWithVerifier(ctx, providerName, verifier)
	return config, verifier, err
}

func (s *Server) oauthConfigWithVerifier(ctx context.Context, providerName, verifier string) (*oauth2.Config, string, error) {
	redirectURL := s.cfg.PublicAppURL + "/api/auth/" + providerName + "/callback"
	switch providerName {
	case oauthGoogle:
		if s.cfg.OAuth.Google.ClientID == "" || s.cfg.OAuth.Google.ClientSecret == "" {
			return nil, "", errors.New("google oauth is not configured")
		}
		provider, err := oidc.NewProvider(ctx, "https://accounts.google.com")
		if err != nil {
			return nil, "", err
		}
		return &oauth2.Config{
			ClientID:     s.cfg.OAuth.Google.ClientID,
			ClientSecret: s.cfg.OAuth.Google.ClientSecret,
			RedirectURL:  redirectURL,
			Endpoint:     provider.Endpoint(),
			Scopes:       []string{oidc.ScopeOpenID, "email"},
		}, verifier, nil
	case oauthApple:
		if s.cfg.OAuth.Apple.ClientID == "" || s.cfg.OAuth.Apple.TeamID == "" || s.cfg.OAuth.Apple.KeyID == "" || s.cfg.OAuth.Apple.PrivateKey == "" {
			return nil, "", errors.New("apple oauth is not configured")
		}
		secret, err := appleClientSecret(s.cfg.OAuth.Apple.TeamID, s.cfg.OAuth.Apple.ClientID, s.cfg.OAuth.Apple.KeyID, s.cfg.OAuth.Apple.PrivateKey)
		if err != nil {
			return nil, "", err
		}
		provider, err := oidc.NewProvider(ctx, "https://appleid.apple.com")
		if err != nil {
			return nil, "", err
		}
		return &oauth2.Config{
			ClientID:     s.cfg.OAuth.Apple.ClientID,
			ClientSecret: secret,
			RedirectURL:  redirectURL,
			Endpoint:     provider.Endpoint(),
			Scopes:       []string{oidc.ScopeOpenID, "email"},
		}, verifier, nil
	default:
		return nil, "", errors.New("unknown oauth provider")
	}
}

func (s *Server) enabledOAuthProviders() []string {
	providers := []string{}
	if s.cfg.OAuth.Google.ClientID != "" && s.cfg.OAuth.Google.ClientSecret != "" {
		providers = append(providers, oauthGoogle)
	}
	if s.cfg.OAuth.Apple.ClientID != "" && s.cfg.OAuth.Apple.TeamID != "" && s.cfg.OAuth.Apple.KeyID != "" && s.cfg.OAuth.Apple.PrivateKey != "" {
		providers = append(providers, oauthApple)
	}
	return providers
}

func providerLabel(provider string) string {
	switch provider {
	case oauthGoogle:
		return "Continue with Google"
	case oauthApple:
		return "Continue with Apple"
	default:
		return "Continue"
	}
}

func pkceChallenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func sanitizeReturnTo(value string) string {
	if value == "" {
		return "/"
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.IsAbs() || strings.HasPrefix(value, "//") {
		return "/"
	}
	if !strings.HasPrefix(value, "/") {
		return "/"
	}
	return value
}

func emailVerifiedBool(value any) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		return typed == "true"
	default:
		return false
	}
}

func appleClientSecret(teamID, clientID, keyID, privateKey string) (string, error) {
	key, err := parseApplePrivateKey(privateKey)
	if err != nil {
		return "", err
	}
	header, _ := json.Marshal(map[string]string{"alg": "ES256", "kid": keyID})
	now := time.Now()
	claims, _ := json.Marshal(map[string]any{
		"iss": teamID,
		"iat": now.Unix(),
		"exp": now.Add(24 * time.Hour).Unix(),
		"aud": "https://appleid.apple.com",
		"sub": clientID,
	})
	unsigned := base64.RawURLEncoding.EncodeToString(header) + "." + base64.RawURLEncoding.EncodeToString(claims)
	sum := sha256.Sum256([]byte(unsigned))
	r, s, err := ecdsa.Sign(crand.Reader, key, sum[:])
	if err != nil {
		return "", err
	}
	signature := append(padBigInt(r, 32), padBigInt(s, 32)...)
	return unsigned + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

func parseApplePrivateKey(value string) (*ecdsa.PrivateKey, error) {
	value = strings.ReplaceAll(value, `\n`, "\n")
	block, _ := pem.Decode([]byte(value))
	if block == nil {
		return nil, errors.New("invalid apple private key")
	}
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	ecdsaKey, ok := key.(*ecdsa.PrivateKey)
	if !ok {
		return nil, errors.New("apple private key must be ECDSA")
	}
	return ecdsaKey, nil
}

func padBigInt(value *big.Int, size int) []byte {
	bytes := value.Bytes()
	if len(bytes) >= size {
		return bytes
	}
	padded := make([]byte, size)
	copy(padded[size-len(bytes):], bytes)
	return padded
}
