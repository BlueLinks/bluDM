package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	crand "crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

var (
	errOAuthEmailAlreadyRegistered = errors.New("email is already registered")
	errOAuthIdentityAlreadyLinked  = errors.New("that provider account is already linked to another bluDM account")
)

func (s *Server) authStatus(w http.ResponseWriter, r *http.Request) {
	hasUser, err := s.hasUser(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not check setup status")
		return
	}

	var user any
	currentUser, ok := s.currentUser(r)
	if ok {
		user = currentUser
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"setupRequired":    s.cfg.LocalAuthEnabled && !hasUser,
		"authenticated":    ok,
		"localAuthEnabled": s.cfg.LocalAuthEnabled,
		"user":             user,
	})
}

func (s *Server) setup(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.LocalAuthEnabled {
		writeError(w, http.StatusNotFound, "local auth is disabled")
		return
	}
	hasUser, err := s.hasUser(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not check setup status")
		return
	}
	if hasUser {
		writeError(w, http.StatusConflict, "setup is already complete")
		return
	}

	var req authRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if err := validateAuthRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	user, err := s.createUser(r.Context(), req.Email, string(hash))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create user")
		return
	}
	if err := s.startSession(w, r, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not start session")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"user": user})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.LocalAuthEnabled {
		writeError(w, http.StatusNotFound, "local auth is disabled")
		return
	}
	var req authRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	user, err := s.userByEmail(r.Context(), req.Email)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if user.PasswordHash == "" || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if err := s.startSession(w, r, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not start session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.LocalAuthEnabled {
		writeError(w, http.StatusNotFound, "local auth is disabled")
		return
	}
	var req authRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if err := validateAuthRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}
	user, err := s.createUser(r.Context(), req.Email, string(hash))
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "an account already exists for that email")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create account")
		return
	}
	if err := s.startSession(w, r, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not start session")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"user": user})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("bludm_session")
	if err == nil {
		_ = s.deleteSession(r.Context(), cookie.Value)
	}
	s.clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) deleteAccount(w http.ResponseWriter, r *http.Request) {
	user, ok := currentUserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req deleteAccountRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Confirm) != "DELETE" {
		writeError(w, http.StatusBadRequest, "type DELETE to confirm account deletion")
		return
	}
	if user.PasswordHash != "" && bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "current password is required to delete this account")
		return
	}
	if _, err := s.db.Exec(r.Context(), `delete from users where id = $1`, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete account")
		return
	}
	s.clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := s.currentUser(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		ctx := context.WithValue(r.Context(), userContextKey{}, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func currentUserFromContext(ctx context.Context) (models.User, bool) {
	user, ok := ctx.Value(userContextKey{}).(models.User)
	return user, ok
}

func currentUserID(ctx context.Context) (string, bool) {
	user, ok := currentUserFromContext(ctx)
	if !ok || user.ID == "" {
		return "", false
	}
	return user.ID, true
}

func currentUserIDMust(ctx context.Context) string {
	userID, _ := currentUserID(ctx)
	return userID
}

func (s *Server) currentUser(r *http.Request) (models.User, bool) {
	cookie, err := r.Cookie("bludm_session")
	if err != nil || cookie.Value == "" {
		return models.User{}, false
	}
	user, err := s.userBySessionToken(r.Context(), cookie.Value)
	if err != nil {
		return models.User{}, false
	}
	return user, true
}

func (s *Server) hasUser(ctx context.Context) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, `select exists(select 1 from users)`).Scan(&exists)
	return exists, err
}

func (s *Server) createUser(ctx context.Context, email, passwordHash string) (models.User, error) {
	return scanUser(s.db.QueryRow(ctx, `
		insert into users (email, password_hash)
		values ($1, $2)
		returning id, email, coalesce(password_hash, ''), coalesce(avatar_asset_id::text, ''), avatar_url, created_at
	`, email, passwordHash))
}

