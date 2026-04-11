package handler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yourname/generate-cv/internal/handler"
	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/service"
)

// ─── Mock ────────────────────────────────────────────────────────────────────

type mockTemplateService struct {
	listResp *model.ListTemplatesResponse
	oneResp  *model.TemplateResponse
	err      error
}

func (m *mockTemplateService) List(_ context.Context, _ model.ListTemplatesQuery) (*model.ListTemplatesResponse, error) {
	return m.listResp, m.err
}
func (m *mockTemplateService) Get(_ context.Context, _ string) (*model.TemplateResponse, error) {
	return m.oneResp, m.err
}

// ─── Router helper ────────────────────────────────────────────────────────────

func newTemplateRouter(svc handler.TemplateServiceIface) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := handler.NewTemplateHandler(svc)
	r.GET("/templates", h.List)
	r.GET("/templates/:id", h.Get)
	return r
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func TestTemplateHandler_List_200(t *testing.T) {
	listResp := &model.ListTemplatesResponse{
		Data: []model.TemplateResponse{
			{ID: "template_modern_01", Name: "Modern", Tags: []string{"free"}},
		},
		Total: 1,
	}
	r := newTemplateRouter(&mockTemplateService{listResp: listResp})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/templates", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var got model.ListTemplatesResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	assert.Equal(t, 1, got.Total)
}

func TestTemplateHandler_List_WithFilter(t *testing.T) {
	listResp := &model.ListTemplatesResponse{
		Data:  []model.TemplateResponse{{ID: "template_executive_01", Name: "Executive", IsPremium: true, Tags: []string{"premium"}}},
		Total: 1,
	}
	r := newTemplateRouter(&mockTemplateService{listResp: listResp})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/templates?is_premium=true", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestTemplateHandler_Get_200(t *testing.T) {
	oneResp := &model.TemplateResponse{ID: "template_modern_01", Name: "Modern", Tags: []string{"free"}}
	r := newTemplateRouter(&mockTemplateService{oneResp: oneResp})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/templates/template_modern_01", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var got model.TemplateResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	assert.Equal(t, "template_modern_01", got.ID)
}

func TestTemplateHandler_Get_404(t *testing.T) {
	r := newTemplateRouter(&mockTemplateService{err: service.ErrTemplateNotFound})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/templates/nonexistent", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
