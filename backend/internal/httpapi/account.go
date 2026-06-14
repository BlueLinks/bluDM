package httpapi

import (
	"context"
	"errors"
	"net/http"
	neturl "net/url"
	"strings"

	"bludm/backend/internal/store"

	"golang.org/x/crypto/bcrypt"
)

type setPasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type unlinkIdentityRequest struct {
	Password string `json:"password"`
}

type updateAccountAvatarRequest struct {
	AvatarAssetID string `json:"avatarAssetId"`
	AvatarURL     string `json:"avatarUrl"`
}

func (s *Server) getAccount(w http.ResponseWriter, r *http.Request) {
	user, ok := currentUserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	account, err := s.accountForUser(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load account")
		return
	}
	writeJSON(w, http.StatusOK, account)
}

func (s *Server) setPassword(w http.ResponseWriter, r *http.Request) {
	user, ok := currentUserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req setPasswordRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := validatePassword(req.NewPassword); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if user.PasswordHash != "" && bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)) != nil {
		writeError(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}
	if err := s.stores.Auth.SetPassword(r.Context(), user.ID, string(hash)); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update password")
		return
	}
	account, err := s.accountForUser(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load account")
		return
	}
	writeJSON(w, http.StatusOK, account)
}

func (s *Server) updateAccountAvatar(w http.ResponseWriter, r *http.Request) {
	user, ok := currentUserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req updateAccountAvatarRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.AvatarAssetID = strings.TrimSpace(req.AvatarAssetID)
	req.AvatarURL = strings.TrimSpace(req.AvatarURL)
	if req.AvatarAssetID != "" && req.AvatarURL != "" {
		writeError(w, http.StatusBadRequest, "choose an uploaded avatar or an avatar URL, not both")
		return
	}
	if req.AvatarURL != "" && !validExternalAvatarURL(req.AvatarURL) {
		writeError(w, http.StatusBadRequest, "avatar URL must start with http:// or https://")
		return
	}
	if err := s.validateOwnedAsset(r.Context(), req.AvatarAssetID); err != nil {
		writeError(w, http.StatusNotFound, "avatar image not found")
		return
	}
	if err := s.stores.Auth.UpdateAvatar(r.Context(), user.ID, req.AvatarAssetID, req.AvatarURL); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update avatar")
		return
	}
	account, err := s.accountForUser(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load account")
		return
	}
	writeJSON(w, http.StatusOK, account)
}

func validExternalAvatarURL(rawURL string) bool {
	parsed, err := neturl.ParseRequestURI(rawURL)
	return err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}

func (s *Server) unlinkOAuthIdentity(w http.ResponseWriter, r *http.Request) {
	user, ok := currentUserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	provider := strings.TrimSpace(strings.ToLower(r.PathValue("provider")))
	if provider != oauthGoogle && provider != oauthDiscord {
		writeError(w, http.StatusNotFound, "auth provider is not configured")
		return
	}
	var req unlinkIdentityRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if user.PasswordHash != "" && bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}
	account, err := s.accountForUser(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load account")
		return
	}
	if !account.HasPassword && len(account.Identities) <= 1 {
		writeError(w, http.StatusBadRequest, "set a password before unlinking your last sign-in provider")
		return
	}
	if err := s.stores.Auth.UnlinkIdentity(r.Context(), user.ID, provider); store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "linked account not found")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "could not unlink account")
		return
	}
	account, err = s.accountForUser(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load account")
		return
	}
	writeJSON(w, http.StatusOK, account)
}

func (s *Server) accountForUser(ctx context.Context, userID string) (store.Account, error) {
	return s.stores.Auth.Account(ctx, userID)
}

func (s *Server) linkOAuthIdentity(ctx context.Context, userID, provider string, identity oauthIdentity) error {
	err := s.stores.Auth.LinkOAuthIdentity(ctx, userID, provider, store.OAuthIdentityInput{
		Subject:       identity.Subject,
		Email:         identity.Email,
		EmailVerified: identity.EmailVerified,
	})
	if errors.Is(err, store.ErrOAuthIdentityAlreadyLinked) {
		return errOAuthIdentityAlreadyLinked
	}
	return err
}
