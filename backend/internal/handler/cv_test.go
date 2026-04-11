package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/yourname/generate-cv/internal/handler"
	"github.com/yourname/generate-cv/internal/middleware"
	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/service"
	"github.com/yourname/generate-cv/pkg/jwtutil"
)

// ─── Mock CV service ──────────────────────────────────────────────────────────

type mockCVService struct {
	listFn      func(ctx context.Context, userID uuid.UUID, q model.ListCVsQuery) (*model.ListCVsResponse, error)
	createFn    func(ctx context.Context, userID uuid.UUID, req model.CreateCVRequest) (*model.CVResponse, error)
	getFn       func(ctx context.Context, userID, cvID uuid.UUID) (*model.CVResponse, error)
	updateFn    func(ctx context.Context, userID, cvID uuid.UUID, req model.UpdateCVRequest) (*model.CVResponse, error)
	deleteFn    func(ctx context.Context, userID, cvID uuid.UUID) error
	duplicateFn func(ctx context.Context, userID, cvID uuid.UUID) (*model.CVResponse, error)
}

func (m *mockCVService) List(ctx context.Context, userID uuid.UUID, q model.ListCVsQuery) (*model.ListCVsResponse, error) {
	return m.listFn(ctx, userID, q)
}
func (m *mockCVService) Create(ctx context.Context, userID uuid.UUID, req model.CreateCVRequest) (*model.CVResponse, error) {
	return m.createFn(ctx, userID, req)
}
func (m *mockCVService) Get(ctx context.Context, userID, cvID uuid.UUID) (*model.CVResponse, error) {
	return m.getFn(ctx, userID, cvID)
}
func (m *mockCVService) Update(ctx context.Context, userID, cvID uuid.UUID, req model.UpdateCVRequest) (*model.CVResponse, error) {
	return m.updateFn(ctx, userID, cvID, req)
}
func (m *mockCVService) Delete(ctx context.Context, userID, cvID uuid.UUID) error {
	return m.deleteFn(ctx, userID, cvID)
}
func (m *mockCVService) Duplicate(ctx context.Context, userID, cvID uuid.UUID) (*model.CVResponse, error) {
	return m.duplicateFn(ctx, userID, cvID)
}

// ─── Router factory ───────────────────────────────────────────────────────────

const cvTestSecret = "test-secret-at-least-32-chars-long!!"

func newCVRouter(svc handler.CVServiceIface) (*gin.Engine, uuid.UUID) {
	gin.SetMode(gin.TestMode)
	userID := uuid.New()

	r := gin.New()
	r.Use(middleware.AuthJWT(cvTestSecret))

	h := handler.NewCVHandler(svc)
	r.GET("/cvs", h.List)
	r.POST("/cvs", h.Create)
	r.GET("/cvs/:id", h.Get)
	r.PATCH("/cvs/:id", h.Update)
	r.DELETE("/cvs/:id", h.Delete)
	r.POST("/cvs/:id/duplicate", h.Duplicate)

	return r, userID
}

func bearerToken(t *testing.T, userID uuid.UUID) string {
	t.Helper()
	tok, err := jwtutil.Sign(cvTestSecret, userID, 15*60*1000000000)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return "Bearer " + tok
}

func doCVRequest(t *testing.T, r *gin.Engine, method, path string, body interface{}, token string) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", token)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func fakeCVResponse(userID uuid.UUID) *model.CVResponse {
	return &model.CVResponse{
		ID:         uuid.New(),
		UserID:     userID,
		Title:      "My CV",
		TemplateID: "template_modern_01",
		ColorTheme: "#1a56db",
		Sections:   json.RawMessage(`[]`),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
}

// ─── List ─────────────────────────────────────────────────────────────────────

func TestCVHandler_List_200(t *testing.T) {
	svc := &mockCVService{
		listFn: func(_ context.Context, _ uuid.UUID, _ model.ListCVsQuery) (*model.ListCVsResponse, error) {
			return &model.ListCVsResponse{Data: []model.CVResponse{}, Total: 0, Page: 1, PerPage: 10, TotalPages: 0}, nil
		},
	}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodGet, "/cvs", nil, bearerToken(t, userID))
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCVHandler_List_401_NoToken(t *testing.T) {
	svc := &mockCVService{}
	r, _ := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodGet, "/cvs", nil, "")
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ─── Create ───────────────────────────────────────────────────────────────────