func (s *Server) findOrCreateOAuthUser(ctx context.Context, provider, subject, email string, emailVerified bool) (models.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	user, err := scanUser(s.db.QueryRow(ctx, `
		select users.id, users.email, coalesce(users.password_hash, ''), coalesce(users.avatar_asset_id::text, ''), users.avatar_url, users.created_at
		from auth_identities
		join users on users.id = auth_identities.user_id
		where auth_identities.provider = $1 and auth_identities.provider_subject = $2
	`, provider, subject))
	if err == nil {
		_, _ = s.db.Exec(ctx, `
			update auth_identities
			set email = $3, email_verified = $4, last_login_at = now()
			where provider = $1 and provider_subject = $2
		`, provider, subject, email, emailVerified)
		return user, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, err
	}
	if existing, err := s.userByEmail(ctx, email); err == nil && existing.ID != "" {
		return models.User{}, errOAuthEmailAlreadyRegistered
	} else if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, err
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.User{}, err
	}
	defer tx.Rollback(ctx)
	user, err = scanUser(tx.QueryRow(ctx, `
		insert into users (email, password_hash)
		values ($1, null)
		returning id, email, coalesce(password_hash, ''), coalesce(avatar_asset_id::text, ''), avatar_url, created_at
	`, email))
	if err != nil {
		if isUniqueViolation(err) {
			return models.User{}, errOAuthEmailAlreadyRegistered
		}
		return models.User{}, err
	}
	_, err = tx.Exec(ctx, `
		insert into auth_identities (user_id, provider, provider_subject, email, email_verified, last_login_at)
		values ($1, $2, $3, $4, $5, now())
	`, user.ID, provider, subject, email, emailVerified)
	if err != nil {
		if isUniqueViolation(err) {
			return models.User{}, errOAuthIdentityAlreadyLinked
		}
		return models.User{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.User{}, err
	}
	return user, nil
}

func (s *Server) userByEmail(ctx context.Context, email string) (models.User, error) {
	return scanUser(s.db.QueryRow(ctx, `
		select id, email, coalesce(password_hash, ''), coalesce(avatar_asset_id::text, ''), avatar_url, created_at
		from users
		where email = $1
	`, email))
}

func (s *Server) userBySessionToken(ctx context.Context, token string) (models.User, error) {
	tokenHash := hashToken(token)
	return scanUser(s.db.QueryRow(ctx, `
		select users.id, users.email, coalesce(users.password_hash, ''), coalesce(users.avatar_asset_id::text, ''), users.avatar_url, users.created_at
		from sessions
		join users on users.id = sessions.user_id
		where sessions.token_hash = $1 and sessions.expires_at > now()
	`, tokenHash))
}

func (s *Server) startSession(w http.ResponseWriter, r *http.Request, userID string) error {
	token, err := randomToken()
	if err != nil {
		return err
	}
	expiresAt := time.Now().Add(s.cfg.SessionLifetime)
	_, err = s.db.Exec(r.Context(), `
		insert into sessions (user_id, token_hash, expires_at)
		values ($1, $2, $3)
	`, userID, hashToken(token), expiresAt)
	if err != nil {
		return err
	}

	// nosemgrep: go.lang.security.audit.net.cookie-missing-secure.cookie-missing-secure -- Secure is environment-controlled for local HTTP self-hosting; production should set COOKIE_SECURE=true.
	http.SetCookie(w, &http.Cookie{ // #nosec G124 -- Secure is environment-controlled for local HTTP self-hosting; production should set COOKIE_SECURE=true.
		Name:     "bludm_session",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.cfg.CookieSecure,
		Expires:  expiresAt,
	})
	return nil
}

func (s *Server) deleteSession(ctx context.Context, token string) error {
	_, err := s.db.Exec(ctx, `delete from sessions where token_hash = $1`, hashToken(token))
	return err
}

func (s *Server) clearSessionCookie(w http.ResponseWriter) {
	// nosemgrep: go.lang.security.audit.net.cookie-missing-secure.cookie-missing-secure -- Secure is environment-controlled for local HTTP self-hosting; production should set COOKIE_SECURE=true.
	http.SetCookie(w, &http.Cookie{ // #nosec G124 -- Secure is environment-controlled for local HTTP self-hosting; production should set COOKIE_SECURE=true.
		Name:     "bludm_session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.cfg.CookieSecure,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func randomToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := crand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func validateAuthRequest(req authRequest) error {
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		return errors.New("valid email is required")
	}
	if err := validatePassword(req.Password); err != nil {
		return err
	}
	return nil
}

func validatePassword(password string) error {
	if len(password) < 12 {
		return errors.New("password must be at least 12 characters")
	}
	return nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

type authRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type deleteAccountRequest struct {
	Confirm  string `json:"confirm"`
	Password string `json:"password"`
}

type userContextKey struct{}
