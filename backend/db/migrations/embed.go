// Package migrations exposes the embedded SQL migration files.
package migrations

import "embed"

// FS holds all *.sql migration files embedded at compile time.
//
//go:embed *.sql
var FS embed.FS
