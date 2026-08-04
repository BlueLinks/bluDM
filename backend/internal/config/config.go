package config

import (
	"errors"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Addr             string
	DatabaseURL      string
	SessionSecret    string
	AdminEmail       string
	AdminPassword    string
	CookieSecure     bool
	PublicAppURL     string
	LocalAuthEnabled bool
	OAuth            OAuthConfig
	MCP              MCPConfig
	SessionLifetime  time.Duration
}

type OAuthConfig struct {
	Google  OAuthProviderConfig
	Discord OAuthProviderConfig
}

type OAuthProviderConfig struct {
	ClientID     string
	ClientSecret string
}

type MCPConfig struct {
	ResourceURL                 string
	OIDCIssuer                  string
	OIDCAudience                string
	OIDCEnabled                 bool
	TrustForwardedHeaders       bool
	MaxRequestBytes             int64
	ToolExecutionTimeout        time.Duration
	ReadRequestsPerMinute       int
	WriteRequestsPerMinute      int
	GenerationRequestsPerMinute int
	AuthFailuresPerMinute       int
}

func Load() (Config, error) {
	_ = godotenv.Load("../.env", ".env")

	cfg := Config{
		Addr:             env("ADDR", ":8080"),
		DatabaseURL:      DatabaseURLFromEnv(),
		SessionSecret:    env("SESSION_SECRET", ""),
		AdminEmail:       env("ADMIN_EMAIL", ""),
		AdminPassword:    env("ADMIN_PASSWORD", ""),
		CookieSecure:     envBool("COOKIE_SECURE", false),
		PublicAppURL:     strings.TrimRight(env("PUBLIC_APP_URL", "http://localhost:3000"), "/"),
		LocalAuthEnabled: envBool("LOCAL_AUTH_ENABLED", true),
		OAuth: OAuthConfig{
			Google: OAuthProviderConfig{
				ClientID:     env("OAUTH_GOOGLE_CLIENT_ID", ""),
				ClientSecret: env("OAUTH_GOOGLE_CLIENT_SECRET", ""),
			},
			Discord: OAuthProviderConfig{
				ClientID:     env("OAUTH_DISCORD_CLIENT_ID", ""),
				ClientSecret: env("OAUTH_DISCORD_CLIENT_SECRET", ""),
			},
		},
		MCP: MCPConfig{
			ResourceURL:                 strings.TrimRight(env("MCP_RESOURCE_URL", ""), "/"),
			OIDCIssuer:                  strings.TrimRight(env("MCP_OIDC_ISSUER", ""), "/"),
			OIDCAudience:                env("MCP_OIDC_AUDIENCE", ""),
			OIDCEnabled:                 envBool("MCP_OIDC_ENABLED", false),
			TrustForwardedHeaders:       envBool("TRUST_FORWARDED_HEADERS", false),
			MaxRequestBytes:             int64(envInt("MCP_MAX_REQUEST_BYTES", 4<<20)),
			ToolExecutionTimeout:        time.Duration(envInt("MCP_TOOL_TIMEOUT_SECONDS", 60)) * time.Second,
			ReadRequestsPerMinute:       envInt("MCP_READ_REQUESTS_PER_MINUTE", 240),
			WriteRequestsPerMinute:      envInt("MCP_WRITE_REQUESTS_PER_MINUTE", 60),
			GenerationRequestsPerMinute: envInt("MCP_GENERATION_REQUESTS_PER_MINUTE", 20),
			AuthFailuresPerMinute:       envInt("MCP_AUTH_FAILURES_PER_MINUTE", 20),
		},
		SessionLifetime: 30 * 24 * time.Hour,
	}
	if cfg.MCP.ResourceURL == "" {
		cfg.MCP.ResourceURL = cfg.PublicAppURL + "/mcp"
	}

	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if len(cfg.SessionSecret) < 32 {
		return Config{}, errors.New("SESSION_SECRET must be at least 32 characters")
	}
	if cfg.AdminEmail != "" && len(cfg.AdminPassword) < 12 {
		return Config{}, errors.New("ADMIN_PASSWORD must be at least 12 characters when ADMIN_EMAIL is set")
	}
	if cfg.MCP.OIDCEnabled && (cfg.MCP.OIDCIssuer == "" || cfg.MCP.OIDCAudience == "") {
		return Config{}, errors.New("MCP_OIDC_ISSUER and MCP_OIDC_AUDIENCE are required when MCP_OIDC_ENABLED is true")
	}
	if cfg.MCP.OIDCEnabled &&
		(!strings.HasPrefix(cfg.PublicAppURL, "https://") ||
			!strings.HasPrefix(cfg.MCP.ResourceURL, "https://")) {
		return Config{}, errors.New("PUBLIC_APP_URL and MCP_RESOURCE_URL must use HTTPS when MCP_OIDC_ENABLED is true")
	}

	return cfg, nil
}

func DatabaseURLFromEnv() string {
	if value := env("DATABASE_URL", ""); value != "" {
		return value
	}

	user := env("DATABASE_USER", env("POSTGRES_USER", ""))
	password := env("DATABASE_PASSWORD", env("POSTGRES_PASSWORD", ""))
	host := env("DATABASE_HOST", "postgres")
	port := env("DATABASE_PORT", "5432")
	name := env("DATABASE_NAME", env("POSTGRES_DB", ""))
	sslMode := env("DATABASE_SSLMODE", "disable")
	if user == "" || host == "" || name == "" {
		return ""
	}

	databaseURL := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(user, password),
		Host:   net.JoinHostPort(host, port),
		Path:   name,
	}
	query := databaseURL.Query()
	query.Set("sslmode", sslMode)
	databaseURL.RawQuery = query.Encode()
	return databaseURL.String()
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func envBool(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}
