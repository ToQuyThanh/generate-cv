package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/yourname/generate-cv/internal/middleware"
	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/service"
)

// CVServiceIface is the subset of CVService the handler depends on.
type CVServiceIface interface {
	List(ctx context.Context, userID uuid.UUID, q model.ListCVsQuery) (*model.ListCVsResponse, error)
	Create(ctx context.Context, userID uuid.UUID, req model.CreateCVRequest) (*model.CVResponse, error)
	Get(ctx context.Context, userID, cvID uuid.UUID) (*model.CVResponse, error)
	Update(ctx context.Context, userID, cvID uuid.UUID, req model.UpdateCVRequest) (*model.CVResponse, error)
	UpdateOverrides(ctx context.Context, userID, cvID uuid.UUID, req model.UpdateCVOverridesRequest) (*model.CVResponse, error)
	SyncProfile(ctx context.Context, userID, cvID uuid.UUID) (*model.CVResponse, error)
	Delete(ctx context.Context, userID, cvID uuid.UUID) error
	Duplicate(ctx context.Context, userID, cvID uuid.UUID) (*model.CVResponse, error)
}

type CVHandler struct {
	svc CVServiceIface
}

func NewCVHandler(svc CVServiceIface) *CVHandler {
	return &CVHandler{svc: svc}
}

// ─── GET /cvs ─────────────────────────────────────────────────────────────────

func (h *CVHandler) List(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var q model.ListCVsQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.List(c.Request.Context(), userID, q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list CVs"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─── POST /cvs ────────────────────────────────────────────────────────────────

func (h *CVHandler) Create(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req model.CreateCVRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.Create(c.Request.Context(), userID, req)
	if err != nil {
		if errors.Is(err, service.ErrProfileNotFound) || errors.Is(err, service.ErrProfileForbidden) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create CV"})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// ─── GET /cvs/:id ─────────────────────────────────────────────────────────────

func (h *CVHandler) Get(c *gin.Context) {
	userID := middleware.GetUserID(c)

	cvID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	resp, err := h.svc.Get(c.Request.Context(), userID, cvID)
	if err != nil {
		if isCVNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "cv not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get CV"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─── PATCH /cvs/:id ───────────────────────────────────────────────────────────

func (h *CVHandler) Update(c *gin.Context) {
	userID := middleware.GetUserID(c)

	cvID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	var req model.UpdateCVRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.Update(c.Request.Context(), userID, cvID, req)
	if err != nil {
		if isCVNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "cv not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update CV"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─── PUT /cvs/:id/overrides ───────────────────────────────────────────────────

func (h *CVHandler) UpdateOverrides(c *gin.Context) {
	userID := middleware.GetUserID(c)

	cvID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	var req model.UpdateCVOverridesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.UpdateOverrides(c.Request.Context(), userID, cvID, req)
	if err != nil {
		if isCVNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "cv not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update overrides"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─── POST /cvs/:id/sync-profile ───────────────────────────────────────────────

func (h *CVHandler) SyncProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)

	cvID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	resp, err := h.svc.SyncProfile(c.Request.Context(), userID, cvID)
	if err != nil {
		if isCVNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "cv not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─── DELETE /cvs/:id ──────────────────────────────────────────────────────────

func (h *CVHandler) Delete(c *gin.Context) {
	userID := middleware.GetUserID(c)

	cvID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	if err := h.svc.Delete(c.Request.Context(), userID, cvID); err != nil {
		if isCVNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "cv not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete CV"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "cv deleted"})
}

// ─── POST /cvs/:id/duplicate ──────────────────────────────────────────────────

func (h *CVHandler) Duplicate(c *gin.Context) {
	userID := middleware.GetUserID(c)

	cvID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	resp, err := h.svc.Duplicate(c.Request.Context(), userID, cvID)
	if err != nil {
		if isCVNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "cv not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to duplicate CV"})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func parseUUID(c *gin.Context, param string) (uuid.UUID, error) {
	raw := c.Param(param)
	id, err := uuid.Parse(raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid " + param})
		return uuid.UUID{}, err
	}
	return id, nil
}

func isCVNotFound(err error) bool {
	return errors.Is(err, service.ErrCVNotFound) || errors.Is(err, service.ErrCVForbidden)
}
