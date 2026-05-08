package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type accountIdentity struct {
	Provider      string `json:"provider"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"emailVerified"`
	CreatedAt     string `json:"createdAt"`
	LastLoginAt   string `json:"lastLoginAt"`
}

type accountResponse struct {
	Email       string            `json:"email"`
	HasPassword bool              `json:"hasPassword"`
	Identities  []accountIdentity `json:"identities"`
	Stats       accountStats      `json:"stats"`
}

type accountStats struct {
	Campaigns        int `json:"campaigns"`
	PlayerCharacters int `json:"playerCharacters"`
	Creatures        int `json:"creatures"`
	Spells           int `json:"spells"`
	ActionTemplates  int `json:"actionTemplates"`
	Encounters       int `json:"encounters"`
}

type setPasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type unlinkIdentityRequest struct {
	Password string `json:"password"`
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
	if _, err := s.db.Exec(r.Context(), `update users set password_hash = $2 where id = $1`, user.ID, string(hash)); err != nil {
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
	tag, err := s.db.Exec(r.Context(), `delete from auth_identities where user_id = $1 and provider = $2`, user.ID, provider)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not unlink account")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "linked account not found")
		return
	}
	account, err = s.accountForUser(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load account")
		return
	}
	writeJSON(w, http.StatusOK, account)
}

func (s *Server) accountForUser(ctx context.Context, userID string) (accountResponse, error) {
	var account accountResponse
	var passwordHash string
	err := s.db.QueryRow(ctx, `
		select email, coalesce(password_hash, '')
		from users
		where id = $1
	`, userID).Scan(&account.Email, &passwordHash)
	if err != nil {
		return accountResponse{}, err
	}
	account.HasPassword = passwordHash != ""
	account.Identities = []accountIdentity{}
	if err := s.db.QueryRow(ctx, `
		select
			(select count(*) from campaigns where owner_user_id = $1),
			(select count(*) from players join campaigns on campaigns.id = players.campaign_id where campaigns.owner_user_id = $1),
			(select count(*) from creatures where owner_user_id = $1),
			(select count(*) from spells where owner_user_id = $1),
			(select count(*) from action_templates where owner_user_id = $1),
			(select count(*) from encounters join campaigns on campaigns.id = encounters.campaign_id where campaigns.owner_user_id = $1)
	`, userID).Scan(
		&account.Stats.Campaigns,
		&account.Stats.PlayerCharacters,
		&account.Stats.Creatures,
		&account.Stats.Spells,
		&account.Stats.ActionTemplates,
		&account.Stats.Encounters,
	); err != nil {
		return accountResponse{}, err
	}
	rows, err := s.db.Query(ctx, `
		select provider, email, email_verified, created_at::text, last_login_at::text
		from auth_identities
		where user_id = $1
		order by provider
	`, userID)
	if err != nil {
		return accountResponse{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var identity accountIdentity
		if err := rows.Scan(&identity.Provider, &identity.Email, &identity.EmailVerified, &identity.CreatedAt, &identity.LastLoginAt); err != nil {
			return accountResponse{}, err
		}
		account.Identities = append(account.Identities, identity)
	}
	return account, rows.Err()
}

func (s *Server) linkOAuthIdentity(ctx context.Context, userID, provider string, identity oauthIdentity) error {
	identity.Email = strings.TrimSpace(strings.ToLower(identity.Email))
	var linkedUserID string
	err := s.db.QueryRow(ctx, `
		select user_id::text
		from auth_identities
		where provider = $1 and provider_subject = $2
	`, provider, identity.Subject).Scan(&linkedUserID)
	if err == nil && linkedUserID != userID {
		return errOAuthIdentityAlreadyLinked
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	var existingSubject string
	err = s.db.QueryRow(ctx, `
		select provider_subject
		from auth_identities
		where user_id = $1 and provider = $2
	`, userID, provider).Scan(&existingSubject)
	if err == nil && existingSubject != identity.Subject {
		return errors.New("this account already has a different identity for that provider")
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	_, err = s.db.Exec(ctx, `
		insert into auth_identities (user_id, provider, provider_subject, email, email_verified, last_login_at)
		values ($1, $2, $3, $4, $5, now())
		on conflict (provider, provider_subject) do update
		set email = excluded.email,
			email_verified = excluded.email_verified,
			last_login_at = now()
	`, userID, provider, identity.Subject, identity.Email, identity.EmailVerified)
	return err
}
