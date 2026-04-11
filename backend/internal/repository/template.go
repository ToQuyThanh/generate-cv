// Package repository — Template data access layer.
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ─── Template ─────────────────────────────────────────────────────────────────

type Template struct {
	ID           string   `db:"id"`
	Name         string   `db:"name"`
	ThumbnailURL *string  `db:"thumbnail_url"`
	PreviewURL   *string  `db:"preview_url"`
	IsPremium    bool     `db:"is_premium"`
	Tags         []string `db:"tags"`
}

// ─── TemplateRepository ───────────────────────────────────────────────────────

type TemplateRepository struct {
	pool *pgxpool.Pool
}

func NewTemplateRepository(pool *pgxpool.Pool) *TemplateRepository {
	return &TemplateRepository{pool: pool}
}

// List returns all templates with optional is_premium and tag filters.
func (r *TemplateRepository) List(ctx context.Context, isPremium *bool, tag string) ([]Template, error) {
	query := `SELECT id, name, thumbnail_url, preview_url, is_premium, tags
	          FROM templates WHERE 1=1`
	args := []any{}
	n := 1

	if isPremium != nil {
		query += fmt.Sprintf(" AND is_premium = $%d", n)
		args = append(args, *isPremium)
		n++
	}

	if tag != "" {
		query += fmt.Sprintf(" AND $%d = ANY(tags)", n)
		args = append(args, tag)
		n++ //nolint:ineffassign
	}

	query += " ORDER BY is_premium ASC, id ASC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []Template
	for rows.Next() {
		var t Template
		if err := rows.Scan(&t.ID, &t.Name, &t.ThumbnailURL, &t.PreviewURL, &t.IsPremium, &t.Tags); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if templates == nil {
		templates = []Template{}
	}
	return templates, nil
}

// GetByID returns a single template by its text ID, or pgx.ErrNoRows.
func (r *TemplateRepository) GetByID(ctx context.Context, id string) (*Template, error) {
	var t Template
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, thumbnail_url, preview_url, is_premium, tags
		 FROM templates WHERE id = $1`,
		id,
	).Scan(&t.ID, &t.Name, &t.ThumbnailURL, &t.PreviewURL, &t.IsPremium, &t.Tags)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
