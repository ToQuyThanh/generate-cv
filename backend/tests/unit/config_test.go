package unit_test

import (
	"os"
	"testing"

	"github.com/yourname/generate-cv/config"
	"github.com/yourname/generate-cv/tests/testhelper"
)

// ─────────────────────────────────────────────
// config.Load()
// ─────────────────────────────────────────────

func TestConfig_Load_ReturnsDefaultValues(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() unexpected error: %v", err)
	}

	cases := []struct {
		name string
		got  string
		want string
	}{
		{"APP_PORT", cfg.App.Port, "8080"},
		{"DB_HOST", cfg.DB.Host, "localhost"},
		{"DB_PORT", cfg.DB.Port, "5432"},
		{"DB_USER", cfg.DB.User, "postgres"},
		{"DB_SSLMODE", cfg.DB.SSLMode, "disable"},
		{"REDIS_ADDR", cfg.Redis.Addr, "localhost:6379"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if tc.got != tc.want {
				t.Errorf("expected %q, got %q", tc.want, tc.got)
			}
		})
	}
}

func TestConfig_Load_DefaultJWTTTL(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.JWT.AccessTTLMin != 15 {
		t.Errorf("expected AccessTTLMin=15, got %d", cfg.JWT.AccessTTLMin)
	}
	if cfg.JWT.RefreshTTLDays != 30 {
		t.Errorf("expected RefreshTTLDays=30, got %d", cfg.JWT.RefreshTTLDays)
	}
}

func TestConfig_Load_EnvOverridesPort(t *testing.T) {
	testhelper.SetEnv(t, "APP_PORT", "9090")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.App.Port != "9090" {
		t.Errorf("expected port 9090, got %s", cfg.App.Port)
	}
}

func TestConfig_Load_EnvOverridesDBName(t *testing.T) {
	testhelper.SetEnv(t, "DB_NAME", "custom_db")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.DB.Name != "custom_db" {
		t.Errorf("expected DB_NAME=custom_db, got %s", cfg.DB.Name)
	}
}

func TestConfig_Load_EnvOverridesRedisAddr(t *testing.T) {
	testhelper.SetEnv(t, "REDIS_ADDR", "redis:6380")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.Redis.Addr != "redis:6380" {
		t.Errorf("expected REDIS_ADDR=redis:6380, got %s", cfg.Redis.Addr)
	}
}

func TestConfig_Load_MultipleEnvOverrides(t *testing.T) {
	testhelper.SetEnv(t, "APP_PORT", "3000")
	testhelper.SetEnv(t, "DB_NAME", "multi_override_db")
	testhelper.SetEnv(t, "JWT_ACCESS_TTL_MINUTES", "30")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.App.Port != "3000" {
		t.Errorf("expected port 3000, got %s", cfg.App.Port)
	}
	if cfg.DB.Name != "multi_override_db" {
		t.Errorf("expected db multi_override_db, got %s", cfg.DB.Name)
	}
	if cfg.JWT.AccessTTLMin != 30 {
		t.Errorf("expected AccessTTLMin=30, got %d", cfg.JWT.AccessTTLMin)
	}
}

func TestConfig_Load_ProductionRequiresJWTSecret(t *testing.T) {
	testhelper.SetEnv(t, "APP_ENV", "production")
	testhelper.UnsetEnv(t, "JWT_SECRET")

	_, err := config.Load()
	if err == nil {
		t.Error("expected error when JWT_SECRET is empty in production, got nil")
	}
}

func TestConfig_Load_DevelopmentAllowsEmptyJWTSecret(t *testing.T) {
	testhelper.SetEnv(t, "APP_ENV", "development")
	testhelper.UnsetEnv(t, "JWT_SECRET")

	_, err := config.Load()
	if err != nil {
		t.Errorf("expected no error in development without JWT_SECRET, got: %v", err)
	}
}

// ─────────────────────────────────────────────
// DBConfig.DSN()
// ─────────────────────────────────────────────

func TestDBConfig_DSN_Format(t *testing.T) {
	cfg := config.DBConfig{
		Host: "localhost", Port: "5432",
		User: "pguser", Password: "pgpass",
		Name: "mydb", SSLMode: "disable",
	}
	got := cfg.DSN()
	want := "host=localhost port=5432 user=pguser password=pgpass dbname=mydb sslmode=disable"
	if got != want {
		t.Errorf("DSN mismatch\ngot:  %s\nwant: %s", got, want)
	}
}

func TestDBConfig_DSN_WithSSLRequire(t *testing.T) {
	cfg := config.DBConfig{
		Host: "db.prod.example.com", Port: "5432",
		User: "app", Password: "secret",
		Name: "prod_db", SSLMode: "require",
	}
	got := cfg.DSN()
	if got == "" {
		t.Fatal("DSN must not be empty")
	}
	for _, substr := range []string{"host=db.prod.example.com", "sslmode=require", "user=app"} {
		if !containsStr(got, substr) {
			t.Errorf("DSN missing %q", substr)
		}
	}
}

// ─────────────────────────────────────────────
// DBConfig.URL()
// ─────────────────────────────────────────────

func TestDBConfig_URL_Format(t *testing.T) {
	cfg := config.DBConfig{
		Host: "localhost", Port: "5432",
		User: "pguser", Password: "pgpass",
		Name: "mydb", SSLMode: "disable",
	}
	got := cfg.URL()
	want := "postgres://pguser:pgpass@localhost:5432/mydb?sslmode=disable"
	if got != want {
		t.Errorf("URL mismatch\ngot:  %s\nwant: %s", got, want)
	}
}

func TestDBConfig_URL_StartsWithScheme(t *testing.T) {
	cfg := config.DBConfig{
		Host: "localhost", Port: "5432",
		User: "u", Password: "p",
		Name: "db", SSLMode: "disable",
	}
	got := cfg.URL()
	if len(got) < 11 || got[:11] != "postgres://" {
		t.Errorf("URL must start with postgres://, got: %s", got)
	}
}

func TestDBConfig_URL_ContainsSSLMode(t *testing.T) {
	for _, mode := range []string{"disable", "require", "verify-full"} {
		cfg := config.DBConfig{
			Host: "h", Port: "5432", User: "u", Password: "p",
			Name: "db", SSLMode: mode,
		}
		got := cfg.URL()
		expected := "sslmode=" + mode
		if !containsStr(got, expected) {
			t.Errorf("URL missing %q for mode %s", expected, mode)
		}
	}
}

// ─────────────────────────────────────────────
// AppConfig helpers
// ─────────────────────────────────────────────

func TestConfig_AppEnv_IsSet(t *testing.T) {
	testhelper.SetEnv(t, "APP_ENV", "staging")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.App.Env != "staging" {
		t.Errorf("expected APP_ENV=staging, got %s", cfg.App.Env)
	}
}

func TestConfig_EnvCleanup(t *testing.T) {
	// Ensure SetEnv restores original value after test
	testhelper.SetEnv(t, "APP_PORT", "1111")
	// After test ends, APP_PORT should be restored automatically by t.Cleanup
}

func TestConfig_EnvRestored_AfterCleanup(t *testing.T) {
	original := os.Getenv("APP_PORT")
	// This subtest sets APP_PORT then immediately ends, cleanup runs
	t.Run("inner", func(t *testing.T) {
		testhelper.SetEnv(t, "APP_PORT", "2222")
	})
	// After inner test, APP_PORT should be restored
	if got := os.Getenv("APP_PORT"); got != original {
		t.Errorf("expected APP_PORT to be restored to %q, got %q", original, got)
	}
}

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────

func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && findSubstr(s, substr))
}

func findSubstr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
