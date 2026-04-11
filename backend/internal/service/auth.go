// Package service contains business logic for the Auth domain.
// It orchestrates repository calls, password hashing, token generation,
// and OAuth flows — keeping handlers thin and testable.
package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/yourname/generate-cv/config"
	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/pkg/jwtutil"
)

// ─── Sentinel errors ──────────────────────────────────────────────────────────

var (
	ErrEmailTaken       = errors.New("email already registered")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrTokenNotFound    = errors.New("token not found or expired")
	ErrPasswordTooWeak  = errors.New("password must be at least 8 characters")
)

// ─── Interfaces (for mocking in tests) ───────────────────────────────────────

type UserRepo interface {
	Create(ctx context.Context, email, hashedPassword, fullName string) (*repository.User, error)
	CreateOAuth(ctx context.Context, email, fullName string, avatarURL *string) (*repository.User, error)
	GetByEmail(ctx context.Context, email string) (*repository.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*repository.User, error)
	UpdatePassword(ctx context.Context, id uuid.UUID, hashedPassword string) error
}

type RefreshTokenRepo interface {
	Create(ctx context.Context, userID uuid.UUID, token string, expiresAt time.Time) (*repository.RefreshToken, error)
	Get(ctx context.Context, token string) (*repository.RefreshToken, error)
	Delete(ctx context.Context, token string) error
	DeleteByUserID(ctx context.Context, userID uuid.UUID) error
}

type SubscriptionRepo interface {
	Create(ctx context.Context, userID uuid.UUID, plan, status string) (*repository.Subscription, error)
}

type PasswordResetRepo interface {
	Create(ctx context.Context, userID uuid.UUID, token string, expiresAt time.Time) (*repository.PasswordResetToken, error)
	Get(ctx context.Context, token string) (*repository.PasswordResetToken, error)
	MarkUsed(ctx context.Context, token string) error
}

// EmailSender is a narrow interface — full Resend client satisfies it in production;
// a no-op struct satisfies it in tests.
type EmailSender interface {
	SendPasswordReset(ctx context.Context, toEmail, resetToken string) error
}

// ─── AuthService ──────────────────────────────────────────────────────────────

type AuthService struct {
	cfg       *config.Config
	users     UserRepo
	tokens    RefreshTokenRepo
	subs      SubscriptionRepo
	resets    PasswordResetRepo
	mailer    EmailSender
}

func NewAuthService(
	cfg *config.Config,
	users UserRepo,
	tokens RefreshTokenRepo,
	subs SubscriptionRepo,
	resets PasswordResetRepo,
	mailer EmailSender,
) *AuthService {
	return &AuthService{
		cfg:    cfg,
		users:  users,
		tokens: tokens,
		subs:   subs,
		resets: resets,
		mailer: mailer,
	}
}

// ─── Register ─────────────────────────────────────────────────────────────────

func (s *AuthService) Register(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, error) {
	// Check email uniqueness
	_, err := s.users.GetByEmail(ctx, req.Email)
	if err == nil {
		return nil, ErrEmailTaken
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get user by email: %w", err)
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	// Create user
	user, err := s.users.Create(ctx, req.Email, string(hash), req.FullName)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	// Create free subscription
	if _, err := s.subs.Create(ctx, user.ID, "free", "active"); err != nil {
		return nil, fmt.Errorf("create subscription: %w", err)
	}

	return s.issueTokenPair(ctx, user)
}

// ─── Login ────────────────────────────────────────────────────────────────────

func (s *AuthService) Login(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error) {
	user, err := s.users.GetByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("get user: %w", err)
	}

	// User registered via Google — no password
	if user.Password == nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.Password), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.issueTokenPair(ctx, user)
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*model.RefreshResponse, error) {
	rt, err := s.tokens.Get(ctx, refreshToken)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTokenNotFound
		}
		return nil, fmt.Errorf("get refresh token: %w", err)
	}

	if time.Now().After(rt.ExpiresAt) {
		// Clean up expired token
		_ = s.tokens.Delete(ctx, refreshToken)
		return nil, ErrTokenNotFound
	}

	accessToken, err := jwtutil.Sign(
		s.cfg.JWT.Secret,
		rt.UserID,
		time.Duration(s.cfg.JWT.AccessTTLMin)*time.Minute,
	)
	if err != nil {
		return nil, fmt.Errorf("sign access token: %w", err)
	}

	return &model.RefreshResponse{AccessToken: accessToken}, nil
}

// ─── Logout ───────────────────────────────────────────────────────────────────

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	if err := s.tokens.Delete(ctx, refreshToken); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("delete refresh token: %w", err)
	}
	return nil
}

// ─── ForgotPassword ───────────────────────────────────────────────────────────

// ForgotPassword always returns nil error (HTTP 200) to prevent user enumeration.
func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		// Silently ignore — do not reveal whether email exists
		return nil
	}

	token := uuid.New().String()
	expiresAt := time.Now().Add(1 * time.Hour)

	if _, err := s.resets.Create(ctx, user.ID, token, expiresAt); err != nil {
		return fmt.Errorf("create reset token: %w", err)
	}

	// Best-effort email send — failure is logged, not surfaced to caller
	_ = s.mailer.SendPasswordReset(ctx, email, token)

	return nil
}

// ─── ResetPassword ────────────────────────────────────────────────────────────

func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	rt, err := s.resets.Get(ctx, token)
	if err != nil {
		return ErrTokenNotFound
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	if err := s.users.UpdatePassword(ctx, rt.UserID, string(hash)); err != nil {
		return fmt.Errorf("update password: %w", err)
	}

	if err := s.resets.MarkUsed(ctx, token); err != nil {
		return fmt.Errorf("mark token used: %w", err)
	}

	// Invalidate all existing refresh tokens for security
	_ = s.tokens.DeleteByUserID(ctx, rt.UserID)

	return nil
}

// ─── UpsertOAuthUser ──────────────────────────────────────────────────────────

// UpsertOAuthUser is called after a successful Google OAuth2 callback.
func (s *AuthService) UpsertOAuthUser(ctx context.Context, email, fullName string, avatarURL *string) (*model.AuthResponse, error) {
	user, err := s.users.CreateOAuth(ctx, email, fullName, avatarURL)
	if err != nil {
		return nil, fmt.Errorf("upsert oauth user: %w", err)
	}

	// Ensure subscription exists (ignore duplicate key error for existing users)
	_, _ = s.subs.Create(ctx, user.ID, "free", "active")

	return s.issueTokenPair(ctx, user)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

func (s *AuthService) issueTokenPair(ctx context.Context, user *repository.User) (*model.AuthResponse, error) {
	accessToken, err := jwtutil.Sign(
		s.cfg.JWT.Secret,
		user.ID,
		time.Duration(s.cfg.JWT.AccessTTLMin)*time.Minute,
	)
	if err != nil {
		return nil, fmt.Errorf("sign access token: %w", err)
	}

	refreshToken := uuid.New().String()
	expiresAt := time.Now().AddDate(0, 0, s.cfg.JWT.RefreshTTLDays)

	if _, err := s.tokens.Create(ctx, user.ID, refreshToken, expiresAt); err != nil {
		return nil, fmt.Errorf("create refresh token: %w", err)
	}

	return &model.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: model.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			FullName:  user.FullName,
			AvatarURL: user.AvatarURL,
			CreatedAt: user.CreatedAt,
		},
	}, nil
}
