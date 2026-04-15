// Package model defines request / response structs for Profile API.
package model

import (
	"time"

	"github.com/google/uuid"
)

// ─── Section types ────────────────────────────────────────────────────────────

type SectionType string

const (
	SectionTypeWorkExperience  SectionType = "work_experience"
	SectionTypeEducation       SectionType = "education"
	SectionTypeSkills          SectionType = "skills"
	SectionTypeProjects        SectionType = "projects"
	SectionTypeCertifications  SectionType = "certifications"
	SectionTypeLanguages       SectionType = "languages"
	SectionTypeCustom          SectionType = "custom"
)

// ─── Request payloads ─────────────────────────────────────────────────────────

type CreateProfileRequest struct {
	Name       string  `json:"name"        binding:"required,min=1,max=100"`
	RoleTarget *string `json:"role_target"`
	Summary    *string `json:"summary"`
	FullName   *string `json:"full_name"`
	Email      *string `json:"email"`
	Phone      *string `json:"phone"`
	Location   *string `json:"location"`
	LinkedinURL *string `json:"linkedin_url"`
	GithubURL  *string `json:"github_url"`
	WebsiteURL *string `json:"website_url"`
	AvatarURL  *string `json:"avatar_url"`
}

type UpdateProfileRequest struct {
	Name       *string `json:"name"         binding:"omitempty,min=1,max=100"`
	RoleTarget *string `json:"role_target"`
	Summary    *string `json:"summary"`
	FullName   *string `json:"full_name"`
	Email      *string `json:"email"`
	Phone      *string `json:"phone"`
	Location   *string `json:"location"`
	LinkedinURL *string `json:"linkedin_url"`
	GithubURL  *string `json:"github_url"`
	WebsiteURL *string `json:"website_url"`
	AvatarURL  *string `json:"avatar_url"`
}

type CreateSectionRequest struct {
	Type     SectionType `json:"type"  binding:"required"`
	Title    string      `json:"title" binding:"required,min=1,max=100"`
	Position int         `json:"position"`
}

type UpdateSectionRequest struct {
	Title     *string `json:"title"      binding:"omitempty,min=1,max=100"`
	Position  *int    `json:"position"`
	IsVisible *bool   `json:"is_visible"`
}

type ReorderRequest struct {
	Order []uuid.UUID `json:"order" binding:"required,min=1"`
}

type CreateItemRequest struct {
	Position  int            `json:"position"`
	IsVisible *bool          `json:"is_visible"`
	Data      map[string]any `json:"data" binding:"required"`
}

type UpdateItemRequest struct {
	Position  *int           `json:"position"`
	IsVisible *bool          `json:"is_visible"`
	Data      map[string]any `json:"data"`
}

// ─── Response payloads ───────────────────────────────────────────────────────

type ProfileItemResponse struct {
	ID        uuid.UUID      `json:"id"`
	SectionID uuid.UUID      `json:"section_id"`
	Position  int            `json:"position"`
	IsVisible bool           `json:"is_visible"`
	Data      map[string]any `json:"data"`
}

type ProfileSectionResponse struct {
	ID        uuid.UUID             `json:"id"`
	ProfileID uuid.UUID             `json:"profile_id"`
	Type      SectionType           `json:"type"`
	Title     string                `json:"title"`
	Position  int                   `json:"position"`
	IsVisible bool                  `json:"is_visible"`
	Items     []ProfileItemResponse `json:"items,omitempty"`
}

type ProfileResponse struct {
	ID          uuid.UUID                `json:"id"`
	UserID      uuid.UUID                `json:"user_id"`
	Name        string                   `json:"name"`
	RoleTarget  *string                  `json:"role_target,omitempty"`
	Summary     *string                  `json:"summary,omitempty"`
	FullName    *string                  `json:"full_name,omitempty"`
	Email       *string                  `json:"email,omitempty"`
	Phone       *string                  `json:"phone,omitempty"`
	Location    *string                  `json:"location,omitempty"`
	LinkedinURL *string                  `json:"linkedin_url,omitempty"`
	GithubURL   *string                  `json:"github_url,omitempty"`
	WebsiteURL  *string                  `json:"website_url,omitempty"`
	AvatarURL   *string                  `json:"avatar_url,omitempty"`
	IsDefault   bool                     `json:"is_default"`
	Sections    []ProfileSectionResponse `json:"sections,omitempty"`
	CreatedAt   time.Time                `json:"created_at"`
	UpdatedAt   time.Time                `json:"updated_at"`
}

type ListProfilesResponse struct {
	Data  []ProfileResponse `json:"data"`
	Total int64             `json:"total"`
}
