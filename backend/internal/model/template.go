// Package model defines request / response structs for Template API.
package model

// ─── Request payloads ────────────────────────────────────────────────────────

// ListTemplatesQuery holds optional filters for GET /templates.
type ListTemplatesQuery struct {
	// IsPremium filters by premium flag. nil = no filter (return all).
	IsPremium *bool  `form:"is_premium"`
	Tag       string `form:"tag"`
}

// ─── Response payloads ───────────────────────────────────────────────────────

// TemplateResponse is a single template as returned by the API.
type TemplateResponse struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	ThumbnailURL *string  `json:"thumbnail_url,omitempty"`
	PreviewURL   *string  `json:"preview_url,omitempty"`
	IsPremium    bool     `json:"is_premium"`
	Tags         []string `json:"tags"`
}

// ListTemplatesResponse wraps a slice of templates with a total count.
type ListTemplatesResponse struct {
	Data  []TemplateResponse `json:"data"`
	Total int                `json:"total"`
}
