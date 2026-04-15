package unit_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yourname/generate-cv/internal/router"
	"github.com/yourname/generate-cv/tests/testhelper"
)

// ─────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────

func TestRouter_Health_Returns200(t *testing.T) {
	r := router.New(testhelper.DefaultConfig())
	w, req := newReq(http.MethodGet, "/health")
	r.ServeHTTP(w, req)

	assertStatus(t, w, http.StatusOK)
}

func TestRouter_Health_ReturnsJSONBody(t *testing.T) {
	r := router.New(testhelper.DefaultConfig())
	w, req := newReq(http.MethodGet, "/health")
	r.ServeHTTP(w, req)

	var body map[string]string
	mustParseJSON(t, w, &body)
	if body["status"] != "ok" {
		t.Errorf(`expected "status":"ok", got %q`, body["status"])
	}
}

func TestRouter_Health_ContentTypeIsJSON(t *testing.T) {
	r := router.New(testhelper.DefaultConfig())
	w, req := newReq(http.MethodGet, "/health")
	r.ServeHTTP(w, req)

	ct := w.Header().Get("Content-Type")
	if ct == "" {
		t.Fatal("Content-Type header is missing")
	}
}

func TestRouter_Health_MethodNotAllowed_POST(t *testing.T) {
	r := router.New(testhelper.DefaultConfig())
	w, req := newReq(http.MethodPost, "/health")
	r.ServeHTTP(w, req)

	// Gin returns 404 for unregistered method+path combos by default
	if w.Code == http.StatusOK {
		t.Error("POST /health should not return 200")
	}
}

// ─────────────────────────────────────────────
// GET /api/v1/ping
// ─────────────────────────────────────────────

func TestRouter_Ping_Returns200(t *testing.T) {
	r := router.New(testhelper.DefaultConfig())
	w, req := newReq(http.MethodGet, "/api/v1/ping")
	r.ServeHTTP(w, req)

	assertStatus(t, w, http.StatusOK)
}

func TestRouter_Ping_ReturnsMessagePong(t *testing.T) {
	r := router.New(testhelper.DefaultConfig())
	w, req := newReq(http.MethodGet, "/api/v1/ping")
	r.ServeHTTP(w, req)

	var body map[string]string
	mustParseJSON(t, w, &body)
	if body["message"] != "pong" {
		t.Errorf(`expected "message":"pong", got %q`, body["message"])
	}
}

func TestRouter_Ping_ResponseIsValidJSON(t *testing.T) {
	r := router.New(testhelper.DefaultConfig())
	w, req := newReq(http.MethodGet, "/api/v1/ping")
	r.ServeHTTP(w, req)

	if !json.Valid(w.Body.Bytes()) {
		t.Errorf("response body is not valid JSON: %s", w.Body.String())
	}
}

// ─────────────────────────────────────────────
// 404 / Unknown routes
// ─────────────────────────────────────────────

func TestRouter_UnknownRoute_Returns404(t *testing.T) {
	r := router.New(testhelper.DefaultConfig())

	paths := []string{
		"/not-found",
		"/api",
		"/api/v1",
		"/api/v2/ping",
		"/health/extra",
	}

	for _, p := range paths {
		t.Run(p, func(t *testing.T) {
			w, req := newReq(http.MethodGet, p)
			r.ServeHTTP(w, req)
			assertStatus(t, w, http.StatusNotFound)
		})
	}
}

// ─────────────────────────────────────────────
// Production mode
// ─────────────────────────────────────────────

func TestRouter_ProductionMode_HealthStillWorks(t *testing.T) {
	cfg := testhelper.DefaultConfig()
	cfg.App.Env = "production"

	r := router.New(cfg)
	w, req := newReq(http.MethodGet, "/health")
	r.ServeHTTP(w, req)

	assertStatus(t, w, http.StatusOK)
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

func newReq(method, path string) (*httptest.ResponseRecorder, *http.Request) {
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(method, path, nil)
	return w, req
}

func assertStatus(t *testing.T, w *httptest.ResponseRecorder, want int) {
	t.Helper()
	if w.Code != want {
		t.Fatalf("expected status %d, got %d (body: %s)", want, w.Code, w.Body.String())
	}
}

func mustParseJSON(t *testing.T, w *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.Unmarshal(w.Body.Bytes(), v); err != nil {
		t.Fatalf("failed to parse JSON response: %v\nbody: %s", err, w.Body.String())
	}
}
