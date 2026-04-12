-- name: CreatePaymentTransaction :one
INSERT INTO payment_transactions (user_id, plan, method, amount_vnd, status)
VALUES ($1, $2, $3, $4, 'pending')
RETURNING *;

-- name: GetPaymentTransactionByID :one
SELECT * FROM payment_transactions
WHERE id = $1
LIMIT 1;

-- name: GetPaymentTransactionByProviderRef :one
SELECT * FROM payment_transactions
WHERE provider_ref = $1
LIMIT 1;

-- name: UpdatePaymentTransactionSuccess :one
UPDATE payment_transactions
SET
    status       = 'success',
    provider_ref = $2,
    paid_at      = NOW()
WHERE id = $1
  AND status   = 'pending'
RETURNING *;

-- name: UpdatePaymentTransactionFailed :one
UPDATE payment_transactions
SET
    status       = 'failed',
    provider_ref = $2
WHERE id = $1
  AND status   = 'pending'
RETURNING *;

-- name: ListPaymentTransactionsByUser :many
SELECT * FROM payment_transactions
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT  $2
OFFSET $3;

-- name: CountPaymentTransactionsByUser :one
SELECT COUNT(*) FROM payment_transactions
WHERE user_id = $1;

-- name: UpdateSubscription :one
UPDATE subscriptions
SET
    plan       = $2,
    status     = 'active',
    started_at = NOW(),
    expires_at = $3,
    updated_at = NOW()
WHERE user_id = $1
RETURNING *;

-- name: ExpireSubscriptions :many
UPDATE subscriptions
SET
    plan       = 'free',
    status     = 'expired',
    updated_at = NOW()
WHERE status     = 'active'
  AND expires_at IS NOT NULL
  AND expires_at < NOW()
RETURNING *;
