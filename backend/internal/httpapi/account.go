package httpapi

import (
	"context"
	"net/http"

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
}

type setPasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
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
