package router_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yourname/generate-cv/config"
	"github.com/yourname/generate-cv/internal/router"
)

func testConfig() *config.Config {
	return &config.Config{
		App: config.AppConfig{Env: "test", Port: "8080"},
	}
}

func TestHealthEndpoint(t *testing.T) {
	r := router.New(testConfig())

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/health", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf(`expected status "ok", got %q`, body["status"])
	}
}

func TestPingEndpoint(t *testing.T) {
	r := router.New(testConfig())

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/ping", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if body["message"] != "pong" {
		t.Errorf(`expected message "pong", got %q`, body["message"])
	}
}

func TestUnknownRoutReturns404(t *testing.T) {
	r := router.New(testConfig())

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/not-found", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}
