// Package repository wraps raw pgx queries into typed, testable methods.
// We do NOT use sqlc-generated code directly in service/handler to keep
// the dependency boundary clean — if we switch DB later, only this layer changes.
package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ─── User ─────────────────────────────────────────────────────────────────────

type User struct {
	ID        uuid.UUID  `db:"id"`
	Email     string     `db:"email"`
	Password  *string    `db:"password"`
	FullName  string     `db:"full_name"`
	AvatarURL *string    `db:"avatar_url"`
	CreatedAt time.Time  `db:"created_at"`
	UpdatedAt time.Time  `db:"updated_at"`
}

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) Create(ctx context.Context, email, hashedPassword, fullName string) (*User, error) {
	var u User
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, password, full_name)
		 VALUES ($1, $2, $3)
		 RETURNING id, email, password, full_name, avatar_url, created_at, updated_at`,
		email, hashedPassword, fullName,
	).Scan(&u.ID, &u.Email, &u.Password, &u.FullName, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// CreateOAuth creates a user without password (Google login).
func (r *UserRepository) CreateOAuth(ctx context.Context, email, fullName string, avatarURL *string) (*User, error) {
	var u User
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, full_name, avatar_url)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
		 RETURNING id, email, password, full_name, avatar_url, created_at, updated_at`,
		email, fullName, avatarURL,
	).Scan(&u.ID, &u.Email, &u.Password, &u.FullName, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password, full_name, avatar_url, created_at, updated_at
		 FROM users WHERE email = $1 LIMIT 1`,
		email,
	).Scan(&u.ID, &u.Email, &u.Password, &u.FullName, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var u User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password, full_name, avatar_url, created_at, updated_at
		 FROM users WHERE id = $1 LIMIT 1`,
		id,
	).Scan(&u.ID, &u.Email, &u.Password, &u.FullName, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) UpdatePassword(ctx context.Context, id uuid.UUID, hashedPassword string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
		hashedPassword, id,
	)
	return err
}

