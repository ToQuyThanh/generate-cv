// Package model defines request / response structs for User API.
package model

import (
	"time"

	"github.com/google/uuid"
)

// ─── Request payloads ────────────────────────────────────────────────────────

// UpdateUserRequest holds optional fields for PATCH /users/me.
// nil = keep existing value.
type UpdateUserRequest struct {
	FullName  *string `json:"full_name"`
	AvatarURL *string `json:"avatar_url"`
}

// ─── Response payloads ───────────────────────────────────────────────────────

// SubscriptionResponse is the subscription block returned inside user responses.
type SubscriptionResponse struct {
	ID        uuid.UUID  `json:"id"`
	Plan      string     `json:"plan"`   // free | weekly | monthly
	Status    string     `json:"status"` // active | expired | cancelled
	StartedAt *time.Time `json:"started_at,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// UserWithSubResponse is returned by GET /users/me.
type UserWithSubResponse struct {
	ID           uuid.UUID             `json:"id"`
	Email        string                `json:"email"`
	FullName     string                `json:"full_name"`
	AvatarURL    *string               `json:"avatar_url,omitempty"`
	CreatedAt    time.Time             `json:"created_at"`
	Subscription *SubscriptionResponse `json:"subscription,omitempty"`
}
