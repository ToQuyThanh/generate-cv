package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yourname/generate-cv/config"
	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/internal/service"
)

// ─── Mock implementations ─────────────────────────────────────────────────────

type mockUserRepo struct {
	users map[string]*repository.User // keyed by email
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{users: make(map[string]*repository.User)}
}

func (m *mockUserRepo) Create(_ context.Context, email, hashedPassword, fullName string) (*repository.User, error) {
	if _, exists := m.users[email]; exists {
		return nil, errors.New("duplicate email")
	}
	u := &repository.User{
		ID:       uuid.New(),
		Email:    email,
		Password: &hashedPassword,
		FullName: fullName,
	}
	m.users[email] = u
	return u, nil
}

func (m *mockUserRepo) CreateOAuth(_ context.Context, email, fullName string, avatarURL *string) (*repository.User, error) {
	if u, exists := m.users[email]; exists {
		return u, nil
	}
	u := &repository.User{
		ID:        uuid.New(),
		Email:     email,
		FullName:  fullName,
		AvatarURL: avatarURL,
	}
	m.users[email] = u
	return u, nil
}

func (m *mockUserRepo) GetByEmail(_ context.Context, email string) (*repository.User, error) {
	if u, ok := m.users[email]; ok {
		return u, nil
	}
	return nil, pgx.ErrNoRows
}

func (m *mockUserRepo) GetByID(_ context.Context, id uuid.UUID) (*repository.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, pgx.ErrNoRows
}

func (m *mockUserRepo) UpdatePassword(_ context.Context, id uuid.UUID, hashedPassword string) error {
	for _, u := range m.users {
		if u.ID == id {
			u.Password = &hashedPassword
			return nil
		}
	}
	return pgx.ErrNoRows
}

// ─────────────────────────────────────────────────────────────────────────────

type mockRefreshTokenRepo struct {
	tokens map[string]*repository.RefreshToken
}

func newMockRefreshTokenRepo() *mockRefreshTokenRepo {
	return &mockRefreshTokenRepo{tokens: make(map[string]*repository.RefreshToken)}
}

func (m *mockRefreshTokenRepo) Create(_ context.Context, userID uuid.UUID, token string, expiresAt time.Time) (*repository.RefreshToken, error) {
	rt := &repository.RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     token,
		ExpiresAt: expiresAt,
	}
	m.tokens[token] = rt
	return rt, nil
}

func (m *mockRefreshTokenRepo) Get(_ context.Context, token string) (*repository.RefreshToken, error) {
	if rt, ok := m.tokens[token]; ok {
		return rt, nil
	}
	return nil, pgx.ErrNoRows
}

func (m *mockRefreshTokenRepo) Delete(_ context.Context, token string) error {
	delete(m.tokens, token)
	return nil
}

