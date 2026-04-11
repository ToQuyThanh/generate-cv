// Package database provides helpers to connect to PostgreSQL and run migrations.
package database

import (
	"context"
	"embed"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pressly/goose/v3"
	"github.com/yourname/generate-cv/config"
)

//go:embed ../../db/migrations/*.sql
var migrationsFS embed.FS

// NewPool opens a pgx connection pool and verifies connectivity.
func NewPool(ctx context.Context, cfg config.DBConfig) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, cfg.URL())
	if err != nil {
		return nil, fmt.Errorf("pgxpool.New: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("db ping failed: %w", err)
	}

	return pool, nil
}

// RunMigrations applies all pending goose migrations from the embedded FS.
func RunMigrations(cfg config.DBConfig) error {
	goose.SetBaseFS(migrationsFS)

	db, err := goose.OpenDBWithDriver("postgres", cfg.DSN())
	if err != nil {
		return fmt.Errorf("goose open db: %w", err)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("goose set dialect: %w", err)
	}

	if err := goose.Up(db, "db/migrations"); err != nil {
		return fmt.Errorf("goose up: %w", err)
	}

	return nil
}
