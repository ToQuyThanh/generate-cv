package config_test

import (
	"os"
	"testing"

	"github.com/yourname/generate-cv/config"
)

func TestLoad_Defaults(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.App.Port == "" {
		t.Error("expected APP_PORT to have a default value")
	}
	if cfg.DB.Host == "" {
		t.Error("expected DB_HOST to have a default value")
	}
	if cfg.JWT.AccessTTLMin <= 0 {
		t.Error("expected JWT_ACCESS_TTL_MINUTES > 0")
	}
}

func TestLoad_EnvOverride(t *testing.T) {
	os.Setenv("APP_PORT", "9090")
	os.Setenv("DB_NAME", "test_db")
	defer func() {
		os.Unsetenv("APP_PORT")
		os.Unsetenv("DB_NAME")
	}()

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.App.Port != "9090" {
		t.Errorf("expected port 9090, got %s", cfg.App.Port)
	}
	if cfg.DB.Name != "test_db" {
		t.Errorf("expected db name test_db, got %s", cfg.DB.Name)
	}
}

func TestDBConfig_DSN(t *testing.T) {
	cfg := config.DBConfig{
		Host: "localhost", Port: "5432",
		User: "pguser", Password: "pgpass",
		Name: "mydb", SSLMode: "disable",
	}
	dsn := cfg.DSN()
	expected := "host=localhost port=5432 user=pguser password=pgpass dbname=mydb sslmode=disable"
	if dsn != expected {
		t.Errorf("DSN mismatch\ngot:  %s\nwant: %s", dsn, expected)
	}
}

func TestDBConfig_URL(t *testing.T) {
	cfg := config.DBConfig{
		Host: "localhost", Port: "5432",
		User: "pguser", Password: "pgpass",
		Name: "mydb", SSLMode: "disable",
	}
	url := cfg.URL()
	expected := "postgres://pguser:pgpass@localhost:5432/mydb?sslmode=disable"
	if url != expected {
		t.Errorf("URL mismatch\ngot:  %s\nwant: %s", url, expected)
	}
}
