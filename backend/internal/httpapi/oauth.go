package httpapi

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

const (
	oauthGoogle  = "google"
	oauthDiscord = "discord"
	oauthLogin   = "login"
	oauthLink    = "link"
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
	s.startOAuthFlow(w, r, providerName, oauthLogin, "", sanitizeReturnTo(r.URL.Query().Get("returnTo")))
}

func (s *Server) oauthLinkStart(w http.ResponseWriter, r *http.Request) {
	user, ok := currentUserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	providerName := strings.TrimSpace(strings.ToLower(r.PathValue("provider")))
	s.startOAuthFlow(w, r, providerName, oauthLink, user.ID, "/settings")
}

func (s *Server) startOAuthFlow(w http.ResponseWriter, r *http.Request, providerName, purpose, userID, returnTo string) {
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
	if _, err := s.db.Exec(r.Context(), `delete from oauth_states where expires_at < now()`); err != nil {
		s.log.Error("oauth state cleanup failed", "provider", providerName, "error", err)
		writeError(w, http.StatusInternalServerError, "could not start sign-in")
		return
	}
	if _, err := s.db.Exec(r.Context(), `
		insert into oauth_states (state_hash, provider, nonce, pkce_verifier, purpose, user_id, return_to, expires_at)
		values ($1, $2, $3, $4, $5, nullif($6, '')::uuid, $7, now() + interval '10 minutes')
	`, hashToken(state), providerName, nonce, verifier, purpose, userID, returnTo); err != nil {
		s.log.Error("oauth state insert failed", "provider", providerName, "error", err)
		writeError(w, http.StatusInternalServerError, "could not start sign-in")
		return
	}
	http.Redirect(w, r, oauthConfig.AuthCodeURL( // #nosec G710 -- Redirect target is the configured provider authorization endpoint, not user-controlled input.
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
		Purpose  string
		UserID   string
	}
	err := s.db.QueryRow(r.Context(), `
		delete from oauth_states
		where state_hash = $1 and expires_at > now()
		returning provider, nonce, pkce_verifier, return_to, purpose, coalesce(user_id::text, '')
	`, hashToken(state)).Scan(&saved.Provider, &saved.Nonce, &saved.Verifier, &saved.ReturnTo, &saved.Purpose, &saved.UserID)
	if err != nil || saved.Provider != providerName {
		s.log.Warn("oauth callback state lookup failed", "provider", providerName, "error", err)
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
		s.log.Warn("oauth code exchange failed", "provider", providerName, "error", err)
		writeError(w, http.StatusBadRequest, "could not exchange sign-in code")
		return
	}
	identity, err := s.verifyOAuthIdentity(r.Context(), providerName, token, oauthConfig.ClientID, saved.Nonce)
	if err != nil {
		s.log.Warn("oauth identity verification failed", "provider", providerName, "error", err)
		writeError(w, http.StatusBadRequest, "could not verify identity")
		return
	}
	if saved.Purpose == oauthLink {
		user, ok := s.currentUser(r)
		if !ok || user.ID != saved.UserID {
			writeError(w, http.StatusUnauthorized, "sign-in session changed during account linking")
			return
		}
		if err := s.linkOAuthIdentity(r.Context(), user.ID, providerName, identity); err != nil {
			status := http.StatusBadRequest
			if errors.Is(err, errOAuthIdentityAlreadyLinked) {
				status = http.StatusConflict
			}
			writeError(w, status, err.Error())
			return
		}
		http.Redirect(w, r, saved.ReturnTo, http.StatusFound)
		return
	}
	user, err := s.findOrCreateOAuthUser(r.Context(), providerName, identity.Subject, identity.Email, identity.EmailVerified)
	if err != nil {
		if errors.Is(err, errOAuthEmailAlreadyRegistered) {
			writeError(w, http.StatusConflict, "an account already exists for that email; sign in with your password and link this provider from settings")
			return
		}
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

func (s *Server) verifyOAuthIdentity(ctx context.Context, providerName string, token *oauth2.Token, clientID, nonce string) (oauthIdentity, error) {
	if providerName == oauthDiscord {
		return verifyDiscordIdentity(ctx, token)
	}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return oauthIdentity{}, errors.New("provider did not return an identity token")
	}
	provider, err := oidc.NewProvider(ctx, "https://accounts.google.com")
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

func verifyDiscordIdentity(ctx context.Context, token *oauth2.Token) (oauthIdentity, error) {
	client := oauth2.NewClient(ctx, oauth2.StaticTokenSource(token))
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://discord.com/api/users/@me", nil)
	if err != nil {
		return oauthIdentity{}, err
	}
	response, err := client.Do(request)
	if err != nil {
		return oauthIdentity{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return oauthIdentity{}, errors.New("discord identity request failed")
	}
	var payload struct {
		ID       string `json:"id"`
		Email    string `json:"email"`
		Verified bool   `json:"verified"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return oauthIdentity{}, err
	}
	email := strings.TrimSpace(strings.ToLower(payload.Email))
	if payload.ID == "" || email == "" || !strings.Contains(email, "@") {
		return oauthIdentity{}, errors.New("discord identity is missing a usable email")
	}
	return oauthIdentity{
		Subject:       payload.ID,
		Email:         email,
		EmailVerified: payload.Verified,
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
	case oauthDiscord:
		if s.cfg.OAuth.Discord.ClientID == "" || s.cfg.OAuth.Discord.ClientSecret == "" {
			return nil, "", errors.New("discord oauth is not configured")
		}
		return &oauth2.Config{
			ClientID:     s.cfg.OAuth.Discord.ClientID,
			ClientSecret: s.cfg.OAuth.Discord.ClientSecret,
			RedirectURL:  redirectURL,
			Endpoint: oauth2.Endpoint{ // #nosec G101 -- These are public Discord OAuth endpoint URLs, not credentials.
				AuthURL:  "https://discord.com/oauth2/authorize",
				TokenURL: "https://discord.com/api/oauth2/token",
			},
			Scopes: []string{"identify", "email"},
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
	if s.cfg.OAuth.Discord.ClientID != "" && s.cfg.OAuth.Discord.ClientSecret != "" {
		providers = append(providers, oauthDiscord)
	}
	return providers
}

func providerLabel(provider string) string {
	switch provider {
	case oauthGoogle:
		return "Sign in with Google"
	case oauthDiscord:
		return "Sign in with Discord"
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
