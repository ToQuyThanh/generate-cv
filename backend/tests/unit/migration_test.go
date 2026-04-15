package unit_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// migrationsDir là đường dẫn tương đối từ thư mục tests/unit/ tới db/migrations/
const migrationsDir = "../../db/migrations"

// ─────────────────────────────────────────────
// File existence
// ─────────────────────────────────────────────

func TestMigration_DirExists(t *testing.T) {
	info, err := os.Stat(migrationsDir)
	if err != nil {
		t.Fatalf("migrations directory not found: %v", err)
	}
	if !info.IsDir() {
		t.Fatal("migrations path is not a directory")
	}
}

func TestMigration_AtLeastOneFile(t *testing.T) {
	entries := readMigrationEntries(t)
	sqlFiles := filterSQL(entries)
	if len(sqlFiles) == 0 {
		t.Fatal("no .sql migration files found")
	}
}

func TestMigration_InitialSchemaExists(t *testing.T) {
	path := filepath.Join(migrationsDir, "001_initial_schema.sql")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatal("001_initial_schema.sql does not exist")
	}
}

// ─────────────────────────────────────────────
// Goose annotations
// ─────────────────────────────────────────────

func TestMigration_AllFilesHaveUpAnnotation(t *testing.T) {
	for _, name := range sqlFileNames(t) {
		t.Run(name, func(t *testing.T) {
			src := readMigrationFile(t, name)
			if !strings.Contains(src, "-- +goose Up") {
				t.Errorf("%s missing '-- +goose Up'", name)
			}
		})
	}
}

func TestMigration_AllFilesHaveDownAnnotation(t *testing.T) {
	for _, name := range sqlFileNames(t) {
		t.Run(name, func(t *testing.T) {
			src := readMigrationFile(t, name)
			if !strings.Contains(src, "-- +goose Down") {
				t.Errorf("%s missing '-- +goose Down'", name)
			}
		})
	}
}

func TestMigration_UpAppearsBeforeDown(t *testing.T) {
	for _, name := range sqlFileNames(t) {
		t.Run(name, func(t *testing.T) {
			src := readMigrationFile(t, name)
			upIdx := strings.Index(src, "-- +goose Up")
			downIdx := strings.Index(src, "-- +goose Down")
			if upIdx == -1 || downIdx == -1 {
				t.Skip("missing annotations — covered by other tests")
			}
			if upIdx > downIdx {
				t.Errorf("%s: '-- +goose Up' must appear before '-- +goose Down'", name)
			}
		})
	}
}

func TestMigration_StatementBeginEndPresent(t *testing.T) {
	for _, name := range sqlFileNames(t) {
		t.Run(name, func(t *testing.T) {
			src := readMigrationFile(t, name)
			if !strings.Contains(src, "-- +goose StatementBegin") {
				t.Errorf("%s missing '-- +goose StatementBegin'", name)
			}
			if !strings.Contains(src, "-- +goose StatementEnd") {
				t.Errorf("%s missing '-- +goose StatementEnd'", name)
			}
		})
	}
}

// ─────────────────────────────────────────────
// Schema — table definitions
// ─────────────────────────────────────────────

func TestMigration_001_AllTablesPresent(t *testing.T) {
	src := readMigrationFile(t, "001_initial_schema.sql")

	requiredTables := []string{
		"users",
		"refresh_tokens",
		"subscriptions",
		"cvs",
		"templates",
	}

	for _, table := range requiredTables {
		t.Run("table_"+table, func(t *testing.T) {
			if !strings.Contains(src, "CREATE TABLE "+table) {
				t.Errorf("missing CREATE TABLE %s", table)
			}
		})
	}
}

func TestMigration_001_UsersPrimaryKey(t *testing.T) {
	src := readMigrationFile(t, "001_initial_schema.sql")
	if !strings.Contains(src, "UUID PRIMARY KEY") {
		t.Error("users table missing UUID PRIMARY KEY")
	}
}

func TestMigration_001_UsersEmailUnique(t *testing.T) {
	src := readMigrationFile(t, "001_initial_schema.sql")
	if !strings.Contains(src, "email") || !strings.Contains(src, "UNIQUE") {
		t.Error("users.email should have UNIQUE constraint")
	}
}

func TestMigration_001_RefreshTokensCascadeDelete(t *testing.T) {
	src := readMigrationFile(t, "001_initial_schema.sql")
	if !strings.Contains(src, "ON DELETE CASCADE") {
		t.Error("refresh_tokens should have ON DELETE CASCADE for user_id FK")
	}
}

