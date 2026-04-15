// Package model defines request / response structs for Auth API.
// These are separate from sqlc-generated DB models intentionally:
// API shapes can evolve independently of the DB schema.
package model

import (
	"time"

	"github.com/google/uuid"
)

// ─── Request payloads ────────────────────────────────────────────────────────

type RegisterRequest struct {
	Email    string `json:"email"     binding:"required,email"`
	Password string `json:"password"  binding:"required,min=8"`
	FullName string `json:"full_name" binding:"required,min=1"`
}

type LoginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token"        binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// ─── Response payloads ───────────────────────────────────────────────────────

type UserResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	AvatarURL *string   `json:"avatar_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         UserResponse `json:"user"`
}

type RefreshResponse struct {
	AccessToken string `json:"access_token"`
}

// ─── JWT Claims ───────────────────────────────────────────────────────────────

type JWTClaims struct {
	UserID uuid.UUID `json:"sub"`
}
