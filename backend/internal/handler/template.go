// Package handler — HTTP handlers for Template endpoints.
package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/service"
)

// ─── Interface ────────────────────────────────────────────────────────────────

// TemplateServiceIface is the subset of TemplateService the handler depends on.
type TemplateServiceIface interface {
	List(ctx context.Context, q model.ListTemplatesQuery) (*model.ListTemplatesResponse, error)
	Get(ctx context.Context, id string) (*model.TemplateResponse, error)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

type TemplateHandler struct {
	svc TemplateServiceIface
}

func NewTemplateHandler(svc TemplateServiceIface) *TemplateHandler {
	return &TemplateHandler{svc: svc}
}

// ─── GET /templates ───────────────────────────────────────────────────────────

func (h *TemplateHandler) List(c *gin.Context) {
	var q model.ListTemplatesQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.List(c.Request.Context(), q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list templates"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─── GET /templates/:id ───────────────────────────────────────────────────────

func (h *TemplateHandler) Get(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing template id"})
		return
	}

	resp, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrTemplateNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get template"})
		return
	}

	c.JSON(http.StatusOK, resp)
}
