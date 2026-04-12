// Package repository contains the profile data access layer.
package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ─── Entities ─────────────────────────────────────────────────────────────────

type CVProfile struct {
	ID          uuid.UUID  `db:"id"`
	UserID      uuid.UUID  `db:"user_id"`
	Name        string     `db:"name"`
	RoleTarget  *string    `db:"role_target"`
	Summary     *string    `db:"summary"`
	FullName    *string    `db:"full_name"`
	Email       *string    `db:"email"`
	Phone       *string    `db:"phone"`
	Location    *string    `db:"location"`
	LinkedinURL *string    `db:"linkedin_url"`
	GithubURL   *string    `db:"github_url"`
	WebsiteURL  *string    `db:"website_url"`
	AvatarURL   *string    `db:"avatar_url"`
	IsDefault   bool       `db:"is_default"`
	CreatedAt   time.Time  `db:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at"`
}

type CVProfileSection struct {
	ID        uuid.UUID `db:"id"`
	ProfileID uuid.UUID `db:"profile_id"`
	Type      string    `db:"type"`
	Title     string    `db:"title"`
	Position  int       `db:"position"`
	IsVisible bool      `db:"is_visible"`
}

type CVProfileItem struct {
	ID        uuid.UUID       `db:"id"`
	SectionID uuid.UUID       `db:"section_id"`
	Position  int             `db:"position"`
	IsVisible bool            `db:"is_visible"`
	Data      json.RawMessage `db:"data"`
}

// ─── ProfileRepository ────────────────────────────────────────────────────────

type ProfileRepository struct {
	pool *pgxpool.Pool
}

func NewProfileRepository(pool *pgxpool.Pool) *ProfileRepository {
	return &ProfileRepository{pool: pool}
}

// ── Profile CRUD ──────────────────────────────────────────────────────────────

func (r *ProfileRepository) Create(ctx context.Context, p CVProfile) (*CVProfile, error) {
	var out CVProfile
	err := r.pool.QueryRow(ctx, `
		INSERT INTO cv_profiles
		  (user_id, name, role_target, summary, full_name, email, phone,
		   location, linkedin_url, github_url, website_url, avatar_url, is_default)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id, user_id, name, role_target, summary, full_name, email,
		          phone, location, linkedin_url, github_url, website_url,
		          avatar_url, is_default, created_at, updated_at`,
		p.UserID, p.Name, p.RoleTarget, p.Summary, p.FullName, p.Email, p.Phone,
		p.Location, p.LinkedinURL, p.GithubURL, p.WebsiteURL, p.AvatarURL, p.IsDefault,
	).Scan(
		&out.ID, &out.UserID, &out.Name, &out.RoleTarget, &out.Summary,
		&out.FullName, &out.Email, &out.Phone, &out.Location,
		&out.LinkedinURL, &out.GithubURL, &out.WebsiteURL, &out.AvatarURL,
		&out.IsDefault, &out.CreatedAt, &out.UpdatedAt,
	)
	return &out, err
}

func (r *ProfileRepository) GetByID(ctx context.Context, id uuid.UUID) (*CVProfile, error) {
	var out CVProfile
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, name, role_target, summary, full_name, email,
		       phone, location, linkedin_url, github_url, website_url,
		       avatar_url, is_default, created_at, updated_at
		FROM cv_profiles WHERE id = $1 LIMIT 1`, id,
	).Scan(
		&out.ID, &out.UserID, &out.Name, &out.RoleTarget, &out.Summary,
		&out.FullName, &out.Email, &out.Phone, &out.Location,
		&out.LinkedinURL, &out.GithubURL, &out.WebsiteURL, &out.AvatarURL,
		&out.IsDefault, &out.CreatedAt, &out.UpdatedAt,
	)
	return &out, err
}

func (r *ProfileRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]CVProfile, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, name, role_target, summary, full_name, email,
		       phone, location, linkedin_url, github_url, website_url,
		       avatar_url, is_default, created_at, updated_at
		FROM cv_profiles WHERE user_id = $1
		ORDER BY is_default DESC, updated_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var profiles []CVProfile
	for rows.Next() {
		var p CVProfile
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.Name, &p.RoleTarget, &p.Summary,
			&p.FullName, &p.Email, &p.Phone, &p.Location,
			&p.LinkedinURL, &p.GithubURL, &p.WebsiteURL, &p.AvatarURL,
			&p.IsDefault, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		profiles = append(profiles, p)
	}
	return profiles, rows.Err()
}

func (r *ProfileRepository) CountByUser(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM cv_profiles WHERE user_id = $1`, userID,
	).Scan(&count)
	return count, err
}