func TestCVHandler_Create_201(t *testing.T) {
	svc := &mockCVService{
		createFn: func(_ context.Context, userID uuid.UUID, _ model.CreateCVRequest) (*model.CVResponse, error) {
			return fakeCVResponse(userID), nil
		},
	}
	r, userID := newCVRouter(svc)
	body := map[string]interface{}{
		"title": "My CV", "template_id": "template_modern_01",
		"color_theme": "#1a56db", "sections": []interface{}{},
	}
	w := doCVRequest(t, r, http.MethodPost, "/cvs", body, bearerToken(t, userID))
	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCVHandler_Create_400_MissingFields(t *testing.T) {
	svc := &mockCVService{}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodPost, "/cvs", map[string]string{"title": "only title"}, bearerToken(t, userID))
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ─── Get ──────────────────────────────────────────────────────────────────────

func TestCVHandler_Get_200(t *testing.T) {
	cvID := uuid.New()
	svc := &mockCVService{
		getFn: func(_ context.Context, userID, _ uuid.UUID) (*model.CVResponse, error) {
			return fakeCVResponse(userID), nil
		},
	}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodGet, "/cvs/"+cvID.String(), nil, bearerToken(t, userID))
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCVHandler_Get_404_NotFound(t *testing.T) {
	cvID := uuid.New()
	svc := &mockCVService{
		getFn: func(_ context.Context, _, _ uuid.UUID) (*model.CVResponse, error) {
			return nil, service.ErrCVNotFound
		},
	}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodGet, "/cvs/"+cvID.String(), nil, bearerToken(t, userID))
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestCVHandler_Get_400_InvalidUUID(t *testing.T) {
	svc := &mockCVService{}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodGet, "/cvs/not-a-uuid", nil, bearerToken(t, userID))
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ─── Update ───────────────────────────────────────────────────────────────────

func TestCVHandler_Update_200(t *testing.T) {
	cvID := uuid.New()
	svc := &mockCVService{
		updateFn: func(_ context.Context, userID, _ uuid.UUID, _ model.UpdateCVRequest) (*model.CVResponse, error) {
			return fakeCVResponse(userID), nil
		},
	}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodPatch, "/cvs/"+cvID.String(), map[string]string{"title": "New Title"}, bearerToken(t, userID))
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCVHandler_Update_404_NotFound(t *testing.T) {
	cvID := uuid.New()
	svc := &mockCVService{
		updateFn: func(_ context.Context, _, _ uuid.UUID, _ model.UpdateCVRequest) (*model.CVResponse, error) {
			return nil, service.ErrCVNotFound
		},
	}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodPatch, "/cvs/"+cvID.String(), map[string]string{"title": "X"}, bearerToken(t, userID))
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// ─── Delete ───────────────────────────────────────────────────────────────────

func TestCVHandler_Delete_200(t *testing.T) {
	cvID := uuid.New()
	svc := &mockCVService{
		deleteFn: func(_ context.Context, _, _ uuid.UUID) error { return nil },
	}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodDelete, "/cvs/"+cvID.String(), nil, bearerToken(t, userID))
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCVHandler_Delete_404_NotFound(t *testing.T) {
	cvID := uuid.New()
	svc := &mockCVService{
		deleteFn: func(_ context.Context, _, _ uuid.UUID) error { return service.ErrCVNotFound },
	}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodDelete, "/cvs/"+cvID.String(), nil, bearerToken(t, userID))
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// ─── Duplicate ────────────────────────────────────────────────────────────────

func TestCVHandler_Duplicate_201(t *testing.T) {
	cvID := uuid.New()
	svc := &mockCVService{
		duplicateFn: func(_ context.Context, userID, _ uuid.UUID) (*model.CVResponse, error) {
			resp := fakeCVResponse(userID)
			resp.Title = "My CV (bản sao)"
			return resp, nil
		},
	}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodPost, "/cvs/"+cvID.String()+"/duplicate", nil, bearerToken(t, userID))
	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCVHandler_Duplicate_404_NotFound(t *testing.T) {
	cvID := uuid.New()
	svc := &mockCVService{
		duplicateFn: func(_ context.Context, _, _ uuid.UUID) (*model.CVResponse, error) {
			return nil, service.ErrCVNotFound
		},
	}
	r, userID := newCVRouter(svc)
	w := doCVRequest(t, r, http.MethodPost, "/cvs/"+cvID.String()+"/duplicate", nil, bearerToken(t, userID))
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}
