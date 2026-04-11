-- name: CreateCV :one
INSERT INTO cvs (user_id, title, template_id, color_theme, sections)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetCVByID :one
SELECT * FROM cvs WHERE id = $1 LIMIT 1;

-- name: ListCVsByUser :many
SELECT * FROM cvs
WHERE user_id = $1
ORDER BY updated_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateCV :one
UPDATE cvs
SET
  title       = COALESCE(sqlc.narg('title'), title),
  template_id = COALESCE(sqlc.narg('template_id'), template_id),
  color_theme = COALESCE(sqlc.narg('color_theme'), color_theme),
  sections    = COALESCE(sqlc.narg('sections'), sections),
  updated_at  = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteCV :exec
DELETE FROM cvs WHERE id = $1;
