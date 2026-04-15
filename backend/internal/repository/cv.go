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
	ID              uuid.UUID       `db:"id"`
	UserID          uuid.UUID       `db:"user_id"`
	ProfileID       *uuid.UUID      `db:"profile_id"`
	Title           string          `db:"title"`
	TemplateID      string          `db:"template_id"`
	ColorTheme      string          `db:"color_theme"`
	Sections        json.RawMessage `db:"sections"`
	ProfileSnapshot json.RawMessage `db:"profile_snapshot"`
	Overrides       json.RawMessage `db:"overrides"`
	CreatedAt       time.Time       `db:"created_at"`
	UpdatedAt       time.Time       `db:"updated_at"`
}

// ─── CVRepository ─────────────────────────────────────────────────────────────

type CVRepository struct {
	pool *pgxpool.Pool
}

func NewCVRepository(pool *pgxpool.Pool) *CVRepository {
	return &CVRepository{pool: pool}
}

const cvColumns = `id, user_id, profile_id, title, template_id, color_theme,
	sections, profile_snapshot, overrides, created_at, updated_at`

func scanCV(row interface {
	Scan(...any) error
}, cv *CV) error {
	return row.Scan(
		&cv.ID, &cv.UserID, &cv.ProfileID, &cv.Title, &cv.TemplateID, &cv.ColorTheme,
		&cv.Sections, &cv.ProfileSnapshot, &cv.Overrides, &cv.CreatedAt, &cv.UpdatedAt,
	)
}

func (r *CVRepository) Create(ctx context.Context, userID uuid.UUID, title, templateID, colorTheme string, sections json.RawMessage, profileID *uuid.UUID, profileSnapshot json.RawMessage) (*CV, error) {
	if sections == nil {
		sections = json.RawMessage("[]")
	}
	var cv CV
	err := scanCV(r.pool.QueryRow(ctx,
		`INSERT INTO cvs (user_id, title, template_id, color_theme, sections, profile_id, profile_snapshot)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING `+cvColumns,
		userID, title, templateID, colorTheme, sections, profileID, profileSnapshot,
	), &cv)
	if err != nil {
		return nil, err
	}
	return &cv, nil
}

func (r *CVRepository) GetByID(ctx context.Context, id uuid.UUID) (*CV, error) {
	var cv CV
	err := scanCV(r.pool.QueryRow(ctx,
		`SELECT `+cvColumns+` FROM cvs WHERE id = $1 LIMIT 1`, id,
	), &cv)
	if err != nil {
		return nil, err
	}
	return &cv, nil
}

func (r *CVRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]CV, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+cvColumns+` FROM cvs WHERE user_id = $1
		 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cvs []CV
	for rows.Next() {
		var cv CV
		if err := scanCV(rows, &cv); err != nil {
			return nil, err
		}
		cvs = append(cvs, cv)
	}
	return cvs, rows.Err()
}

func (r *CVRepository) CountByUser(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM cvs WHERE user_id = $1`, userID,
	).Scan(&count)
	return count, err
}

// UpdateFields applies only the non-nil fields in the patch.
func (r *CVRepository) UpdateFields(ctx context.Context, id uuid.UUID, title, templateID, colorTheme *string, sections json.RawMessage) (*CV, error) {
	var cv CV
	err := scanCV(r.pool.QueryRow(ctx,
		`UPDATE cvs SET
		   title       = COALESCE($2, title),
		   template_id = COALESCE($3, template_id),
		   color_theme = COALESCE($4, color_theme),
		   sections    = COALESCE($5, sections),
		   updated_at  = NOW()
		 WHERE id = $1
		 RETURNING `+cvColumns,
		id, title, templateID, colorTheme, sections,
	), &cv)
	return &cv, err
}

// UpdateOverrides saves editor override data for a CV document.
func (r *CVRepository) UpdateOverrides(ctx context.Context, id uuid.UUID, overrides json.RawMessage) (*CV, error) {
	var cv CV
	err := scanCV(r.pool.QueryRow(ctx,
		`UPDATE cvs SET overrides = $2, updated_at = NOW()
		 WHERE id = $1
		 RETURNING `+cvColumns,
		id, overrides,
	), &cv)
	return &cv, err
}

// RefreshSnapshot replaces profile_snapshot with the current profile data.
func (r *CVRepository) RefreshSnapshot(ctx context.Context, id uuid.UUID, snapshot json.RawMessage) (*CV, error) {
	var cv CV
	err := scanCV(r.pool.QueryRow(ctx,
		`UPDATE cvs SET profile_snapshot = $2, updated_at = NOW()
		 WHERE id = $1
		 RETURNING `+cvColumns,
		id, snapshot,
	), &cv)
	return &cv, err
}

func (r *CVRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM cvs WHERE id = $1`, id)
	return err
}
