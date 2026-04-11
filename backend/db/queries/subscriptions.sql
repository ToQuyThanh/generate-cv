-- name: CreateSubscription :one
INSERT INTO subscriptions (user_id, plan, status)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetSubscriptionByUserID :one
SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1;

-- name: UpdateSubscription :one
UPDATE subscriptions
SET
  plan       = COALESCE(sqlc.narg('plan'), plan),
  status     = COALESCE(sqlc.narg('status'), status),
  started_at = COALESCE(sqlc.narg('started_at'), started_at),
  expires_at = COALESCE(sqlc.narg('expires_at'), expires_at),
  updated_at = NOW()
WHERE user_id = $1
RETURNING *;
