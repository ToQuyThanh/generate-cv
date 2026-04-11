// Package service — business logic for User domain.
package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
)

// ─── Sentinel errors ──────────────────────────────────────────────────────────

var ErrUserNotFound = errors.New("user not found")

// ─── Repo interfaces (for mocking in tests) ───────────────────────────────────

type UserRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (*repository.User, error)
	UpdateFields(ctx context.Context, id uuid.UUID, fullName, avatarURL *string) (*repository.User, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type SubRepo interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*repository.Subscription, error)
}

// ─── UserService ──────────────────────────────────────────────────────────────

type UserService struct {
	users UserRepo
	subs  SubRepo
}

func NewUserService(users UserRepo, subs SubRepo) *UserService {
	return &UserService{users: users, subs: subs}
}

// ─── GetMe ────────────────────────────────────────────────────────────────────

// GetMe returns user info + subscription.
func (s *UserService) GetMe(ctx context.Context, userID uuid.UUID) (*model.UserWithSubResponse, error) {
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user: %w", err)
	}

	sub, err := s.subs.GetByUserID(ctx, userID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get subscription: %w", err)
	}

	return toUserWithSubResponse(u, sub), nil
}

// ─── UpdateMe ─────────────────────────────────────────────────────────────────

// UpdateMe applies partial update to the user profile.
func (s *UserService) UpdateMe(ctx context.Context, userID uuid.UUID, req model.UpdateUserRequest) (*model.UserWithSubResponse, error) {
	u, err := s.users.UpdateFields(ctx, userID, req.FullName, req.AvatarURL)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("update user: %w", err)
	}

	sub, err := s.subs.GetByUserID(ctx, userID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get subscription after update: %w", err)
	}

	return toUserWithSubResponse(u, sub), nil
}

// ─── DeleteMe ────────────────────────────────────────────────────────────────

// DeleteMe hard-deletes the user. DB CASCADE removes CVs, tokens, subscription.
func (s *UserService) DeleteMe(ctx context.Context, userID uuid.UUID) error {
	// Verify the user exists first
	_, err := s.users.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("get user for delete: %w", err)
	}

	if err := s.users.Delete(ctx, userID); err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	return nil
}

// ─── GetSubscription ─────────────────────────────────────────────────────────

// GetSubscription returns only the subscription detail for the current user.
func (s *UserService) GetSubscription(ctx context.Context, userID uuid.UUID) (*model.SubscriptionResponse, error) {
	sub, err := s.subs.GetByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Return a default free subscription if none exists yet
			return &model.SubscriptionResponse{
				Plan:   "free",
				Status: "active",
			}, nil
		}
		return nil, fmt.Errorf("get subscription: %w", err)
	}

	return toSubResponse(sub), nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func toSubResponse(s *repository.Subscription) *model.SubscriptionResponse {
	if s == nil {
		return nil
	}
	return &model.SubscriptionResponse{
		ID:        s.ID,
		Plan:      s.Plan,
		Status:    s.Status,
		StartedAt: s.StartedAt,
		ExpiresAt: s.ExpiresAt,
		UpdatedAt: s.UpdatedAt,
	}
}

func toUserWithSubResponse(u *repository.User, sub *repository.Subscription) *model.UserWithSubResponse {
	return &model.UserWithSubResponse{
		ID:           u.ID,
		Email:        u.Email,
		FullName:     u.FullName,
		AvatarURL:    u.AvatarURL,
		CreatedAt:    u.CreatedAt,
		Subscription: toSubResponse(sub),
	}
}
