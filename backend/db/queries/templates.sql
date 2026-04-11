-- name: ListTemplates :many
SELECT * FROM templates
WHERE
  ($1::boolean IS NULL OR is_premium = $1)
ORDER BY id;

-- name: GetTemplateByID :one
SELECT * FROM templates WHERE id = $1 LIMIT 1;

-- name: UpsertTemplate :one
INSERT INTO templates (id, name, thumbnail_url, preview_url, is_premium, tags)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (id) DO UPDATE
SET
  name          = EXCLUDED.name,
  thumbnail_url = EXCLUDED.thumbnail_url,
  preview_url   = EXCLUDED.preview_url,
  is_premium    = EXCLUDED.is_premium,
  tags          = EXCLUDED.tags
RETURNING *;