func (m *mockRefreshTokenRepo) DeleteByUserID(_ context.Context, userID uuid.UUID) error {
	for k, rt := range m.tokens {
		if rt.UserID == userID {
			delete(m.tokens, k)
		}
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────

type mockSubscriptionRepo struct{}

func (m *mockSubscriptionRepo) Create(_ context.Context, userID uuid.UUID, plan, status string) (*repository.Subscription, error) {
	return &repository.Subscription{
		ID:     uuid.New(),
		UserID: userID,
		Plan:   plan,
		Status: status,
	}, nil
}

// ─────────────────────────────────────────────────────────────────────────────

type mockPasswordResetRepo struct {
	tokens map[string]*repository.PasswordResetToken
}

func newMockPasswordResetRepo() *mockPasswordResetRepo {
	return &mockPasswordResetRepo{tokens: make(map[string]*repository.PasswordResetToken)}
}

func (m *mockPasswordResetRepo) Create(_ context.Context, userID uuid.UUID, token string, expiresAt time.Time) (*repository.PasswordResetToken, error) {
	rt := &repository.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     token,
		ExpiresAt: expiresAt,
	}
	m.tokens[token] = rt
	return rt, nil
}

func (m *mockPasswordResetRepo) Get(_ context.Context, token string) (*repository.PasswordResetToken, error) {
	if rt, ok := m.tokens[token]; ok {
		if rt.UsedAt != nil || time.Now().After(rt.ExpiresAt) {
			return nil, pgx.ErrNoRows
		}
		return rt, nil
	}
	return nil, pgx.ErrNoRows
}

func (m *mockPasswordResetRepo) MarkUsed(_ context.Context, token string) error {
	if rt, ok := m.tokens[token]; ok {
		now := time.Now()
		rt.UsedAt = &now
		return nil
	}
	return pgx.ErrNoRows
}

// ─────────────────────────────────────────────────────────────────────────────

type mockEmailSender struct {
	sent []string
}

func (m *mockEmailSender) SendPasswordReset(_ context.Context, toEmail, _ string) error {
	m.sent = append(m.sent, toEmail)
	return nil
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

func testConfig() *config.Config {
	return &config.Config{
		JWT: config.JWTConfig{
			Secret:         "test-secret-at-least-32-chars-long!!",
			AccessTTLMin:   15,
			RefreshTTLDays: 30,
		},
	}
}

func newTestService() (*service.AuthService, *mockUserRepo, *mockRefreshTokenRepo, *mockPasswordResetRepo, *mockEmailSender) {
	users := newMockUserRepo()
	tokens := newMockRefreshTokenRepo()
	subs := &mockSubscriptionRepo{}
	resets := newMockPasswordResetRepo()
	mailer := &mockEmailSender{}
	svc := service.NewAuthService(testConfig(), users, tokens, subs, resets, mailer)
	return svc, users, tokens, resets, mailer
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func TestRegister_Success(t *testing.T) {
	svc, _, _, _, _ := newTestService()

	resp, err := svc.Register(context.Background(), model.RegisterRequest{
		Email:    "alice@example.com",
		Password: "securepassword",
		FullName: "Alice",
	})

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if resp.AccessToken == "" {
		t.Error("expected non-empty access token")
	}
	if resp.RefreshToken == "" {
		t.Error("expected non-empty refresh token")
	}
	if resp.User.Email != "alice@example.com" {
		t.Errorf("expected email alice@example.com, got %s", resp.User.Email)
	}
}

func TestRegister_DuplicateEmail(t *testing.T) {
	svc, _, _, _, _ := newTestService()

	req := model.RegisterRequest{Email: "alice@example.com", Password: "securepassword", FullName: "Alice"}
	if _, err := svc.Register(context.Background(), req); err != nil {
		t.Fatalf("first register should succeed: %v", err)
	}

	_, err := svc.Register(context.Background(), req)
	if !errors.Is(err, service.ErrEmailTaken) {
		t.Errorf("expected ErrEmailTaken, got: %v", err)
	}
}

func TestLogin_Success(t *testing.T) {
	svc, _, _, _, _ := newTestService()

	_, err := svc.Register(context.Background(), model.RegisterRequest{
		Email: "bob@example.com", Password: "mypassword1", FullName: "Bob",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	resp, err := svc.Login(context.Background(), model.LoginRequest{
		Email: "bob@example.com", Password: "mypassword1",
	})
	if err != nil {
		t.Fatalf("login should succeed: %v", err)
	}
	if resp.AccessToken == "" {
		t.Error("expected non-empty access token")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	svc, _, _, _, _ := newTestService()

	_, _ = svc.Register(context.Background(), model.RegisterRequest{
		Email: "carol@example.com", Password: "correctpass", FullName: "Carol",
	})

	_, err := svc.Login(context.Background(), model.LoginRequest{
		Email: "carol@example.com", Password: "wrongpass",
	})
	if !errors.Is(err, service.ErrInvalidCredentials) {
		t.Errorf("expected ErrInvalidCredentials, got: %v", err)
	}
}

func TestLogin_UnknownEmail(t *testing.T) {
	svc, _, _, _, _ := newTestService()

	_, err := svc.Login(context.Background(), model.LoginRequest{
		Email: "nobody@example.com", Password: "whatever",
	})
	if !errors.Is(err, service.ErrInvalidCredentials) {
		t.Errorf("expected ErrInvalidCredentials, got: %v", err)
	}
}

func TestRefresh_Success(t *testing.T) {
	svc, _, _, _, _ := newTestService()

	reg, _ := svc.Register(context.Background(), model.RegisterRequest{
		Email: "dave@example.com", Password: "pass12345", FullName: "Dave",
	})

	resp, err := svc.Refresh(context.Background(), reg.RefreshToken)
	if err != nil {
		t.Fatalf("refresh should succeed: %v", err)
	}
	if resp.AccessToken == "" {
		t.Error("expected non-empty new access token")
	}
}

func TestRefresh_InvalidToken(t *testing.T) {
	svc, _, _, _, _ := newTestService()

	_, err := svc.Refresh(context.Background(), "not-a-real-token")
	if !errors.Is(err, service.ErrTokenNotFound) {
		t.Errorf("expected ErrTokenNotFound, got: %v", err)
	}
}

func TestLogout_DeletesToken(t *testing.T) {
	svc, _, tokenRepo, _, _ := newTestService()

	reg, _ := svc.Register(context.Background(), model.RegisterRequest{
		Email: "eve@example.com", Password: "pass12345", FullName: "Eve",
	})

	if err := svc.Logout(context.Background(), reg.RefreshToken); err != nil {
		t.Fatalf("logout should succeed: %v", err)
	}

	// Token should no longer exist
	_, err := tokenRepo.Get(context.Background(), reg.RefreshToken)
	if !errors.Is(err, pgx.ErrNoRows) {
		t.Errorf("refresh token should be deleted after logout")
	}
}

func TestForgotPassword_AlwaysSucceeds(t *testing.T) {
	svc, _, _, _, mailer := newTestService()

	// Unknown email — should still return nil (no user enumeration)
	if err := svc.ForgotPassword(context.Background(), "ghost@example.com"); err != nil {
		t.Errorf("forgot password should always return nil, got: %v", err)
	}
	if len(mailer.sent) != 0 {
		t.Error("should not send email for unknown address")
	}

	// Known email — email should be sent
	_, _ = svc.Register(context.Background(), model.RegisterRequest{
		Email: "frank@example.com", Password: "pass12345", FullName: "Frank",
	})
	if err := svc.ForgotPassword(context.Background(), "frank@example.com"); err != nil {
		t.Errorf("forgot password: %v", err)
	}
	if len(mailer.sent) != 1 || mailer.sent[0] != "frank@example.com" {
		t.Errorf("expected email sent to frank@example.com, got: %v", mailer.sent)
	}
}

func TestResetPassword_Success(t *testing.T) {
	svc, _, _, resets, _ := newTestService()

	reg, _ := svc.Register(context.Background(), model.RegisterRequest{
		Email: "grace@example.com", Password: "oldpassword", FullName: "Grace",
	})

	// Manually create a valid reset token
	resetToken := uuid.New().String()
	_, _ = resets.Create(context.Background(), reg.User.ID, resetToken, time.Now().Add(1*time.Hour))

	if err := svc.ResetPassword(context.Background(), resetToken, "newpassword1"); err != nil {
		t.Fatalf("reset password should succeed: %v", err)
	}

	// Old password should no longer work
	_, err := svc.Login(context.Background(), model.LoginRequest{
		Email: "grace@example.com", Password: "oldpassword",
	})
	if !errors.Is(err, service.ErrInvalidCredentials) {
		t.Errorf("old password should be rejected after reset")
	}

	// New password should work
	_, err = svc.Login(context.Background(), model.LoginRequest{
		Email: "grace@example.com", Password: "newpassword1",
	})
	if err != nil {
		t.Errorf("new password should work: %v", err)
	}
}

func TestResetPassword_InvalidToken(t *testing.T) {
	svc, _, _, _, _ := newTestService()

	err := svc.ResetPassword(context.Background(), "fake-token", "newpassword")
	if !errors.Is(err, service.ErrTokenNotFound) {
		t.Errorf("expected ErrTokenNotFound, got: %v", err)
	}
}
