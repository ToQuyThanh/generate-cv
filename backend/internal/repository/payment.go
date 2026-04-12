package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ─── Types ────────────────────────────────────────────────────────────────────

// PaymentTransaction mirrors the payment_transactions table.
type PaymentTransaction struct {
	ID          uuid.UUID  `db:"id"`
	UserID      uuid.UUID  `db:"user_id"`
	Plan        string     `db:"plan"`
	Method      string     `db:"method"`
	AmountVND   int64      `db:"amount_vnd"`
	Status      string     `db:"status"`
	ProviderRef *string    `db:"provider_ref"`
	CreatedAt   time.Time  `db:"created_at"`
	PaidAt      *time.Time `db:"paid_at"`
}

// ─── Interface ────────────────────────────────────────────────────────────────

// PaymentRepo defines all DB operations needed by PaymentService.
// Keeping it as an interface lets tests inject a fake without a real DB.
type PaymentRepo interface {
	Create(ctx context.Context, userID uuid.UUID, plan, method string, amountVND int64) (*PaymentTransaction, error)
	GetByID(ctx context.Context, id uuid.UUID) (*PaymentTransaction, error)
	GetByProviderRef(ctx context.Context, providerRef string) (*PaymentTransaction, error)
	MarkSuccess(ctx context.Context, id uuid.UUID, providerRef string) (*PaymentTransaction, error)
	MarkFailed(ctx context.Context, id uuid.UUID, providerRef string) (*PaymentTransaction, error)
	List(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*PaymentTransaction, error)
	Count(ctx context.Context, userID uuid.UUID) (int64, error)
}

// SubscriptionRepo defines DB operations for subscriptions needed by PaymentService + cron.
type SubscriptionRepo interface {
	Upgrade(ctx context.Context, userID uuid.UUID, plan string, expiresAt time.Time) (*Subscription, error)
	ExpireAll(ctx context.Context) ([]*Subscription, error)
}

// ─── PaymentRepository ────────────────────────────────────────────────────────

// PaymentRepository is the real pgxpool-backed implementation of PaymentRepo.
type PaymentRepository struct {
	pool *pgxpool.Pool
}

func NewPaymentRepository(pool *pgxpool.Pool) *PaymentRepository {
	return &PaymentRepository{pool: pool}
}

