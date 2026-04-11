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

	"github.com/yourname/generate-cv/internal/handler"
	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/service"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ─── Mock service ─────────────────────────────────────────────────────────────

type mockAuthService struct {
	registerFn       func(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, error)
	loginFn          func(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error)
	refreshFn        func(ctx context.Context, refreshToken string) (*model.RefreshResponse, error)
	logoutFn         func(ctx context.Context, refreshToken string) error
	forgotPasswordFn func(ctx context.Context, email string) error
	resetPasswordFn  func(ctx context.Context, token, newPassword string) error
}

func (m *mockAuthService) Register(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, error) {
	return m.registerFn(ctx, req)
}
func (m *mockAuthService) Login(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error) {
	return m.loginFn(ctx, req)
}
func (m *mockAuthService) Refresh(ctx context.Context, token string) (*model.RefreshResponse, error) {
	return m.refreshFn(ctx, token)
}
func (m *mockAuthService) Logout(ctx context.Context, token string) error {
	return m.logoutFn(ctx, token)
}
func (m *mockAuthService) ForgotPassword(ctx context.Context, email string) error {
	return m.forgotPasswordFn(ctx, email)
}
func (m *mockAuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	return m.resetPasswordFn(ctx, token, newPassword)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func newTestRouter(svc handler.AuthServiceIface) *gin.Engine {
	r := gin.New()
	h := handler.NewAuthHandler(svc)
	r.POST("/auth/register",        h.Register)
	r.POST("/auth/login",           h.Login)
	r.POST("/auth/refresh",         h.Refresh)
	r.POST("/auth/logout",          h.Logout)
	r.POST("/auth/forgot-password", h.ForgotPassword)
	r.POST("/auth/reset-password",  h.ResetPassword)
	return r
}

func doRequest(t *testing.T, r *gin.Engine, method, path string, body interface{}) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode body: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ─── Register ─────────────────────────────────────────────────────────────────

func TestHandler_Register_201(t *testing.T) {
	svc := &mockAuthService{
		registerFn: func(_ context.Context, req model.RegisterRequest) (*model.AuthResponse, error) {
			return &model.AuthResponse{AccessToken: "at", RefreshToken: "rt"}, nil
		},
	}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/register", map[string]string{
		"email": "a@b.com", "password": "pass1234", "full_name": "Alice",
	})
	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandler_Register_409_DuplicateEmail(t *testing.T) {
	svc := &mockAuthService{
		registerFn: func(_ context.Context, _ model.RegisterRequest) (*model.AuthResponse, error) {
			return nil, service.ErrEmailTaken
		},
	}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/register", map[string]string{
		"email": "a@b.com", "password": "pass1234", "full_name": "Alice",
	})
	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

func TestHandler_Register_400_MissingFields(t *testing.T) {
	svc := &mockAuthService{}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/register", map[string]string{
		"email": "a@b.com",
		// missing password and full_name
	})
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ─── Login ────────────────────────────────────────────────────────────────────

func TestHandler_Login_200(t *testing.T) {
	svc := &mockAuthService{
		loginFn: func(_ context.Context, _ model.LoginRequest) (*model.AuthResponse, error) {
			return &model.AuthResponse{AccessToken: "at", RefreshToken: "rt"}, nil
		},
	}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/login", map[string]string{
		"email": "a@b.com", "password": "pass1234",
	})
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandler_Login_401_WrongCredentials(t *testing.T) {
	svc := &mockAuthService{
		loginFn: func(_ context.Context, _ model.LoginRequest) (*model.AuthResponse, error) {
			return nil, service.ErrInvalidCredentials
		},
	}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/login", map[string]string{
		"email": "a@b.com", "password": "wrong",
	})
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

func TestHandler_Refresh_200(t *testing.T) {
	svc := &mockAuthService{
		refreshFn: func(_ context.Context, _ string) (*model.RefreshResponse, error) {
			return &model.RefreshResponse{AccessToken: "new-at"}, nil
		},
	}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/refresh", map[string]string{
		"refresh_token": "some-token",
	})
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandler_Refresh_401_InvalidToken(t *testing.T) {
	svc := &mockAuthService{
		refreshFn: func(_ context.Context, _ string) (*model.RefreshResponse, error) {
			return nil, service.ErrTokenNotFound
		},
	}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/refresh", map[string]string{
		"refresh_token": "bad-token",
	})
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ─── Logout ───────────────────────────────────────────────────────────────────

func TestHandler_Logout_200(t *testing.T) {
	svc := &mockAuthService{
		logoutFn: func(_ context.Context, _ string) error { return nil },
	}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/logout", map[string]string{
		"refresh_token": "some-token",
	})
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

// ─── ForgotPassword ───────────────────────────────────────────────────────────

func TestHandler_ForgotPassword_AlwaysReturns200(t *testing.T) {
	called := false
	svc := &mockAuthService{
		forgotPasswordFn: func(_ context.Context, email string) error {
			called = true
			return errors.New("internal error") // even if service errors, handler returns 200
		},
	}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/forgot-password", map[string]string{
		"email": "x@y.com",
	})
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	_ = called
}

// ─── ResetPassword ────────────────────────────────────────────────────────────

func TestHandler_ResetPassword_200(t *testing.T) {
	svc := &mockAuthService{
		resetPasswordFn: func(_ context.Context, _, _ string) error { return nil },
	}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/reset-password", map[string]string{
		"token": "valid-token", "new_password": "newpass123",
	})
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestHandler_ResetPassword_400_InvalidToken(t *testing.T) {
	svc := &mockAuthService{
		resetPasswordFn: func(_ context.Context, _, _ string) error {
			return service.ErrTokenNotFound
		},
	}
	w := doRequest(t, newTestRouter(svc), http.MethodPost, "/auth/reset-password", map[string]string{
		"token": "bad-token", "new_password": "newpass123",
	})
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
