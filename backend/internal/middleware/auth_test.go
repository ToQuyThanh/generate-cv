package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/yourname/generate-cv/internal/middleware"
	"github.com/yourname/generate-cv/pkg/jwtutil"
)

const testSecret = "test-secret-at-least-32-chars-long!!"

func init() {
	gin.SetMode(gin.TestMode)
}

func newRouter() *gin.Engine {
	r := gin.New()
	r.Use(middleware.AuthJWT(testSecret))
	r.GET("/protected", func(c *gin.Context) {
		uid := middleware.GetUserID(c)
		c.JSON(http.StatusOK, gin.H{"user_id": uid.String()})
	})
	return r
}

func TestAuthJWT_ValidToken(t *testing.T) {
	userID := uuid.New()
	token, _ := jwtutil.Sign(testSecret, userID, 15*time.Minute)

	r := newRouter()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuthJWT_MissingHeader(t *testing.T) {
	r := newRouter()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthJWT_InvalidToken(t *testing.T) {
	r := newRouter()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer garbage.token.here")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthJWT_ExpiredToken(t *testing.T) {
	userID := uuid.New()
	token, _ := jwtutil.Sign(testSecret, userID, -1*time.Second)

	r := newRouter()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthJWT_WrongScheme(t *testing.T) {
	r := newRouter()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Basic dXNlcjpwYXNz")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}
