package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/internal/service"
)

// ─── Mocks ───────────────────────────────────────────────────────────────────

type mockUserRepo struct {
	user    *repository.User
	updated *repository.User
	err     error
	deleted bool
}

func (m *mockUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*repository.User, error) {
	return m.user, m.err
}

func (m *mockUserRepo) UpdateFields(_ context.Context, _ uuid.UUID, fullName, avatarURL *string) (*repository.User, error) {
	if m.err != nil {
		return nil, m.err
	}
	u := *m.user
	if fullName != nil {
		u.FullName = *fullName
	}
	if avatarURL != nil {
		u.AvatarURL = avatarURL
	}
	m.updated = &u
	return &u, nil
}

func (m *mockUserRepo) Delete(_ context.Context, _ uuid.UUID) error {
	if m.err != nil {
		return m.err
	}
	m.deleted = true
	return nil
}

type mockSubRepo struct {
	sub *repository.Subscription
	err error
}

func (m *mockSubRepo) GetByUserID(_ context.Context, _ uuid.UUID) (*repository.Subscription, error) {
	return m.sub, m.err
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func sampleUser() *repository.User {
	return &repository.User{
		ID:        uuid.New(),
		Email:     "test@example.com",
		FullName:  "Test User",
		AvatarURL: nil,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func sampleSub() *repository.Subscription {
	now := time.Now()
	return &repository.Subscription{
		ID:        uuid.New(),
		UserID:    uuid.New(),
		Plan:      "monthly",
		Status:    "active",
		StartedAt: &now,
		ExpiresAt: &now,
		UpdatedAt: now,
	}
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func TestUserService_GetMe_OK(t *testing.T) {
	u := sampleUser()
	sub := sampleSub()
	svc := service.NewUserService(&mockUserRepo{user: u}, &mockSubRepo{sub: sub})

	resp, err := svc.GetMe(context.Background(), u.ID)

	require.NoError(t, err)
	assert.Equal(t, u.Email, resp.Email)
	assert.Equal(t, u.FullName, resp.FullName)
	require.NotNil(t, resp.Subscription)
	assert.Equal(t, "monthly", resp.Subscription.Plan)
}

func TestUserService_GetMe_NoSubscription(t *testing.T) {
	u := sampleUser()
	svc := service.NewUserService(&mockUserRepo{user: u}, &mockSubRepo{err: pgx.ErrNoRows})

	resp, err := svc.GetMe(context.Background(), u.ID)

	require.NoError(t, err)
	assert.Equal(t, u.Email, resp.Email)
	assert.Nil(t, resp.Subscription) // no subscription row = nil in response
}

func TestUserService_GetMe_UserNotFound(t *testing.T) {
	svc := service.NewUserService(&mockUserRepo{err: pgx.ErrNoRows}, &mockSubRepo{})

	_, err := svc.GetMe(context.Background(), uuid.New())

	assert.ErrorIs(t, err, service.ErrUserNotFound)
}

func TestUserService_GetMe_DBError(t *testing.T) {
	dbErr := errors.New("db connection lost")
	svc := service.NewUserService(&mockUserRepo{err: dbErr}, &mockSubRepo{})

	_, err := svc.GetMe(context.Background(), uuid.New())

	require.Error(t, err)
	assert.NotErrorIs(t, err, service.ErrUserNotFound)
}

func TestUserService_UpdateMe_OK(t *testing.T) {
	u := sampleUser()
	newName := "Updated Name"
	svc := service.NewUserService(&mockUserRepo{user: u}, &mockSubRepo{err: pgx.ErrNoRows})

	resp, err := svc.UpdateMe(context.Background(), u.ID, model.UpdateUserRequest{
		FullName: &newName,
	})

	require.NoError(t, err)
	assert.Equal(t, "Updated Name", resp.FullName)
}

func TestUserService_UpdateMe_AvatarURL(t *testing.T) {
	u := sampleUser()
	avatarURL := "https://example.com/avatar.png"
	svc := service.NewUserService(&mockUserRepo{user: u}, &mockSubRepo{err: pgx.ErrNoRows})

	resp, err := svc.UpdateMe(context.Background(), u.ID, model.UpdateUserRequest{
		AvatarURL: &avatarURL,
	})

	require.NoError(t, err)
	require.NotNil(t, resp.AvatarURL)
	assert.Equal(t, avatarURL, *resp.AvatarURL)
}

func TestUserService_UpdateMe_UserNotFound(t *testing.T) {
	svc := service.NewUserService(&mockUserRepo{err: pgx.ErrNoRows}, &mockSubRepo{})

	_, err := svc.UpdateMe(context.Background(), uuid.New(), model.UpdateUserRequest{})

	assert.ErrorIs(t, err, service.ErrUserNotFound)
}

func TestUserService_DeleteMe_OK(t *testing.T) {
	u := sampleUser()
	repo := &mockUserRepo{user: u}
	svc := service.NewUserService(repo, &mockSubRepo{})

	err := svc.DeleteMe(context.Background(), u.ID)

	require.NoError(t, err)
	assert.True(t, repo.deleted)
}

func TestUserService_DeleteMe_UserNotFound(t *testing.T) {
	svc := service.NewUserService(&mockUserRepo{err: pgx.ErrNoRows}, &mockSubRepo{})

	err := svc.DeleteMe(context.Background(), uuid.New())

	assert.ErrorIs(t, err, service.ErrUserNotFound)
}

func TestUserService_GetSubscription_OK(t *testing.T) {
	sub := sampleSub()
	svc := service.NewUserService(&mockUserRepo{}, &mockSubRepo{sub: sub})

	resp, err := svc.GetSubscription(context.Background(), uuid.New())

	require.NoError(t, err)
	assert.Equal(t, "monthly", resp.Plan)
	assert.Equal(t, "active", resp.Status)
}

func TestUserService_GetSubscription_NoRow_DefaultsFree(t *testing.T) {
	svc := service.NewUserService(&mockUserRepo{}, &mockSubRepo{err: pgx.ErrNoRows})

	resp, err := svc.GetSubscription(context.Background(), uuid.New())

	require.NoError(t, err)
	assert.Equal(t, "free", resp.Plan)
	assert.Equal(t, "active", resp.Status)
}