// UpdateFields applies partial updates (nil fields are skipped via COALESCE).
func (r *ProfileRepository) UpdateFields(ctx context.Context, id uuid.UUID,
	name, roleTarget, summary, fullName, email, phone,
	location, linkedinURL, githubURL, websiteURL, avatarURL *string,
) (*CVProfile, error) {
	var out CVProfile
	err := r.pool.QueryRow(ctx, `
		UPDATE cv_profiles SET
		  name        = COALESCE($2, name),
		  role_target = COALESCE($3, role_target),
		  summary     = COALESCE($4, summary),
		  full_name   = COALESCE($5, full_name),
		  email       = COALESCE($6, email),
		  phone       = COALESCE($7, phone),
		  location    = COALESCE($8, location),
		  linkedin_url = COALESCE($9, linkedin_url),
		  github_url  = COALESCE($10, github_url),
		  website_url = COALESCE($11, website_url),
		  avatar_url  = COALESCE($12, avatar_url),
		  updated_at  = NOW()
		WHERE id = $1
		RETURNING id, user_id, name, role_target, summary, full_name, email,
		          phone, location, linkedin_url, github_url, website_url,
		          avatar_url, is_default, created_at, updated_at`,
		id, name, roleTarget, summary, fullName, email, phone,
		location, linkedinURL, githubURL, websiteURL, avatarURL,
	).Scan(
		&out.ID, &out.UserID, &out.Name, &out.RoleTarget, &out.Summary,
		&out.FullName, &out.Email, &out.Phone, &out.Location,
		&out.LinkedinURL, &out.GithubURL, &out.WebsiteURL, &out.AvatarURL,
		&out.IsDefault, &out.CreatedAt, &out.UpdatedAt,
	)
	return &out, err
}

func (r *ProfileRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM cv_profiles WHERE id = $1`, id)
	return err
}

// SetDefault unsets all defaults for user, then sets the target as default — in one transaction.
func (r *ProfileRepository) SetDefault(ctx context.Context, userID, profileID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if _, err = tx.Exec(ctx,
		`UPDATE cv_profiles SET is_default = false WHERE user_id = $1`, userID,
	); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx,
		`UPDATE cv_profiles SET is_default = true, updated_at = NOW() WHERE id = $1`, profileID,
	); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// ── Section CRUD ──────────────────────────────────────────────────────────────

func (r *ProfileRepository) CreateSection(ctx context.Context, s CVProfileSection) (*CVProfileSection, error) {
	var out CVProfileSection
	err := r.pool.QueryRow(ctx, `
		INSERT INTO cv_profile_sections (profile_id, type, title, position, is_visible)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, profile_id, type, title, position, is_visible`,
		s.ProfileID, s.Type, s.Title, s.Position, s.IsVisible,
	).Scan(&out.ID, &out.ProfileID, &out.Type, &out.Title, &out.Position, &out.IsVisible)
	return &out, err
}

func (r *ProfileRepository) GetSection(ctx context.Context, id uuid.UUID) (*CVProfileSection, error) {
	var out CVProfileSection
	err := r.pool.QueryRow(ctx, `
		SELECT id, profile_id, type, title, position, is_visible
		FROM cv_profile_sections WHERE id = $1`, id,
	).Scan(&out.ID, &out.ProfileID, &out.Type, &out.Title, &out.Position, &out.IsVisible)
	return &out, err
}

func (r *ProfileRepository) ListSections(ctx context.Context, profileID uuid.UUID) ([]CVProfileSection, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, profile_id, type, title, position, is_visible
		FROM cv_profile_sections WHERE profile_id = $1
		ORDER BY position ASC`, profileID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sections []CVProfileSection
	for rows.Next() {
		var s CVProfileSection
		if err := rows.Scan(&s.ID, &s.ProfileID, &s.Type, &s.Title, &s.Position, &s.IsVisible); err != nil {
			return nil, err
		}
		sections = append(sections, s)
	}
	return sections, rows.Err()
}

