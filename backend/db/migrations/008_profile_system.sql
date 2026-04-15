-- +goose Up
-- +goose StatementBegin

-- ─── cv_profiles ─────────────────────────────────────────────────────────────
-- Bộ dữ liệu CV của user (profile-first model)
CREATE TABLE cv_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,          -- "Senior Backend", "Freelance Fullstack"
  role_target  TEXT,                   -- "Software Engineer"
  summary      TEXT,
  -- Personal info
  full_name    TEXT,
  email        TEXT,
  phone        TEXT,
  location     TEXT,
  linkedin_url TEXT,
  github_url   TEXT,
  website_url  TEXT,
  avatar_url   TEXT,
  -- Meta
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── cv_profile_sections ─────────────────────────────────────────────────────
-- Section trong profile: work_experience, education, skills, projects, certs...
CREATE TABLE cv_profile_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES cv_profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,    -- 'work_experience'|'education'|'skills'|'projects'|'certifications'|'languages'|'custom'
  title       TEXT NOT NULL,    -- display label (user có thể đổi)
  position    INT  NOT NULL,    -- thứ tự hiển thị (0-based)
  is_visible  BOOLEAN NOT NULL DEFAULT true
);

-- ─── cv_profile_items ────────────────────────────────────────────────────────
-- Item trong section: 1 công ty, 1 trường, 1 skill group...
CREATE TABLE cv_profile_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID NOT NULL REFERENCES cv_profile_sections(id) ON DELETE CASCADE,
  position    INT  NOT NULL,
  is_visible  BOOLEAN NOT NULL DEFAULT true,
  data        JSONB NOT NULL DEFAULT '{}'  -- schema flexible theo section type
);

-- ─── cv_documents ────────────────────────────────────────────────────────────
-- Thêm columns vào bảng cvs hiện có (rename tương lai, nhưng giữ backward compat)
ALTER TABLE cvs
  ADD COLUMN profile_id       UUID REFERENCES cv_profiles(id) ON DELETE SET NULL,
  ADD COLUMN profile_snapshot JSONB,
  ADD COLUMN overrides        JSONB NOT NULL DEFAULT '{}';

-- ─── cv_uploads ──────────────────────────────────────────────────────────────
-- Upload tracking cho PDF/DOCX/XLSX
CREATE TABLE cv_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id    UUID REFERENCES cv_profiles(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_type     TEXT NOT NULL,          -- 'pdf' | 'docx' | 'xlsx'
  parse_status  TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'processing'|'done'|'failed'
  parsed_data   JSONB,                  -- raw extract từ AI
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_cv_profiles_user_id         ON cv_profiles(user_id);
CREATE INDEX idx_cv_profiles_is_default      ON cv_profiles(user_id, is_default);
CREATE INDEX idx_cv_profile_sections_profile ON cv_profile_sections(profile_id, position);
CREATE INDEX idx_cv_profile_items_section    ON cv_profile_items(section_id, position);
CREATE INDEX idx_cvs_profile_id              ON cvs(profile_id);
CREATE INDEX idx_cv_uploads_user_id          ON cv_uploads(user_id);
CREATE INDEX idx_cv_uploads_profile_id       ON cv_uploads(profile_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_cv_uploads_profile_id;
DROP INDEX IF EXISTS idx_cv_uploads_user_id;
DROP INDEX IF EXISTS idx_cvs_profile_id;
DROP INDEX IF EXISTS idx_cv_profile_items_section;
DROP INDEX IF EXISTS idx_cv_profile_sections_profile;
DROP INDEX IF EXISTS idx_cv_profiles_is_default;
DROP INDEX IF EXISTS idx_cv_profiles_user_id;

DROP TABLE IF EXISTS cv_uploads;

ALTER TABLE cvs
  DROP COLUMN IF EXISTS overrides,
  DROP COLUMN IF EXISTS profile_snapshot,
  DROP COLUMN IF EXISTS profile_id;

DROP TABLE IF EXISTS cv_profile_items;
DROP TABLE IF EXISTS cv_profile_sections;
DROP TABLE IF EXISTS cv_profiles;

-- +goose StatementEnd
