package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Timeout returns the timeout as a time.Duration
func (a AgentConfig) Timeout() time.Duration {
	if a.TimeoutSec == 0 {
		return 30 * time.Second
	}
	return time.Duration(a.TimeoutSec) * time.Second
}

// RetryDelay returns the retry delay as a time.Duration
func (a AgentConfig) RetryDelay() time.Duration {
	if a.RetryDelaySec == 0 {
		return 1 * time.Second
	}
	return time.Duration(a.RetryDelaySec) * time.Second
}

// Config holds all application configuration loaded from environment / .env file.
type Config struct {
	App    AppConfig
	DB     DBConfig
	Redis  RedisConfig
	JWT    JWTConfig
	Google GoogleConfig
	Sentry SentryConfig
	Resend ResendConfig
	Agent  AgentConfig
}

type AppConfig struct {
	Env         string
	Port        string
	Release     string // used for Sentry release tracking
	CORSOrigins []string
	FrontendURL string
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

// DSN returns a PostgreSQL connection string suitable for pgx / goose.
func (d DBConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode,
	)
}

// URL returns a PostgreSQL URL (postgres://...) for pgx pool.
func (d DBConfig) URL() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		d.User, d.Password, d.Host, d.Port, d.Name, d.SSLMode,
	)
}

type RedisConfig struct {
	Addr     string
	Password string
}

type JWTConfig struct {
	Secret         string
	AccessTTLMin   int
	RefreshTTLDays int
}

type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type SentryConfig struct {
	DSN string
}

type ResendConfig struct {
	APIKey  string
	From    string // e.g. "CV Generator <noreply@yourdomain.com>"
	AppName string
}

type AgentConfig struct {
	BaseURL       string
	TimeoutSec    int
	MaxRetries    int
	RetryDelaySec int
}

// Load reads configuration from .env (if present) and environment variables.
// Environment variables take precedence over .env file values.
func Load() (*Config, error) {
	v := viper.New()

	// Defaults
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("APP_PORT", "8080")
	v.SetDefault("APP_RELEASE", "dev")
	v.SetDefault("CORS_ORIGINS", "http://localhost:3000")
	v.SetDefault("DB_HOST", "localhost")
	v.SetDefault("DB_PORT", "5432")
	v.SetDefault("DB_USER", "postgres")
	v.SetDefault("DB_PASSWORD", "postgres")
	v.SetDefault("DB_NAME", "generate_cv")
	v.SetDefault("DB_SSLMODE", "disable")
	v.SetDefault("REDIS_ADDR", "localhost:6379")
	v.SetDefault("REDIS_PASSWORD", "")
	v.SetDefault("JWT_ACCESS_TTL_MINUTES", 15)
	v.SetDefault("JWT_REFRESH_TTL_DAYS", 30)
	v.SetDefault("SENTRY_DSN", "")
	v.SetDefault("FRONTEND_URL", "http://localhost:3000")
	v.SetDefault("RESEND_API_KEY", "")
	v.SetDefault("RESEND_FROM", "CV Generator <noreply@localhost>")
	v.SetDefault("RESEND_APP_NAME", "CV Generator")
	v.SetDefault("AGENT_BASE_URL", "http://localhost:8000")
	v.SetDefault("AGENT_TIMEOUT_SEC", 30)
	v.SetDefault("AGENT_MAX_RETRIES", 3)
	v.SetDefault("AGENT_RETRY_DELAY_SEC", 1)

	// Read .env file if it exists (silently ignore if not found)
	v.SetConfigName(".env")
	v.SetConfigType("env")
	v.AddConfigPath(".")
	_ = v.ReadInConfig()

	// Override with actual environment variables
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Parse CORS_ORIGINS as comma-separated list
	rawOrigins := v.GetString("CORS_ORIGINS")
	var corsOrigins []string
	for _, o := range strings.Split(rawOrigins, ",") {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			corsOrigins = append(corsOrigins, trimmed)
		}
	}

	cfg := &Config{
		App: AppConfig{
			Env:         v.GetString("APP_ENV"),
			Port:        v.GetString("APP_PORT"),
			Release:     v.GetString("APP_RELEASE"),
			CORSOrigins: corsOrigins,
			FrontendURL: v.GetString("FRONTEND_URL"),
		},
		DB: DBConfig{
			Host:     v.GetString("DB_HOST"),
			Port:     v.GetString("DB_PORT"),
			User:     v.GetString("DB_USER"),
			Password: v.GetString("DB_PASSWORD"),
			Name:     v.GetString("DB_NAME"),
			SSLMode:  v.GetString("DB_SSLMODE"),
		},
		Redis: RedisConfig{
			Addr:     v.GetString("REDIS_ADDR"),
			Password: v.GetString("REDIS_PASSWORD"),
		},
		JWT: JWTConfig{
			Secret:         v.GetString("JWT_SECRET"),
			AccessTTLMin:   v.GetInt("JWT_ACCESS_TTL_MINUTES"),
			RefreshTTLDays: v.GetInt("JWT_REFRESH_TTL_DAYS"),
		},
		Google: GoogleConfig{
			ClientID:     v.GetString("GOOGLE_CLIENT_ID"),
			ClientSecret: v.GetString("GOOGLE_CLIENT_SECRET"),
			RedirectURL:  v.GetString("GOOGLE_REDIRECT_URL"),
		},
		Sentry: SentryConfig{
			DSN: v.GetString("SENTRY_DSN"),
		},
		Resend: ResendConfig{
			APIKey:  v.GetString("RESEND_API_KEY"),
			From:    v.GetString("RESEND_FROM"),
			AppName: v.GetString("RESEND_APP_NAME"),
		},
		Agent: AgentConfig{
			BaseURL:       v.GetString("AGENT_BASE_URL"),
			TimeoutSec:    v.GetInt("AGENT_TIMEOUT_SEC"),
			MaxRetries:    v.GetInt("AGENT_MAX_RETRIES"),
			RetryDelaySec: v.GetInt("AGENT_RETRY_DELAY_SEC"),
		},
	}

	if cfg.JWT.Secret == "" || cfg.JWT.Secret == "change_me_to_a_random_secret_at_least_32_chars" {
		if cfg.App.Env == "production" {
			return nil, fmt.Errorf("JWT_SECRET must be set in production")
		}
	}

	return cfg, nil
}
