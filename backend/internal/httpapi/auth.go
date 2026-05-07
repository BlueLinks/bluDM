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

	"golang.org/x/crypto/bcrypt"
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
		"setupRequired": !hasUser,
		"authenticated": ok,
		"user":          user,
	})
}

func (s *Server) setup(w http.ResponseWriter, r *http.Request) {
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
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if err := s.startSession(w, r, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not start session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("bludm_session")
	if err == nil {
		_ = s.deleteSession(r.Context(), cookie.Value)
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
	var user models.User
	err := s.db.QueryRow(ctx, `
		insert into users (email, password_hash)
		values ($1, $2)
		returning id, email, password_hash, created_at
	`, email, passwordHash).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	return user, err
}

func (s *Server) userByEmail(ctx context.Context, email string) (models.User, error) {
	var user models.User
	err := s.db.QueryRow(ctx, `
		select id, email, password_hash, created_at
		from users
		where email = $1
	`, email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	return user, err
}

func (s *Server) userBySessionToken(ctx context.Context, token string) (models.User, error) {
	tokenHash := hashToken(token)
	var user models.User
	err := s.db.QueryRow(ctx, `
		select users.id, users.email, users.password_hash, users.created_at
		from sessions
		join users on users.id = sessions.user_id
		where sessions.token_hash = $1 and sessions.expires_at > now()
	`, tokenHash).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	return user, err
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
	if len(req.Password) < 12 {
		return errors.New("password must be at least 12 characters")
	}
	return nil
}

type authRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type userContextKey struct{}
