package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yourname/generate-cv/internal/handler"
	"github.com/yourname/generate-cv/internal/middleware"
	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/service"
)

// ─── Mock ────────────────────────────────────────────────────────────────────

type mockUserService struct {
	meResp  *model.UserWithSubResponse
	subResp *model.SubscriptionResponse
	err     error
}

func (m *mockUserService) GetMe(_ context.Context, _ uuid.UUID) (*model.UserWithSubResponse, error) {
	return m.meResp, m.err
}
func (m *mockUserService) UpdateMe(_ context.Context, _ uuid.UUID, _ model.UpdateUserRequest) (*model.UserWithSubResponse, error) {
	return m.meResp, m.err
}
func (m *mockUserService) DeleteMe(_ context.Context, _ uuid.UUID) error { return m.err }
func (m *mockUserService) GetSubscription(_ context.Context, _ uuid.UUID) (*model.SubscriptionResponse, error) {
	return m.subResp, m.err
}

// ─── Router helper ────────────────────────────────────────────────────────────

func newUserRouter(svc handler.UserServiceIface) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	testUserID := uuid.New()
	// Inject a fixed userID to bypass JWT
	r.Use(func(c *gin.Context) {
		c.Set(middleware.ContextKeyUserID, testUserID)
		c.Next()
	})
	h := handler.NewUserHandler(svc)
	r.GET("/users/me", h.GetMe)
	r.PATCH("/users/me", h.UpdateMe)
	r.DELETE("/users/me", h.DeleteMe)
	r.GET("/users/me/subscription", h.GetSubscription)
	return r
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func TestUserHandler_GetMe_200(t *testing.T) {
	resp := &model.UserWithSubResponse{ID: uuid.New(), Email: "a@b.com", FullName: "Test"}
	r := newUserRouter(&mockUserService{meResp: resp})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/users/me", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var got model.UserWithSubResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	assert.Equal(t, resp.Email, got.Email)
}

func TestUserHandler_GetMe_404(t *testing.T) {
	r := newUserRouter(&mockUserService{err: service.ErrUserNotFound})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/users/me", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUserHandler_GetMe_500(t *testing.T) {
	r := newUserRouter(&mockUserService{err: errors.New("db error")})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/users/me", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestUserHandler_UpdateMe_200(t *testing.T) {
	updated := &model.UserWithSubResponse{Email: "a@b.com", FullName: "New Name"}
	r := newUserRouter(&mockUserService{meResp: updated})

	body, _ := json.Marshal(map[string]string{"full_name": "New Name"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPatch, "/users/me", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUserHandler_DeleteMe_200(t *testing.T) {
	r := newUserRouter(&mockUserService{})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/users/me", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUserHandler_DeleteMe_404(t *testing.T) {
	r := newUserRouter(&mockUserService{err: service.ErrUserNotFound})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/users/me", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUserHandler_GetSubscription_200(t *testing.T) {
	sub := &model.SubscriptionResponse{Plan: "monthly", Status: "active"}
	r := newUserRouter(&mockUserService{subResp: sub})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/users/me/subscription", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var got model.SubscriptionResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	assert.Equal(t, "monthly", got.Plan)
}

func TestUserHandler_GetSubscription_500(t *testing.T) {
	r := newUserRouter(&mockUserService{err: errors.New("db error")})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/users/me/subscription", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