func (r *ProfileRepository) UpdateSection(ctx context.Context, id uuid.UUID, title *string, position *int, isVisible *bool) (*CVProfileSection, error) {
	var out CVProfileSection
	err := r.pool.QueryRow(ctx, `
		UPDATE cv_profile_sections SET
		  title      = COALESCE($2, title),
		  position   = COALESCE($3, position),
		  is_visible = COALESCE($4, is_visible)
		WHERE id = $1
		RETURNING id, profile_id, type, title, position, is_visible`,
		id, title, position, isVisible,
	).Scan(&out.ID, &out.ProfileID, &out.Type, &out.Title, &out.Position, &out.IsVisible)
	return &out, err
}

func (r *ProfileRepository) DeleteSection(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM cv_profile_sections WHERE id = $1`, id)
	return err
}

// ReorderSections updates position for each ID in the given order.
func (r *ProfileRepository) ReorderSections(ctx context.Context, profileID uuid.UUID, ids []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	for i, id := range ids {
		if _, err := tx.Exec(ctx,
			`UPDATE cv_profile_sections SET position = $1 WHERE id = $2 AND profile_id = $3`,
			i, id, profileID,
		); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// ── Item CRUD ─────────────────────────────────────────────────────────────────

func (r *ProfileRepository) CreateItem(ctx context.Context, item CVProfileItem) (*CVProfileItem, error) {
	var out CVProfileItem
	err := r.pool.QueryRow(ctx, `
		INSERT INTO cv_profile_items (section_id, position, is_visible, data)
		VALUES ($1, $2, $3, $4)
		RETURNING id, section_id, position, is_visible, data`,
		item.SectionID, item.Position, item.IsVisible, item.Data,
	).Scan(&out.ID, &out.SectionID, &out.Position, &out.IsVisible, &out.Data)
	return &out, err
}

func (r *ProfileRepository) GetItem(ctx context.Context, id uuid.UUID) (*CVProfileItem, error) {
	var out CVProfileItem
	err := r.pool.QueryRow(ctx, `
		SELECT id, section_id, position, is_visible, data
		FROM cv_profile_items WHERE id = $1`, id,
	).Scan(&out.ID, &out.SectionID, &out.Position, &out.IsVisible, &out.Data)
	return &out, err
}

func (r *ProfileRepository) ListItems(ctx context.Context, sectionID uuid.UUID) ([]CVProfileItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, section_id, position, is_visible, data
		FROM cv_profile_items WHERE section_id = $1
		ORDER BY position ASC`, sectionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []CVProfileItem
	for rows.Next() {
		var it CVProfileItem
		if err := rows.Scan(&it.ID, &it.SectionID, &it.Position, &it.IsVisible, &it.Data); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *ProfileRepository) UpdateItem(ctx context.Context, id uuid.UUID, position *int, isVisible *bool, data json.RawMessage) (*CVProfileItem, error) {
	var out CVProfileItem
	err := r.pool.QueryRow(ctx, `
		UPDATE cv_profile_items SET
		  position   = COALESCE($2, position),
		  is_visible = COALESCE($3, is_visible),
		  data       = COALESCE($4, data)
		WHERE id = $1
		RETURNING id, section_id, position, is_visible, data`,
		id, position, isVisible, data,
	).Scan(&out.ID, &out.SectionID, &out.Position, &out.IsVisible, &out.Data)
	return &out, err
}

func (r *ProfileRepository) DeleteItem(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM cv_profile_items WHERE id = $1`, id)
	return err
}

func (r *ProfileRepository) ReorderItems(ctx context.Context, sectionID uuid.UUID, ids []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	for i, id := range ids {
		if _, err := tx.Exec(ctx,
			`UPDATE cv_profile_items SET position = $1 WHERE id = $2 AND section_id = $3`,
			i, id, sectionID,
		); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// ── Full profile load (profile + sections + items) ────────────────────────────

func (r *ProfileRepository) ListItemsBySections(ctx context.Context, sectionIDs []uuid.UUID) (map[uuid.UUID][]CVProfileItem, error) {
	if len(sectionIDs) == 0 {
		return map[uuid.UUID][]CVProfileItem{}, nil
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id, section_id, position, is_visible, data
		FROM cv_profile_items
		WHERE section_id = ANY($1)
		ORDER BY section_id, position ASC`, sectionIDs,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[uuid.UUID][]CVProfileItem)
	for rows.Next() {
		var it CVProfileItem
		if err := rows.Scan(&it.ID, &it.SectionID, &it.Position, &it.IsVisible, &it.Data); err != nil {
			return nil, err
		}
		result[it.SectionID] = append(result[it.SectionID], it)
	}
	return result, rows.Err()
}