func (r *PaymentRepository) Create(ctx context.Context, userID uuid.UUID, plan, method string, amountVND int64) (*PaymentTransaction, error) {
	var t PaymentTransaction
	err := r.pool.QueryRow(ctx,
		`INSERT INTO payment_transactions (user_id, plan, method, amount_vnd)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, plan, method, amount_vnd, status, provider_ref, created_at, paid_at`,
		userID, plan, method, amountVND,
	).Scan(&t.ID, &t.UserID, &t.Plan, &t.Method, &t.AmountVND, &t.Status, &t.ProviderRef, &t.CreatedAt, &t.PaidAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *PaymentRepository) GetByID(ctx context.Context, id uuid.UUID) (*PaymentTransaction, error) {
	var t PaymentTransaction
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, plan, method, amount_vnd, status, provider_ref, created_at, paid_at
		 FROM payment_transactions WHERE id = $1 LIMIT 1`,
		id,
	).Scan(&t.ID, &t.UserID, &t.Plan, &t.Method, &t.AmountVND, &t.Status, &t.ProviderRef, &t.CreatedAt, &t.PaidAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *PaymentRepository) GetByProviderRef(ctx context.Context, providerRef string) (*PaymentTransaction, error) {
	var t PaymentTransaction
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, plan, method, amount_vnd, status, provider_ref, created_at, paid_at
		 FROM payment_transactions WHERE provider_ref = $1 LIMIT 1`,
		providerRef,
	).Scan(&t.ID, &t.UserID, &t.Plan, &t.Method, &t.AmountVND, &t.Status, &t.ProviderRef, &t.CreatedAt, &t.PaidAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// MarkSuccess idempotently updates status → success (only from pending).
func (r *PaymentRepository) MarkSuccess(ctx context.Context, id uuid.UUID, providerRef string) (*PaymentTransaction, error) {
	var t PaymentTransaction
	err := r.pool.QueryRow(ctx,
		`UPDATE payment_transactions
		 SET status = 'success', provider_ref = $2, paid_at = NOW()
		 WHERE id = $1 AND status = 'pending'
		 RETURNING id, user_id, plan, method, amount_vnd, status, provider_ref, created_at, paid_at`,
		id, providerRef,
	).Scan(&t.ID, &t.UserID, &t.Plan, &t.Method, &t.AmountVND, &t.Status, &t.ProviderRef, &t.CreatedAt, &t.PaidAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// MarkFailed idempotently updates status → failed (only from pending).
func (r *PaymentRepository) MarkFailed(ctx context.Context, id uuid.UUID, providerRef string) (*PaymentTransaction, error) {
	var t PaymentTransaction
	err := r.pool.QueryRow(ctx,
		`UPDATE payment_transactions
		 SET status = 'failed', provider_ref = $2
		 WHERE id = $1 AND status = 'pending'
		 RETURNING id, user_id, plan, method, amount_vnd, status, provider_ref, created_at, paid_at`,
		id, providerRef,
	).Scan(&t.ID, &t.UserID, &t.Plan, &t.Method, &t.AmountVND, &t.Status, &t.ProviderRef, &t.CreatedAt, &t.PaidAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *PaymentRepository) List(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*PaymentTransaction, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, plan, method, amount_vnd, status, provider_ref, created_at, paid_at
		 FROM payment_transactions
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*PaymentTransaction
	for rows.Next() {
		var t PaymentTransaction
		if err := rows.Scan(&t.ID, &t.UserID, &t.Plan, &t.Method, &t.AmountVND, &t.Status, &t.ProviderRef, &t.CreatedAt, &t.PaidAt); err != nil {
			return nil, err
		}
		result = append(result, &t)
	}
	return result, rows.Err()
}

func (r *PaymentRepository) Count(ctx context.Context, userID uuid.UUID) (int64, error) {
	var n int64
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM payment_transactions WHERE user_id = $1`,
		userID,
	).Scan(&n)
	return n, err
}

// ─── SubscriptionRepository (extend existing) ─────────────────────────────────

// Upgrade bumps a user's subscription to a paid plan with a new expiry.
func (r *SubscriptionRepository) Upgrade(ctx context.Context, userID uuid.UUID, plan string, expiresAt time.Time) (*Subscription, error) {
	var s Subscription
	err := r.pool.QueryRow(ctx,
		`UPDATE subscriptions
		 SET plan = $2, status = 'active', started_at = NOW(), expires_at = $3, updated_at = NOW()
		 WHERE user_id = $1
		 RETURNING id, user_id, plan, status, started_at, expires_at, updated_at`,
		userID, plan, expiresAt,
	).Scan(&s.ID, &s.UserID, &s.Plan, &s.Status, &s.StartedAt, &s.ExpiresAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// ExpireAll downgrades every subscription whose expires_at has passed.
// Returns the list of affected subscriptions for audit logging.
func (r *SubscriptionRepository) ExpireAll(ctx context.Context) ([]*Subscription, error) {
	rows, err := r.pool.Query(ctx,
		`UPDATE subscriptions
		 SET plan = 'free', status = 'expired', updated_at = NOW()
		 WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW()
		 RETURNING id, user_id, plan, status, started_at, expires_at, updated_at`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*Subscription
	for rows.Next() {
		var s Subscription
		if err := rows.Scan(&s.ID, &s.UserID, &s.Plan, &s.Status, &s.StartedAt, &s.ExpiresAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, &s)
	}
	return result, rows.Err()
}
