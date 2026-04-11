-- +goose Up
-- Seed: 3 free templates + 5 premium templates

INSERT INTO templates (id, name, thumbnail_url, preview_url, is_premium, tags) VALUES
  -- ── Free templates ──────────────────────────────────────────────────────────
  (
    'template_modern_01',
    'Modern',
    'https://cdn.generate-cv.com/thumbnails/modern_01.png',
    'https://cdn.generate-cv.com/previews/modern_01.png',
    FALSE,
    ARRAY['modern','clean','single-column']
  ),
  (
    'template_classic_01',
    'Classic',
    'https://cdn.generate-cv.com/thumbnails/classic_01.png',
    'https://cdn.generate-cv.com/previews/classic_01.png',
    FALSE,
    ARRAY['classic','traditional','single-column']
  ),
  (
    'template_minimal_01',
    'Minimal',
    'https://cdn.generate-cv.com/thumbnails/minimal_01.png',
    'https://cdn.generate-cv.com/previews/minimal_01.png',
    FALSE,
    ARRAY['minimal','clean','two-column']
  ),

  -- ── Premium templates ───────────────────────────────────────────────────────
  (
    'template_executive_01',
    'Executive',
    'https://cdn.generate-cv.com/thumbnails/executive_01.png',
    'https://cdn.generate-cv.com/previews/executive_01.png',
    TRUE,
    ARRAY['premium','executive','professional','two-column']
  ),
  (
    'template_creative_01',
    'Creative',
    'https://cdn.generate-cv.com/thumbnails/creative_01.png',
    'https://cdn.generate-cv.com/previews/creative_01.png',
    TRUE,
    ARRAY['premium','creative','design','colorful']
  ),
  (
    'template_tech_01',
    'Tech',
    'https://cdn.generate-cv.com/thumbnails/tech_01.png',
    'https://cdn.generate-cv.com/previews/tech_01.png',
    TRUE,
    ARRAY['premium','tech','developer','dark']
  ),
  (
    'template_elegant_01',
    'Elegant',
    'https://cdn.generate-cv.com/thumbnails/elegant_01.png',
    'https://cdn.generate-cv.com/previews/elegant_01.png',
    TRUE,
    ARRAY['premium','elegant','serif','two-column']
  ),
  (
    'template_bold_01',
    'Bold',
    'https://cdn.generate-cv.com/thumbnails/bold_01.png',
    'https://cdn.generate-cv.com/previews/bold_01.png',
    TRUE,
    ARRAY['premium','bold','impact','single-column']
  )
ON CONFLICT (id) DO NOTHING;

-- +goose Down
DELETE FROM templates WHERE id IN (
  'template_modern_01',
  'template_classic_01',
  'template_minimal_01',
  'template_executive_01',
  'template_creative_01',
  'template_tech_01',
  'template_elegant_01',
  'template_bold_01'
);
