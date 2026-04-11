// Package integration chứa các test yêu cầu kết nối PostgreSQL + Redis thật.
// Chỉ chạy khi có biến môi trường INTEGRATION=true:
//
//	INTEGRATION=true go test ./tests/integration/...
package integration_test

import (
	"context"
	"os"
	"testing"

	"github.com/yourname/generate-cv/config"
	"github.com/yourname/generate-cv/pkg/database"
)

// skipIfNoIntegration bỏ qua test nếu không có flag INTEGRATION=true.
func skipIfNoIntegration(t *testing.T) {
	t.Helper()
	if os.Getenv("INTEGRATION") != "true" {
		t.Skip("skipping integration test (set INTEGRATION=true to run)")
	}
}

// ─────────────────────────────────────────────
// Database connectivity
// ─────────────────────────────────────────────

func TestDB_Pool_ConnectsSuccessfully(t *testing.T) {
	skipIfNoIntegration(t)

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config.Load() error: %v", err)
	}

	ctx := context.Background()
	pool, err := database.NewPool(ctx, cfg.DB)
	if err != nil {
		t.Fatalf("NewPool() error: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("pool.Ping() error: %v", err)
	}
}

func TestDB_Pool_CanQueryVersion(t *testing.T) {
	skipIfNoIntegration(t)

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config.Load() error: %v", err)
	}

	ctx := context.Background()
	pool, err := database.NewPool(ctx, cfg.DB)
	if err != nil {
		t.Fatalf("NewPool() error: %v", err)
	}
	defer pool.Close()

	var version string
	row := pool.QueryRow(ctx, "SELECT version()")
	if err := row.Scan(&version); err != nil {
		t.Fatalf("QueryRow version: %v", err)
	}
	if version == "" {
		t.Error("expected non-empty postgres version string")
	}
	t.Logf("PostgreSQL: %s", version)
}

// ─────────────────────────────────────────────
// Migrations
// ─────────────────────────────────────────────

func TestDB_Migrations_RunSuccessfully(t *testing.T) {
	skipIfNoIntegration(t)

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config.Load() error: %v", err)
	}

	if err := database.RunMigrations(cfg.DB); err != nil {
		t.Fatalf("RunMigrations() error: %v", err)
	}
}

func TestDB_Migrations_TablesExist(t *testing.T) {
	skipIfNoIntegration(t)

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config.Load() error: %v", err)
	}

	ctx := context.Background()
	pool, err := database.NewPool(ctx, cfg.DB)
	if err != nil {
		t.Fatalf("NewPool() error: %v", err)
	}
	defer pool.Close()

	tables := []string{"users", "refresh_tokens", "subscriptions", "cvs", "templates"}
	for _, table := range tables {
		t.Run("table_"+table, func(t *testing.T) {
			var exists bool
			err := pool.QueryRow(ctx,
				`SELECT EXISTS (
					SELECT FROM information_schema.tables
					WHERE table_schema = 'public' AND table_name = $1
				)`, table,
			).Scan(&exists)
			if err != nil {
				t.Fatalf("query error: %v", err)
			}
			if !exists {
				t.Errorf("table %q does not exist in the database", table)
			}
		})
	}
}

func TestDB_Migrations_IndexesExist(t *testing.T) {
	skipIfNoIntegration(t)

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config.Load() error: %v", err)
	}

	ctx := context.Background()
	pool, err := database.NewPool(ctx, cfg.DB)
	if err != nil {
		t.Fatalf("NewPool() error: %v", err)
	}
	defer pool.Close()

	indexes := []string{
		"idx_refresh_tokens_user_id",
		"idx_cvs_user_id",
		"idx_subscriptions_user_id",
	}

	for _, idx := range indexes {
		t.Run(idx, func(t *testing.T) {
			var exists bool
			err := pool.QueryRow(ctx,
				`SELECT EXISTS (
					SELECT FROM pg_indexes
					WHERE schemaname = 'public' AND indexname = $1
				)`, idx,
			).Scan(&exists)
			if err != nil {
				t.Fatalf("query error: %v", err)
			}
			if !exists {
				t.Errorf("index %q does not exist", idx)
			}
		})
	}
}
