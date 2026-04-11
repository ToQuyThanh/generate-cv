package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ─── CV entity ────────────────────────────────────────────────────────────────

type CV struct {
	ID         uuid.UUID       `db:"id"`
	UserID     uuid.UUID       `db:"user_id"`
	Title      string          `db:"title"`
	TemplateID string          `db:"template_id"`
	ColorTheme string          `db:"color_theme"`
	Sections   json.RawMessage `db:"sections"`
	CreatedAt  time.Time       `db:"created_at"`
	UpdatedAt  time.Time       `db:"updated_at"`
}

// ─── CVRepository ─────────────────────────────────────────────────────────────

type CVRepository struct {
	pool *pgxpool.Pool
}

func NewCVRepository(pool *pgxpool.Pool) *CVRepository {
	return &CVRepository{pool: pool}
}

func (r *CVRepository) Create(ctx context.Context, userID uuid.UUID, title, templateID, colorTheme string, sections json.RawMessage) (*CV, error) {
	if sections == nil {
		sections = json.RawMessage("[]")
	}
	var cv CV
	err := r.pool.QueryRow(ctx,
		`INSERT INTO cvs (user_id, title, template_id, color_theme, sections)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, user_id, title, template_id, color_theme, sections, created_at, updated_at`,
		userID, title, templateID, colorTheme, sections,
	).Scan(&cv.ID, &cv.UserID, &cv.Title, &cv.TemplateID, &cv.ColorTheme, &cv.Sections, &cv.CreatedAt, &cv.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &cv, nil
}

func (r *CVRepository) GetByID(ctx context.Context, id uuid.UUID) (*CV, error) {
	var cv CV
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, title, template_id, color_theme, sections, created_at, updated_at
		 FROM cvs WHERE id = $1 LIMIT 1`,
		id,
	).Scan(&cv.ID, &cv.UserID, &cv.Title, &cv.TemplateID, &cv.ColorTheme, &cv.Sections, &cv.CreatedAt, &cv.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &cv, nil
}

func (r *CVRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]CV, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, title, template_id, color_theme, sections, created_at, updated_at
		 FROM cvs WHERE user_id = $1
		 ORDER BY updated_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cvs []CV
	for rows.Next() {
		var cv CV
		if err := rows.Scan(&cv.ID, &cv.UserID, &cv.Title, &cv.TemplateID, &cv.ColorTheme, &cv.Sections, &cv.CreatedAt, &cv.UpdatedAt); err != nil {
			return nil, err
		}
		cvs = append(cvs, cv)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return cvs, nil
}

func (r *CVRepository) CountByUser(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM cvs WHERE user_id = $1`,
		userID,
	).Scan(&count)
	return count, err
}

// UpdateFields applies only the non-nil fields in the patch.
func (r *CVRepository) UpdateFields(ctx context.Context, id uuid.UUID, title, templateID, colorTheme *string, sections json.RawMessage) (*CV, error) {
	var cv CV
	err := r.pool.QueryRow(ctx,
		`UPDATE cvs SET
		   title       = COALESCE($2, title),
		   template_id = COALESCE($3, template_id),
		   color_theme = COALESCE($4, color_theme),
		   sections    = COALESCE($5, sections),
		   updated_at  = NOW()
		 WHERE id = $1
		 RETURNING id, user_id, title, template_id, color_theme, sections, created_at, updated_at`,
		id, title, templateID, colorTheme, sections,
	).Scan(&cv.ID, &cv.UserID, &cv.Title, &cv.TemplateID, &cv.ColorTheme, &cv.Sections, &cv.CreatedAt, &cv.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &cv, nil
}

func (r *CVRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM cvs WHERE id = $1`, id)
	return err
}