// UpdateFields applies only non-nil fields (partial update).
func (r *UserRepository) UpdateFields(ctx context.Context, id uuid.UUID, fullName, avatarURL *string) (*User, error) {
	var u User
	err := r.pool.QueryRow(ctx,
		`UPDATE users SET
		   full_name  = COALESCE($2, full_name),
		   avatar_url = COALESCE($3, avatar_url),
		   updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, email, password, full_name, avatar_url, created_at, updated_at`,
		id, fullName, avatarURL,
	).Scan(&u.ID, &u.Email, &u.Password, &u.FullName, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// Delete hard-deletes the user. CASCADE on DB will remove CVs, tokens, subscription.
func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	return err
}

// ─── RefreshToken ─────────────────────────────────────────────────────────────

type RefreshToken struct {
	ID        uuid.UUID `db:"id"`
	UserID    uuid.UUID `db:"user_id"`
	Token     string    `db:"token"`
	ExpiresAt time.Time `db:"expires_at"`
	CreatedAt time.Time `db:"created_at"`
}

type RefreshTokenRepository struct {
	pool *pgxpool.Pool
}

func NewRefreshTokenRepository(pool *pgxpool.Pool) *RefreshTokenRepository {
	return &RefreshTokenRepository{pool: pool}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, userID uuid.UUID, token string, expiresAt time.Time) (*RefreshToken, error) {
	var rt RefreshToken
	err := r.pool.QueryRow(ctx,
		`INSERT INTO refresh_tokens (user_id, token, expires_at)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, token, expires_at, created_at`,
		userID, token, expiresAt,
	).Scan(&rt.ID, &rt.UserID, &rt.Token, &rt.ExpiresAt, &rt.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &rt, nil
}

func (r *RefreshTokenRepository) Get(ctx context.Context, token string) (*RefreshToken, error) {
	var rt RefreshToken
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, token, expires_at, created_at
		 FROM refresh_tokens WHERE token = $1 LIMIT 1`,
		token,
	).Scan(&rt.ID, &rt.UserID, &rt.Token, &rt.ExpiresAt, &rt.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &rt, nil
}

func (r *RefreshTokenRepository) Delete(ctx context.Context, token string) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM refresh_tokens WHERE token = $1`,
		token,
	)
	return err
}

func (r *RefreshTokenRepository) DeleteByUserID(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM refresh_tokens WHERE user_id = $1`,
		userID,
	)
	return err
}

// ─── Subscription ─────────────────────────────────────────────────────────────

type Subscription struct {
	ID        uuid.UUID  `db:"id"`
	UserID    uuid.UUID  `db:"user_id"`
	Plan      string     `db:"plan"`
	Status    string     `db:"status"`
	StartedAt *time.Time `db:"started_at"`
	ExpiresAt *time.Time `db:"expires_at"`
	UpdatedAt time.Time  `db:"updated_at"`
}

type SubscriptionRepository struct {
	pool *pgxpool.Pool
}

func NewSubscriptionRepository(pool *pgxpool.Pool) *SubscriptionRepository {
	return &SubscriptionRepository{pool: pool}
}

func (r *SubscriptionRepository) Create(ctx context.Context, userID uuid.UUID, plan, status string) (*Subscription, error) {
	var s Subscription
	err := r.pool.QueryRow(ctx,
		`INSERT INTO subscriptions (user_id, plan, status)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, plan, status, started_at, expires_at, updated_at`,
		userID, plan, status,
	).Scan(&s.ID, &s.UserID, &s.Plan, &s.Status, &s.StartedAt, &s.ExpiresAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// GetByUserID returns the subscription for a given user, or pgx.ErrNoRows.
func (r *SubscriptionRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*Subscription, error) {
	var s Subscription
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, plan, status, started_at, expires_at, updated_at
		 FROM subscriptions WHERE user_id = $1 LIMIT 1`,
		userID,
	).Scan(&s.ID, &s.UserID, &s.Plan, &s.Status, &s.StartedAt, &s.ExpiresAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// ─── PasswordResetToken ───────────────────────────────────────────────────────

type PasswordResetToken struct {
	ID        uuid.UUID  `db:"id"`
	UserID    uuid.UUID  `db:"user_id"`
	Token     string     `db:"token"`
	ExpiresAt time.Time  `db:"expires_at"`
	UsedAt    *time.Time `db:"used_at"`
	CreatedAt time.Time  `db:"created_at"`
}

type PasswordResetTokenRepository struct {
	pool *pgxpool.Pool
}

func NewPasswordResetTokenRepository(pool *pgxpool.Pool) *PasswordResetTokenRepository {
	return &PasswordResetTokenRepository{pool: pool}
}

func (r *PasswordResetTokenRepository) Create(ctx context.Context, userID uuid.UUID, token string, expiresAt time.Time) (*PasswordResetToken, error) {
	var t PasswordResetToken
	err := r.pool.QueryRow(ctx,
		`INSERT INTO password_reset_tokens (user_id, token, expires_at)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, token, expires_at, used_at, created_at`,
		userID, token, expiresAt,
	).Scan(&t.ID, &t.UserID, &t.Token, &t.ExpiresAt, &t.UsedAt, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *PasswordResetTokenRepository) Get(ctx context.Context, token string) (*PasswordResetToken, error) {
	var t PasswordResetToken
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, token, expires_at, used_at, created_at
		 FROM password_reset_tokens
		 WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
		 LIMIT 1`,
		token,
	).Scan(&t.ID, &t.UserID, &t.Token, &t.ExpiresAt, &t.UsedAt, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *PasswordResetTokenRepository) MarkUsed(ctx context.Context, token string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1`,
		token,
	)
	return err
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// IsNotFound returns true when a pgx query returns no rows.
func IsNotFound(err error) bool {
	return err == pgx.ErrNoRows
}
