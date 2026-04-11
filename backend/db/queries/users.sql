-- name: CreateUser :one
INSERT INTO users (email, password, full_name, avatar_url)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 LIMIT 1;

-- name: UpdateUser :one
UPDATE users
SET
  full_name  = COALESCE(sqlc.narg('full_name'), full_name),
  avatar_url = COALESCE(sqlc.narg('avatar_url'), avatar_url),
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;
