// Package model defines request / response structs for CV API.
package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ─── Common types ─────────────────────────────────────────────────────────────

// Sections is a raw JSON array — the frontend owns the shape of each section block.
// Backend stores and returns it opaquely; no validation on section internals.
type Sections = json.RawMessage

// ─── Request payloads ────────────────────────────────────────────────────────

type CreateCVRequest struct {
	Title      string     `json:"title"       binding:"required,min=1,max=200"`
	TemplateID string     `json:"template_id" binding:"required"`
	ColorTheme string     `json:"color_theme" binding:"required"`
	ProfileID  *uuid.UUID `json:"profile_id"` // optional — link to a profile & snapshot it
	Sections   Sections   `json:"sections"`
}

type UpdateCVRequest struct {
	Title      *string  `json:"title"`
	TemplateID *string  `json:"template_id"`
	ColorTheme *string  `json:"color_theme"`
	Sections   Sections `json:"sections"`
}

// UpdateCVOverridesRequest carries the CV-level override data saved from the editor.
type UpdateCVOverridesRequest struct {
	Overrides json.RawMessage `json:"overrides" binding:"required"`
}

// ListCVsQuery holds pagination params parsed from query string.
type ListCVsQuery struct {
	Page    int `form:"page"`
	PerPage int `form:"per_page"`
}

// ─── Response payloads ───────────────────────────────────────────────────────

type CVResponse struct {
	ID              uuid.UUID       `json:"id"`
	UserID          uuid.UUID       `json:"user_id"`
	ProfileID       *uuid.UUID      `json:"profile_id,omitempty"`
	Title           string          `json:"title"`
	TemplateID      string          `json:"template_id"`
	ColorTheme      string          `json:"color_theme"`
	Sections        Sections        `json:"sections"`
	ProfileSnapshot json.RawMessage `json:"profile_snapshot,omitempty"`
	Overrides       json.RawMessage `json:"overrides,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type ListCVsResponse struct {
	Data       []CVResponse `json:"data"`
	Total      int64        `json:"total"`
	Page       int          `json:"page"`
	PerPage    int          `json:"per_page"`
	TotalPages int          `json:"total_pages"`
}