func TestMigration_001_CVsSectionsIsJSONB(t *testing.T) {
	src := readMigrationFile(t, "001_initial_schema.sql")
	if !strings.Contains(src, "sections") || !strings.Contains(src, "JSONB") {
		t.Error("cvs.sections should be of type JSONB")
	}
}

func TestMigration_001_SubscriptionPlanDefault(t *testing.T) {
	src := readMigrationFile(t, "001_initial_schema.sql")
	if !strings.Contains(src, "'free'") {
		t.Error("subscriptions.plan should have DEFAULT 'free'")
	}
}

func TestMigration_001_IndexesPresent(t *testing.T) {
	src := readMigrationFile(t, "001_initial_schema.sql")
	indexes := []string{
		"idx_refresh_tokens_user_id",
		"idx_cvs_user_id",
		"idx_subscriptions_user_id",
	}
	for _, idx := range indexes {
		if !strings.Contains(src, idx) {
			t.Errorf("missing index: %s", idx)
		}
	}
}

// ─────────────────────────────────────────────
// Schema — Down migration (drop order)
// ─────────────────────────────────────────────

func TestMigration_001_DropOrderRespectsFKs(t *testing.T) {
	src := readMigrationFile(t, "001_initial_schema.sql")

	downSection := extractDownSection(t, src)

	// Tables that reference users must be dropped BEFORE users
	dependents := []string{"cvs", "subscriptions", "refresh_tokens"}
	usersIdx := strings.Index(downSection, "DROP TABLE IF EXISTS users")
	if usersIdx == -1 {
		t.Fatal("users not found in Down section")
	}

	for _, dep := range dependents {
		idx := strings.Index(downSection, "DROP TABLE IF EXISTS "+dep)
		if idx == -1 {
			t.Errorf("%s not found in Down section", dep)
			continue
		}
		if idx > usersIdx {
			t.Errorf("%s must be dropped BEFORE users (FK constraint)", dep)
		}
	}
}

func TestMigration_001_DownDropsAllTables(t *testing.T) {
	src := readMigrationFile(t, "001_initial_schema.sql")
	downSection := extractDownSection(t, src)

	tables := []string{"users", "refresh_tokens", "subscriptions", "cvs", "templates"}
	for _, table := range tables {
		t.Run("drop_"+table, func(t *testing.T) {
			needle := "DROP TABLE IF EXISTS " + table
			if !strings.Contains(downSection, needle) {
				t.Errorf("Down section missing %q", needle)
			}
		})
	}
}

// ─────────────────────────────────────────────
// File naming conventions
// ─────────────────────────────────────────────

func TestMigration_FilesFollowNamingConvention(t *testing.T) {
	for _, name := range sqlFileNames(t) {
		t.Run(name, func(t *testing.T) {
			// Must start with a 3-digit number prefix: e.g. "001_"
			if len(name) < 5 {
				t.Errorf("%s: filename too short", name)
				return
			}
			prefix := name[:3]
			for _, ch := range prefix {
				if ch < '0' || ch > '9' {
					t.Errorf("%s: filename must start with 3-digit number (e.g. 001_)", name)
					return
				}
			}
			if name[3] != '_' {
				t.Errorf("%s: expected underscore after number prefix", name)
			}
		})
	}
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

func readMigrationEntries(t *testing.T) []os.DirEntry {
	t.Helper()
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		t.Fatalf("cannot read migrations dir: %v", err)
	}
	return entries
}

func filterSQL(entries []os.DirEntry) []os.DirEntry {
	var out []os.DirEntry
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			out = append(out, e)
		}
	}
	return out
}

func sqlFileNames(t *testing.T) []string {
	t.Helper()
	var names []string
	for _, e := range filterSQL(readMigrationEntries(t)) {
		names = append(names, e.Name())
	}
	return names
}

func readMigrationFile(t *testing.T, name string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(migrationsDir, name))
	if err != nil {
		t.Fatalf("cannot read %s: %v", name, err)
	}
	return string(data)
}

func extractDownSection(t *testing.T, src string) string {
	t.Helper()
	idx := strings.Index(src, "-- +goose Down")
	if idx == -1 {
		t.Fatal("no '-- +goose Down' section found")
	}
	return src[idx:]
}
