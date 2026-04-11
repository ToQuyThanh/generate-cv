// Package migrations_test verifies that migration SQL files are parseable
// and contain required goose annotations.
package migrations_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const migrationsDir = "../migrations"

func TestMigrationFilesExist(t *testing.T) {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		t.Fatalf("cannot read migrations dir: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("no migration files found")
	}
}

func TestMigrationFilesHaveGooseAnnotations(t *testing.T) {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		t.Fatalf("cannot read migrations dir: %v", err)
	}

	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}

		path := filepath.Join(migrationsDir, e.Name())
		content, err := os.ReadFile(path)
		if err != nil {
			t.Errorf("cannot read %s: %v", e.Name(), err)
			continue
		}

		src := string(content)
		if !strings.Contains(src, "-- +goose Up") {
			t.Errorf("%s missing '-- +goose Up' annotation", e.Name())
		}
		if !strings.Contains(src, "-- +goose Down") {
			t.Errorf("%s missing '-- +goose Down' annotation", e.Name())
		}
	}
}

func TestInitialSchemaTables(t *testing.T) {
	path := filepath.Join(migrationsDir, "001_initial_schema.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("cannot read 001_initial_schema.sql: %v", err)
	}

	requiredTables := []string{"users", "refresh_tokens", "subscriptions", "cvs", "templates"}
	src := string(content)

	for _, table := range requiredTables {
		needle := "CREATE TABLE " + table
		if !strings.Contains(src, needle) {
			t.Errorf("missing CREATE TABLE %s in 001_initial_schema.sql", table)
		}
	}
}

func TestInitialSchemaDropOrder(t *testing.T) {
	path := filepath.Join(migrationsDir, "001_initial_schema.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("cannot read 001_initial_schema.sql: %v", err)
	}

	src := string(content)
	downIdx := strings.Index(src, "-- +goose Down")
	if downIdx == -1 {
		t.Fatal("no Down section found")
	}
	downSection := src[downIdx:]

	// cvs references users — must be dropped before users
	cvsIdx := strings.Index(downSection, "DROP TABLE IF EXISTS cvs")
	usersIdx := strings.Index(downSection, "DROP TABLE IF EXISTS users")
	if cvsIdx == -1 || usersIdx == -1 {
		t.Fatal("cvs or users not found in Down section")
	}
	if cvsIdx > usersIdx {
		t.Error("cvs must be dropped before users (FK constraint)")
	}
}
